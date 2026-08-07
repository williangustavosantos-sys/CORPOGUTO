// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://a5be3191825f2710b5547e00933751ed@o4511394950152192.ingest.de.sentry.io/4511394954215504",

  // Closed beta: keep production telemetry limited to error monitoring.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0 : 1,
  enableLogs: false,

  // Console messages can contain user or health context and must not be
  // attached to error events as breadcrumbs.
  beforeBreadcrumb(breadcrumb) {
    return breadcrumb.category === "console" ? null : breadcrumb;
  },

  // PII disabled — GUTO handles health data (GDPR Art. 9); Sentry is not listed as sub-processor.
  sendDefaultPii: false,
});
