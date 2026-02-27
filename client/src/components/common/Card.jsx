import PropTypes from 'prop-types';

const Card = ({ 
  children, 
  variant = 'default',
  className = '',
  hoverable = false,
  onClick 
}) => {
  const baseClasses = 'bg-white rounded-lg shadow-sm border';
  
  const variants = {
    default: 'border-gray-200',
    danger: 'border-red-200',
    success: 'border-green-200'
  };
  
  const hoverClasses = hoverable 
    ? 'hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer' 
    : '';
  
  return (
    <div
      onClick={onClick}
      className={`${baseClasses} ${variants[variant]} ${hoverClasses} ${className}`}
    >
      {children}
    </div>
  );
};

Card.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['default', 'danger', 'success']),
  className: PropTypes.string,
  hoverable: PropTypes.bool,
  onClick: PropTypes.func
};

export default Card;
