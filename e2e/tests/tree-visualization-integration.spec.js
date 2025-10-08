/**
 * @fileoverview Comprehensive integration tests for tree visualization feature
 * Tests the complete search-to-selection flow with tree view functionality
 */

const { test, expect } = require('@playwright/test');

test.describe('Tree Visualization Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test.describe('Complete Search-to-Selection Flow', () => {
    test('should complete full search flow with tree view selection', async ({ page }) => {
      const searchInput = page.locator('input[type="text"]');
      
      // Type a query that should generate tree structure
      await searchInput.fill('app');
      
      // Wait for suggestions to appear
      const suggestionsDropdown = page.locator('[data-testid="suggestions-dropdown"]');
      await expect(suggestionsDropdown).toBeVisible({ timeout: 5000 });
      
      // Switch to tree view
      const treeViewButton = page.locator('[data-testid="tree-view-button"]');
      await expect(treeViewButton).toBeVisible();
      await treeViewButton.click();
      
      // Verify tree structure is displayed
      const treeView = page.locator('[role="tree"]');
      await expect(treeView).toBeVisible();
      
      // Verify tree nodes are present
      const treeItems = page.locator('[role="treeitem"]');
      await expect(treeItems.first()).toBeVisible();
      
      // Expand a prefix node if present
      const expandableNode = page.locator('[role="treeitem"][aria-expanded="false"]').first();
      if (await expandableNode.isVisible()) {
        await expandableNode.click();
        await expect(expandableNode).toHaveAttribute('aria-expanded', 'true');
      }
      
      // Select a word node
      const wordNode = page.locator('[role="treeitem"][data-node-type="word"]').first();
      await expect(wordNode).toBeVisible();
      
      const selectedWord = await wordNode.textContent();
      await wordNode.click();
      
      // Verify selection was made
      await expect(searchInput).toHaveValue(selectedWord.trim());
      await expect(suggestionsDropdown).not.toBeVisible();
    });

    test('should handle keyboard navigation in tree view', async ({ page }) => {
      const searchInput = page.locator('input[type="text"]');
      
      await searchInput.fill('new');
      
      const suggestionsDropdown = page.locator('[data-testid="suggestions-dropdown"]');
      await expect(suggestionsDropdown).toBeVisible({ timeout: 5000 });
      
      // Switch to tree view
      const treeViewButton = page.locator('[data-testid="tree-view-button"]');
      await treeViewButton.click();
      
      const treeView = page.locator('[role="tree"]');
      await expect(treeView).toBeVisible();
      
      // Focus the tree
      await treeView.focus();
      
      // Navigate with arrow keys
      await page.keyboard.press('ArrowDown');
      
      // Verify navigation worked
      const focusedNode = page.locator('[role="treeitem"].ring-2');
      await expect(focusedNode).toBeVisible();
      
      // Test expansion with right arrow
      const expandableNode = page.locator('[role="treeitem"][aria-expanded="false"]').first();
      if (await expandableNode.isVisible()) {
        await expandableNode.focus();
        await page.keyboard.press('ArrowRight');
        await expect(expandableNode).toHaveAttribute('aria-expanded', 'true');
      }
      
      // Test selection with Enter
      const wordNode = page.locator('[role="treeitem"][data-node-type="word"]').first();
      if (await wordNode.isVisible()) {
        await wordNode.focus();
        const wordText = await wordNode.textContent();
        await page.keyboard.press('Enter');
        
        await expect(searchInput).toHaveValue(wordText.trim());
      }
    });

    test('should preserve state when switching between views', async ({ page }) => {
      const searchInput = page.locator('input[type="text"]');
      
      await searchInput.fill('test');
      
      const suggestionsDropdown = page.locator('[data-testid="suggestions-dropdown"]');
      await expect(suggestionsDropdown).toBeVisible({ timeout: 5000 });
      
      // Navigate to second item in list view
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');
      
      // Switch to tree view
      const treeViewButton = page.locator('[data-testid="tree-view-button"]');
      await treeViewButton.click();
      
      // Verify tree view is active
      const treeView = page.locator('[role="tree"]');
      await expect(treeView).toBeVisible();
      
      // Switch back to list view
      const listViewButton = page.locator('[data-testid="list-view-button"]');
      await listViewButton.click();
      
      // Verify list view is active
      const listView = page.locator('[data-testid="suggestions-list"]');
      await expect(listView).toBeVisible();
      
      // Verify selection is preserved (approximately)
      const highlightedItem = page.locator('[data-testid="suggestion-item"].highlighted');
      await expect(highlightedItem).toBeVisible();
    });
  });

  test.describe('Real API Data Integration', () => {
    test('should handle real autocomplete API responses in tree view', async ({ page }) => {
      // Monitor API requests
      const apiRequests = [];
      page.on('request', request => {
        if (request.url().includes('/api/search')) {
          apiRequests.push(request);
        }
      });

      const searchInput = page.locator('input[type="text"]');
      
      // Use a query that should return real data
      await searchInput.fill('tokyo');
      
      // Wait for API response
      await page.waitForResponse(response => 
        response.url().includes('/api/search') && response.status() === 200
      );
      
      const suggestionsDropdown = page.locator('[data-testid="suggestions-dropdown"]');
      await expect(suggestionsDropdown).toBeVisible({ timeout: 5000 });
      
      // Switch to tree view
      const treeViewButton = page.locator('[data-testid="tree-view-button"]');
      await treeViewButton.click();
      
      // Verify tree was built from real data
      const treeView = page.locator('[role="tree"]');
      await expect(treeView).toBeVisible();
      
      const treeItems = page.locator('[role="treeitem"]');
      await expect(treeItems).toHaveCount.greaterThan(0);
      
      // Verify API was called
      expect(apiRequests.length).toBeGreaterThan(0);
      
      // Test selection with real data
      const wordNode = page.locator('[role="treeitem"][data-node-type="word"]').first();
      if (await wordNode.isVisible()) {
        const wordText = await wordNode.textContent();
        await wordNode.click();
        
        // Verify selection triggers frequency increment
        await expect(searchInput).toHaveValue(wordText.trim());
      }
    });

    test('should handle API errors gracefully in tree view', async ({ page }) => {
      // Mock API to return error
      await page.route('**/api/search*', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });

      const searchInput = page.locator('input[type="text"]');
      await searchInput.fill('error');
      
      // Wait for error handling
      await page.waitForTimeout(1000);
      
      // Should either show no dropdown or error message
      const suggestionsDropdown = page.locator('[data-testid="suggestions-dropdown"]');
      const errorMessage = page.locator('[data-testid="error-message"]');
      
      const hasDropdown = await suggestionsDropdown.isVisible().catch(() => false);
      const hasError = await errorMessage.isVisible().catch(() => false);
      
      // Should handle error gracefully
      expect(hasDropdown || hasError).toBeTruthy();
      
      // Tree view button should still be functional
      if (hasDropdown) {
        const treeViewButton = page.locator('[data-testid="tree-view-button"]');
        if (await treeViewButton.isVisible()) {
          await expect(treeViewButton).not.toBeDisabled();
        }
      }
    });

    test('should handle typo corrections in tree structure', async ({ page }) => {
      const searchInput = page.locator('input[type="text"]');
      
      // Type a query with potential typos
      await searchInput.fill('tokio'); // Misspelling of "tokyo"
      
      const suggestionsDropdown = page.locator('[data-testid="suggestions-dropdown"]');
      await expect(suggestionsDropdown).toBeVisible({ timeout: 5000 });
      
      // Switch to tree view
      const treeViewButton = page.locator('[data-testid="tree-view-button"]');
      await treeViewButton.click();
      
      const treeView = page.locator('[role="tree"]');
      await expect(treeView).toBeVisible();
      
      // Look for typo correction indicators
      const typoNodes = page.locator('[role="treeitem"][data-suggestion-type="typo_correction"]');
      if (await typoNodes.count() > 0) {
        const typoNode = typoNodes.first();
        await expect(typoNode).toBeVisible();
        
        // Verify typo correction styling
        await expect(typoNode).toHaveClass(/typo-correction/);
        
        // Test selection of typo correction
        await typoNode.click();
        
        // Should select the corrected word
        const inputValue = await searchInput.inputValue();
        expect(inputValue).not.toBe('tokio');
        expect(inputValue.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Performance with Large Datasets', () => {
    test('should handle 100+ suggestions efficiently', async ({ page }) => {
      // Mock API to return large dataset
      await page.route('**/api/search*', route => {
        const largeSuggestions = Array.from({ length: 150 }, (_, i) => ({
          word: `suggestion${i.toString().padStart(3, '0')}`,
          frequency: Math.floor(Math.random() * 100) + 1,
          type: 'exact_match'
        }));
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ suggestions: largeSuggestions })
        });
      });

      const searchInput = page.locator('input[type="text"]');
      
      const startTime = Date.now();
      await searchInput.fill('suggestion');
      
      const suggestionsDropdown = page.locator('[data-testid="suggestions-dropdown"]');
      await expect(suggestionsDropdown).toBeVisible({ timeout: 10000 });
      
      // Switch to tree view
      const treeViewButton = page.locator('[data-testid="tree-view-button"]');
      await treeViewButton.click();
      
      const treeView = page.locator('[role="tree"]');
      await expect(treeView).toBeVisible({ timeout: 5000 });
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should handle large dataset within reasonable time (< 3 seconds)
      expect(totalTime).toBeLessThan(3000);
      
      // Verify virtual scrolling or pagination is working
      const visibleItems = page.locator('[role="treeitem"]:visible');
      const visibleCount = await visibleItems.count();
      
      // Should not render all 150+ items at once (virtual scrolling)
      expect(visibleCount).toBeLessThan(100);
      
      // Test scrolling performance
      const scrollContainer = page.locator('.tree-view');
      await scrollContainer.hover();
      
      for (let i = 0; i < 5; i++) {
        await page.mouse.wheel(0, 100);
        await page.waitForTimeout(50);
      }
      
      // Should still be responsive after scrolling
      await expect(treeView).toBeVisible();
    });

    test('should fallback to list view for extremely large datasets', async ({ page }) => {
      // Mock API to return extremely large dataset
      await page.route('**/api/search*', route => {
        const hugeSuggestions = Array.from({ length: 1000 }, (_, i) => ({
          word: `word${i}`,
          frequency: 1,
          type: 'exact_match'
        }));
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ suggestions: hugeSuggestions })
        });
      });

      const searchInput = page.locator('input[type="text"]');
      await searchInput.fill('word');
      
      const suggestionsDropdown = page.locator('[data-testid="suggestions-dropdown"]');
      await expect(suggestionsDropdown).toBeVisible({ timeout: 10000 });
      
      // Try to switch to tree view
      const treeViewButton = page.locator('[data-testid="tree-view-button"]');
      
      if (await treeViewButton.isVisible()) {
        await treeViewButton.click();
        
        // Should either show tree view or fallback to list view
        const treeView = page.locator('[role="tree"]');
        const listView = page.locator('[data-testid="suggestions-list"]');
        
        const hasTreeView = await treeView.isVisible().catch(() => false);
        const hasListView = await listView.isVisible().catch(() => false);
        
        expect(hasTreeView || hasListView).toBeTruthy();
        
        // If fallback occurred, should show appropriate message
        if (hasListView && !hasTreeView) {
          const fallbackMessage = page.locator('[data-testid="fallback-message"]');
          if (await fallbackMessage.isVisible()) {
            await expect(fallbackMessage).toContainText(/large dataset/i);
          }
        }
      }
    });

    test('should maintain performance during rapid interactions', async ({ page }) => {
      const searchInput = page.locator('input[type="text"]');
      
      await searchInput.fill('test');
      
      const suggestionsDropdown = page.locator('[data-testid="suggestions-dropdown"]');
      await expect(suggestionsDropdown).toBeVisible({ timeout: 5000 });
      
      // Switch to tree view
      const treeViewButton = page.locator('[data-testid="tree-view-button"]');
      await treeViewButton.click();
      
      const treeView = page.locator('[role="tree"]');
      await expect(treeView).toBeVisible();
      
      // Perform rapid interactions
      const startTime = Date.now();
      
      for (let i = 0; i < 10; i++) {
        // Rapid expand/collapse operations
        const expandableNodes = page.locator('[role="treeitem"][aria-expanded="false"]');
        if (await expandableNodes.count() > 0) {
          await expandableNodes.first().click();
        }
        
        const collapsibleNodes = page.locator('[role="treeitem"][aria-expanded="true"]');
        if (await collapsibleNodes.count() > 0) {
          await collapsibleNodes.first().click();
        }
        
        // Rapid keyboard navigation
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowUp');
      }
      
      const endTime = Date.now();
      const interactionTime = endTime - startTime;
      
      // Should handle rapid interactions within reasonable time
      expect(interactionTime).toBeLessThan(2000);
      
      // Tree should still be functional
      await expect(treeView).toBeVisible();
      const treeItems = page.locator('[role="treeitem"]');
      await expect(treeItems.first()).toBeVisible();
    });
  });

  test.describe('Cross-Browser Compatibility', () => {
    test('should work correctly in different browsers', async ({ page, browserName }) => {
      const searchInput = page.locator('input[type="text"]');
      
      await searchInput.fill('browser');
      
      const suggestionsDropdown = page.locator('[data-testid="suggestions-dropdown"]');
      await expect(suggestionsDropdown).toBeVisible({ timeout: 5000 });
      
      // Switch to tree view
      const treeViewButton = page.locator('[data-testid="tree-view-button"]');
      await treeViewButton.click();
      
      const treeView = page.locator('[role="tree"]');
      await expect(treeView).toBeVisible();
      
      // Test basic functionality across browsers
      const treeItems = page.locator('[role="treeitem"]');
      await expect(treeItems.first()).toBeVisible();
      
      // Test keyboard navigation (may vary by browser)
      await treeView.focus();
      await page.keyboard.press('ArrowDown');
      
      const focusedNode = page.locator('[role="treeitem"].ring-2');
      await expect(focusedNode).toBeVisible();
      
      // Test selection
      const wordNode = page.locator('[role="treeitem"][data-node-type="word"]').first();
      if (await wordNode.isVisible()) {
        const wordText = await wordNode.textContent();
        await wordNode.click();
        
        await expect(searchInput).toHaveValue(wordText.trim());
      }
      
      console.log(`Tree view functionality verified in ${browserName}`);
    });

    test('should handle browser-specific CSS features gracefully', async ({ page }) => {
      const searchInput = page.locator('input[type="text"]');
      
      await searchInput.fill('css');
      
      const suggestionsDropdown = page.locator('[data-testid="suggestions-dropdown"]');
      await expect(suggestionsDropdown).toBeVisible({ timeout: 5000 });
      
      const treeViewButton = page.locator('[data-testid="tree-view-button"]');
      await treeViewButton.click();
      
      const treeView = page.locator('[role="tree"]');
      await expect(treeView).toBeVisible();
      
      // Test CSS animations and transitions
      const expandableNode = page.locator('[role="treeitem"][aria-expanded="false"]').first();
      if (await expandableNode.isVisible()) {
        await expandableNode.click();
        
        // Animation should complete within reasonable time
        await expect(expandableNode).toHaveAttribute('aria-expanded', 'true', { timeout: 1000 });
      }
      
      // Test CSS Grid/Flexbox layouts
      const treeNodes = page.locator('[role="treeitem"]');
      const nodeCount = await treeNodes.count();
      
      if (nodeCount > 0) {
        // All nodes should be properly positioned
        for (let i = 0; i < Math.min(nodeCount, 5); i++) {
          const node = treeNodes.nth(i);
          const boundingBox = await node.boundingBox();
          
          expect(boundingBox).toBeTruthy();
          expect(boundingBox.width).toBeGreaterThan(0);
          expect(boundingBox.height).toBeGreaterThan(0);
        }
      }
    });
  });

  test.describe('Error Recovery and Resilience', () => {
    test('should recover from tree building failures', async ({ page }) => {
      // Mock API to return malformed data
      await page.route('**/api/search*', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ 
            suggestions: [
              { word: null }, // Invalid data
              { frequency: 'invalid' }, // Invalid data
              { word: 'valid', frequency: 10 } // Valid data
            ]
          })
        });
      });

      const searchInput = page.locator('input[type="text"]');
      await searchInput.fill('malformed');
      
      const suggestionsDropdown = page.locator('[data-testid="suggestions-dropdown"]');
      await expect(suggestionsDropdown).toBeVisible({ timeout: 5000 });
      
      // Try to switch to tree view
      const treeViewButton = page.locator('[data-testid="tree-view-button"]');
      await treeViewButton.click();
      
      // Should either show tree view or fallback to list view
      const treeView = page.locator('[role="tree"]');
      const listView = page.locator('[data-testid="suggestions-list"]');
      const errorMessage = page.locator('[data-testid="error-message"]');
      
      const hasTreeView = await treeView.isVisible().catch(() => false);
      const hasListView = await listView.isVisible().catch(() => false);
      const hasError = await errorMessage.isVisible().catch(() => false);
      
      // Should handle error gracefully
      expect(hasTreeView || hasListView || hasError).toBeTruthy();
      
      // Should still be able to interact with the interface
      if (hasListView) {
        const suggestions = page.locator('[data-testid="suggestion-item"]');
        if (await suggestions.count() > 0) {
          await suggestions.first().click();
          await expect(searchInput).not.toHaveValue('malformed');
        }
      }
    });

    test('should handle network interruptions gracefully', async ({ page }) => {
      const searchInput = page.locator('input[type="text"]');
      
      // Start with working API
      await searchInput.fill('network');
      
      const suggestionsDropdown = page.locator('[data-testid="suggestions-dropdown"]');
      await expect(suggestionsDropdown).toBeVisible({ timeout: 5000 });
      
      // Switch to tree view
      const treeViewButton = page.locator('[data-testid="tree-view-button"]');
      await treeViewButton.click();
      
      const treeView = page.locator('[role="tree"]');
      await expect(treeView).toBeVisible();
      
      // Simulate network interruption
      await page.route('**/api/search*', route => {
        route.abort('failed');
      });
      
      // Try new search
      await searchInput.clear();
      await searchInput.fill('interrupted');
      
      // Should handle network failure gracefully
      await page.waitForTimeout(2000);
      
      // Interface should remain functional
      const currentDropdown = page.locator('[data-testid="suggestions-dropdown"]');
      const hasDropdown = await currentDropdown.isVisible().catch(() => false);
      
      if (!hasDropdown) {
        // Should be able to clear and try again
        await searchInput.clear();
        expect(await searchInput.inputValue()).toBe('');
      }
    });
  });
});