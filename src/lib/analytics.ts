export const SITE_NAME = "End to End Solutions";

/**
 * Clave de localStorage donde se guarda la decisión de cookies/analytics.
 * Compartida por el banner de consentimiento y el cargador de GA4 para que
 * ambos componentes lean y escriban exactamente el mismo valor.
 */
export const CONSENT_STORAGE_KEY = "e2e_analytics_consent";

export type ConsentValue = "granted" | "denied";

/**
 * Los Measurement ID de GA4 tienen el formato `G-XXXXXXX`.
 * Devolver `false` evita inyectar un snippet roto cuando la variable de
 * entorno no está definida (por ejemplo, en builds locales).
 */
export function isValidMeasurementId(value: string | undefined): boolean {
  return /^G-[A-Z0-9]{4,}$/i.test((value ?? "").trim());
}