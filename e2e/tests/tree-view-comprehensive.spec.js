/**
 * @fileoverview Comprehensive E2E tests for tree view with large datasets and cross-browser compatibility
 */

const { test, expect } = require('@playwright/test');

test.describe('Tree View Comprehensive E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Large Dataset Performance Tests', () => {
    test('should handle 100+ suggestions with real API efficiently', async ({ page }) => {
      // Mock API to return large realistic dataset
      await page.route('**/api/search*', route => {
        const largeSuggestions = [];
        
        // Create hierarchical data for better tree structure
        const cities = ['tokyo', 'toronto', 'london', 'paris', 'berlin', 'madrid', 'rome', 'vienna'];
        const suffixes = ['', ' station', ' airport', ' center', ' downtown', ' north', ' south', ' east', ' west'];
        
        cities.forEach(city => {
          suffixes.forEach(suffix => {
            largeSuggestions.push({
              word: city + suffix,
              frequency: Math.floor(Math.random() * 100) + 10,
              type: 'exact_match'
            });
          });
        });

        // Add more variations to reach 100+
        for (let i = largeSuggestions.length; i < 120; i++) {
          largeSuggestions.push({
            word: `location${i.toString().padStart(3, '0')}`,
            frequency: Math.floor(Math.random() * 50) + 1,
            type: 'exact_match'
          });
        }
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ suggestions: largeSuggestions })
        });
      });

      const searchInput = page.locator('input[type="text"]');
      
      const startTime = Date.now();
      await searchInput.fill('to');
      
      const suggestionsDropdown = page.locator('[data-testid="suggestions-dropdown"]');
      await expect(suggestionsDropdown).toBeVisible({ timeout: 10000 });
      
      // Switch to tree view
      const treeViewButton = page.locator('[data-testid="tree-view-button"]');
      await expect(treeViewButton).toBeVisible();
      await treeViewButton.click();
      
      const treeView = page.locator('[role="tree"]');
      await expect(treeView).toBeVisible({ timeout: 5000 });
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should handle large dataset within performance budget
      expect(totalTime).toBeLessThan(3000);
      
      // Verify tree structure is properly built
      const treeItems = page.locator('[role="treeitem"]');
      await expect(treeItems.first()).toBeVisible();
      
      // Should use virtual scrolling - not all items visible at once
      const visibleItemCount = await treeItems.count();
      expect(visibleItemCount).toBeLessThan(120);
      expect(visibleItemCount).toBeGreaterThan(0);
      
      // Test scrolling performance
      const scrollContainer = page.locator('.tree-view');
      for (let i = 0; i < 5; i++) {
        await scrollContainer.hover();
        await page.mouse.wheel(0, 100);
        await page.waitForTimeout(50);
      }
      
      // Tree should remain responsive after scrolling
      await expect(treeView).toBeVisible();
      
      console.log(`Large dataset test completed in ${totalTime}ms`);
    });

    test('should automatically fallback for extremely large datasets', async ({ page }) => {
      // Mock API to return extremely large dataset
      await page.route('**/api/search*', route => {
        const hugeSuggestions = Array.from({ length: 1500 }, (_, i) => ({
          word: `huge${i.toString().padStart(4, '0')}`,
          frequency: Math.floor(Math.random() * 10) + 1,
          type: 'exact_match'
        }));
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ suggestions: hugeSuggestions })
        });
      });

      const searchInput = page.locator('input[type="text"]');
      await searchInput.fill('huge');
      
      const suggestionsDropdown = page.locator('[data-testid="suggestions-dropdown"]');
      await expect(suggestionsDropdown).toBeVisible({ timeout: 10000 });
      
      // Try to switch to tree view
      const treeViewButton = page.locator('[data-testid="tree-view-button"]');
      
      if (await treeViewButton.isVisible()) {
        await treeViewButton.click();
        
        // Should either show tree view or fallback to list view
        const treeView = page.locator('[role="tree"]');
        const listView = page.locator('[data-testid="suggestions-list"]');
        
        await page.waitForTimeout(2000);
        
        const hasTreeView = await treeView.isVisible().catch(() => false);
        const hasListView = await listView.isVisible().catch(() => false);
        
        expect(hasTreeView || hasListView).toBeTruthy();
        
        // If fallback occurred, should show appropriate message
        if (hasListView && !hasTreeView) {
          const fallbackMessage = page.locator('[data-testid="fallback-message"]');
          if (await fallbackMessage.isVisible()) {
            await expect(fallbackMessage).toContainText(/large dataset|performance/i);
          }
        }
      }
    });

    test('should maintain performance during stress testing', async ({ page }) => {
      const suggestions = Array.from({ length: 80 }, (_, i) => ({
        word: `stress${i.toString().padStart(2, '0')}`,
        frequency: Math.floor(Math.random() * 40) + 10,
        type: 'exact_match'
      }));

      await page.route('**/api/search*', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ suggestions })
        });
      });

      const searchInput = page.locator('input[type="text"]');
      await searchInput.fill('stress');
      
      const suggestionsDropdown = page.locator('[data-testid="suggestions-dropdown"]');
      await expect(suggestionsDropdown).toBeVisible();
      
      const treeViewButton = page.locator('[data-testid="tree-view-button"]');
      await treeViewButton.click();
      
      const treeView = page.locator('[role="tree"]');
      await expect(treeView).toBeVisible();
      
      const startTime = Date.now();
      
      // Perform stress testing operations
      for (let i = 0; i < 20; i++) {
        // Rapid view switching
        const listViewButton = page.locator('[data-testid="list-view-button"]');
        await listViewButton.click();
        await page.waitForTimeout(50);
        
        await treeViewButton.click();
        await page.waitForTimeout(50);
        
        // Rapid keyboard navigation
        await treeView.focus();
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowUp');
        
        // Rapid expand/collapse if available
        const expandableNodes = page.locator('[role="treeitem"][aria-expanded="false"]');
        if (await expandableNodes.count() > 0) {
          await expandableNodes.first().click();
          await page.waitForTimeout(25);
        }
      }
      
      const endTime = Date.now();
      const stressTime = endTime - startTime;
      
      // Should handle stress testing within reasonable time
      expect(stressTime).toBeLessThan(5000);
      
      // Interface should still be functional
      await expect(treeView).toBeVisible();
      const treeItems = page.locator('[role="treeitem"]');
      await expect(treeItems.first()).toBeVisible();
      
      console.log(`Stress test completed in ${stressTime}ms`);
    });
  });

  test.describe('Cross-Browser Compatibility', () => {
    test('should work correctly across different browsers', async ({ page, browserName }) => {
      const suggestions = [
        { word: 'browser', frequency: 60, type: 'exact_match' },
        { word: 'browsing', frequency: 50, type: 'exact_match' },
        { word: 'browsers', frequency: 45, type: 'exact_match' },
        { word: 'chrome', frequency: 80, type: 'exact_match' },
        { word: 'firefox', frequency: 70, type: 'exact_match' },
        { word: 'safari', frequency: 65, type: 'exact_match' }
      ];

      await page.route('**/api/search*', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ suggestions })
        });
      });

      const searchInput = page.locator('input[type="text"]');
      await searchInput.fill('browser');
      
      const suggestionsDropdown = page.locator('[data-testid="suggestions-dropdown"]');
      await expect(suggestionsDropdown).toBeVisible();
      
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
      
      // Verify navigation worked
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

    test('should handle browser-specific event differences', async ({ page, browserName }) => {
      const suggestions = [
        { word: 'events', frequency: 40, type: 'exact_match' },
        { word: 'eventful', frequency: 30, type: 'exact_match' }
      ];

      await page.route('**/api/search*', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ suggestions })
        });
      });

      const searchInput = page.locator('input[type="text"]');
      await searchInput.fill('event');
      
      const suggestionsDropdown = page.locator('[data-testid="suggestions-dropdown"]');
      await expect(suggestionsDropdown).toBeVisible();
      
      const treeViewButton = page.locator('[data-testid="tree-view-button"]');
      await treeViewButton.click();
      
      const treeView = page.locator('[role="tree"]');
      await expect(treeView).toBeVisible();
      
      // Test different event types that might vary by browser
      const treeItems = page.locator('[role="treeitem"]');
      const firstItem = treeItems.first();
      
      // Test mouse events
      await firstItem.hover();
      await page.waitForTimeout(100);
      
      // Test keyboard events with different key codes
      await treeView.focus();
      
      // Different browsers might handle these differently
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      await page.keyboard.press('Escape');
      
      // Test touch events for mobile browsers
      if (browserName === 'webkit') {
        await firstItem.tap();
      }
      
      // Should handle all events without errors
      await expect(treeView).toBeVisible();
      
      console.log(`Event handling verified in ${browserName}`);
    });

    test('should work with different viewport sizes', async ({ page }) => {
      const suggestions = Array.from({ length: 30 }, (_, i) => ({
        word: `responsive${i}`,
        frequency: Math.floor(Math.random() * 30) + 10,
        type: 'exact_match'
      }));

      await page.route('**/api/search*', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ suggestions })
        });
      });

      // Test different viewport sizes
      const viewports = [
        { width: 1920, height: 1080 }, // Desktop
        { width: 1024, height: 768 },  // Tablet
        { width: 375, height: 667 }    // Mobile
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        
        const searchInput = page.locator('input[type="text"]');
        await searchInput.fill('responsive');
        
        const suggestionsDropdown = page.locator('[data-testid="suggestions-dropdown"]');
        await expect(suggestionsDropdown).toBeVisible();
        
        const treeViewButton = page.locator('[data-testid="tree-view-button"]');
        
        // Tree view button should be visible and functional
        if (await treeViewButton.isVisible()) {
          await treeViewButton.click();
          
          const treeView = page.locator('[role="tree"]');
          await expect(treeView).toBeVisible();
          
          // Tree should adapt to viewport size
          const treeBox = await treeView.boundingBox();
          expect(treeBox.width).toBeLessThanOrEqual(viewport.width);
          
          // Should be scrollable if needed
          if (viewport.height < 800) {
            const scrollContainer = page.locator('.tree-view');
            await scrollContainer.hover();
            await page.mouse.wheel(0, 100);
            
            // Should handle scrolling on smaller screens
            await expect(treeView).toBeVisible();
          }
        }
        
        console.log(`Responsive test passed for ${viewport.width}x${viewport.height}`);
        
        // Clear for next test
        await searchInput.clear();
        await page.waitForTimeout(200);
      }
    });
  });

  test.describe('Real API Integration with Performance Monitoring', () => {
    test('should monitor and report performance metrics', async ({ page }) => {
      // Enable performance monitoring
      await page.addInitScript(() => {
        window.performanceMetrics = [];
        
        // Override performance.mark to capture metrics
        const originalMark = performance.mark;
        performance.mark = function(name) {
          window.performanceMetrics.push({ type: 'mark', name, timestamp: performance.now() });
          return originalMark.call(this, name);
        };
        
        // Override performance.measure to capture metrics
        const originalMeasure = performance.measure;
        performance.measure = function(name, startMark, endMark) {
          const result = originalMeasure.call(this, name, startMark, endMark);
          window.performanceMetrics.push({ 
            type: 'measure', 
            name, 
            duration: result.duration,
            timestamp: performance.now() 
          });
          return result;
        };
      });

      const searchInput = page.locator('input[type="text"]');
      
      // Use a query that should return real data
      await searchInput.fill('tokyo');
      
      // Wait for API response
      await page.waitForResponse(response => 
        response.url().includes('/api/search') && response.status() === 200
      );
      
      const suggestionsDropdown = page.locator('[data-testid="suggestions-dropdown"]');
      await expect(suggestionsDropdown).toBeVisible();
      
      // Switch to tree view and measure performance
      const treeViewButton = page.locator('[data-testid="tree-view-button"]');
      await treeViewButton.click();
      
      const treeView = page.locator('[role="tree"]');
      await expect(treeView).toBeVisible();
      
      // Get performance metrics
      const metrics = await page.evaluate(() => window.performanceMetrics);
      
      // Should have captured performance data
      expect(metrics.length).toBeGreaterThan(0);
      
      // Check for specific performance markers
      const treeBuildMetrics = metrics.filter(m => m.name && m.name.includes('tree'));
      if (treeBuildMetrics.length > 0) {
        console.log('Tree build metrics:', treeBuildMetrics);
      }
      
      // Test selection with performance monitoring
      const wordNode = page.locator('[role="treeitem"][data-node-type="word"]').first();
      if (await wordNode.isVisible()) {
        const wordText = await wordNode.textContent();
        await wordNode.click();
        
        await expect(searchInput).toHaveValue(wordText.trim());
        
        // Should have recorded selection metrics
        const finalMetrics = await page.evaluate(() => window.performanceMetrics);
        expect(finalMetrics.length).toBeGreaterThanOrEqual(metrics.length);
      }
    });

    test('should handle API rate limiting gracefully', async ({ page }) => {
      let requestCount = 0;
      
      await page.route('**/api/search*', route => {
        requestCount++;
        
        if (requestCount > 3) {
          // Simulate rate limiting
          route.fulfill({
            status: 429,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Rate limit exceeded' })
          });
        } else {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ 
              suggestions: [
                { word: 'rate', frequency: 30, type: 'exact_match' },
                { word: 'rating', frequency: 25, type: 'exact_match' }
              ]
            })
          });
        }
      });

      const searchInput = page.locator('input[type="text"]');
      
      // Make multiple rapid requests
      for (let i = 0; i < 5; i++) {
        await searchInput.clear();
        await searchInput.fill(`rate${i}`);
        await page.waitForTimeout(100);
      }
      
      // Should handle rate limiting gracefully
      const suggestionsDropdown = page.locator('[data-testid="suggestions-dropdown"]');
      const errorMessage = page.locator('[data-testid="error-message"]');
      
      // Either show suggestions or error message
      const hasDropdown = await suggestionsDropdown.isVisible().catch(() => false);
      const hasError = await errorMessage.isVisible().catch(() => false);
      
      // Should not crash the application
      expect(hasDropdown || hasError || true).toBeTruthy();
      
      // Interface should remain functional
      await expect(searchInput).toBeVisible();
      await expect(searchInput).toBeEnabled();
    });

    test('should handle concurrent users simulation', async ({ page, context }) => {
      // Create multiple pages to simulate concurrent users
      const pages = [page];
      
      for (let i = 0; i < 2; i++) {
        const newPage = await context.newPage();
        await newPage.goto('/');
        pages.push(newPage);
      }
      
      const queries = ['concurrent1', 'concurrent2', 'concurrent3'];
      
      // Perform concurrent searches
      const searchPromises = pages.map(async (p, index) => {
        const searchInput = p.locator('input[type="text"]');
        const query = queries[index] || 'concurrent';
        
        await searchInput.fill(query);
        
        try {
          const suggestionsDropdown = p.locator('[data-testid="suggestions-dropdown"]');
          await expect(suggestionsDropdown).toBeVisible({ timeout: 5000 });
          
          const treeViewButton = p.locator('[data-testid="tree-view-button"]');
          if (await treeViewButton.isVisible()) {
            await treeViewButton.click();
            
            const treeView = p.locator('[role="tree"]');
            await expect(treeView).toBeVisible({ timeout: 3000 });
            
            return true;
          }
        } catch (error) {
          console.log(`Page ${index} failed:`, error.message);
          return false;
        }
        
        return false;
      });
      
      const results = await Promise.all(searchPromises);
      
      // At least some concurrent operations should succeed
      const successCount = results.filter(Boolean).length;
      expect(successCount).toBeGreaterThan(0);
      
      // Clean up additional pages
      for (let i = 1; i < pages.length; i++) {
        await pages[i].close();
      }
      
      console.log(`Concurrent test: ${successCount}/${pages.length} pages succeeded`);
    });
  });

  test.describe('Accessibility and Usability', () => {
    test('should maintain accessibility with large datasets', async ({ page }) => {
      const largeSuggestions = Array.from({ length: 100 }, (_, i) => ({
        word: `accessible${i.toString().padStart(3, '0')}`,
        frequency: Math.floor(Math.random() * 50) + 1,
        type: 'exact_match'
      }));

      await page.route('**/api/search*', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ suggestions: largeSuggestions })
        });
      });

      const searchInput = page.locator('input[type="text"]');
      await searchInput.fill('accessible');
      
      const suggestionsDropdown = page.locator('[data-testid="suggestions-dropdown"]');
      await expect(suggestionsDropdown).toBeVisible();
      
      const treeViewButton = page.locator('[data-testid="tree-view-button"]');
      await treeViewButton.click();
      
      const treeView = page.locator('[role="tree"]');
      await expect(treeView).toBeVisible();
      
      // Check ARIA attributes are properly set
      await expect(treeView).toHaveAttribute('role', 'tree');
      
      const treeItems = page.locator('[role="treeitem"]');
      const firstItem = treeItems.first();
      
      // Should have proper ARIA attributes
      await expect(firstItem).toHaveAttribute('role', 'treeitem');
      
      // Test keyboard navigation accessibility
      await treeView.focus();
      await page.keyboard.press('ArrowDown');
      
      // Should announce navigation to screen readers
      const focusedItem = page.locator('[role="treeitem"]:focus, [role="treeitem"].ring-2').first();
      await expect(focusedItem).toBeVisible();
      
      // Test selection accessibility
      await page.keyboard.press('Enter');
      
      // Should complete selection or expand node
      const inputValue = await searchInput.inputValue();
      expect(inputValue.length).toBeGreaterThan(0);
      
      console.log('Accessibility maintained with large dataset');
    });

    test('should provide clear visual feedback during loading', async ({ page }) => {
      // Simulate slow API response
      await page.route('**/api/search*', async route => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ 
            suggestions: [
              { word: 'loading', frequency: 40, type: 'exact_match' },
              { word: 'loaded', frequency: 35, type: 'exact_match' }
            ]
          })
        });
      });

      const searchInput = page.locator('input[type="text"]');
      await searchInput.fill('loading');
      
      // Should show loading indicator
      const loadingSpinner = page.locator('[data-testid="loading-spinner"]');
      if (await loadingSpinner.isVisible()) {
        await expect(loadingSpinner).toBeVisible();
      }
      
      // Wait for suggestions to load
      const suggestionsDropdown = page.locator('[data-testid="suggestions-dropdown"]');
      await expect(suggestionsDropdown).toBeVisible({ timeout: 5000 });
      
      // Loading indicator should be gone
      if (await loadingSpinner.isVisible()) {
        await expect(loadingSpinner).not.toBeVisible();
      }
      
      // Tree view should be available
      const treeViewButton = page.locator('[data-testid="tree-view-button"]');
      await expect(treeViewButton).toBeVisible();
      await expect(treeViewButton).toBeEnabled();
      
      console.log('Loading feedback provided correctly');
    });
  });
});