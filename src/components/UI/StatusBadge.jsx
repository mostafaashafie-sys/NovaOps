import React from 'react';
import { getStatusColor } from '../utils/formatters.js';

/**
 * Status Badge Component
 * Displays order/status with appropriate styling
 */
export const StatusBadge = ({ status }) => {
  const colors = getStatusColor(status);
  
  return (
    <span 
      className="px-2 py-1 rounded-full text-xs font-medium"
      style={{ 
        backgroundColor: colors.bg, 
        color: colors.text, 
        border: `1px solid ${colors.border}` 
      }}
    >
      {status}
    </span>
  );
};

export default StatusBadge;

