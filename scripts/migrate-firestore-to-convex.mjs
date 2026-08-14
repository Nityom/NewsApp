import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const OUTPUT_DIRECTORY = path.resolve('.convex-migration');
const TABLES = ['articles', 'reporters', 'payments', 'notifications', 'pushTokens', 'settings'];

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function normalize(value) {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    if (typeof value.latitude === 'number' && typeof value.longitude === 'number') {
      return { latitude: value.latitude, longitude: value.longitude };
    }
    if (typeof value.path === 'string' && value.firestore) return value.path;
    return Object.fromEntries(
      Object.entries(value).flatMap(([key, entry]) => entry === undefined ? [] : [[key, normalize(entry)]]),
    );
  }
  return value;
}

function requireString(value, description) {
  if (typeof value !== 'string' || !value) throw new Error(`Missing ${description}.`);
  return value;
}

function convertDocument(table, document) {
  const data = { ...normalize(document.data()), id: document.id };
  if (table === 'articles') {
    return { id: document.id, reporterId: requireString(data.reporterId, `reporterId for article ${document.id}`), data };
  }
  if (table === 'reporters') {
    return { id: document.id, email: requireString(data.email, `email for reporter ${document.id}`), data };
  }
  if (table === 'payments') {
    return { id: document.id, reporterId: requireString(data.reporterId, `reporterId for payment ${document.id}`), data };
  }
  if (table === 'notifications') {
    const audience = requireString(data.audience, `audience for notification ${document.id}`);
    if (!['admin', 'reporter'].includes(audience)) throw new Error(`Invalid audience for notification ${document.id}.`);
    return { id: document.id, audience, ...(data.reporterId ? { reporterId: data.reporterId } : {}), data };
  }
  if (table === 'pushTokens') {
    const audience = requireString(data.audience, `audience for push token ${document.id}`);
    if (!['admin', 'reporter'].includes(audience)) throw new Error(`Invalid audience for push token ${document.id}.`);
    return {
      key: document.id,
      token: requireString(data.token, `token for push registration ${document.id}`),
      audience,
      reporterIds: Array.isArray(data.reporterIds) ? data.reporterIds : [],
      platform: typeof data.platform === 'string' ? data.platform : 'unknown',
      updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString(),
    };
  }
  return { key: document.id, data };
}

function importTable(table, filePath) {
  const result = spawnSync('npx', ['convex', 'import', '--table', table, '--replace', '--yes', filePath], {
    stdio: 'inherit',
  });
  if (result.status !== 0) throw new Error(`Convex import failed for ${table}.`);
}

async function run() {
  const serviceAccount = JSON.parse(requiredEnvironment('FIREBASE_SERVICE_ACCOUNT'));
  if (getApps().length === 0) initializeApp({ credential: cert(serviceAccount) });
  const database = getFirestore();
  const exports = [];

  for (const table of TABLES) {
    const snapshot = await database.collection(table).get();
    exports.push({ table, records: snapshot.docs.map((document) => convertDocument(table, document)) });
  }

  await mkdir(OUTPUT_DIRECTORY, { recursive: true });
  for (const exportedTable of exports) {
    const filePath = path.join(OUTPUT_DIRECTORY, `${exportedTable.table}.jsonl`);
    const contents = exportedTable.records.map((record) => JSON.stringify(record)).join('\n');
    await writeFile(filePath, contents ? `${contents}\n` : '', { mode: 0o600 });
    console.log(`Exported ${exportedTable.records.length} ${exportedTable.table} record(s).`);
  }

  if (process.argv.includes('--export-only')) return;
  for (const exportedTable of exports) {
    importTable(exportedTable.table, path.join(OUTPUT_DIRECTORY, `${exportedTable.table}.jsonl`));
    console.log(`Imported ${exportedTable.records.length} ${exportedTable.table} record(s).`);
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});