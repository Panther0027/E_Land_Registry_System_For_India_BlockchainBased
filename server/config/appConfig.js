/** When false, demo/in-memory fallbacks are disabled (production + real MongoDB). */
export const isDemoModeEnabled = () =>
  process.env.ENABLE_DEMO_MODE === 'true' || process.env.ENABLE_DEMO_MODE === '1';

/** True when MongoDB is unavailable — use in-memory stores for auth/properties. */
export const isOfflineMode = () => process.env.BHUMI_OFFLINE_MODE === '1';
