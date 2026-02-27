import PropTypes from 'prop-types';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  onClick, 
  className = '',
  icon: Icon,
  fullWidth = false,
  disabled = false 
}) => {
  const baseClasses = 'font-bold rounded-full transition-all duration-200 flex items-center justify-center gap-2';
  
  const variants = {
    primary: 'bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700 shadow-sm hover:shadow-md',
    secondary: 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100 shadow-sm',
    danger: 'bg-white border border-red-200 text-red-600 hover:bg-red-50 active:bg-red-100',
    ghost: 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
  };
  
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${baseClasses}
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {Icon && <Icon className="text-xl" />}
      {children}
    </button>
  );
};

Button.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'ghost']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  onClick: PropTypes.func,
  className: PropTypes.string,
  icon: PropTypes.elementType,
  fullWidth: PropTypes.bool,
  disabled: PropTypes.bool
};

export default Button;
