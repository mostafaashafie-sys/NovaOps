import React from 'react';

/**
 * Modern Toggle Button Component
 * Replaces checkboxes with a more modern button-style toggle
 */
export const ToggleButton = ({
  label,
  checked,
  onChange,
  icon,
  variant = 'default',
  size = 'md',
  className = '',
  disabled = false,
  ...props
}) => {
  const variants = {
    default: checked
      ? 'bg-blue-600 text-white border-blue-600 shadow-md'
      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
    success: checked
      ? 'bg-green-600 text-white border-green-600 shadow-md'
      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
    primary: checked
      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-5 py-3 text-base',
  };

  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`
        inline-flex items-center gap-2
        font-semibold rounded-xl
        border-2 transition-all duration-200
        focus:outline-none focus:ring-4 focus:ring-blue-500/20
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      {...props}
    >
      {checked && (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      )}
      {!checked && icon && (
        <span className="text-lg">{icon}</span>
      )}
      {label}
    </button>
  );
};

export default ToggleButton;

