/**
 * useLifecycle Hook Examples
 * 
 * Demonstrates fine-grained component lifecycle control with useLifecycle
 */

import React, { useState } from 'react';
import { useLifecycle } from '../src/react/useLifecycle';
import { signal } from '../src/signal';

// ============================================================================
// Example 1: Basic Lifecycle Tracking
// ============================================================================

function LifecycleTracker() {
  const [logs, setLogs] = useState<string[]>([]);

  useLifecycle({
    init: () => {
      setLogs(prev => [...prev, '✨ Init: Component initializing']);
    },
    mount: () => {
      setLogs(prev => [...prev, '🎉 Mount: Component mounted']);
    },
    render: () => {
      setLogs(prev => [...prev, '🔄 Render: Component rendering']);
    },
    cleanup: () => {
      setLogs(prev => [...prev, '🧹 Cleanup: Cleaning up']);
    },
    dispose: () => {
      console.log('💀 Dispose: Component disposed (runs once)');
    },
  });

  return (
    <div>
      <h3>Lifecycle Events:</h3>
      <ul>
        {logs.map((log, i) => (
          <li key={i}>{log}</li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================================
// Example 2: Service Integration
// ============================================================================

class DataService {
  private intervalId?: number;
  data = signal<number>(0);

  start() {
    console.log('🚀 Service started');
    this.intervalId = window.setInterval(() => {
      this.data.set(prev => prev + 1);
    }, 1000);
  }

  stop() {
    console.log('🛑 Service stopped');
    if (this.intervalId !== undefined) {
      clearInterval(this.intervalId);
    }
  }

  dispose() {
    console.log('💀 Service disposed');
    this.stop();
    this.data.dispose();
  }
}

function ServiceComponent() {
  const [service] = useState(() => new DataService());

  useLifecycle({
    mount: () => {
      service.start();
    },
    cleanup: () => {
      service.stop();
    },
    dispose: () => {
      service.dispose();
    },
  });

  return (
    <div>
      <p>Service data: {service.data()}</p>
    </div>
  );
}

// ============================================================================
// Example 3: Analytics Tracking
// ============================================================================

function AnalyticsPage({ pageId }: { pageId: string }) {
  const [viewStartTime] = useState(() => Date.now());

  useLifecycle({
    mount: () => {
      // Track page view
      console.log(`📊 Analytics: Page viewed - ${pageId}`);
      analytics.track('page_view', { pageId });
    },
    dispose: () => {
      // Track page exit with duration
      const duration = Date.now() - viewStartTime;
      console.log(`📊 Analytics: Page exited - ${pageId} (${duration}ms)`);
      analytics.track('page_exit', { pageId, duration });
    },
  });

  return <div>Page: {pageId}</div>;
}

// Mock analytics
const analytics = {
  track: (event: string, data: any) => {
    console.log(`Analytics: ${event}`, data);
  },
};

// ============================================================================
// Example 4: Resource Management
// ============================================================================

function WebSocketComponent({ url }: { url: string }) {
  const [messages, setMessages] = useState<string[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useLifecycle({
    mount: () => {
      const socket = new WebSocket(url);
      
      socket.onopen = () => {
        console.log('🔌 WebSocket connected');
      };
      
      socket.onmessage = (event) => {
        setMessages(prev => [...prev, event.data]);
      };
      
      socket.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };
      
      setWs(socket);
    },
    cleanup: () => {
      // Close connection on unmount
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
        console.log('🔌 WebSocket closed');
      }
    },
  });

  return (
    <div>
      <h3>Messages:</h3>
      <ul>
        {messages.map((msg, i) => (
          <li key={i}>{msg}</li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================================
// Example 5: Global State Registration
// ============================================================================

const globalRegistry = {
  components: new Set<string>(),
  register(id: string) {
    this.components.add(id);
    console.log(`📝 Registered: ${id}`);
  },
  unregister(id: string) {
    this.components.delete(id);
    console.log(`📝 Unregistered: ${id}`);
  },
};

function RegisteredComponent({ id }: { id: string }) {
  useLifecycle({
    init: () => {
      // Register immediately during initialization
      globalRegistry.register(id);
    },
    dispose: () => {
      // Always unregister, even if component errors
      globalRegistry.unregister(id);
    },
  });

  return <div>Component: {id}</div>;
}

// ============================================================================
// Example 6: StrictMode-Safe Cleanup
// ============================================================================

function StrictModeSafeComponent() {
  const [renderCount, setRenderCount] = useState(0);
  const [cleanupCount, setCleanupCount] = useState(0);
  const [disposeCount, setDisposeCount] = useState(0);

  useLifecycle({
    render: () => {
      setRenderCount(prev => prev + 1);
    },
    cleanup: () => {
      // ⚠️ In StrictMode, this may run 2-3 times
      setCleanupCount(prev => prev + 1);
      console.log('🧹 Cleanup called');
    },
    dispose: () => {
      // ✅ This always runs exactly once
      setDisposeCount(prev => prev + 1);
      console.log('💀 Dispose called (once only)');
    },
  });

  return (
    <div>
      <p>Renders: {renderCount}</p>
      <p>Cleanups: {cleanupCount}</p>
      <p>Disposes: {disposeCount}</p>
      <p>💡 In StrictMode, cleanup may run multiple times</p>
    </div>
  );
}

// ============================================================================
// Example 7: Error Handling
// ============================================================================

function ErrorHandlingComponent({ shouldError }: { shouldError: boolean }) {
  useLifecycle({
    init: () => {
      console.log('✨ Init: Setting up');
    },
    mount: () => {
      console.log('🎉 Mount: Mounted successfully');
    },
    dispose: () => {
      console.log('💀 Dispose: Cleaning up (with error protection)');
      // This won't run if component errors before mounting
    },
  });

  if (shouldError) {
    throw new Error('💥 Component error!');
  }

  return <div>No error</div>;
}

// ============================================================================
// Demo App
// ============================================================================

export function UseLifecycleDemo() {
  const [showComponent, setShowComponent] = useState(true);
  const [example, setExample] = useState<string>('tracker');

  const examples = {
    tracker: <LifecycleTracker />,
    service: <ServiceComponent />,
    analytics: <AnalyticsPage pageId="home" />,
    websocket: <WebSocketComponent url="ws://localhost:3000" />,
    registered: <RegisteredComponent id="comp-123" />,
    strictmode: <StrictModeSafeComponent />,
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>useLifecycle Examples</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <label>
          Example:{' '}
          <select value={example} onChange={(e) => setExample(e.target.value)}>
            <option value="tracker">Lifecycle Tracker</option>
            <option value="service">Service Integration</option>
            <option value="analytics">Analytics Tracking</option>
            <option value="websocket">WebSocket</option>
            <option value="registered">Global Registry</option>
            <option value="strictmode">StrictMode Safe</option>
          </select>
        </label>
        
        <button 
          onClick={() => setShowComponent(!showComponent)}
          style={{ marginLeft: '10px' }}
        >
          {showComponent ? 'Unmount' : 'Mount'}
        </button>
      </div>

      {showComponent && examples[example as keyof typeof examples]}
    </div>
  );
}

