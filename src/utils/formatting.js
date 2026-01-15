/**
 * Formats a numeric value (or string) into a string with thousand separators (dots).
 * e.g. 500000 -> "500.000"
 */
export const formatMoney = (value) => {
    if (!value) return '';
    // Remove non-numeric characters first to ensure clean parsing if needed,
    // though usually we expect a raw number or reasonably clean string.
    const cleanValue = value.toString().replace(/\D/g, '');
    if (!cleanValue) return '';
    // Use regex to add dots as thousand separators
    return cleanValue.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

/**
 * Parses a formatted money string back into a number.
 * e.g. "500.000" -> 500000
 */
export const parseMoney = (value) => {
    if (!value) return 0;
    // Remove all non-numeric characters (including dots)
    const cleanValue = value.toString().replace(/\./g, '');
    return parseInt(cleanValue, 10) || 0;
};
