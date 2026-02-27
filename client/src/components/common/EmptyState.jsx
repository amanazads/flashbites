import PropTypes from 'prop-types';
import Button from './Button';

const EmptyState = ({ 
  emoji, 
  title, 
  message, 
  actionLabel, 
  onAction,
  actionIcon 
}) => {
  return (
    <div className="text-center py-20 animate-fadeIn">
      <div className="text-6xl mb-4 text-gray-400">{emoji}</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6">{message}</p>
      {actionLabel && onAction && (
        <Button 
          onClick={onAction}
          icon={actionIcon}
          size="lg"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

EmptyState.propTypes = {
  emoji: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
  actionLabel: PropTypes.string,
  onAction: PropTypes.func,
  actionIcon: PropTypes.elementType
};

export default EmptyState;
