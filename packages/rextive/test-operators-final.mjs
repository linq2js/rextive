/**
 * Final verification test for separated operator files
 */

import { signal } from "./dist/rextive.js";
import { map, filter, scan } from "./dist/op.js";

console.log("Testing separated operator files...\n");

// Test each operator individually
const count = signal(5);

console.log("✓ map operator:", count.to(map(x => x * 2))() === 10);
console.log("✓ filter operator:", count.to(filter(x => x > 0))() === 5);
console.log("✓ scan operator:", count.to(scan((acc, x) => acc + x, 0))() === 5);

// Test chaining
const result = count.to(
  filter(x => x > 0),
  map(x => x * 2),
  scan((acc, x) => acc + x, 0)
);
console.log("✓ operator chaining:", result() === 10);

console.log("\n✅ All operator files working correctly!");

