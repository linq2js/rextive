import { Component, ReactNode } from "react";
import { orderLogic, checkoutLogic } from "@/logic/checkout";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class OrderErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  handleRetry = () => {
    // Reset error state
    this.setState({ error: null });
    // Reset order and go back to review
    orderLogic().reset();
    checkoutLogic().goToStep("review");
  };

  render() {
    const { error } = this.state;

    if (error) {
      return (
        <div className="text-center py-8">
          {/* Error Icon */}
          <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>

          <h3 className="text-2xl font-bold text-warm-900 mb-2">
            Order Failed
          </h3>
          <p className="text-warm-600 mb-6 max-w-sm mx-auto">
            {error.message || "An unexpected error occurred while processing your order."}
          </p>

          <button
            onClick={this.handleRetry}
            className="btn-primary py-3 px-8"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

