/**
 * Hardcoded vendor minimum order spend per manufacturerID.
 *
 * TODO: Ask Doc (MarketTime) whether the manufacturer detail endpoint
 * exposes a minimum order amount field. If it does, retire this file
 * and fetch the value from the manufacturers table during sync.
 *
 * Jimmy or Mario can update this map manually until then.
 * Format: { [manufacturerID]: minimumSpendInDollars }
 */
const VENDOR_MINIMUMS = {
  // Example: 'M100001': 500,
  // Add manufacturer IDs and minimum spend amounts here.
};

/**
 * Returns the minimum order spend for a manufacturer, or 0 if none configured.
 */
export const getVendorMinimum = (manufacturerID) =>
  VENDOR_MINIMUMS[manufacturerID] ?? 0;

/**
 * Returns true if the vendor subtotal meets the minimum spend requirement.
 */
export const meetsVendorMinimum = (manufacturerID, subtotal) => {
  const minimum = getVendorMinimum(manufacturerID);
  return minimum === 0 || subtotal >= minimum;
};

export default VENDOR_MINIMUMS;
