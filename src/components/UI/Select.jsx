import { Select as AntSelect } from 'antd';

/**
 * Select Component
 * Reusable select dropdown with label and error support using Ant Design
 * Maintains same API as custom Select for backward compatibility
 */
export const Select = ({
  label,
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
  required = false,
  disabled = false,
  error,
  helperText,
  className = '',
  ...props
}) => {
  // Convert options to Ant Design format
  const selectOptions = options.map(option => {
    if (typeof option === 'string') {
      return { label: option, value: option };
    }
    return { label: option.label, value: option.value };
  });
  
  // Handle onChange to match native select behavior
  const handleChange = (selectedValue) => {
    if (onChange) {
      // Check if onChange expects an event object (native select) or direct value
      // Try to call with event first, fallback to direct value
      try {
        const event = {
          target: {
            name: name,
            value: selectedValue
          },
          currentTarget: {
            name: name,
            value: selectedValue
          }
        };
        onChange(event);
      } catch (err) {
        // If event format fails, try direct value
        onChange(selectedValue);
      }
    }
  };
  
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <AntSelect
        value={value || undefined}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        options={selectOptions}
        className={className}
        status={error ? 'error' : ''}
        style={{ width: '100%' }}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-xs text-gray-500">{helperText}</p>
      )}
    </div>
  );
};

export default Select;

