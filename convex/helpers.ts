import type { DocumentByName, GenericDatabaseReader, TableNamesInDataModel } from 'convex/server';

import type { DataModel } from './_generated/dataModel';

export function cleanData<T>(value: T): T {
  if (Array.isArray(value)) return value.map(cleanData) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).flatMap(([key, entry]) => entry === undefined ? [] : [[key, cleanData(entry)]]),
    ) as T;
  }
  return value;
}

export async function findByExternalId<TableName extends Extract<
  TableNamesInDataModel<DataModel>,
  'articles' | 'reporters' | 'payments' | 'notifications'
>>(
  db: GenericDatabaseReader<DataModel>,
  table: TableName,
  id: string,
): Promise<DocumentByName<DataModel, TableName> | null> {
  return db.query(table).withIndex('by_external_id', (query) => query.eq('id' as never, id as never)).unique() as Promise<
    DocumentByName<DataModel, TableName> | null
  >;
}