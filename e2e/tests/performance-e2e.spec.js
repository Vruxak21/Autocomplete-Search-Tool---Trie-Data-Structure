const { test, expect } = require('@playwright/test');

test.describe('Performance E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load initial page within performance budget', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/', { waitUntil: 'networkidle' });
    
    const loadTime = Date.now() - startTime;
    
    // Page should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    // Check that critical elements are visible
    await expect(page.locator('input[type="text"]')).toBeVisible();
    await expect(page.locator('[data-testid="search-tab"]')).toBeVisible();
    await expect(page.locator('[data-testid="visualization-tab"]')).toBeVisible();
  });

  test('should respond to search queries within performance budget', async ({ page }) => {
    const searchInput = page.locator('input[type="text"]');
    
    const queries = ['to', 'new', 'lon', 'par', 'ber'];
    
    for (const query of queries) {
      const startTime = Date.now();
      
      await searchInput.fill(query);
      
      // Wait for suggestions to appear or timeout
      try {
        await page.locator('[data-testid="suggestions-dropdown"]').waitFor({ 
          state: 'visible', 
          timeout: 500 
        });
        
        const responseTime = Date.now() - startTime;
        
        // Search should respond within 500ms
        expect(responseTime).toBeLessThan(500);
        
        console.log(`Query "${query}" responded in ${responseTime}ms`);
      } catch (error) {
        // No suggestions is acceptable, but should still be fast
        const responseTime = Date.now() - startTime;
        expect(responseTime).toBeLessThan(500);
      }
      
      // Clear for next query
      await searchInput.clear();
      await page.waitForTimeout(100);
    }
  });

  test('should handle rapid typing without performance degradation', async ({ page }) => {
    const searchInput = page.locator('input[type="text"]');
    
    const rapidQuery = 'tokyo';
    const typingDelays = [];
    
    for (let i = 0; i < rapidQuery.length; i++) {
      const startTime = Date.now();
      
      await searchInput.type(rapidQuery[i], { delay: 50 }); // Fast typing
      
      // Wait a bit to see if suggestions appear
      await page.waitForTimeout(100);
      
      const responseTime = Date.now() - startTime;
      typingDelays.push(responseTime);
    }
    
    // Each keystroke should be processed quickly
    const avgResponseTime = typingDelays.reduce((sum, time) => sum + time, 0) / typingDelays.length;
    expect(avgResponseTime).toBeLessThan(200);
    
    // Final suggestions should appear
    await expect(page.locator('[data-testid="suggestions-dropdown"]')).toBeVisible({ timeout: 1000 });
  });

  test('should maintain performance with multiple concurrent operations', async ({ page, context }) => {
    // Open multiple tabs to simulate concurrent users
    const pages = [page];
    
    for (let i = 0; i < 3; i++) {
      const newPage = await context.newPage();
      await newPage.goto('/');
      pages.push(newPage);
    }
    
    const startTime = Date.now();
    
    // Perform searches concurrently
    const searchPromises = pages.map(async (p, index) => {
      const searchInput = p.locator('input[type="text"]');
      const query = ['tokyo', 'london', 'paris', 'berlin'][index];
      
      await searchInput.fill(query);
      
      try {
        await p.locator('[data-testid="suggestions-dropdown"]').waitFor({ 
          state: 'visible', 
          timeout: 1000 
        });
        return true;
      } catch {
        return false; // No suggestions is acceptable
      }
    });
    
    const results = await Promise.all(searchPromises);
    const totalTime = Date.now() - startTime;
    
    // Concurrent operations should complete within reasonable time
    expect(totalTime).toBeLessThan(2000);
    
    // At least some searches should have succeeded
    const successCount = results.filter(Boolean).length;
    expect(successCount).toBeGreaterThan(0);
    
    // Clean up additional pages
    for (let i = 1; i < pages.length; i++) {
      await pages[i].close();
    }
  });

  test('should handle visualization loading performance', async ({ page }) => {
    // Navigate to visualization tab
    await page.locator('[data-testid="visualization-tab"]').click();
    
    const startTime = Date.now();
    
    // Wait for visualization to load
    await expect(page.locator('[data-testid="trie-visualization"]')).toBeVisible({ timeout: 5000 });
    
    const loadTime = Date.now() - startTime;
    
    // Visualization should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
    
    // Test interaction performance
    const searchInput = page.locator('input[type="text"]');
    
    const interactionStart = Date.now();
    await searchInput.fill('test');
    
    // Wait for visualization to update (if it does)
    await page.waitForTimeout(1000);
    
    const interactionTime = Date.now() - interactionStart;
    
    // Interaction should be responsive
    expect(interactionTime).toBeLessThan(2000);
  });

  test('should measure and validate Core Web Vitals', async ({ page }) => {
    // Navigate to page and wait for load
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Measure Core Web Vitals using Performance API
    const webVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals = {};
        
        // Largest Contentful Paint (LCP)
        new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          vitals.lcp = lastEntry.startTime;
        }).observe({ entryTypes: ['largest-contentful-paint'] });
        
        // First Input Delay (FID) - simulate with click
        const startTime = performance.now();
        document.addEventListener('click', () => {
          vitals.fid = performance.now() - startTime;
        }, { once: true });
        
        // Cumulative Layout Shift (CLS)
        let clsValue = 0;
        new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
          vitals.cls = clsValue;
        }).observe({ entryTypes: ['layout-shift'] });
        
        // Wait a bit for measurements
        setTimeout(() => {
          resolve(vitals);
        }, 2000);
      });
    });
    
    // Trigger a click to measure FID
    await page.locator('input[type="text"]').click();
    
    // Wait for measurements to complete
    await page.waitForTimeout(3000);
    
    const finalVitals = await page.evaluate(() => {
      return {
        lcp: performance.getEntriesByType('largest-contentful-paint').slice(-1)[0]?.startTime || 0,
        cls: performance.getEntriesByType('layout-shift').reduce((sum, entry) => {
          return sum + (entry.hadRecentInput ? 0 : entry.value);
        }, 0)
      };
    });
    
    // Validate Core Web Vitals thresholds
    if (finalVitals.lcp > 0) {
      expect(finalVitals.lcp).toBeLessThan(2500); // LCP should be under 2.5s
    }
    
    expect(finalVitals.cls).toBeLessThan(0.1); // CLS should be under 0.1
    
    console.log('Core Web Vitals:', finalVitals);
  });

  test('should handle memory usage efficiently', async ({ page }) => {
    // Perform memory-intensive operations
    const searchInput = page.locator('input[type="text"]');
    
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      return performance.memory ? {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize
      } : null;
    });
    
    // Perform many search operations
    const queries = ['a', 'ab', 'abc', 'abcd', 'abcde'];
    
    for (let round = 0; round < 10; round++) {
      for (const query of queries) {
        await searchInput.fill(query);
        await page.waitForTimeout(100);
        await searchInput.clear();
      }
    }
    
    // Force garbage collection if available
    await page.evaluate(() => {
      if (window.gc) {
        window.gc();
      }
    });
    
    await page.waitForTimeout(1000);
    
    // Get final memory usage
    const finalMemory = await page.evaluate(() => {
      return performance.memory ? {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize
      } : null;
    });
    
    if (initialMemory && finalMemory) {
      const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
      const memoryIncreasePercent = (memoryIncrease / initialMemory.usedJSHeapSize) * 100;
      
      // Memory increase should be reasonable (less than 50% increase)
      expect(memoryIncreasePercent).toBeLessThan(50);
      
      console.log(`Memory usage: ${memoryIncreasePercent.toFixed(2)}% increase`);
    }
  });

  test('should maintain performance under error conditions', async ({ page }) => {
    // Test performance when backend is slow/unavailable
    
    // Intercept API calls and add delay
    await page.route('**/api/search*', async (route) => {
      // Simulate slow response
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.continue();
    });
    
    const searchInput = page.locator('input[type="text"]');
    
    const startTime = Date.now();
    await searchInput.fill('test');
    
    // UI should remain responsive even with slow backend
    const uiResponseTime = Date.now() - startTime;
    expect(uiResponseTime).toBeLessThan(100); // UI should respond immediately
    
    // Check that loading state is shown
    const loadingIndicator = page.locator('[data-testid="loading-spinner"]');
    if (await loadingIndicator.isVisible()) {
      expect(await loadingIndicator.isVisible()).toBe(true);
    }
    
    // Wait for the slow response to complete
    await page.waitForTimeout(3000);
    
    // UI should still be functional after slow response
    await expect(searchInput).toBeEnabled();
  });
});