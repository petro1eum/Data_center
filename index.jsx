import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './src/App'; // Adjust the path if necessary
import './src/index.css'; // Импортируем CSS файл
// import './index.css'; // If you have a CSS file

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error("Failed to find the root element");
}