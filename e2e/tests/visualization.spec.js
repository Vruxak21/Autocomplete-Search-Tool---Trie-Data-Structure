const { test, expect } = require('@playwright/test');

test.describe('Trie Visualization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should navigate to visualization tab', async ({ page }) => {
    // Click on visualization tab
    const visualizationTab = page.locator('[data-testid="visualization-tab"]');
    await visualizationTab.click();
    
    // Check that visualization content is visible
    const visualizationContent = page.locator('[data-testid="trie-visualization"]');
    await expect(visualizationContent).toBeVisible();
  });

  test('should display trie structure', async ({ page }) => {
    // Navigate to visualization
    await page.locator('[data-testid="visualization-tab"]').click();
    
    // Wait for visualization to load
    const trieGraph = page.locator('[data-testid="trie-graph"]');
    await expect(trieGraph).toBeVisible({ timeout: 10000 });
    
    // Check for SVG elements (D3.js visualization)
    const svgElement = page.locator('svg');
    await expect(svgElement).toBeVisible();
  });

  test('should highlight path when typing in search', async ({ page }) => {
    // Navigate to visualization
    await page.locator('[data-testid="visualization-tab"]').click();
    
    // Wait for visualization to load
    await page.waitForTimeout(2000);
    
    // Type in search input
    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('to');
    
    // Check for highlighted path
    const highlightedNodes = page.locator('.highlighted-node');
    await expect(highlightedNodes.first()).toBeVisible({ timeout: 5000 });
  });

  test('should display time complexity information', async ({ page }) => {
    // Navigate to visualization
    await page.locator('[data-testid="visualization-tab"]').click();
    
    // Check for complexity information
    const complexityInfo = page.locator('[data-testid="complexity-info"]');
    await expect(complexityInfo).toBeVisible();
    
    // Check for specific complexity mentions
    await expect(complexityInfo).toContainText('O(L)');
  });

  test('should be interactive with node clicks', async ({ page }) => {
    // Navigate to visualization
    await page.locator('[data-testid="visualization-tab"]').click();
    
    // Wait for visualization to load
    await page.waitForTimeout(2000);
    
    // Try to click on a node (if interactive)
    const nodes = page.locator('.trie-node');
    if (await nodes.count() > 0) {
      await nodes.first().click();
      
      // Check for some interaction feedback
      const nodeInfo = page.locator('[data-testid="node-info"]');
      await expect(nodeInfo).toBeVisible({ timeout: 3000 });
    }
  });
});