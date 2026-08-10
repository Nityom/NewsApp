# Article cleanup

A GitHub Actions job runs daily and permanently removes articles more than 10 days after their `createdAt` timestamp. It deletes referenced Cloudinary images first, then related Firestore notifications, then the Firestore article document. If an image deletion fails, the article remains so the next run can retry safely.

The schedule runs at 00:20 UTC. Because it runs daily, deletion occurs on the first run after an article crosses 10 days old, up to 24 hours later.

## Required GitHub secrets

Open the repository on GitHub, then go to **Settings > Secrets and variables > Actions > New repository secret** and add:

- `FIREBASE_SERVICE_ACCOUNT`: the complete JSON contents of a Firebase service-account private key for project `education-news-7f9bf`. Generate it from **Firebase Console > Project settings > Service accounts > Generate new private key**.
- `CLOUDINARY_CLOUD_NAME`: the Cloudinary cloud name, currently `dmjetilgd`.
- `CLOUDINARY_API_KEY`: from **Cloudinary Console > Settings > API Keys**.
- `CLOUDINARY_API_SECRET`: from the same Cloudinary page.

Never put the service-account JSON or Cloudinary API secret in source files, the mobile app, or the APK.

## Enable and test

1. Push `.github/workflows/article-cleanup.yml` and `scripts/article-cleanup/` to the repository's default branch.
2. Open **GitHub > Actions > Delete expired articles > Run workflow**.
3. Keep **Report expired articles without deleting them** enabled for the first run and inspect the log.
4. Run it again with dry-run disabled only after the reported articles look correct.

Scheduled runs perform real deletion automatically. GitHub may delay scheduled jobs during high load. In public repositories, GitHub can disable scheduled workflows after 60 days without repository activity; re-enable the workflow from the Actions page if that occurs.

## Local checks

```bash
cd scripts/article-cleanup
npm test
```

A local dry run also needs all four environment variables:

```bash
npm run dry-run
```
