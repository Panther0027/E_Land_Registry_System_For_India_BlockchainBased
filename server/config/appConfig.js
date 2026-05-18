/** When false, demo/in-memory fallbacks are disabled (production + real MongoDB). */
export const isDemoModeEnabled = () =>
  process.env.ENABLE_DEMO_MODE === 'true' || process.env.ENABLE_DEMO_MODE === '1';
