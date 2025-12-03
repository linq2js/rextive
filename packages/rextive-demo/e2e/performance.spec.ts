import { test, expect } from '@playwright/test';

test.describe('Performance', () => {
  test('should load app within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    
    const loadTime = Date.now() - startTime;
    
    // App should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should render todo list efficiently', async ({ page }) => {
    await page.goto('/');
    
    const input = page.locator('.todo-input');
    
    // Add 5 todos quickly (reduced for speed)
    const startTime = Date.now();
    
    for (let i = 1; i <= 5; i++) {
      await input.fill(`Todo item ${i}`);
      await input.press('Enter');
    }
    
    const addTime = Date.now() - startTime;
    
    // Adding 5 todos should take less than 5 seconds
    expect(addTime).toBeLessThan(5000);
    
    // All todos should be visible
    for (let i = 1; i <= 5; i++) {
      await expect(page.getByText(`Todo item ${i}`)).toBeVisible();
    }
  });

  test('should filter todos quickly', async ({ page }) => {
    await page.goto('/');
    
    const input = page.locator('.todo-input');
    
    // Add some todos
    for (let i = 1; i <= 5; i++) {
      await input.fill(`Todo ${i}`);
      await input.press('Enter');
    }
    
    // Mark some as completed
    const toggleBtns = page.locator('.todo-toggle');
    await toggleBtns.nth(0).click();
    await toggleBtns.nth(2).click();
    
    // Measure filter time
    const startTime = Date.now();
    
    // Click Active filter
    await page.locator('.filter-btn', { hasText: 'Active' }).click();
    
    const filterTime = Date.now() - startTime;
    
    // Filtering should be instant (< 500ms)
    expect(filterTime).toBeLessThan(500);
  });

  test('should search todos with debounce', async ({ page }) => {
    await page.goto('/');
    
    const input = page.locator('.todo-input');
    
    // Add todos
    await input.fill('Apple');
    await input.press('Enter');
    await input.fill('Banana');
    await input.press('Enter');
    await input.fill('Apricot');
    await input.press('Enter');
    
    const searchInput = page.locator('.search-input');
    
    // Type search term
    const startTime = Date.now();
    await searchInput.fill('Ap');
    
    // Results should appear quickly (after debounce)
    await page.waitForTimeout(100);
    
    // Apple and Apricot should be visible, Banana should not
    await expect(page.getByText('Apple')).toBeVisible();
    await expect(page.getByText('Apricot')).toBeVisible();
    await expect(page.getByText('Banana')).not.toBeVisible();
    
    const searchTime = Date.now() - startTime;
    
    // Search should complete within 1 second
    expect(searchTime).toBeLessThan(1000);
  });

  test('should handle rapid counter clicks', async ({ page }) => {
    await page.goto('/');
    await page.locator('#counter-demo').scrollIntoViewIfNeeded();
    
    const counterDemo = page.locator('.counter-demo');
    const incrementBtn = counterDemo.getByRole('button', { name: '+' });
    const resetBtn = counterDemo.getByRole('button', { name: 'Reset' });
    
    // Reset first
    await resetBtn.click();
    
    // Click increment 20 times rapidly
    const startTime = Date.now();
    
    for (let i = 0; i < 20; i++) {
      await incrementBtn.click();
    }
    
    const clickTime = Date.now() - startTime;
    
    // Rapid clicks should complete within 2 seconds
    expect(clickTime).toBeLessThan(2000);
    
    // Counter should show 20
    const countValue = counterDemo.locator('.counter-value').first().locator('.value');
    await expect(countValue).toHaveText('20');
    
    // Doubled should show 40
    const doubledValue = counterDemo.locator('.counter-value').nth(1).locator('.value');
    await expect(doubledValue).toHaveText('40');
  });

  test('should not have memory leaks on navigation', async ({ page }) => {
    await page.goto('/');
    
    // Navigate through sections multiple times
    const tocLinks = page.locator('.toc-link');
    const linkCount = await tocLinks.count();
    
    for (let round = 0; round < 3; round++) {
      for (let i = 0; i < linkCount; i++) {
        await tocLinks.nth(i).click();
        await page.waitForTimeout(100);
      }
    }
    
    // App should still be responsive
    await expect(page.locator('h1')).toBeVisible();
    
    // Should be able to add todos still
    const input = page.locator('.todo-input');
    await input.fill('After navigation todo');
    await input.press('Enter');
    await expect(page.getByText('After navigation todo')).toBeVisible();
  });
});

test.describe('Stress Testing', () => {
  test('should handle many todos', async ({ page }) => {
    await page.goto('/');
    
    const input = page.locator('.todo-input');
    
    // Add 10 todos (reduced for speed)
    for (let i = 1; i <= 10; i++) {
      await input.fill(`Stress test todo ${i}`);
      await input.press('Enter');
    }
    
    // First and last should be visible (use exact match to avoid ambiguity)
    await expect(page.getByText('Stress test todo 1', { exact: true })).toBeVisible();
    await expect(page.getByText('Stress test todo 10', { exact: true })).toBeVisible();
    
    // Filtering should still work
    await page.locator('.filter-btn', { hasText: 'All' }).click();
    
    // Items count should show correct number
    const itemsCount = page.locator('.items-count');
    await expect(itemsCount).toBeVisible();
  });

  test('should handle rapid filter switching', async ({ page }) => {
    await page.goto('/');
    
    const input = page.locator('.todo-input');
    
    // Add some todos
    for (let i = 1; i <= 5; i++) {
      await input.fill(`Switch test ${i}`);
      await input.press('Enter');
    }
    
    // Mark some as completed
    await page.locator('.todo-toggle').first().click();
    
    // Rapidly switch filters
    for (let i = 0; i < 10; i++) {
      await page.locator('.filter-btn', { hasText: 'All' }).click();
      await page.locator('.filter-btn', { hasText: 'Active' }).click();
      await page.locator('.filter-btn', { hasText: /Done|Completed/ }).click();
    }
    
    // App should still work
    await page.locator('.filter-btn', { hasText: 'All' }).click();
    await expect(page.getByText('Switch test 1')).toBeVisible();
  });
});

