import { Button as AntButton } from 'antd';

/**
 * Button Component
 * Reusable button with variants and sizes using Ant Design
 * Maintains same API as custom Button for backward compatibility
 */
export const Button = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  className = '',
  ...props
}) => {
  // Map custom variants to Ant Design types
  const typeMap = {
    primary: 'primary',
    secondary: 'default',
    success: 'primary', // Ant Design doesn't have success, use primary with custom class
    danger: 'primary', // Ant Design doesn't have danger, use primary with custom class
    warning: 'primary', // Ant Design doesn't have warning, use primary with custom class
    outline: 'default',
    ghost: 'text',
    gradient: 'primary'
  };
  
  // Map custom sizes to Ant Design sizes
  const sizeMap = {
    xs: 'small',
    sm: 'small',
    md: 'middle',
    lg: 'large',
    xl: 'large'
  };
  
  // Custom classes for variants Ant Design doesn't support
  const variantClasses = {
    success: 'ant-btn-success',
    danger: 'ant-btn-danger',
    warning: 'ant-btn-warning',
    gradient: 'ant-btn-gradient'
  };
  
  const antType = typeMap[variant] || 'default';
  const antSize = sizeMap[size] || 'middle';
  const variantClass = variantClasses[variant] || '';
  
  return (
    <AntButton
      type={antType}
      size={antSize}
      onClick={onClick}
      disabled={disabled}
      loading={loading}
      block={fullWidth}
      icon={icon}
      htmlType={type}
      className={`${variantClass} ${className}`}
      {...props}
    >
      {children}
    </AntButton>
  );
};

export default Button;

