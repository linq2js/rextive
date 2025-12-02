import { signal, rx } from "rextive/react";
import { Button } from "./Button";

// 🎯 One concept for everything
const count = signal(0, { name: "demo:count" }); // Mutable state
const doubled = count.to((x) => x * 2); // Derived value
const tripled = signal({ count }, ({ deps }) => deps.count * 3, {
  name: "demo:tripled",
}); // Explicit deps
const increment = () => count.set((prev) => prev + 1); // Update signal
const decrement = () => count.set((prev) => prev - 1);
const reset = () => count.reset();

// Auto-increment interval (5 seconds)
const autoIncrement = signal(false, { name: "demo:autoIncrement" });

// Effect signal: runs when autoIncrement changes, schedules refresh every 5 seconds
signal(
  { autoIncrement },
  ({ deps, refresh }) => {
    if (deps.autoIncrement) {
      count.set((prev) => prev + 1); // Increment count
      setTimeout(refresh, 5000); // Schedule next refresh in 5 seconds
    }
  },
  { name: "demo:autoEffect", lazy: false }
);

export function CounterDemo() {
  return (
    <div className="counter-demo">
      <h3>📊 Signal Counter Demo</h3>
      <p className="demo-desc">
        Demonstrates mutable state, derived values, and effect signals with
        auto-refresh
      </p>

      <div className="counter-display">
        <div className="counter-value">
          <span className="label">Count</span>
          <span className="value">{rx(count)}</span>
        </div>
        <div className="counter-value">
          <span className="label">Doubled</span>
          <span className="value derived">{rx(doubled)}</span>
        </div>
        <div className="counter-value">
          <span className="label">Tripled</span>
          <span className="value derived">{rx(tripled)}</span>
        </div>
      </div>

      <div className="counter-controls">
        <Button variant="primary" size="md" onClick={decrement}>
          −
        </Button>
        <Button variant="primary" size="md" onClick={increment}>
          +
        </Button>
        <Button variant="outline" size="md" onClick={reset}>
          Reset
        </Button>
      </div>

      <div className="auto-increment">
        {rx(() => (
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={autoIncrement()}
              onChange={(e) => autoIncrement.set(e.target.checked)}
            />
            <span>Auto-increment every 5s</span>
            {autoIncrement() && <span className="pulse">●</span>}
          </label>
        ))}
      </div>

      <style>{`
        .counter-demo {
          background: #1c2128;
          border-radius: 12px;
          padding: 24px;
          margin-top: 24px;
          border: 1px solid #30363d;
        }
        .counter-demo h3 {
          margin: 0 0 8px 0;
          color: #e0e7ff;
          font-size: 18px;
        }
        .demo-desc {
          margin: 0 0 20px 0;
          color: #a5b4fc;
          font-size: 13px;
        }
        .counter-display {
          display: flex;
          gap: 16px;
          justify-content: center;
          margin-bottom: 20px;
        }
        .counter-value {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 12px;
          padding: 16px 24px;
          text-align: center;
          min-width: 80px;
        }
        .counter-value .label {
          display: block;
          font-size: 11px;
          color: #a5b4fc;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 4px;
        }
        .counter-value .value {
          display: block;
          font-size: 32px;
          font-weight: bold;
          color: #fff;
          font-variant-numeric: tabular-nums;
        }
        .counter-value .value.derived {
          color: #a78bfa;
        }
        .counter-controls {
          display: flex;
          gap: 8px;
          justify-content: center;
          margin-bottom: 16px;
        }
        .auto-increment {
          display: flex;
          justify-content: center;
        }
        .toggle-label {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #c7d2fe;
          font-size: 14px;
          cursor: pointer;
        }
        .toggle-label input {
          width: 18px;
          height: 18px;
          accent-color: #6366f1;
        }
        .pulse {
          color: #34d399;
          animation: pulse 1s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
