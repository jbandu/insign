import { test, expect } from '@playwright/test';
import { generateTestData } from './utils/test-helpers';

test.describe('Authentication', () => {
  test.describe('Signup Flow', () => {
    test('should successfully create a new organization and user account', async ({ page }) => {
      const testData = generateTestData();

      await page.goto('/auth/signup');

      // Verify signup page loads
      await expect(page).toHaveURL('/auth/signup');
      await expect(page.locator('h1, h2').filter({ hasText: /sign up|create account/i }).first()).toBeVisible();

      // Fill in organization details
      await page.fill('input[name="organizationName"]', testData.orgName);
      await page.fill('input[name="domain"]', testData.orgDomain);

      // Fill in user details
      await page.fill('input[name="firstName"]', testData.firstName);
      await page.fill('input[name="lastName"]', testData.lastName);
      await page.fill('input[name="email"]', testData.email);
      await page.fill('input[name="password"]', testData.password);
      await page.fill('input[name="confirmPassword"]', testData.password);

      // Check terms and conditions
      await page.check('input[type="checkbox"]');

      // Submit the form
      await page.click('button[type="submit"]');

      // Wait for redirect to dashboard
      await page.waitForURL('/dashboard', { timeout: 15000 });

      // Verify we're logged in and on dashboard
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test('should show error for duplicate organization domain', async ({ page }) => {
      const testData = generateTestData();

      // Create first account
      await page.goto('/auth/signup');
      await page.fill('input[name="organizationName"]', testData.orgName);
      await page.fill('input[name="domain"]', testData.orgDomain);
      await page.fill('input[name="firstName"]', testData.firstName);
      await page.fill('input[name="lastName"]', testData.lastName);
      await page.fill('input[name="email"]', testData.email);
      await page.fill('input[name="password"]', testData.password);
      await page.fill('input[name="confirmPassword"]', testData.password);
      await page.check('input[type="checkbox"]');
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard', { timeout: 15000 });

      // Logout (navigate to signup page - this will clear session)
      await page.goto('/auth/signup');

      // Try to create another account with same domain
      const newEmail = `different-${testData.email}`;
      await page.fill('input[name="organizationName"]', `Different ${testData.orgName}`);
      await page.fill('input[name="domain"]', testData.orgDomain); // Same domain
      await page.fill('input[name="firstName"]', testData.firstName);
      await page.fill('input[name="lastName"]', testData.lastName);
      await page.fill('input[name="email"]', newEmail);
      await page.fill('input[name="password"]', testData.password);
      await page.fill('input[name="confirmPassword"]', testData.password);
      await page.check('input[type="checkbox"]');

      // Submit and expect error
      await page.click('button[type="submit"]');

      // Should show error message about domain being taken
      await expect(
        page.locator('text=/domain.*already.*taken|domain.*exists|domain.*unavailable/i')
      ).toBeVisible({ timeout: 5000 });
    });

    test('should show validation errors for invalid input', async ({ page }) => {
      await page.goto('/auth/signup');

      // Try to submit empty form
      await page.click('button[type="submit"]');

      // Should show validation errors
      const errors = page.locator('.text-destructive, .error, [role="alert"]');
      await expect(errors.first()).toBeVisible({ timeout: 3000 });
    });

    test('should show error for password mismatch', async ({ page }) => {
      const testData = generateTestData();

      await page.goto('/auth/signup');

      await page.fill('input[name="organizationName"]', testData.orgName);
      await page.fill('input[name="domain"]', testData.orgDomain);
      await page.fill('input[name="firstName"]', testData.firstName);
      await page.fill('input[name="lastName"]', testData.lastName);
      await page.fill('input[name="email"]', testData.email);
      await page.fill('input[name="password"]', testData.password);
      await page.fill('input[name="confirmPassword"]', 'DifferentPassword123!');

      await page.click('button[type="submit"]');

      // Should show password mismatch error
      await expect(
        page.locator('text=/password.*match|passwords.*same/i')
      ).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Login Flow', () => {
    test('should successfully login with valid credentials', async ({ page }) => {
      const testData = generateTestData();

      // First create an account
      await page.goto('/auth/signup');
      await page.fill('input[name="organizationName"]', testData.orgName);
      await page.fill('input[name="domain"]', testData.orgDomain);
      await page.fill('input[name="firstName"]', testData.firstName);
      await page.fill('input[name="lastName"]', testData.lastName);
      await page.fill('input[name="email"]', testData.email);
      await page.fill('input[name="password"]', testData.password);
      await page.fill('input[name="confirmPassword"]', testData.password);
      await page.check('input[type="checkbox"]');
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard', { timeout: 15000 });

      // Now logout (clear cookies)
      await page.context().clearCookies();

      // Navigate to login page
      await page.goto('/auth/signin');

      // Fill in credentials
      await page.fill('input[name="email"]', testData.email);
      await page.fill('input[name="password"]', testData.password);

      // Submit login form
      await page.click('button[type="submit"]');

      // Should redirect to dashboard
      await page.waitForURL('/dashboard', { timeout: 15000 });
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/auth/signin');

      // Try to login with invalid credentials
      await page.fill('input[name="email"]', 'nonexistent@example.com');
      await page.fill('input[name="password"]', 'WrongPassword123!');
      await page.click('button[type="submit"]');

      // Should show error message
      await expect(
        page.locator('text=/invalid.*credentials|incorrect.*password|login.*failed/i')
      ).toBeVisible({ timeout: 5000 });
    });

    test('should show validation errors for empty fields', async ({ page }) => {
      await page.goto('/auth/signin');

      // Try to submit empty form
      await page.click('button[type="submit"]');

      // Should show validation errors
      const errors = page.locator('.text-destructive, .error, [role="alert"]');
      await expect(errors.first()).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect to login when accessing protected route without authentication', async ({ page }) => {
      await page.goto('/dashboard');

      // Should redirect to signin page
      await page.waitForURL(/\/auth\/signin/, { timeout: 5000 });
      await expect(page).toHaveURL(/\/auth\/signin/);
    });

    test('should redirect to dashboard when accessing auth pages while logged in', async ({ page }) => {
      const testData = generateTestData();

      // Create account and login
      await page.goto('/auth/signup');
      await page.fill('input[name="organizationName"]', testData.orgName);
      await page.fill('input[name="domain"]', testData.orgDomain);
      await page.fill('input[name="firstName"]', testData.firstName);
      await page.fill('input[name="lastName"]', testData.lastName);
      await page.fill('input[name="email"]', testData.email);
      await page.fill('input[name="password"]', testData.password);
      await page.fill('input[name="confirmPassword"]', testData.password);
      await page.check('input[type="checkbox"]');
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard', { timeout: 15000 });

      // Try to access signin page while logged in
      await page.goto('/auth/signin');

      // Should redirect back to dashboard
      await page.waitForURL('/dashboard', { timeout: 5000 });
      await expect(page).toHaveURL('/dashboard');
    });
  });

  test.describe('Session Persistence', () => {
    test('should maintain session after page reload', async ({ page }) => {
      const testData = generateTestData();

      // Create account
      await page.goto('/auth/signup');
      await page.fill('input[name="organizationName"]', testData.orgName);
      await page.fill('input[name="domain"]', testData.orgDomain);
      await page.fill('input[name="firstName"]', testData.firstName);
      await page.fill('input[name="lastName"]', testData.lastName);
      await page.fill('input[name="email"]', testData.email);
      await page.fill('input[name="password"]', testData.password);
      await page.fill('input[name="confirmPassword"]', testData.password);
      await page.check('input[type="checkbox"]');
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard', { timeout: 15000 });

      // Reload the page
      await page.reload();

      // Should still be logged in
      await expect(page).toHaveURL(/\/dashboard/);
    });
  });
});
