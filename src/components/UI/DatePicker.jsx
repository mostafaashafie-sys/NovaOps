import React from 'react';
import { DatePicker as AntDatePicker } from 'antd';
import dayjs from 'dayjs';

/**
 * Modern Date Picker Component (Ant Design-based)
 * Enhanced date input with better styling and UX
 */
export const DatePicker = ({
  value,
  onChange,
  label,
  required = false,
  min,
  max,
  placeholder = 'Select date',
  className = '',
  error,
  helperText,
  disabled = false,
  ...props
}) => {
  // Convert string value to dayjs object for Ant Design
  const dateValue = React.useMemo(() => {
    if (!value) return null;
    return dayjs(value);
  }, [value]);

  const handleChange = (date) => {
    if (!date) {
      onChange('');
      return;
    }
    // Convert dayjs to YYYY-MM-DD format for compatibility
    onChange(date.format('YYYY-MM-DD'));
  };

  // Convert min/max strings to dayjs objects
  const minDate = min ? dayjs(min) : undefined;
  const maxDate = max ? dayjs(max) : undefined;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <AntDatePicker
        value={dateValue}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        minDate={minDate}
        maxDate={maxDate}
        status={error ? 'error' : undefined}
        className="w-full"
        size="large"
        format="YYYY-MM-DD"
        {...props}
      />
      
      {error && (
        <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p className="mt-1.5 text-xs text-gray-500">{helperText}</p>
      )}
    </div>
  );
};

export default DatePicker;
