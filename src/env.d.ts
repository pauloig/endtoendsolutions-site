/// <reference types="astro/client" />

declare global {
  interface Window {
    /** Expuesta por GoogleAnalytics.astro; carga GA4 solo tras consentimiento. */
    __e2eLoadGA?: () => void;
  }
}

export {};