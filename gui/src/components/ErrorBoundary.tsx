/**
 * ErrorBoundary - Catches React errors and displays useful info
 */

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('React Error Boundary caught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex-1 flex items-center justify-center bg-gray-900 p-8">
          <div className="max-w-2xl w-full bg-red-900/20 border border-red-500/30 rounded-xl p-6">
            <h2 className="text-xl font-bold text-red-400 mb-4">Something went wrong</h2>
            
            <div className="bg-gray-900 rounded-lg p-4 mb-4 overflow-auto max-h-64">
              <p className="text-red-300 font-mono text-sm mb-2">
                {this.state.error?.message || 'Unknown error'}
              </p>
              {this.state.error?.stack && (
                <pre className="text-gray-400 font-mono text-xs whitespace-pre-wrap">
                  {this.state.error.stack}
                </pre>
              )}
            </div>

            {this.state.errorInfo && (
              <div className="bg-gray-900 rounded-lg p-4 mb-4 overflow-auto max-h-48">
                <p className="text-gray-500 text-sm mb-2">Component Stack:</p>
                <pre className="text-gray-400 font-mono text-xs whitespace-pre-wrap">
                  {this.state.errorInfo.componentStack}
                </pre>
              </div>
            )}

            <button
              onClick={() => {
                this.setState({ hasError: false, error: null, errorInfo: null });
                window.location.reload();
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition-colors"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
