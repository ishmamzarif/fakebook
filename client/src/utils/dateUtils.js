/**
 * Centralized date utilities to handle UTC timestamps from the database consistently
 * across different timezones and components.
 */

/**
 * Parses a timestamp value from the database. 
 * Database timestamps (TIMESTAMP without time zone) are treated as UTC.
 */
export const parseTimestamp = (value) => {
  if (!value) return null;
  
  let d = null;
  // If it's already a Date instance, use it.
  if (value instanceof Date) {
    d = Number.isNaN(value.getTime()) ? null : new Date(value);
  } else {
    const s = String(value).trim();
    if (!s) return null;

    // If it's an ISO string (contains T and ends with Z), use it.
    if (s.includes("T") && (s.endsWith("Z") || /[+-]\d\d(:\d\d)?$/.test(s))) {
      d = new Date(s);
    } 
    // If it's a Postgres-like timestamp string (YYYY-MM-DD HH:MM:SS)
    // or already has Z/+-offset, parse it carefully.
    else if (s.endsWith("Z") || /[+-]\d\d(:\d\d)?$/.test(s)) {
      d = new Date(s);
    } else {
      // If no timezone info, treat as UTC by converting to ISO and appending Z.
      const isoLike = s.replace(" ", "T");
      d = new Date(`${isoLike}Z`);
    }
  }

  if (!d || Number.isNaN(d.getTime())) return null;

  /**
   * MANUAL OFFSET FIX: 
   * The server is currently storing timestamps 6 hours behind UTC.
   * We apply a 6-hour correction here to align them with the real UTC time.
   */
  const CORRECTED_OFFSET_MS = 6 * 60 * 60 * 1000;
  return new Date(d.getTime() + CORRECTED_OFFSET_MS);
};

/**
 * Returns a "time ago" string (e.g., "5m ago", "just now").
 */
export const formatTimeAgo = (value) => {
  const d = parseTimestamp(value);
  if (!d) return "";

  let diffMs = Date.now() - d.getTime();
  if (diffMs < 0) diffMs = 0;

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(days / 365);
  return `${years}y ago`;
};

/**
 * Returns a "time left" string for expiring content (e.g., stories).
 */
export const formatExpiry = (value) => {
  const d = parseTimestamp(value);
  if (!d) return "";

  const diff = d.getTime() - Date.now();
  if (diff <= 0) return "expired";

  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
};

/**
 * Returns a localized date string (e.g., "Oct 12").
 */
export const formatDateShort = (value) => {
  const d = parseTimestamp(value);
  if (!d) return "";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
};

/**
 * Returns a localized time string (e.g., "12:30 PM").
 */
export const formatTimeShort = (value) => {
  const d = parseTimestamp(value);
  if (!d) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};
