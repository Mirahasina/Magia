/**
 * Typed wrappers around localStorage.
 * Use these instead of bare localStorage.getItem/setItem with magic strings.
 */

const KEYS = {
  ACCESS_TOKEN: "access_token",
  REFRESH_TOKEN: "refresh_token",
  CURRENT_VIEW: "current_view",
  ACTIVE_TAB: "active_tab",
  BACKOFFICE_TAB: "backoffice_tab",
  BACKOFFICE_MODE: "backoffice_mode",
} as const;

export const StorageKeys = KEYS;

export const getToken = (): string | null =>
  localStorage.getItem(KEYS.ACCESS_TOKEN);

export const clearSession = (): void => {
  localStorage.removeItem(KEYS.ACCESS_TOKEN);
  localStorage.removeItem(KEYS.REFRESH_TOKEN);
  localStorage.removeItem(KEYS.CURRENT_VIEW);
  localStorage.removeItem(KEYS.ACTIVE_TAB);
  localStorage.removeItem(KEYS.BACKOFFICE_TAB);
};
