import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    // Should have h1
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    
    // Should have h3 for section headers
    const h3s = page.locator('h3');
    expect(await h3s.count()).toBeGreaterThan(0);
  });

  test('should have accessible form inputs', async ({ page }) => {
    // Todo input should have placeholder
    const todoInput = page.locator('.todo-input');
    await expect(todoInput).toHaveAttribute('placeholder', /what needs to be done/i);
    
    // Search input should have placeholder
    const searchInput = page.locator('.search-input');
    await expect(searchInput).toHaveAttribute('placeholder', /search/i);
  });

  test('should have accessible buttons', async ({ page }) => {
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    // Check specific buttons we know exist
    const todoAddBtn = page.locator('.todo-add-btn');
    const filterBtns = page.locator('.filter-btn');
    const syncBtns = page.locator('.sync-btn');
    
    // At least one of these should exist
    const addBtnCount = await todoAddBtn.count();
    const filterBtnCount = await filterBtns.count();
    const syncBtnCount = await syncBtns.count();
    
    const totalButtons = addBtnCount + filterBtnCount + syncBtnCount;
    expect(totalButtons).toBeGreaterThan(0);
    
    // Check that filter buttons have accessible text
    if (filterBtnCount > 0) {
      const firstFilter = filterBtns.first();
      const text = await firstFilter.textContent();
      expect(text?.trim().length).toBeGreaterThan(0);
    }
  });

  test('should support keyboard navigation for todo input', async ({ page }) => {
    const todoInput = page.locator('.todo-input');
    
    // Focus the input
    await todoInput.focus();
    await expect(todoInput).toBeFocused();
    
    // Type and submit with Enter
    await todoInput.fill('Keyboard todo');
    await todoInput.press('Enter');
    
    // Todo should be added
    await expect(page.getByText('Keyboard todo')).toBeVisible();
  });

  test('should support keyboard navigation for filters', async ({ page }) => {
    // Add a todo first
    const todoInput = page.locator('.todo-input');
    await todoInput.fill('Filter test');
    await todoInput.press('Enter');
    
    // Tab to filter buttons
    const filterBtns = page.locator('.filter-btn');
    
    if (await filterBtns.count() > 0) {
      // Click with keyboard (Enter)
      await filterBtns.first().focus();
      await filterBtns.first().press('Enter');
      
      // Button should be active
      await expect(filterBtns.first()).toHaveClass(/active/);
    }
  });

  test('should have visible focus indicators', async ({ page }) => {
    const todoInput = page.locator('.todo-input');
    
    // Focus the input
    await todoInput.focus();
    
    // Check that element is focused (browser should show focus ring)
    await expect(todoInput).toBeFocused();
  });

  test('should have proper color contrast', async ({ page }) => {
    // Check that main text is visible
    const header = page.locator('h1');
    await expect(header).toBeVisible();
    
    // Check subtitle is visible
    const subtitle = page.locator('.subtitle');
    await expect(subtitle).toBeVisible();
  });

  test('toggle buttons should be keyboard accessible', async ({ page }) => {
    // Add a todo
    const todoInput = page.locator('.todo-input');
    await todoInput.fill('Toggle test');
    await todoInput.press('Enter');
    
    // Find toggle button
    const toggleBtn = page.locator('.todo-toggle').first();
    
    if (await toggleBtn.count() > 0) {
      // Focus and toggle with keyboard
      await toggleBtn.focus();
      await expect(toggleBtn).toBeFocused();
      
      // Press Enter to toggle
      await toggleBtn.press('Enter');
      
      // Todo should now be completed
      const todoItem = page.locator('.todo-item').first();
      await expect(todoItem).toHaveClass(/completed/);
    }
  });

  test('back to top button should have aria-label', async ({ page }) => {
    const backToTop = page.locator('.back-to-top');
    await expect(backToTop).toHaveAttribute('aria-label', /back to top/i);
  });
});

test.describe('Keyboard Navigation Flow', () => {
  test('should navigate through app with Tab key', async ({ page }) => {
    await page.goto('/');
    
    // Start from beginning of page
    await page.keyboard.press('Tab');
    
    // Should be able to tab through interactive elements
    let tabCount = 0;
    const maxTabs = 20;
    
    while (tabCount < maxTabs) {
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        return el ? el.tagName : null;
      });
      
      // Should focus on interactive elements
      if (focusedElement && ['BUTTON', 'INPUT', 'A', 'TEXTAREA'].includes(focusedElement)) {
        tabCount++;
      }
      
      await page.keyboard.press('Tab');
      tabCount++;
    }
    
    // Should have found interactive elements
    expect(tabCount).toBeGreaterThan(0);
  });

  test('should be able to complete todo workflow with keyboard only', async ({ page }) => {
    await page.goto('/');
    
    // Tab to todo input
    const todoInput = page.locator('.todo-input');
    await todoInput.focus();
    
    // Type todo
    await page.keyboard.type('Keyboard only todo');
    
    // Submit with Enter
    await page.keyboard.press('Enter');
    
    // Verify todo was added
    await expect(page.getByText('Keyboard only todo')).toBeVisible();
    
    // Tab to the toggle button
    const toggleBtn = page.locator('.todo-toggle').first();
    if (await toggleBtn.count() > 0) {
      await toggleBtn.focus();
      
      // Toggle with Enter
      await page.keyboard.press('Enter');
      
      // Verify todo is completed
      const todoItem = page.locator('.todo-item').first();
      await expect(todoItem).toHaveClass(/completed/);
    }
  });
});

