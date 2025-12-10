import React from 'react';

/**
 * Info Card Component
 * Displays key-value pairs in a card format
 * Used for displaying details and information
 */
export const InfoCard = ({
  title,
  icon,
  children,
  className = '',
  headerClassName = '',
  bodyClassName = ''
}) => {
  return (
    <div className={`bg-white rounded-xl p-4 shadow-sm border border-gray-200 ${className}`}>
      {title && (
        <div className={`flex items-center gap-2 mb-4 ${headerClassName}`}>
          {icon && <span className="text-lg">{icon}</span>}
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
      )}
      <div className={bodyClassName}>
        {children}
      </div>
    </div>
  );
};

/**
 * InfoRow Component
 * Single row in InfoCard displaying label and value
 */
export const InfoRow = ({
  label,
  value,
  valueComponent,
  className = '',
  labelClassName = '',
  valueClassName = ''
}) => {
  return (
    <div className={`flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0 ${className}`}>
      <span className={`text-gray-600 ${labelClassName}`}>{label}</span>
      {valueComponent ? (
        <div className={valueClassName}>{valueComponent}</div>
      ) : (
        <span className={`font-semibold text-gray-900 ${valueClassName}`}>{value}</span>
      )}
    </div>
  );
};

export default InfoCard;

