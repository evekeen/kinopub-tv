import { Component, ReactNode, ReactElement, ErrorInfo, memo } from 'react';
import styles from './ErrorBoundary.module.css';

interface ErrorBoundaryProps {
  children: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo): void {}

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' && this.state.hasError) {
      this.props.onReset?.();
      this.setState({ hasError: false, error: null });
    }
  };

  componentDidMount(): void {
    if (this.state.hasError) {
      window.addEventListener('keydown', this.handleKeyDown);
    }
  }

  componentDidUpdate(_prevProps: ErrorBoundaryProps, prevState: ErrorBoundaryState): void {
    if (!prevState.hasError && this.state.hasError) {
      window.addEventListener('keydown', this.handleKeyDown);
    } else if (prevState.hasError && !this.state.hasError) {
      window.removeEventListener('keydown', this.handleKeyDown);
    }
  }

  componentWillUnmount(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}

const ErrorFallback = memo(function ErrorFallback(): ReactElement {
  return (
    <div className={styles.container}>
      <div className={styles.icon}>!</div>
      <h1 className={styles.title}>Something went wrong</h1>
      <p className={styles.message}>An unexpected error occurred.</p>
      <p className={styles.hint}>Press Enter to retry</p>
    </div>
  );
});
