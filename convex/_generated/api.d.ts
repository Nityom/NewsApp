/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as articleCleanup from "../articleCleanup.js";
import type * as articleCleanupData from "../articleCleanupData.js";
import type * as articles from "../articles.js";
import type * as authUtils from "../authUtils.js";
import type * as cashfree from "../cashfree.js";
import type * as cashfreeData from "../cashfreeData.js";
import type * as crons from "../crons.js";
import type * as helpers from "../helpers.js";
import type * as http from "../http.js";
import type * as notificationActions from "../notificationActions.js";
import type * as notifications from "../notifications.js";
import type * as payments from "../payments.js";
import type * as reporters from "../reporters.js";
import type * as settings from "../settings.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  articleCleanup: typeof articleCleanup;
  articleCleanupData: typeof articleCleanupData;
  articles: typeof articles;
  authUtils: typeof authUtils;
  cashfree: typeof cashfree;
  cashfreeData: typeof cashfreeData;
  crons: typeof crons;
  helpers: typeof helpers;
  http: typeof http;
  notificationActions: typeof notificationActions;
  notifications: typeof notifications;
  payments: typeof payments;
  reporters: typeof reporters;
  settings: typeof settings;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
