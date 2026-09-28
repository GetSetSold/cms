/** True if a hex color is dark enough to need light text on it — actual
 *  relative-luminance math, not a guess, so a custom color picker gets
 *  readable text automatically instead of assuming every color is light. */
export function isDarkColor(hex?: string): boolean {
  if (!hex) return false;
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}
