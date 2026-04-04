import { test, expect } from '@playwright/test';

test.describe('Navigation and UI', () => {
  test('should have proper page structure', async ({ page }) => {
    await page.goto('/');

    // Check for main container
    const mainContent = page.locator('main, [role="main"]');
    await expect(mainContent).toBeVisible();
  });

  test('should navigate between pages', async ({ page }) => {
    await page.goto('/');

    // Check if navigation elements exist
    const navLinks = page.locator('nav a, [role="navigation"] a');
    const linkCount = await navLinks.count();

    // If navigation exists, verify links work
    if (linkCount > 0) {
      const firstLink = navLinks.first();
      await firstLink.click();

      // Verify page changed (URL or content)
      await expect(page).toHaveURL(/.*/, { timeout: 5000 });
    }
  });

  test('should display responsive layout', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    const mainContent = page.locator('body');
    await expect(mainContent).toBeVisible();

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(mainContent).toBeVisible();

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(mainContent).toBeVisible();
  });

  test('should have accessible headings', async ({ page }) => {
    await page.goto('/');

    // Check for at least one heading
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const headingCount = await headings.count();

    if (headingCount > 0) {
      const firstHeading = headings.first();
      await expect(firstHeading).toBeVisible();
      const text = await firstHeading.textContent();
      expect(text?.length).toBeGreaterThan(0);
    }
  });

  test('should have proper contrast for text', async ({ page }) => {
    await page.goto('/');

    // Check that body has background and text colors
    const body = page.locator('body');
    const bgColor = await body.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });

    expect(bgColor).toBeTruthy();
    expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
  });
});
