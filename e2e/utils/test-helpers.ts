import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Generate unique test data
 */
export function generateTestData() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);

  return {
    timestamp,
    random,
    orgName: `Test Org ${timestamp}`,
    orgDomain: `testorg${timestamp}${random}`,
    email: `user-${timestamp}-${random}@test.com`,
    firstName: 'Test',
    lastName: `User${timestamp}`,
    password: 'TestPassword123!',
    folderName: `Test Folder ${timestamp}`,
    documentName: `Test Document ${timestamp}.pdf`,
  };
}

/**
 * Wait for toast/notification message
 */
export async function waitForToast(page: Page, message?: string) {
  const toast = page.locator('[role="status"], .toast, [data-testid="toast"]').first();
  await expect(toast).toBeVisible({ timeout: 5000 });

  if (message) {
    await expect(toast).toContainText(message);
  }

  return toast;
}

/**
 * Navigate to dashboard section
 */
export async function navigateToDashboard(page: Page, section: string) {
  await page.goto(`/dashboard/${section}`);
  await page.waitForLoadState('networkidle');
}

/**
 * Upload a file (for document upload tests)
 */
export async function uploadFile(page: Page, filePath: string, inputSelector = 'input[type="file"]') {
  const fileInput = page.locator(inputSelector);
  await fileInput.setInputFiles(filePath);
}

/**
 * Create a test file for upload
 */
export async function createTestFile(fileName: string, content: string): Promise<Buffer> {
  return Buffer.from(content);
}

/**
 * Wait for network idle
 */
export async function waitForNetworkIdle(page: Page) {
  await page.waitForLoadState('networkidle');
}

/**
 * Check if element exists without throwing
 */
export async function elementExists(page: Page, selector: string): Promise<boolean> {
  try {
    const element = await page.locator(selector).first();
    return await element.isVisible({ timeout: 2000 });
  } catch {
    return false;
  }
}

/**
 * Fill form field by label
 */
export async function fillFieldByLabel(page: Page, label: string, value: string) {
  const field = page.locator(`label:has-text("${label}")`).locator('..').locator('input, textarea');
  await field.fill(value);
}

/**
 * Click button by text
 */
export async function clickButtonByText(page: Page, text: string) {
  await page.click(`button:has-text("${text}")`);
}

/**
 * Wait for API response
 */
export async function waitForApiResponse(page: Page, urlPattern: string | RegExp) {
  return await page.waitForResponse(
    (response) => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    },
    { timeout: 10000 }
  );
}

/**
 * Verify table row exists with text
 */
export async function verifyTableRowExists(page: Page, text: string) {
  const row = page.locator('tr').filter({ hasText: text });
  await expect(row).toBeVisible();
  return row;
}

/**
 * Get row count in table
 */
export async function getTableRowCount(page: Page, tableSelector = 'table'): Promise<number> {
  const rows = await page.locator(`${tableSelector} tbody tr`).count();
  return rows;
}

/**
 * Clear session storage
 */
export async function clearSessionStorage(page: Page) {
  await page.evaluate(() => sessionStorage.clear());
}

/**
 * Clear local storage
 */
export async function clearLocalStorage(page: Page) {
  await page.evaluate(() => localStorage.clear());
}

/**
 * Wait for element to disappear
 */
export async function waitForElementToDisappear(page: Page, selector: string) {
  await page.waitForSelector(selector, { state: 'hidden', timeout: 5000 });
}

/**
 * Verify error message is displayed
 */
export async function verifyErrorMessage(page: Page, message: string) {
  const error = page.locator('.text-destructive, .error, [role="alert"]').filter({ hasText: message });
  await expect(error).toBeVisible();
}

/**
 * Verify success message is displayed
 */
export async function verifySuccessMessage(page: Page, message: string) {
  await waitForToast(page, message);
}
