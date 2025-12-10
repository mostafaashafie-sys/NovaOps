import Input from './Input.jsx';
import Select from './Select.jsx';

/**
 * FormField Component
 * Wrapper for form fields with consistent styling
 */
export const FormField = ({
  type = 'text',
  label,
  name,
  value,
  onChange,
  options,
  placeholder,
  required = false,
  disabled = false,
  error,
  helperText,
  className = ''
}) => {
  const commonProps = {
    label,
    name,
    value,
    onChange,
    placeholder,
    required,
    disabled,
    error,
    helperText,
    className
  };
  
  if (type === 'select') {
    return <Select options={options} {...commonProps} />;
  }
  
  return <Input type={type} {...commonProps} />;
};

export default FormField;

