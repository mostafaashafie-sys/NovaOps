import Button from './Button.jsx';

/**
 * Empty State Component
 * Displays empty state message with optional action
 */
export const EmptyState = ({
  icon = '📋',
  title,
  message,
  actionLabel,
  onAction,
  className = ''
}) => {
  return (
    <div className={`text-center py-12 text-gray-500 ${className}`}>
      <div className="text-4xl mb-4">{icon}</div>
      {title && (
        <p className="font-medium text-gray-900 mb-2">{title}</p>
      )}
      {message && (
        <p className="text-sm mb-4">{message}</p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary" size="md">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;

