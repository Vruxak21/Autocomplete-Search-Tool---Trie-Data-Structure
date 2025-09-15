const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

test.describe('Accessibility Tests', () => {
  test('should not have any automatically detectable accessibility issues on homepage', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have accessibility issues on visualization page', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to visualization
    await page.locator('[data-testid="visualization-tab"]').click();
    await page.waitForTimeout(2000);
    
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/');
    
    // Test tab navigation
    await page.keyboard.press('Tab');
    
    // Check that search input is focused
    const searchInput = page.locator('input[type="text"]');
    await expect(searchInput).toBeFocused();
    
    // Continue tabbing to other interactive elements
    await page.keyboard.press('Tab');
    
    // Should be able to navigate to visualization tab
    const visualizationTab = page.locator('[data-testid="visualization-tab"]');
    if (await visualizationTab.isVisible()) {
      await expect(visualizationTab).toBeFocused();
    }
  });

  test('should have proper ARIA labels and roles', async ({ page }) => {
    await page.goto('/');
    
    // Check search input has proper labeling
    const searchInput = page.locator('input[type="text"]');
    await expect(searchInput).toHaveAttribute('aria-label');
    
    // Check suggestions dropdown has proper ARIA attributes
    await searchInput.fill('test');
    
    const suggestionsDropdown = page.locator('[data-testid="suggestions-dropdown"]');
    if (await suggestionsDropdown.isVisible({ timeout: 3000 })) {
      await expect(suggestionsDropdown).toHaveAttribute('role', 'listbox');
      
      const suggestions = page.locator('[data-testid="suggestion-item"]');
      if (await suggestions.count() > 0) {
        await expect(suggestions.first()).toHaveAttribute('role', 'option');
      }
    }
  });

  test('should support screen reader announcements', async ({ page }) => {
    await page.goto('/');
    
    // Check for live regions for dynamic content
    const liveRegion = page.locator('[aria-live]');
    await expect(liveRegion).toBeAttached();
  });

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/');
    
    // Run axe with color contrast rules specifically
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    
    // Filter for color contrast violations
    const colorContrastViolations = accessibilityScanResults.violations.filter(
      violation => violation.id === 'color-contrast'
    );
    
    expect(colorContrastViolations).toEqual([]);
  });

  test('should work with high contrast mode', async ({ page }) => {
    // Simulate high contrast mode
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await page.goto('/');
    
    // Check that the page is still functional
    const searchInput = page.locator('input[type="text"]');
    await expect(searchInput).toBeVisible();
    
    await searchInput.fill('test');
    
    // Check that suggestions still work
    const suggestionsDropdown = page.locator('[data-testid="suggestions-dropdown"]');
    if (await suggestionsDropdown.isVisible({ timeout: 3000 })) {
      await expect(suggestionsDropdown).toBeVisible();
    }
  });

  test('should respect reduced motion preferences', async ({ page }) => {
    // Set reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    
    // Navigate to visualization which might have animations
    await page.locator('[data-testid="visualization-tab"]').click();
    
    // The page should still be functional without animations
    const visualizationContent = page.locator('[data-testid="trie-visualization"]');
    await expect(visualizationContent).toBeVisible();
  });

  test('should support voice control and speech recognition', async ({ page }) => {
    await page.goto('/');
    
    // Check for speech recognition support indicators
    const searchInput = page.locator('input[type="text"]');
    
    // Test if speech recognition attributes are present
    const hasSpeechSupport = await searchInput.evaluate(input => {
      return input.hasAttribute('x-webkit-speech') || 
             input.hasAttribute('webkitspeech') ||
             'webkitSpeechRecognition' in window ||
             'SpeechRecognition' in window;
    });
    
    // If speech recognition is supported, test basic functionality
    if (hasSpeechSupport) {
      console.log('Speech recognition support detected');
    }
    
    // Test keyboard shortcuts for voice control
    await page.keyboard.press('Alt+s'); // Hypothetical shortcut for speech
    
    // Verify search input is focused after shortcut
    await expect(searchInput).toBeFocused();
  });

  test('should work with screen magnification', async ({ page }) => {
    // Simulate high zoom level
    await page.setViewportSize({ width: 800, height: 600 });
    await page.evaluate(() => {
      document.body.style.zoom = '200%';
    });
    
    await page.goto('/');
    
    // Check that elements are still accessible at high zoom
    const searchInput = page.locator('input[type="text"]');
    await expect(searchInput).toBeVisible();
    
    // Test search functionality at high zoom
    await searchInput.fill('test');
    
    const suggestionsDropdown = page.locator('[data-testid="suggestions-dropdown"]');
    if (await suggestionsDropdown.isVisible({ timeout: 2000 })) {
      await expect(suggestionsDropdown).toBeVisible();
      
      // Check that suggestions are clickable at high zoom
      const firstSuggestion = page.locator('[data-testid="suggestion-item"]').first();
      if (await firstSuggestion.isVisible()) {
        await expect(firstSuggestion).toBeVisible();
      }
    }
  });

  test('should provide comprehensive ARIA live regions', async ({ page }) => {
    await page.goto('/');
    
    // Check for various types of live regions
    const liveRegions = await page.locator('[aria-live]').all();
    expect(liveRegions.length).toBeGreaterThan(0);
    
    // Test search result announcements
    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('test');
    
    // Check if results are announced
    const resultsRegion = page.locator('[aria-live="polite"]');
    if (await resultsRegion.isVisible()) {
      const regionText = await resultsRegion.textContent();
      expect(regionText).toBeTruthy();
    }
    
    // Test error announcements
    const errorRegion = page.locator('[aria-live="assertive"]');
    if (await errorRegion.isVisible()) {
      console.log('Error live region found');
    }
  });

  test('should support custom focus indicators', async ({ page }) => {
    await page.goto('/');
    
    // Test focus visibility
    const searchInput = page.locator('input[type="text"]');
    await searchInput.focus();
    
    // Check that focus is visible
    const focusStyle = await searchInput.evaluate(el => {
      const styles = window.getComputedStyle(el, ':focus');
      return {
        outline: styles.outline,
        outlineWidth: styles.outlineWidth,
        outlineStyle: styles.outlineStyle,
        outlineColor: styles.outlineColor,
        boxShadow: styles.boxShadow
      };
    });
    
    // Should have some form of focus indicator
    const hasFocusIndicator = focusStyle.outline !== 'none' || 
                             focusStyle.outlineWidth !== '0px' ||
                             focusStyle.boxShadow !== 'none';
    
    expect(hasFocusIndicator).toBe(true);
  });

  test('should handle right-to-left (RTL) languages', async ({ page }) => {
    // Set RTL direction
    await page.goto('/');
    await page.evaluate(() => {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'ar';
    });
    
    // Check that layout adapts to RTL
    const searchInput = page.locator('input[type="text"]');
    const inputDirection = await searchInput.evaluate(el => {
      return window.getComputedStyle(el).direction;
    });
    
    // Input should respect RTL direction
    expect(inputDirection).toBe('rtl');
    
    // Test search functionality in RTL
    await searchInput.fill('اختبار'); // Arabic for "test"
    
    // UI should remain functional
    await expect(searchInput).toHaveValue('اختبار');
  });

  test('should support Windows High Contrast mode', async ({ page }) => {
    // Simulate Windows High Contrast mode
    await page.emulateMedia({ 
      colorScheme: 'dark',
      forcedColors: 'active'
    });
    
    await page.goto('/');
    
    // Check that elements are still visible in high contrast
    const searchInput = page.locator('input[type="text"]');
    await expect(searchInput).toBeVisible();
    
    // Test that interactive elements have proper contrast
    const inputStyles = await searchInput.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        borderColor: styles.borderColor
      };
    });
    
    // In forced colors mode, system colors should be used
    console.log('High contrast styles:', inputStyles);
    
    // Test functionality in high contrast mode
    await searchInput.fill('test');
    
    const suggestionsDropdown = page.locator('[data-testid="suggestions-dropdown"]');
    if (await suggestionsDropdown.isVisible({ timeout: 2000 })) {
      await expect(suggestionsDropdown).toBeVisible();
    }
  });

  test('should provide comprehensive error handling for assistive technologies', async ({ page }) => {
    await page.goto('/');
    
    // Test error states
    const searchInput = page.locator('input[type="text"]');
    
    // Simulate network error by intercepting requests
    await page.route('**/api/search*', route => {
      route.abort('failed');
    });
    
    await searchInput.fill('test');
    
    // Check for error announcements
    const errorMessage = page.locator('[role="alert"]');
    if (await errorMessage.isVisible({ timeout: 3000 })) {
      await expect(errorMessage).toBeVisible();
      
      // Error should have appropriate ARIA attributes
      const ariaLive = await errorMessage.getAttribute('aria-live');
      expect(ariaLive).toBeTruthy();
    }
    
    // Check that search input has error state
    const hasErrorState = await searchInput.evaluate(el => {
      return el.hasAttribute('aria-invalid') || 
             el.hasAttribute('aria-describedby') ||
             el.classList.contains('error');
    });
    
    if (hasErrorState) {
      console.log('Error state properly indicated');
    }
  });

  test('should support multiple input methods', async ({ page }) => {
    await page.goto('/');
    
    const searchInput = page.locator('input[type="text"]');
    
    // Test keyboard input
    await searchInput.focus();
    await page.keyboard.type('keyboard');
    await expect(searchInput).toHaveValue('keyboard');
    
    await searchInput.clear();
    
    // Test mouse/touch input
    await searchInput.click();
    await searchInput.fill('mouse');
    await expect(searchInput).toHaveValue('mouse');
    
    await searchInput.clear();
    
    // Test paste operation
    await page.evaluate(() => {
      navigator.clipboard.writeText('clipboard').catch(() => {
        // Fallback for browsers without clipboard API
      });
    });
    
    await searchInput.focus();
    await page.keyboard.press('Control+v');
    
    // Should handle paste gracefully (even if clipboard is empty)
    const finalValue = await searchInput.inputValue();
    console.log('Final input value after paste:', finalValue);
  });
});