const { test, expect } = require('@playwright/test');

test.describe('Search Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display search input on homepage', async ({ page }) => {
    const searchInput = page.locator('input[type="text"]');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute('placeholder', /start typing/i);
  });

  test('should show suggestions when typing', async ({ page }) => {
    const searchInput = page.locator('input[type="text"]');
    
    // Type a query
    await searchInput.fill('tok');
    
    // Wait for suggestions to appear
    const suggestionsDropdown = page.locator('[data-testid="suggestions-dropdown"]');
    await expect(suggestionsDropdown).toBeVisible({ timeout: 5000 });
    
    // Check that suggestions are displayed
    const suggestions = page.locator('[data-testid="suggestion-item"]');
    await expect(suggestions).toHaveCount.greaterThan(0);
  });

  test('should highlight matching text in suggestions', async ({ page }) => {
    const searchInput = page.locator('input[type="text"]');
    
    await searchInput.fill('new');
    
    // Wait for suggestions
    const suggestionsDropdown = page.locator('[data-testid="suggestions-dropdown"]');
    await expect(suggestionsDropdown).toBeVisible({ timeout: 5000 });
    
    // Check for highlighted text
    const highlightedText = page.locator('.bg-yellow-200');
    await expect(highlightedText.first()).toBeVisible();
  });

  test('should select suggestion on click', async ({ page }) => {
    const searchInput = page.locator('input[type="text"]');
    
    await searchInput.fill('tok');
    
    // Wait for suggestions
    const suggestionsDropdown = page.locator('[data-testid="suggestions-dropdown"]');
    await expect(suggestionsDropdown).toBeVisible({ timeout: 5000 });
    
    // Click first suggestion
    const firstSuggestion = page.locator('[data-testid="suggestion-item"]').first();
    const suggestionText = await firstSuggestion.textContent();
    await firstSuggestion.click();
    
    // Check that input is populated with selected suggestion
    await expect(searchInput).toHaveValue(suggestionText.trim());
  });

  test('should support keyboard navigation', async ({ page }) => {
    const searchInput = page.locator('input[type="text"]');
    
    await searchInput.fill('new');
    
    // Wait for suggestions
    const suggestionsDropdown = page.locator('[data-testid="suggestions-dropdown"]');
    await expect(suggestionsDropdown).toBeVisible({ timeout: 5000 });
    
    // Navigate with arrow keys
    await page.keyboard.press('ArrowDown');
    
    // Check that first suggestion is highlighted
    const highlightedSuggestion = page.locator('[data-testid="suggestion-item"].highlighted');
    await expect(highlightedSuggestion).toBeVisible();
    
    // Press Enter to select
    await page.keyboard.press('Enter');
    
    // Check that suggestion was selected
    await expect(searchInput).not.toHaveValue('new');
  });

  test('should clear suggestions when input is empty', async ({ page }) => {
    const searchInput = page.locator('input[type="text"]');
    
    // Type and then clear
    await searchInput.fill('test');
    await searchInput.clear();
    
    // Check that suggestions are hidden
    const suggestionsDropdown = page.locator('[data-testid="suggestions-dropdown"]');
    await expect(suggestionsDropdown).not.toBeVisible();
  });

  test('should handle no results gracefully', async ({ page }) => {
    const searchInput = page.locator('input[type="text"]');
    
    // Type a query that should return no results
    await searchInput.fill('xyzabc123nonexistent');
    
    // Wait a moment for the API call
    await page.waitForTimeout(1000);
    
    // Check that no suggestions are shown or "no results" message is displayed
    const suggestionsDropdown = page.locator('[data-testid="suggestions-dropdown"]');
    const noResultsMessage = page.locator('[data-testid="no-results"]');
    
    // Either no dropdown or a no results message
    const hasNoDropdown = await suggestionsDropdown.isVisible().catch(() => false);
    const hasNoResultsMessage = await noResultsMessage.isVisible().catch(() => false);
    
    expect(hasNoDropdown || hasNoResultsMessage).toBeTruthy();
  });

  test('should debounce search requests', async ({ page }) => {
    const searchInput = page.locator('input[type="text"]');
    
    // Monitor network requests
    const requests = [];
    page.on('request', request => {
      if (request.url().includes('/api/search')) {
        requests.push(request);
      }
    });
    
    // Type quickly
    await searchInput.type('tokyo', { delay: 50 });
    
    // Wait for debounce
    await page.waitForTimeout(500);
    
    // Should have made fewer requests than characters typed
    expect(requests.length).toBeLessThan(5);
  });
});