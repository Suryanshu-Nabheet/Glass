export const APP_BASE_NAME = "Glass";
export const APP_FULL_NAME = "Glass";
export { GLASS_POSITIONING, GLASS_TAGLINE } from "./productVoice";
const isCanaryDesktop =
  typeof window !== "undefined" && window.location?.protocol === "glass-canary:";
export const APP_DISPLAY_NAME = isCanaryDesktop
  ? "Glass Canary"
  : import.meta.env.DEV
    ? `${APP_BASE_NAME} (Dev)`
    : APP_BASE_NAME;
export const APP_VERSION = import.meta.env.APP_VERSION || "0.0.0";
