/**
 * UTILS: Normalization
 * 
 * Shared deterministic string normalizers for Business Intelligence Engines.
 * Ensures consistent matching across disparate inputs (e.g., " PANEER " === "paneer").
 */

export const Normalization = {
  /**
   * Normalizes category and product strings for strict equivalence matching.
   * @param {string} text 
   * @returns {string} lowercased, trimmed string
   */
  normalizeText: (text) => {
    if (!text || typeof text !== 'string') return '';
    return text.trim().toLowerCase();
  },

  /**
   * Derives stock status dynamically based on quantitative stock.
   * Matches APP_CONSTANTS logic exactly.
   * @param {number} quantity 
   * @returns {string} 'Available', 'Low Stock', 'Out of Stock'
   */
  deriveStockStatus: (quantity) => {
    const q = Number(quantity);
    if (isNaN(q) || q <= 0) return 'Out of Stock';
    if (q <= 10) return 'Low Stock';
    return 'Available';
  }
};
