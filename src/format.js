/**
 * Format a numeric game value for display.
 *
 * @param {*} v - Value to format.
 * @param {string} [format] - Format specifier:
 *   - `"ms"` — rounds to integer and appends "ms" (e.g. `342.7` → `"343ms"`)
 *   - `"Ndp"` — fixed-point with N decimal places (e.g. `"2dp"` formats `0.1` as `"0.10"`)
 *   - anything else — `String(v)`
 * @returns {string}
 */
export function formatValue(v, format) {
  if (format === "ms") return `${Math.round(v)}ms`;
  const dp = format?.match(/^(\d+)dp$/);
  if (dp) return typeof v === "number" ? v.toFixed(Number(dp[1])) : v;
  return String(v);
}
