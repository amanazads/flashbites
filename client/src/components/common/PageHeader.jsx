import PropTypes from 'prop-types';

const PageHeader = ({ emoji, title, subtitle }) => {
  return (
    <div className="mb-6 animate-fadeIn">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        {title}
      </h1>
      {subtitle && <p className="text-gray-600 text-sm">{subtitle}</p>}
    </div>
  );
};

PageHeader.propTypes = {
  emoji: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string
};

export default PageHeader;
