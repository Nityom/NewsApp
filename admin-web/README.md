# Education News Admin Web

Desktop-first administration console for the Education News mobile application. It uses the existing Firebase Authentication project and Convex deployment, so articles, reporters, payments, notifications, and publication settings remain live across mobile and web.

## Features

- Live dashboard and editorial queue
- Admin article authoring with drafts, direct publishing, sections, gallery images, advertisements, and live preview
- Article review, approval, rejection, trash, publication date, and image-complete PNG download
- Reporter join requests, fee assignment, payment confirmation, suspension, activation, and deletion
- Payment reconciliation and reporter payment notifications
- Notification inbox with article/reporter deep links
- Seven-day editorial and payment analytics
- Publication masthead settings
- Responsive desktop and mobile browser layouts

## Firebase setup

In Firebase Console for project `education-news-7f9bf`:

1. Open **Authentication > Sign-in method** and enable **Email/Password**.
2. Confirm `admin@educationnews.com` exists in **Authentication > Users**.
3. Add the deployed admin hostname in **Authentication > Settings > Authorized domains**.
4. `localhost` must remain authorized for local development.

Convex only grants admin mutations to `admin@educationnews.com`; UI route protection is not the security boundary.

## Environment

The application includes fallbacks for the existing project configuration. For deployment, create `.env.local` and set these explicitly:

```bash
VITE_CONVEX_URL=https://quirky-rooster-395.convex.cloud
VITE_FIREBASE_API_KEY=your_firebase_web_api_key
VITE_FIREBASE_AUTH_DOMAIN=education-news-7f9bf.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=education-news-7f9bf
VITE_FIREBASE_STORAGE_BUCKET=education-news-7f9bf.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=522828191876
VITE_FIREBASE_APP_ID=your_firebase_web_app_id
VITE_CLOUDINARY_CLOUD_NAME=dmjetilgd
VITE_CLOUDINARY_UPLOAD_PRESET=ih6tkxko
```

Firebase web API keys are public client identifiers. Convex permissions and Firebase security rules must enforce access.

## Development

```bash
npm install
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`.

## Validation

```bash
npm run build
npm run lint
```

## Deployment

The output is a static single-page application in `dist/`. Configure the hosting provider to rewrite unknown routes to `/index.html`.

Examples:

- Firebase Hosting: set `public` to `admin-web/dist` and add a `**` rewrite to `/index.html`.
- Vercel or Netlify: use `admin-web` as the root, `npm run build` as the build command, and `dist` as the output directory.

After deployment, add the production hostname to Firebase Authorized Domains before testing sign-in.
