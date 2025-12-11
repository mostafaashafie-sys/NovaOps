/**
 * Formatting Utilities
 * Centralized formatting functions for numbers, dates, and other data types
 */

export const formatNumber = (num) => {
  if (num === null || num === undefined) return '—';
  return Math.round(num).toLocaleString();
};

export const formatCover = (num) => {
  if (num === null || num === undefined) return '—';
  return num.toFixed(1);
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  });
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-GB', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric',
    hour: '2-digit', 
    minute: '2-digit'
  });
};

import { UI } from '@/config/app.constants.js';

export const getCoverColor = (value) => {
  if (value === null || value === undefined) return '#e5e7eb';
  if (value < 1) return UI.COLORS.COVER.LOW;      // Red (< 1 month)
  if (value < 3) return UI.COLORS.COVER.MEDIUM;  // Orange (1-3 months)
  if (value < 6) return UI.COLORS.COVER.GOOD;    // Green (3-6 months)
  return UI.COLORS.COVER.HIGH;                    // Blue (> 6 months)
};

export const getCoverTextColor = (value) => {
  return 'white';
};

export const getStatusColor = (status) => {
  const colors = {
    // Order Item Statuses
    'Forecasted': { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' },
    'Planned': { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
    'Pending Regulatory': { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
    'Regulatory Approved': { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
    'Order Approved': { bg: '#a7f3d0', text: '#047857', border: '#34d399' }, // Darker green for CFO approval
    'Back Order': { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc' },
    'Allocated to Market': { bg: '#cffafe', text: '#155e75', border: '#67e8f9' },
    'Shipped to Market': { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc' },
    'Arrived to Market': { bg: '#dcfce7', text: '#166534', border: '#86efac' },
    'Deleted': { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
    
    // PO Statuses
    'Draft': { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' },
    'Pending CFO Approval': { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
    'CFO Approved': { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
    'Confirmed to UP': { bg: '#cffafe', text: '#155e75', border: '#67e8f9' },
    'Completed': { bg: '#dcfce7', text: '#166534', border: '#86efac' }, // Dark Green
    // Shipment statuses
    'Shipped to Market': { bg: '#e0e7ff', text: '#4338ca', border: '#a5b4fc' }, // Indigo
    'Arrived to Market': { bg: '#dcfce7', text: '#166534', border: '#86efac' }, // Dark Green
    
    // Legacy/Other Statuses (for backward compatibility)
    'Submitted': { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
    'Approved': { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
    'Rejected': { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
    'Confirmed': { bg: '#cffafe', text: '#155e75', border: '#67e8f9' },
    'Shipped': { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc' },
    'Received': { bg: '#dcfce7', text: '#166534', border: '#86efac' },
    'In Transit': { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
    'Delivered': { bg: '#dcfce7', text: '#166534', border: '#86efac' },
    'Allocated': { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc' },
    'Partially Allocated': { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc' },
    'Fully Allocated': { bg: '#cffafe', text: '#155e75', border: '#67e8f9' },
  };
  return colors[status] || { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' };
};

