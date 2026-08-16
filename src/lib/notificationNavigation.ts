// Tracks whether a notification tap has already routed the app, so the splash
// screen's default redirect doesn't override it and bounce the user to the dashboard.
let handled = false;

export function markNotificationNavigationHandled() {
  handled = true;
}

export function wasNotificationNavigationHandled() {
  return handled;
}
