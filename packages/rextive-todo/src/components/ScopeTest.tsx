/**
 * Test component for useScope signals.
 * Used to test DevTools tracking of component-scoped signals.
 */

import { useState } from "react";
import { signal, rx, useScope } from "rextive/react";

// Child component with useScope signals
function ScopedCounter({ id }: { id: string }) {
  const { count, doubled, increment, decrement } = useScope(() => {
    const count = signal(0, { name: `scopedCount-${id}` });
    const doubled = signal({ count }, ({ deps }) => deps.count * 2, {
      name: `scopedDoubled-${id}`,
    });

    return {
      count,
      doubled,
      increment: () => count.set((c) => c + 1),
      decrement: () => count.set((c) => c - 1),
      dispose: [count, doubled],
    };
  });

  return (
    <div
      style={{
        padding: "12px",
        backgroundColor: "#16213e",
        borderRadius: "8px",
        marginBottom: "8px",
      }}
    >
      <div style={{ fontSize: "12px", color: "#8892b0", marginBottom: "8px" }}>
        Instance #{id}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button
          onClick={decrement}
          style={{
            padding: "4px 12px",
            backgroundColor: "#e94560",
            border: "none",
            borderRadius: "4px",
            color: "white",
            cursor: "pointer",
          }}
        >
          -
        </button>
        <span style={{ minWidth: "60px", textAlign: "center" }}>
          {rx(count)} (×2 = {rx(doubled)})
        </span>
        <button
          onClick={increment}
          style={{
            padding: "4px 12px",
            backgroundColor: "#4ecca3",
            border: "none",
            borderRadius: "4px",
            color: "white",
            cursor: "pointer",
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}

// Parent component that controls mounting/unmounting
export function ScopeTest() {
  const [instances, setInstances] = useState<string[]>([]);

  const addInstance = () => {
    setInstances((prev) => [
      ...prev,
      Math.random().toString(36).substring(2, 15),
    ]);
  };

  const removeInstance = (id: string) => {
    setInstances((prev) => prev.filter((i) => i !== id));
  };

  const removeAll = () => {
    setInstances([]);
  };

  return (
    <div
      style={{
        padding: "16px",
        backgroundColor: "#1a1a2e",
        borderRadius: "12px",
        marginTop: "16px",
        border: "1px solid #2a2a4a",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
      >
        <h3 style={{ margin: 0, fontSize: "14px", color: "#eaeaea" }}>
          🧪 useScope Test
        </h3>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={addInstance}
            style={{
              padding: "6px 12px",
              backgroundColor: "#4ecca3",
              border: "none",
              borderRadius: "6px",
              color: "white",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            + Add Instance
          </button>
          {instances.length > 0 && (
            <button
              onClick={removeAll}
              style={{
                padding: "6px 12px",
                backgroundColor: "#e94560",
                border: "none",
                borderRadius: "6px",
                color: "white",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              Remove All
            </button>
          )}
        </div>
      </div>

      <div style={{ fontSize: "11px", color: "#5a6987", marginBottom: "12px" }}>
        Each instance creates 2 signals (count + doubled). Watch DevTools to see
        signals created/disposed when mounting/unmounting.
      </div>

      {instances.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "24px",
            color: "#5a6987",
            fontSize: "12px",
          }}
        >
          Click "+ Add Instance" to create scoped signals
        </div>
      ) : (
        instances.map((id) => (
          <div key={id} style={{ position: "relative" }}>
            <ScopedCounter id={id} />
            <button
              onClick={() => removeInstance(id)}
              style={{
                position: "absolute",
                top: "8px",
                right: "8px",
                padding: "2px 8px",
                backgroundColor: "transparent",
                border: "1px solid #e94560",
                borderRadius: "4px",
                color: "#e94560",
                cursor: "pointer",
                fontSize: "10px",
              }}
            >
              ✕ Remove
            </button>
          </div>
        ))
      )}
    </div>
  );
}
