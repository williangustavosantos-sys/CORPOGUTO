// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://a5be3191825f2710b5547e00933751ed@o4511394950152192.ingest.de.sentry.io/4511394954215504",

  // Erros continuam reportados, mas produção não envia cada navegação, console
  // e replay pelo tunnel. Isso evita 429 do próprio monitoramento no navegador e
  // reduz a superfície de dados de saúde enviada a um terceiro.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 1,
  enableLogs: false,

  // PII disabled — GUTO handles health data (GDPR Art. 9); Sentry is not listed as sub-processor.
  sendDefaultPii: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
