import { Component, ReactNode, ErrorInfo } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { Card, CardContent } from './Card';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    // Log error to console in development
    // eslint-disable-next-line no-console
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-[400px] p-8">
          <Card className="max-w-lg w-full">
            <CardContent className="text-center py-8">
              <AlertCircle size={48} className="mx-auto text-error-500 mb-4" />
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Something went wrong
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mb-4">
                An unexpected error occurred. Please try again or refresh the page.
              </p>
              {this.state.error && (
                <p className="text-sm text-error-600 dark:text-error-400 bg-error-50 dark:bg-error-900/20 rounded-lg p-3 mb-4 font-mono">
                  {this.state.error.message}
                </p>
              )}
              <div className="flex gap-3 justify-center">
                <Button variant="primary" icon={<RefreshCw size={16} />} onClick={this.handleReset}>
                  Try Again
                </Button>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Refresh Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
