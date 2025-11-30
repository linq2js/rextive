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
    };
  });

  return (
    <div
      style={{
        padding: "16px",
        backgroundColor: "rgba(0, 0, 0, 0.3)",
        borderRadius: "12px",
        marginBottom: "8px",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          color: "#a5b4fc",
          marginBottom: "8px",
          textTransform: "uppercase",
          letterSpacing: "1px",
        }}
      >
        Instance #{id}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button
          onClick={decrement}
          style={{
            width: "36px",
            height: "36px",
            backgroundColor: "#6366f1",
            border: "none",
            borderRadius: "8px",
            color: "white",
            cursor: "pointer",
            fontSize: "18px",
          }}
        >
          −
        </button>
        <span style={{ minWidth: "100px", textAlign: "center", color: "#fff" }}>
          {rx(count)}{" "}
          <span style={{ color: "#a78bfa" }}>(×2 = {rx(doubled)})</span>
        </span>
        <button
          onClick={increment}
          style={{
            width: "36px",
            height: "36px",
            backgroundColor: "#6366f1",
            border: "none",
            borderRadius: "8px",
            color: "white",
            cursor: "pointer",
            fontSize: "18px",
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
        background: "#1c2128",
        borderRadius: "12px",
        padding: "24px",
        marginTop: "24px",
        border: "1px solid #30363d",
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
        <h3 style={{ margin: 0, fontSize: "18px", color: "#e0e7ff" }}>
          🧪 useScope Test
        </h3>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={addInstance}
            style={{
              padding: "8px 16px",
              backgroundColor: "#6366f1",
              border: "none",
              borderRadius: "8px",
              color: "white",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            + Add Instance
          </button>
          {instances.length > 0 && (
            <button
              onClick={removeAll}
              style={{
                padding: "8px 16px",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                border: "none",
                borderRadius: "8px",
                color: "#e0e7ff",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              Remove All
            </button>
          )}
        </div>
      </div>

      <div style={{ fontSize: "13px", color: "#a5b4fc", marginBottom: "20px" }}>
        Each instance creates 2 signals (count + doubled). Watch DevTools to see
        signals created/disposed when mounting/unmounting.
      </div>

      {instances.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "24px",
            color: "#a5b4fc",
            fontSize: "13px",
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
