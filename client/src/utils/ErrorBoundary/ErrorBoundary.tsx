import { Component } from "react";
import { ErrorState } from "../../components/ErrorState";
import styles from "./ErrorBoundary.module.css";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return (
          <div data-testid="error-boundary">{this.props.fallback}</div>
        );
      }

      return (
        <div className={styles.container} data-testid="error-boundary">
          <ErrorState
            message={this.state.error?.message ?? "Something went wrong"}
            onRetry={this.handleRetry}
          />
        </div>
      );
    }

    return this.props.children;
  }
}
