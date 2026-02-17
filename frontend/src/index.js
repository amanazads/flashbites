import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './redux/store';
import App from './App';
import './styles/index.css';

// Log for debugging
console.log('=== FlashBites App Starting ===');
console.log('Environment:', import.meta.env.MODE);
console.log('Root element:', document.getElementById('root'));

// Error handler for uncaught errors
window.addEventListener('error', (event) => {
  console.error('Uncaught error:', event.error);
});

// Error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);

console.log('=== FlashBites App Rendered ===');