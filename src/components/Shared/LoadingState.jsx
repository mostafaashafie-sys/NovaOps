import { Spin } from 'antd';

/**
 * Loading State Component
 * Consistent loading indicator using Ant Design Spin
 */
export const LoadingState = ({ message = 'Loading...' }) => {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <Spin size="large" />
        {message && <p className="mt-4 text-gray-600">{message}</p>}
      </div>
    </div>
  );
};

export default LoadingState;

