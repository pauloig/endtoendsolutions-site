export const SITE_NAME = "End to End Solutions";

/**
 * localStorage key where the cookies/analytics decision is stored.
 * Shared by the consent banner and the GA4 loader so both components read and
 * write exactly the same value.
 */
export const CONSENT_STORAGE_KEY = "e2e_analytics_consent";

export type ConsentValue = "granted" | "denied";

/**
 * GA4 Measurement IDs have the `G-XXXXXXX` format.
 * Returning `false` avoids injecting a broken snippet when the environment
 * variable is undefined (for example, in local builds).
 */
export function isValidMeasurementId(value: string | undefined): boolean {
  return /^G-[A-Z0-9]{4,}$/i.test((value ?? "").trim());
}