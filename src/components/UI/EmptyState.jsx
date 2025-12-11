import { Empty as AntEmpty } from 'antd';
import Button from './Button.jsx';

/**
 * Empty State Component
 * Displays empty state message with optional action using Ant Design Empty
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
    <div className={className}>
      <AntEmpty
        image={null}
        description={
          <div className="text-center">
            {icon && <div className="text-4xl mb-2">{icon}</div>}
            {title && <p className="font-medium text-gray-900 mb-1">{title}</p>}
            {message && <p className="text-sm text-gray-500">{message}</p>}
          </div>
        }
      >
        {actionLabel && onAction && (
          <Button onClick={onAction} variant="primary" size="md">
            {actionLabel}
          </Button>
        )}
      </AntEmpty>
    </div>
  );
};

export default EmptyState;

