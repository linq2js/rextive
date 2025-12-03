import { test, expect } from '@playwright/test';

test.describe('Counter Demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Scroll to counter demo
    await page.locator('#counter-demo').scrollIntoViewIfNeeded();
    await expect(page.locator('.counter-demo')).toBeVisible();
  });

  test('should display initial counter values', async ({ page }) => {
    const counterDemo = page.locator('.counter-demo');
    
    // Check labels exist (use locator with exact text to avoid duplicates)
    await expect(counterDemo.locator('.label', { hasText: 'Count' })).toBeVisible();
    await expect(counterDemo.locator('.label', { hasText: 'Doubled' })).toBeVisible();
    await expect(counterDemo.locator('.label', { hasText: 'Tripled' })).toBeVisible();
  });

  test('should increment counter', async ({ page }) => {
    const counterDemo = page.locator('.counter-demo');
    const incrementBtn = counterDemo.getByRole('button', { name: '+' });
    
    // Get initial count value
    const countValue = counterDemo.locator('.counter-value').first().locator('.value');
    const initialCount = await countValue.textContent();
    const initial = parseInt(initialCount || '0');
    
    // Click increment
    await incrementBtn.click();
    
    // Count should increase by 1
    await expect(countValue).toHaveText(String(initial + 1));
  });

  test('should decrement counter', async ({ page }) => {
    const counterDemo = page.locator('.counter-demo');
    const incrementBtn = counterDemo.getByRole('button', { name: '+' });
    const decrementBtn = counterDemo.getByRole('button', { name: '−' });
    
    // First increment to ensure we have a positive number
    await incrementBtn.click();
    await incrementBtn.click();
    
    const countValue = counterDemo.locator('.counter-value').first().locator('.value');
    const beforeDecrement = parseInt(await countValue.textContent() || '0');
    
    // Click decrement
    await decrementBtn.click();
    
    // Count should decrease by 1
    await expect(countValue).toHaveText(String(beforeDecrement - 1));
  });

  test('should reset counter', async ({ page }) => {
    const counterDemo = page.locator('.counter-demo');
    const incrementBtn = counterDemo.getByRole('button', { name: '+' });
    const resetBtn = counterDemo.getByRole('button', { name: 'Reset' });
    
    // Increment a few times
    await incrementBtn.click();
    await incrementBtn.click();
    await incrementBtn.click();
    
    // Click reset
    await resetBtn.click();
    
    // Count should be back to 0
    const countValue = counterDemo.locator('.counter-value').first().locator('.value');
    await expect(countValue).toHaveText('0');
  });

  test('should show doubled value correctly', async ({ page }) => {
    const counterDemo = page.locator('.counter-demo');
    const incrementBtn = counterDemo.getByRole('button', { name: '+' });
    const resetBtn = counterDemo.getByRole('button', { name: 'Reset' });
    
    // Reset first
    await resetBtn.click();
    
    // Increment to 5
    for (let i = 0; i < 5; i++) {
      await incrementBtn.click();
    }
    
    // Check doubled value
    const doubledValue = counterDemo.locator('.counter-value').nth(1).locator('.value');
    await expect(doubledValue).toHaveText('10');
  });

  test('should show tripled value correctly', async ({ page }) => {
    const counterDemo = page.locator('.counter-demo');
    const incrementBtn = counterDemo.getByRole('button', { name: '+' });
    const resetBtn = counterDemo.getByRole('button', { name: 'Reset' });
    
    // Reset first
    await resetBtn.click();
    
    // Increment to 4
    for (let i = 0; i < 4; i++) {
      await incrementBtn.click();
    }
    
    // Check tripled value
    const tripledValue = counterDemo.locator('.counter-value').nth(2).locator('.value');
    await expect(tripledValue).toHaveText('12');
  });

  test('should toggle auto-increment', async ({ page }) => {
    const counterDemo = page.locator('.counter-demo');
    const autoIncrementCheckbox = counterDemo.locator('input[type="checkbox"]');
    
    // Initially unchecked
    await expect(autoIncrementCheckbox).not.toBeChecked();
    
    // Toggle on
    await autoIncrementCheckbox.click();
    await expect(autoIncrementCheckbox).toBeChecked();
    
    // Pulse indicator should appear
    await expect(counterDemo.locator('.pulse')).toBeVisible();
    
    // Toggle off
    await autoIncrementCheckbox.click();
    await expect(autoIncrementCheckbox).not.toBeChecked();
  });

  test('should auto-increment when enabled', async ({ page }) => {
    const counterDemo = page.locator('.counter-demo');
    const resetBtn = counterDemo.getByRole('button', { name: 'Reset' });
    const autoIncrementCheckbox = counterDemo.locator('input[type="checkbox"]');
    const countValue = counterDemo.locator('.counter-value').first().locator('.value');
    
    // Reset first
    await resetBtn.click();
    await expect(countValue).toHaveText('0');
    
    // Enable auto-increment
    await autoIncrementCheckbox.click();
    
    // Count should increment immediately (effect runs on toggle)
    await expect(countValue).toHaveText('1');
    
    // Disable to stop
    await autoIncrementCheckbox.click();
  });
});

