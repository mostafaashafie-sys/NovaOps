
/**
 * Action Button Component
 * Large action button with icon, title, and description
 * Used in action lists and quick action panels
 */
export const ActionButton = ({
  onClick,
  icon,
  title,
  description,
  variant = 'primary',
  disabled = false,
  className = '',
  ...props
}) => {
  const variants = {
    primary: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    success: 'bg-green-50 hover:bg-green-100 border-green-200',
    warning: 'bg-amber-50 hover:bg-amber-100 border-amber-200',
    danger: 'bg-red-50 hover:bg-red-100 border-red-200',
    purple: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
    gray: 'bg-gray-50 hover:bg-gray-100 border-gray-200'
  };
  
  const iconColors = {
    primary: 'bg-blue-600',
    success: 'bg-green-600',
    warning: 'bg-amber-600',
    danger: 'bg-red-600',
    purple: 'bg-purple-600',
    gray: 'bg-gray-600'
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full px-4 py-3 rounded-xl text-left transition-all border ${
        variants[variant]
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      {...props}
    >
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-lg ${iconColors[variant]} flex items-center justify-center text-white text-xl flex-shrink-0`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900">{title}</p>
          {description && (
            <p className="text-sm text-gray-600 mt-0.5">{description}</p>
          )}
        </div>
      </div>
    </button>
  );
};

export default ActionButton;

