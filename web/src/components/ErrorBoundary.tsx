import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/#/login';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#F7F3EE] flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-red-100 p-3 rounded-xl">
                <AlertTriangle size={32} className="text-red-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Something went wrong</h1>
                <p className="text-sm text-gray-500 mt-1">
                  We encountered an unexpected error. Please try refreshing the page.
                </p>
              </div>
            </div>

            {/* Error Details (only in development) */}
            {import.meta.env.DEV && this.state.error && (
              <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
                <p className="text-xs font-bold text-gray-700 mb-2">Error Details:</p>
                <pre className="text-xs text-red-600 overflow-auto max-h-40">
                  {this.state.error.toString()}
                </pre>
                {this.state.errorInfo && (
                  <pre className="text-xs text-gray-600 overflow-auto max-h-40 mt-2">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={this.handleReload}
                className="flex-1 bg-[#1B6CA8] hover:bg-[#155A8A] text-white py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} />
                Reload Page
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
              >
                <Home size={16} />
                Go to Login
              </button>
            </div>

            {/* Help Text */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                If the problem persists, please contact support or try logging out and back in.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
