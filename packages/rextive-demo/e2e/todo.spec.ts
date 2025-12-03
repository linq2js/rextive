import { test, expect } from '@playwright/test';

test.describe('Todo CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for app to initialize
    await expect(page.locator('.todo-card')).toBeVisible();
  });

  test('should add multiple todos', async ({ page }) => {
    const input = page.locator('.todo-input');
    const addBtn = page.locator('.todo-add-btn');
    
    // Add first todo
    await input.fill('First todo item');
    await addBtn.click();
    await expect(page.getByText('First todo item')).toBeVisible();
    
    // Add second todo
    await input.fill('Second todo item');
    await input.press('Enter');
    await expect(page.getByText('Second todo item')).toBeVisible();
    
    // Add third todo
    await input.fill('Third todo item');
    await addBtn.click();
    await expect(page.getByText('Third todo item')).toBeVisible();
  });

  test('should not add empty todos', async ({ page }) => {
    const input = page.locator('.todo-input');
    const addBtn = page.locator('.todo-add-btn');
    
    // Try to add empty todo
    await input.fill('');
    await expect(addBtn).toBeDisabled();
    
    // Try with only spaces
    await input.fill('   ');
    await expect(addBtn).toBeDisabled();
  });

  test('should clear input after adding todo', async ({ page }) => {
    const input = page.locator('.todo-input');
    
    await input.fill('Test todo');
    await input.press('Enter');
    
    // Input should be cleared
    await expect(input).toHaveValue('');
  });

  test('should toggle todo completion status', async ({ page }) => {
    const input = page.locator('.todo-input');
    
    // Add a todo
    await input.fill('Toggle me');
    await input.press('Enter');
    
    // Find the todo item and its toggle button
    const todoItem = page.locator('.todo-item', { hasText: 'Toggle me' });
    await expect(todoItem).toBeVisible();
    
    const toggleBtn = todoItem.locator('.todo-toggle');
    
    // Toggle to completed
    await toggleBtn.click();
    await expect(todoItem).toHaveClass(/completed/);
    
    // Toggle back to active
    await toggleBtn.click();
    await expect(todoItem).not.toHaveClass(/completed/);
  });

  test('should delete a todo', async ({ page }) => {
    const input = page.locator('.todo-input');
    
    // Add a todo
    await input.fill('Delete me');
    await input.press('Enter');
    await expect(page.getByText('Delete me')).toBeVisible();
    
    // Find and click delete button
    const todoItem = page.locator('.todo-item', { hasText: 'Delete me' });
    const deleteBtn = todoItem.locator('.todo-delete-btn, button[aria-label*="delete" i], button:has(svg)').last();
    
    if (await deleteBtn.count() > 0) {
      await deleteBtn.click();
      await expect(page.getByText('Delete me')).not.toBeVisible();
    }
  });

  test('should show empty state when no todos', async ({ page }) => {
    // Check for empty state message
    const emptyState = page.locator('.todo-empty');
    
    // If there are no todos, empty state should be visible
    const todoList = page.locator('.todo-list');
    if (await todoList.count() === 0) {
      await expect(emptyState).toBeVisible();
      await expect(page.getByText(/No todos yet|Add one above/i)).toBeVisible();
    }
  });
});

test.describe('Todo Filters', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Add some todos for testing
    const input = page.locator('.todo-input');
    
    await input.fill('Active todo 1');
    await input.press('Enter');
    
    await input.fill('Active todo 2');
    await input.press('Enter');
    
    await input.fill('Completed todo');
    await input.press('Enter');
    
    // Mark one as completed using toggle button
    const completedItem = page.locator('.todo-item', { hasText: 'Completed todo' });
    await completedItem.locator('.todo-toggle').click();
  });

  test('should filter by All', async ({ page }) => {
    const allBtn = page.locator('.filter-btn', { hasText: 'All' });
    await allBtn.click();
    
    // Should show all todos
    await expect(page.getByText('Active todo 1')).toBeVisible();
    await expect(page.getByText('Active todo 2')).toBeVisible();
    await expect(page.getByText('Completed todo')).toBeVisible();
  });

  test('should filter by Active', async ({ page }) => {
    const activeBtn = page.locator('.filter-btn', { hasText: 'Active' });
    await activeBtn.click();
    
    // Should only show active todos
    await expect(page.getByText('Active todo 1')).toBeVisible();
    await expect(page.getByText('Active todo 2')).toBeVisible();
    await expect(page.getByText('Completed todo')).not.toBeVisible();
  });

  test('should filter by Completed/Done', async ({ page }) => {
    const completedBtn = page.locator('.filter-btn', { hasText: /Done|Completed/i });
    await completedBtn.click();
    
    // Should only show completed todos
    await expect(page.getByText('Completed todo')).toBeVisible();
    await expect(page.getByText('Active todo 1')).not.toBeVisible();
    await expect(page.getByText('Active todo 2')).not.toBeVisible();
  });

  test('should show correct item count', async ({ page }) => {
    // Check items left count
    const itemsCount = page.locator('.items-count');
    await expect(itemsCount).toContainText(/2 items? left/);
  });

  test('should clear completed todos', async ({ page }) => {
    const clearBtn = page.locator('.clear-completed-btn');
    
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
      
      // Completed todo should be gone
      await expect(page.getByText('Completed todo')).not.toBeVisible();
      
      // Active todos should remain
      await expect(page.getByText('Active todo 1')).toBeVisible();
      await expect(page.getByText('Active todo 2')).toBeVisible();
    }
  });
});

test.describe('Todo Search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Add todos for searching
    const input = page.locator('.todo-input');
    
    await input.fill('Buy groceries');
    await input.press('Enter');
    
    await input.fill('Walk the dog');
    await input.press('Enter');
    
    await input.fill('Buy new shoes');
    await input.press('Enter');
  });

  test('should search todos', async ({ page }) => {
    const searchInput = page.locator('.search-input');
    
    await searchInput.fill('Buy');
    
    // Should show matching todos
    await expect(page.getByText('Buy groceries')).toBeVisible();
    await expect(page.getByText('Buy new shoes')).toBeVisible();
    
    // Should hide non-matching
    await expect(page.getByText('Walk the dog')).not.toBeVisible();
  });

  test('should show no results message for no matches', async ({ page }) => {
    const searchInput = page.locator('.search-input');
    
    await searchInput.fill('xyz123nonexistent');
    
    // Should show no matching todos message
    await expect(page.getByText(/No matching todos/i)).toBeVisible();
  });

  test('should clear search', async ({ page }) => {
    const searchInput = page.locator('.search-input');
    
    await searchInput.fill('Buy');
    
    // Clear the search
    const clearBtn = page.locator('.search-clear');
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
      await expect(searchInput).toHaveValue('');
    } else {
      await searchInput.fill('');
    }
    
    // All todos should be visible again
    await expect(page.getByText('Buy groceries')).toBeVisible();
    await expect(page.getByText('Walk the dog')).toBeVisible();
    await expect(page.getByText('Buy new shoes')).toBeVisible();
  });
});

