import { Component } from 'react';
import { Link } from 'react-router-dom';
import Button from './ui/Button';
import Logo from './Logo';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-accent flex items-center justify-center p-4">
          <div className="card max-w-md text-center">
            <Logo className="justify-center mb-6" />
            <h1 className="font-display text-2xl font-bold text-primary mb-2">Something went wrong</h1>
            <p className="text-text-secondary mb-6">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => window.location.reload()}>Refresh Page</Button>
              <Link to="/landing"><Button variant="outline">Go Home</Button></Link>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
