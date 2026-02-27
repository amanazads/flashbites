import PropTypes from 'prop-types';

const StatCard = ({ emoji, value, label, hoverable = true }) => {
  return (
    <div className={`
      bg-white rounded-lg shadow-sm p-4 
      text-center border border-gray-200
      ${hoverable ? 'hover:shadow-md hover:border-gray-300 transition-all duration-200' : ''}
    `}>
      <div className="text-2xl mb-2 text-gray-600">{emoji}</div>
      <p className="text-2xl font-bold text-gray-900 mb-1">
        {value}
      </p>
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
    </div>
  );
};

StatCard.propTypes = {
  emoji: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  label: PropTypes.string.isRequired,
  hoverable: PropTypes.bool
};

export default StatCard;
