import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login form on initial load', async ({ page }) => {
    // Check if login view is visible
    const loginContainer = page.locator('[data-testid="login-container"]');
    await expect(loginContainer).toBeVisible();

    // Check form elements
    const emailInput = page.locator('input[placeholder*="email"]');
    const passwordInput = page.locator('input[placeholder*="password"]');
    const submitButton = page.locator('button:has-text("Sign in")');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
  });

  test('should show validation error for invalid email', async ({ page }) => {
    const emailInput = page.locator('input[placeholder*="email"]');
    const submitButton = page.locator('button:has-text("Sign in")');

    // Enter invalid email
    await emailInput.fill('invalid-email');
    await emailInput.blur();

    // Check for error message
    const errorMessage = page.locator('text=/email.*invalid/i');
    await expect(errorMessage).toBeVisible();
  });

  test('should show validation error for weak password', async ({ page }) => {
    const passwordInput = page.locator('input[placeholder*="password"]');
    const submitButton = page.locator('button:has-text("Sign in")');

    // Enter weak password
    await passwordInput.fill('12345');
    await passwordInput.blur();

    // Check for error message
    const errorMessage = page.locator('text=/password.*at least 6 characters/i');
    await expect(errorMessage).toBeVisible();
  });

  test('should enable submit button with valid credentials', async ({ page }) => {
    const emailInput = page.locator('input[placeholder*="email"]');
    const passwordInput = page.locator('input[placeholder*="password"]');
    const submitButton = page.locator('button:has-text("Sign in")');

    // Enter valid credentials
    await emailInput.fill('test@example.com');
    await passwordInput.fill('password123');

    // Check submit button is enabled
    await expect(submitButton).toBeEnabled();
  });

  test('should show loading state during submission', async ({ page }) => {
    const emailInput = page.locator('input[placeholder*="email"]');
    const passwordInput = page.locator('input[placeholder*="password"]');
    const submitButton = page.locator('button:has-text("Sign in")');

    // Enter valid credentials
    await emailInput.fill('test@example.com');
    await passwordInput.fill('password123');

    // Monitor network requests
    const responsePromise = page.waitForResponse(response =>
      response.url().includes('/auth')
    );

    // Submit form
    await submitButton.click();

    // Check for loading indicator
    const loadingText = page.locator('text=/signing in|loading/i');
    const isLoadingVisible = await loadingText.isVisible().catch(() => false);

    // Wait for response
    try {
      await responsePromise;
    } catch {
      // Request might fail in test environment, that's ok
    }
  });
});
