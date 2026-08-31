/**
 * 错误边界组件
 * 全局捕获 React 渲染错误，提供优雅的错误页面和恢复选项
 */

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      errorInfo,
    });

    // 调用自定义错误回调
    this.props.onError?.(error, errorInfo);

    // 生产环境下可以发送错误到监控服务
    if (import.meta.env.PROD) {
      this.reportError(error, errorInfo);
    }

    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  private reportError(error: Error, errorInfo: ErrorInfo) {
    // 发送错误到后端监控
    try {
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {}); // 静默失败
    } catch {
      // 静默失败
    }
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义 fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 默认错误页面
      return (
        <div className="min-h-screen bg-noc-bg flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-noc-card border border-noc-border rounded-lg p-6 text-center">
            {/* 错误图标 */}
            <div className="mx-auto w-16 h-16 bg-noc-red/10 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-noc-red" />
            </div>

            {/* 错误标题 */}
            <h1 className="text-xl font-bold text-noc-text mb-2">
              系统错误
            </h1>

            {/* 错误描述 */}
            <p className="text-noc-text-muted mb-2">
              抱歉，应用遇到了意外错误。您可以尝试以下操作：
            </p>

            {/* 错误详情（仅开发环境显示） */}
            {import.meta.env.DEV && this.state.error && (
              <div className="mb-4 p-3 bg-noc-bg rounded text-left text-xs text-noc-text-muted font-mono overflow-auto max-h-32">
                <p className="text-noc-red font-bold mb-1">
                  {this.state.error.name}: {this.state.error.message}
                </p>
                {this.state.error.stack && (
                  <pre className="whitespace-pre-wrap break-all">
                    {this.state.error.stack.split('\n').slice(1, 4).join('\n')}
                  </pre>
                )}
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-noc-blue text-white rounded-md hover:bg-noc-blue/80 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                重试
              </button>
              <button
                onClick={this.handleReload}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-noc-card border border-noc-border text-noc-text rounded-md hover:bg-noc-bg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                刷新页面
              </button>
              <button
                onClick={this.handleGoHome}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-noc-card border border-noc-border text-noc-text rounded-md hover:bg-noc-bg transition-colors"
              >
                <Home className="w-4 h-4" />
                返回首页
              </button>
            </div>

            {/* 错误 ID（用于联系支持） */}
            <p className="mt-4 text-xs text-noc-text-muted">
              错误时间: {new Date().toLocaleString('zh-CN')}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * 函数式组件包装，便于在 React 函数组件中使用
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
) {
  const WithErrorBoundary = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundary.displayName = `withErrorBoundary(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`;

  return WithErrorBoundary;
}
