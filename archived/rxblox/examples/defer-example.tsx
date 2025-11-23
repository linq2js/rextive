/**
 * Examples demonstrating the defer() utility for lazy module loading
 */

import { defer, blox, rx } from "rxblox";

// ============================================================================
// Example 1: Async Dynamic Import (Code Splitting)
// ============================================================================

// service.ts (imagine this is a separate file)
export default {
  settings: {
    theme: "dark",
    version: "1.0.0",
  },
  
  doSomething() {
    return "Task completed!";
  },
  
  async fetchData(id: number) {
    const response = await fetch(`/api/data/${id}`);
    return response.json();
  },
};

// app.tsx
const service = defer(() => import("./service"));

// Usage in components
const AsyncExample = blox(() => {
  const handleClick = async () => {
    // Method call - single invocation
    const result = await service.doSomething();
    console.log(result); // "Task completed!"
    
    // Property access
    const settings = await service.settings();
    console.log(settings.theme); // "dark"
    
    // Async method
    const data = await service.fetchData(123);
    console.log(data);
  };
  
  return <button onClick={handleClick}>Load Service</button>;
});

// ============================================================================
// Example 2: Sync Lazy Initialization (Heavy Computations)
// ============================================================================

const heavyComputation = defer(() => {
  console.log("Initializing expensive computation...");
  
  // Expensive initialization only happens on first access
  return {
    largeArray: Array.from({ length: 1000000 }, (_, i) => i),
    
    calculate(x: number) {
      return this.largeArray.reduce((sum, val) => sum + val, 0) * x;
    },
    
    process(data: number[]) {
      return data.map(x => x * 2);
    },
  };
});

const SyncExample = blox(() => {
  const handleClick = () => {
    // First access triggers initialization
    const result = heavyComputation.calculate(2);
    console.log("Result:", result);
    
    // Subsequent access uses cached instance
    const processed = heavyComputation.process([1, 2, 3]);
    console.log("Processed:", processed);
  };
  
  return <button onClick={handleClick}>Run Heavy Computation</button>;
});

// ============================================================================
// Example 3: Lazy Utils/Helpers
// ============================================================================

const mathUtils = defer(() => import("lodash/fp"));

const MathExample = blox(() => {
  const handleClick = async () => {
    // Load lodash only when needed
    const sum = await mathUtils.sum([1, 2, 3, 4]);
    const max = await mathUtils.max([5, 2, 8, 1]);
    
    console.log("Sum:", sum, "Max:", max);
  };
  
  return <button onClick={handleClick}>Calculate</button>;
});

// ============================================================================
// Example 4: Conditional Heavy Features
// ============================================================================

// Only load chart library when user needs it
const chartLib = defer(() => import("chart.js"));

const ChartExample = blox(() => {
  const createChart = async () => {
    // Chart.js only loads when user clicks "Show Chart"
    const Chart = await chartLib.Chart();
    
    const ctx = document.getElementById("myChart") as HTMLCanvasElement;
    new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Red", "Blue", "Yellow"],
        datasets: [{
          label: "My Data",
          data: [12, 19, 3],
        }],
      },
    });
  };
  
  return (
    <div>
      <button onClick={createChart}>Show Chart</button>
      <canvas id="myChart"></canvas>
    </div>
  );
});

// ============================================================================
// Example 5: Lazy Singleton Services
// ============================================================================

const analyticsService = defer(() => ({
  initialized: false,
  
  init(apiKey: string) {
    if (!this.initialized) {
      console.log("Initializing analytics with", apiKey);
      this.initialized = true;
    }
  },
  
  track(event: string, data?: any) {
    console.log("Track:", event, data);
  },
  
  identify(userId: string) {
    console.log("Identify:", userId);
  },
}));

const AnalyticsExample = blox(() => {
  const handleSignup = () => {
    // Service initializes on first use
    analyticsService.init("my-api-key");
    analyticsService.track("user_signup", { plan: "pro" });
    analyticsService.identify("user-123");
  };
  
  return <button onClick={handleSignup}>Sign Up</button>;
});

// ============================================================================
// Example 6: Feature Flags with Lazy Loading
// ============================================================================

const betaFeatures = defer(() => import("./beta-features"));

const FeatureFlagExample = blox(() => {
  const [showBeta, setShowBeta] = React.useState(false);
  
  const handleToggle = async () => {
    if (!showBeta) {
      // Only load beta features when user enables them
      const features = await betaFeatures.default();
      features.enableAll();
    }
    setShowBeta(!showBeta);
  };
  
  return (
    <div>
      <button onClick={handleToggle}>
        {showBeta ? "Disable" : "Enable"} Beta Features
      </button>
      {showBeta && <div>Beta features enabled!</div>}
    </div>
  );
});

// ============================================================================
// Benefits of defer():
// ============================================================================

// ✅ Code splitting - modules loaded on demand
// ✅ Lazy initialization - expensive code runs only when needed
// ✅ Clean API - no .then() chains, single function call
// ✅ Type safety - full TypeScript support
// ✅ Caching - modules/objects loaded once and reused
// ✅ Referential stability - same proxy returned for same import function
// ✅ Auto-detection - handles both sync and async seamlessly

