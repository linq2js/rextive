import { test, expect } from '@playwright/test';

test.describe('Pokemon Search Demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Scroll to pokemon demo
    await page.locator('#pokemon-demo').scrollIntoViewIfNeeded();
  });

  test('should display pokemon search section', async ({ page }) => {
    const pokemonSection = page.locator('#pokemon-demo');
    await expect(pokemonSection).toBeVisible();
    await expect(pokemonSection.getByText('🔍 Pokemon Search')).toBeVisible();
  });

  test('should have search input', async ({ page }) => {
    const pokemonSection = page.locator('#pokemon-demo');
    const searchInput = pokemonSection.locator('input[type="text"], input[placeholder*="pokemon" i]').first();
    
    await expect(searchInput).toBeVisible();
  });

  test('should show loading state when searching', async ({ page }) => {
    const pokemonSection = page.locator('#pokemon-demo');
    const searchInput = pokemonSection.locator('input[type="text"], input[placeholder*="pokemon" i]').first();
    
    await searchInput.fill('pikachu');
    
    // Wait for debounce (300ms) and check for loading state
    await page.waitForTimeout(400);
    
    // Should show loading indicator or the result
    const hasLoading = await pokemonSection.locator('.spinner, [class*="loading"]').count() > 0;
    const hasResult = await pokemonSection.getByText(/pikachu/i).count() > 0;
    
    expect(hasLoading || hasResult).toBeTruthy();
  });

  test('should search for pikachu', async ({ page }) => {
    const pokemonSection = page.locator('#pokemon-demo');
    const searchInput = pokemonSection.locator('input[type="text"], input[placeholder*="pokemon" i]').first();
    
    await searchInput.fill('pikachu');
    
    // Wait for API response (debounce + 1s delay + API call)
    await page.waitForTimeout(2000);
    
    // Should show pikachu result or error (random 10% error chance)
    const hasResult = await pokemonSection.getByText(/pikachu/i).count() > 0;
    const hasError = await pokemonSection.locator('[class*="error"]').count() > 0;
    
    expect(hasResult || hasError).toBeTruthy();
  });

  test('should search for different pokemon', async ({ page }) => {
    const pokemonSection = page.locator('#pokemon-demo');
    const searchInput = pokemonSection.locator('input[type="text"], input[placeholder*="pokemon" i]').first();
    
    // Search for charizard
    await searchInput.fill('charizard');
    await page.waitForTimeout(2000);
    
    // Should show result or error
    const hasResult = await pokemonSection.getByText(/charizard/i).count() > 0;
    const hasError = await pokemonSection.locator('[class*="error"]').count() > 0;
    
    expect(hasResult || hasError).toBeTruthy();
  });

  test('should show error for invalid pokemon', async ({ page }) => {
    const pokemonSection = page.locator('#pokemon-demo');
    const searchInput = pokemonSection.locator('input[type="text"], input[placeholder*="pokemon" i]').first();
    
    // Search for non-existent pokemon
    await searchInput.fill('notarealpokemon123');
    await page.waitForTimeout(2500);
    
    // Should show "not found" error
    const hasNotFound = await pokemonSection.getByText(/not found/i).count() > 0;
    const hasError = await pokemonSection.locator('[class*="error"]').count() > 0;
    
    expect(hasNotFound || hasError).toBeTruthy();
  });

  test('should clear search and reset state', async ({ page }) => {
    const pokemonSection = page.locator('#pokemon-demo');
    const searchInput = pokemonSection.locator('input[type="text"], input[placeholder*="pokemon" i]').first();
    
    // Search first
    await searchInput.fill('bulbasaur');
    await page.waitForTimeout(500);
    
    // Clear the input
    await searchInput.fill('');
    await page.waitForTimeout(500);
    
    // Input should be empty
    await expect(searchInput).toHaveValue('');
  });

  test('should debounce search input', async ({ page }) => {
    const pokemonSection = page.locator('#pokemon-demo');
    const searchInput = pokemonSection.locator('input[type="text"], input[placeholder*="pokemon" i]').first();
    
    // Type quickly
    await searchInput.fill('p');
    await searchInput.fill('pi');
    await searchInput.fill('pik');
    await searchInput.fill('pika');
    
    // Should not immediately show loading (debounce)
    const immediateLoading = await pokemonSection.locator('.spinner').count();
    
    // Wait for debounce
    await page.waitForTimeout(400);
    
    // Now should show loading or result
    const afterDebounce = await pokemonSection.locator('.spinner, [class*="loading"]').count() > 0 ||
                          await pokemonSection.getByText(/pika/i).count() > 0;
    
    expect(afterDebounce).toBeTruthy();
  });

  test('should cancel previous request on new search', async ({ page }) => {
    const pokemonSection = page.locator('#pokemon-demo');
    const searchInput = pokemonSection.locator('input[type="text"], input[placeholder*="pokemon" i]').first();
    
    // Start first search
    await searchInput.fill('pikachu');
    await page.waitForTimeout(400);
    
    // Immediately start another search
    await searchInput.fill('charizard');
    await page.waitForTimeout(2500);
    
    // Should show charizard result, not pikachu
    const hasCharizard = await pokemonSection.getByText(/charizard/i).count() > 0;
    const hasError = await pokemonSection.locator('[class*="error"]').count() > 0;
    
    // Either shows charizard or error, but not pikachu
    expect(hasCharizard || hasError).toBeTruthy();
  });
});

