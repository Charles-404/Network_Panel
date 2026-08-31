import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ToastContainer } from './components/common/Toast';
import { reportError } from './lib/errorHandler';
import './styles/globals.css';

// 全局错误处理
function handleError(error: Error, errorInfo: React.ErrorInfo) {
  reportError(error, {
    componentStack: errorInfo.componentStack,
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary onError={handleError}>
      <App />
      <ToastContainer />
    </ErrorBoundary>
  </React.StrictMode>
);
