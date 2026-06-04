/**
 * Centralised API configuration.
 * All fetch calls must reference these helpers — never hardcode the base URL.
 */

export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

/** Returns Authorization + Content-Type headers for authenticated JSON requests. */
export function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("access_token");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

/** Returns only the Authorization header (for multipart/form-data requests). */
export function getAuthHeadersOnly(): HeadersInit {
  const token = localStorage.getItem("access_token");
  return { Authorization: `Bearer ${token}` };
}
