import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Global error handler to catch React errors
window.onerror = function(msg, url, line, col, error) {
  console.error('GLOBAL ERROR:', msg, 'at', url, 'line', line);
  document.body.innerHTML = '<div style="padding:20px;color:red;font-family:monospace"><h2>App Error</h2><pre>' + msg + '\nat ' + url + ':' + line + '</pre></div>';
  return false;
};

window.onunhandledrejection = function(event) {
  console.error('UNHANDLED PROMISE REJECTION:', event.reason);
  document.body.innerHTML = '<div style="padding:20px;color:red;font-family:monospace"><h2>Promise Error</h2><pre>' + (event.reason?.stack || event.reason) + '</pre></div>';
};

try {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('App mounted successfully');
} catch (err) {
  console.error('Failed to mount app:', err);
  document.body.innerHTML = '<div style="padding:20px;color:red;font-family:monospace"><h2>Mount Error</h2><pre>' + (err?.stack || err) + '</pre></div>';
}
