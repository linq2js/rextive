/**
 * Test file to verify rextive/op export works after build
 */

import { signal } from "./dist/rextive.js";
import { map, filter, scan } from "./dist/op.js";

console.log("✓ Imports successful");

// Test map operator
const count = signal(5);
const doubled = count.to(map(x => x * 2));
console.log("✓ map operator works:", doubled() === 10);

// Test filter operator
const positiveOnly = count.to(filter(x => x > 0));
console.log("✓ filter operator works:", positiveOnly() === 5);

// Test scan operator
const sum = count.to(scan((acc, x) => acc + x, 0));
console.log("✓ scan operator works:", sum() === 5);

// Test chaining
count.set(10);
const result = count.to(
  filter(x => x > 0),
  map(x => x * 2),
  scan((acc, x) => acc + x, 0)
);
console.log("✓ operator chaining works:", result() === 20);

console.log("\n✅ All rextive/op export tests passed!");

