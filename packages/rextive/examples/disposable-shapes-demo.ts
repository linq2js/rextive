/**
 * Disposable Shape Comparison Demo
 * 
 * Shows the difference between array shape and object shape
 */

import { disposable } from 'rextive';
import type { Disposable } from 'rextive';

// =============================================================================
// Sample Services
// =============================================================================

class AuthService implements Disposable {
  login(email: string, password: string) {
    console.log('Logging in:', email);
  }

  logout() {
    console.log('Logging out');
  }

  dispose() {
    console.log('AuthService disposed');
  }
}

class ApiService implements Disposable {
  get(path: string) {
    console.log('GET:', path);
  }

  post(path: string, data: any) {
    console.log('POST:', path, data);
  }

  dispose() {
    console.log('ApiService disposed');
  }
}

class StorageService implements Disposable {
  save(key: string, value: any) {
    console.log('Saving:', key, value);
  }

  load(key: string) {
    console.log('Loading:', key);
    return null;
  }

  dispose() {
    console.log('StorageService disposed');
  }
}

// =============================================================================
// Option 1: Object Shape (Recommended)
// =============================================================================

console.log('\n========== Object Shape ==========\n');

const servicesObject = disposable({
  auth: new AuthService(),
  api: new ApiService(),
  storage: new StorageService(),
});

// ✅ Clear, explicit property access
servicesObject.auth.login('user@example.com', 'password');
servicesObject.api.get('/users');
servicesObject.storage.save('token', 'abc123');

// Type inference works perfectly
type ObjectServices = typeof servicesObject;
// ObjectServices = {
//   auth: AuthService;
//   api: ApiService;
//   storage: StorageService;
//   dispose: () => void;
// }

console.log('\nDisposing object shape services...');
servicesObject.dispose();
// Output:
// StorageService disposed
// ApiService disposed
// AuthService disposed
// (LIFO order)

// =============================================================================
// Option 2: Array Shape (Flat API)
// =============================================================================

console.log('\n\n========== Array Shape ==========\n');

const servicesArray = disposable([
  new AuthService(),
  new ApiService(),
  new StorageService(),
]);

// ⚠️ All methods merged into flat object
servicesArray.login('user@example.com', 'password');  // From AuthService
servicesArray.get('/users');  // From ApiService
servicesArray.save('token', 'abc123');  // From StorageService

// Type inference: All methods are merged
type ArrayServices = typeof servicesArray;
// ArrayServices = {
//   login: (email: string, password: string) => void;
//   logout: () => void;
//   get: (path: string) => void;
//   post: (path: string, data: any) => void;
//   save: (key: string, value: any) => void;
//   load: (key: string) => null;
//   dispose: () => void;
// }

console.log('\nDisposing array shape services...');
servicesArray.dispose();
// Output:
// StorageService disposed
// ApiService disposed
// AuthService disposed
// (LIFO order)

// =============================================================================
// Comparison: Object vs Array Shape
// =============================================================================

console.log('\n\n========== Comparison ==========\n');

console.log('Object Shape Benefits:');
console.log('✅ Clear service boundaries (services.auth.login)');
console.log('✅ No naming conflicts possible');
console.log('✅ Better autocomplete & discoverability');
console.log('✅ Easier to understand code structure');
console.log('✅ Better for large applications');

console.log('\nArray Shape Benefits:');
console.log('✅ Flat, concise API (services.login)');
console.log('✅ Good for small, focused services');
console.log('✅ Less verbose for simple use cases');
console.log('⚠️  Requires merge strategy for conflicts');

// =============================================================================
// Use Case Examples
// =============================================================================

console.log('\n\n========== Use Case Examples ==========\n');

// Use Case 1: Large Application (Object Shape)
console.log('Large Application Pattern:');
const appServices = disposable({
  auth: new AuthService(),
  api: new ApiService(),
  storage: new StorageService(),
  // Easy to add more services without conflicts
  // analytics: new AnalyticsService(),
  // notifications: new NotificationService(),
});

console.log('  services.auth.login()');
console.log('  services.api.get()');
console.log('  services.storage.save()');

// Use Case 2: Small Utility (Array Shape)
console.log('\nSmall Utility Pattern:');
const utilServices = disposable([
  { log: (msg: string) => console.log(msg), dispose: () => {} },
  { save: (data: any) => console.log('Saving:', data), dispose: () => {} },
]);

console.log('  utils.log("message")');
console.log('  utils.save(data)');

// Cleanup
appServices.dispose();
utilServices.dispose();

// =============================================================================
// TypeScript Type Safety Demo
// =============================================================================

console.log('\n\n========== Type Safety ==========\n');

// Object shape: Full type safety with property names
const typed = disposable({
  auth: new AuthService(),
  api: new ApiService(),
});

// ✅ TypeScript knows about service properties
typed.auth.login('user@example.com', 'password');  // ✅ OK
typed.api.get('/data');  // ✅ OK
// typed.storage.save();  // ❌ Type error: Property 'storage' does not exist

// Array shape: Merged types
const merged = disposable([
  new AuthService(),
  new ApiService(),
]);

// ✅ TypeScript knows about all methods
merged.login('user@example.com', 'password');  // ✅ OK
merged.get('/data');  // ✅ OK
// merged.storage();  // ❌ Type error: Property 'storage' does not exist

typed.dispose();
merged.dispose();

console.log('\n✅ All examples completed!\n');

