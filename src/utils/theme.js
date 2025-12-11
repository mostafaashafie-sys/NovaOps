import { UI } from '@/config/app.constants.js';

/**
 * Theme Utilities
 * Maps global color constants to Tailwind classes and provides theme helpers
 */

/**
 * Get Tailwind classes for status colors
 */
export const getStatusClasses = (status) => {
  const statusMap = {
    'Draft': { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
    'Planned': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
    'Pending': { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
    'Pending Regulatory': { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
    'Approved': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
    'Regulatory Approved': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
    'Order Approved': { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
    'Confirmed': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
    'Confirmed to UP': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
    'Shipped': { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-300' },
    'Shipped to Market': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
    'Completed': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
    'Back Order': { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
    'Allocated to Market': { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-300' },
    'Arrived to Market': { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
    'Deleted': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
    'Error': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  };
  
  return statusMap[status] || statusMap['Draft'];
};

/**
 * Get Tailwind classes for cover levels
 * Uses semantic names that map to UI.COLORS.COVER constants
 */
export const getCoverClasses = (value) => {
  if (value === null || value === undefined) {
    return { bg: 'bg-gray-200', text: 'text-gray-600' };
  }
  if (value < 1) {
    // LOW - Red
    return { bg: 'bg-red-500', text: 'text-white' };
  }
  if (value < 3) {
    // MEDIUM - Orange
    return { bg: 'bg-amber-500', text: 'text-white' };
  }
  if (value < 6) {
    // GOOD - Green
    return { bg: 'bg-green-500', text: 'text-white' };
  }
  // HIGH - Blue
  return { bg: 'bg-blue-500', text: 'text-white' };
};

/**
 * Get primary color classes (for buttons, links, etc.)
 */
export const getPrimaryClasses = (variant = 'default') => {
  const variants = {
    default: 'bg-blue-600 hover:bg-blue-700 text-white',
    light: 'bg-blue-50 hover:bg-blue-100 text-blue-700',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50',
  };
  return variants[variant] || variants.default;
};

/**
 * Get table header classes
 */
export const getTableHeaderClasses = (isCurrent = false, isPast = false) => {
  const base = 'px-3 py-3 text-right font-semibold text-blue-900 min-w-[90px]';
  const current = isCurrent ? 'bg-blue-100 border-l-2 border-blue-500' : 'bg-blue-50';
  const past = isPast ? 'opacity-60' : '';
  return `${base} ${current} ${past}`;
};

/**
 * Get table cell background classes
 */
export const getTableCellBgClasses = (isCurrent = false, isEven = false) => {
  if (isCurrent) return 'bg-blue-50 border-l-2 border-blue-400';
  return isEven ? 'bg-gray-50' : 'bg-white';
};

/**
 * Export color constants for direct use (when inline styles are needed)
 */
export const ThemeColors = {
  status: UI.COLORS.STATUS,
  cover: UI.COLORS.COVER,
};

