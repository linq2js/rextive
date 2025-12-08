import { signal, wait, task, rx, useScope } from "rextive/react";
import { Button } from "./Button";

/**
 * Factory function that creates an async signal that may throw
 */
const createMaybeErrorSignal = () => {
  const maybeError = signal(
    async ({ safe }) => {
      // Simulate async operation
      await safe(wait.delay(1000));

      const random = Math.random() * 100;

      if (random > 30) {
        throw new Error("Something went wrong");
      }

      return random;
    },
    { name: "maybeError" }
  );

  return {
    maybeError,
    dispose: maybeError.dispose,
  };
};

/**
 * Error Demo Component
 *
 * Demonstrates:
 * - Using task() for loading/error/success states
 * - Refresh button to retry the operation
 * - Proper async signal error handling pattern
 */
export const ErrorDemo = () => {
  const { maybeError } = useScope(createMaybeErrorSignal);

  return (
    <div className="error-demo">
      <h3>🎲 Error Demo</h3>
      <p className="demo-description">
        This signal has a 50% chance of throwing an error. Click refresh to
        retry.
      </p>

      {rx(() => {
        const state = task.from(maybeError);

        return (
          <div className="demo-content">
            {state.loading && (
              <div className="demo-loading">
                <span className="spinner" />
                Loading...
              </div>
            )}

            {state.error ? (
              <div className="demo-error">
                <span className="error-icon">⚠️</span>
                <span className="error-message">{String(state.error)}</span>
              </div>
            ) : null}

            {state.status === "success" && (
              <div className="demo-success">
                <span className="success-icon">✅</span>
                <span className="success-value">
                  Random value: <strong>{state.value.toFixed(2)}</strong>
                </span>
              </div>
            )}

            <Button
              variant="primary"
              onClick={() => maybeError.refresh()}
              disabled={state.loading}
            >
              {state.loading ? "Loading..." : "🔄 Refresh"}
            </Button>
          </div>
        );
      })}

      <style>{`
        .error-demo {
          background: #1c2128;
          border-radius: 12px;
          padding: 24px;
          margin-top: 24px;
          border: 1px solid #30363d;
        }

        .error-demo h3 {
          margin: 0 0 8px 0;
          color: #e0e7ff;
          font-size: 18px;
        }

        .demo-description {
          margin: 0 0 20px 0;
          color: #a5b4fc;
          font-size: 13px;
        }

        .demo-content {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .demo-loading {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: rgba(99, 102, 241, 0.1);
          border-radius: 8px;
          color: #a5b4fc;
          font-size: 0.9rem;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(165, 180, 252, 0.3);
          border-top-color: #a5b4fc;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .demo-error {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          color: #fca5a5;
          font-size: 0.9rem;
        }

        .error-icon {
          font-size: 1.1rem;
        }

        .demo-success {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: rgba(34, 197, 94, 0.15);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 8px;
          color: #86efac;
          font-size: 0.9rem;
        }

        .success-icon {
          font-size: 1.1rem;
        }

        .success-value strong {
          color: #4ade80;
        }

        .demo-content .btn {
          align-self: flex-start;
        }
      `}</style>
    </div>
  );
};
