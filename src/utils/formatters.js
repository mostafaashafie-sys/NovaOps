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

export const getCoverColor = (value) => {
  if (value === null || value === undefined) return '#e5e7eb';
  if (value < 2) return '#ef4444';
  if (value < 3) return '#f59e0b';
  if (value < 4) return '#22c55e';
  return '#3b82f6';
};

export const getCoverTextColor = (value) => {
  return 'white';
};

export const getStatusColor = (status) => {
  const colors = {
    'Draft': { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' },
    'Submitted': { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
    'Approved': { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
    'Rejected': { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
    'Confirmed': { bg: '#cffafe', text: '#155e75', border: '#67e8f9' },
    'Shipped': { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc' },
    'Received': { bg: '#dcfce7', text: '#166534', border: '#86efac' },
    'In Transit': { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
    'Delivered': { bg: '#dcfce7', text: '#166534', border: '#86efac' },
    'Allocated': { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc' },
  };
  return colors[status] || { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' };
};

