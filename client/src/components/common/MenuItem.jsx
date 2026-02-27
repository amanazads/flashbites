import PropTypes from 'prop-types';
import { IoChevronForward } from 'react-icons/io5';

const MenuItem = ({ icon: Icon, label, count, onClick, showBorder = true }) => {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center justify-between p-4 
        hover:bg-gray-50 
        transition-colors duration-150 group
        ${showBorder ? 'border-b border-gray-100' : ''}
      `}
    >
      <div className="flex items-center gap-3">
        <Icon className="text-xl text-gray-600 group-hover:text-orange-500 transition-colors" />
        <span className="font-medium text-gray-900">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {count !== null && count !== undefined && (
          <span className="text-sm font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{count}</span>
        )}
        <IoChevronForward className="text-gray-400 group-hover:text-gray-600 transition-colors" />
      </div>
    </button>
  );
};

MenuItem.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  count: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onClick: PropTypes.func,
  showBorder: PropTypes.bool
};

export default MenuItem;
