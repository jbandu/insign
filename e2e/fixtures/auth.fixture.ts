import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

type AuthFixtures = {
  authenticatedPage: Page;
  adminUser: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    orgName: string;
    orgDomain: string;
  };
};

/**
 * Extended test with authentication fixtures
 * Provides a pre-authenticated page for tests that require login
 */
export const test = base.extend<AuthFixtures>({
  adminUser: async ({}, use) => {
    const timestamp = Date.now();
    const user = {
      email: `admin-${timestamp}@test-org-${timestamp}.com`,
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'Admin',
      orgName: `Test Org ${timestamp}`,
      orgDomain: `testorg${timestamp}`,
    };
    await use(user);
  },

  authenticatedPage: async ({ page, adminUser }, use) => {
    // Navigate to signup page
    await page.goto('/auth/signup');

    // Fill in organization details
    await page.fill('input[name="organizationName"]', adminUser.orgName);
    await page.fill('input[name="domain"]', adminUser.orgDomain);

    // Fill in user details
    await page.fill('input[name="firstName"]', adminUser.firstName);
    await page.fill('input[name="lastName"]', adminUser.lastName);
    await page.fill('input[name="email"]', adminUser.email);
    await page.fill('input[name="password"]', adminUser.password);
    await page.fill('input[name="confirmPassword"]', adminUser.password);

    // Check terms and conditions
    await page.check('input[type="checkbox"]');

    // Submit the form
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // Verify we're logged in
    await expect(page).toHaveURL(/\/dashboard/);

    await use(page);
  },
});

export { expect } from '@playwright/test';

/**
 * Login helper function
 */
export async function login(page: Page, email: string, password: string) {
  await page.goto('/auth/signin');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard', { timeout: 10000 });
}

/**
 * Logout helper function
 */
export async function logout(page: Page) {
  // Click on user menu (usually in header)
  await page.click('[data-testid="user-menu"]').catch(() => {
    // Fallback: look for logout button or link
    return page.click('text=Logout').catch(() => {
      return page.click('text=Sign out');
    });
  });

  // Wait for redirect to login page
  await page.waitForURL(/\/auth\/signin/, { timeout: 5000 });
}
