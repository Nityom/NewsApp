# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

## Backend

Firebase Authentication remains the identity provider. Articles, reporters, payments, settings, notification history, push tokens, Cashfree verification, and scheduled cleanup run on Convex.

Configure the public app endpoint in `.env.local`:

```bash
EXPO_PUBLIC_CONVEX_URL=https://quirky-rooster-395.convex.cloud
```

Set backend secrets directly in Convex. Never add their values to source control:

```bash
npx convex env set CASHFREE_APP_ID
npx convex env set CASHFREE_SECRET_KEY
npx convex env set CLOUDINARY_CLOUD_NAME
npx convex env set CLOUDINARY_API_KEY
npx convex env set CLOUDINARY_API_SECRET
```

Cashfree must send payment webhooks to `https://quirky-rooster-395.convex.site/cashfree-webhook`.

To replace the Convex tables with the current Firestore data, expose a Firebase service-account JSON value for only the duration of the command and run:

```bash
FIREBASE_SERVICE_ACCOUNT='...' npm run migrate:firestore
```

Use `npm run migrate:firestore -- --export-only` to inspect the ignored `.convex-migration/*.jsonl` snapshots without importing them. The normal command uses Convex's `--replace` mode for all six tables.

## System notifications

The app registers signed-in devices in Convex for Expo push notifications. A Convex action sends an OS notification whenever the app creates a notification record. Tapping an alert opens its article, reporter, or notification history screen.

Remote notifications require a development or release build; they do not work in Expo Go on Android.

1. Configure Android FCM V1 credentials for the EAS project:

   ```bash
   eas credentials --platform android
   ```

2. Configure iOS push credentials with `eas credentials --platform ios`. Apple push credentials require a paid Apple Developer account.

3. Deploy the Convex functions and cron jobs:

   ```bash
   npx convex dev --once
   ```

4. Rebuild and install the native app because the `expo-notifications` config plugin is a build-time change:

   ```bash
   eas build --profile development --platform android
   # or: eas build --profile development --platform ios
   ```

5. Sign in and allow notifications when the system prompts. Create an article, payment, or reporter event from another signed-in account to test background and closed-app delivery.

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
