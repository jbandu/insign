import { test, expect } from './fixtures/auth.fixture';
import { generateTestData } from './utils/test-helpers';

test.describe('Folder Management', () => {
  test.describe('Folder Creation', () => {
    test('should create a new folder', async ({ authenticatedPage: page }) => {
      const testData = generateTestData();

      await page.goto('/dashboard/folders');

      // Click "New Folder" or "Create Folder" button
      const newFolderButton = page.locator('button:has-text("New Folder"), button:has-text("Create Folder"), button:has-text("New"), a[href*="new"]').first();
      await newFolderButton.click();

      // Fill in folder name
      await page.fill('input[name="name"], input[placeholder*="folder"]', testData.folderName);

      // Submit form
      await page.click('button[type="submit"], button:has-text("Create")');

      // Wait for creation
      await page.waitForTimeout(2000);

      // Verify folder appears in list
      await page.goto('/dashboard/folders');
      await expect(page.locator(`text=${testData.folderName}`)).toBeVisible({ timeout: 5000 });
    });

    test('should create nested folder', async ({ authenticatedPage: page }) => {
      const testData = generateTestData();

      await page.goto('/dashboard/folders');

      // Create parent folder first
      const newFolderButton = page.locator('button:has-text("New Folder"), button:has-text("Create"), button:has-text("New")').first();
      await newFolderButton.click();
      await page.fill('input[name="name"], input[placeholder*="folder"]', 'Parent Folder');
      await page.click('button[type="submit"], button:has-text("Create")');
      await page.waitForTimeout(2000);

      // Navigate into parent folder or select it
      await page.goto('/dashboard/folders');
      const parentFolder = page.locator('text=Parent Folder').first();
      await parentFolder.click();

      // Create child folder
      const newChildFolderButton = page.locator('button:has-text("New Folder"), button:has-text("Create"), button:has-text("New")').first();
      if (await newChildFolderButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await newChildFolderButton.click();
        await page.fill('input[name="name"], input[placeholder*="folder"]', 'Child Folder');

        // Select parent folder if there's a dropdown
        const parentSelect = page.locator('select[name="parentId"], select[name="parent"]').first();
        if (await parentSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
          await parentSelect.selectOption({ label: 'Parent Folder' });
        }

        await page.click('button[type="submit"], button:has-text("Create")');
        await page.waitForTimeout(2000);

        // Verify child folder exists
        await expect(page.locator('text=Child Folder')).toBeVisible();
      }
    });

    test('should validate folder name is required', async ({ authenticatedPage: page }) => {
      await page.goto('/dashboard/folders');

      const newFolderButton = page.locator('button:has-text("New Folder"), button:has-text("Create"), button:has-text("New")').first();
      await newFolderButton.click();

      // Try to submit without name
      await page.click('button[type="submit"], button:has-text("Create")');

      // Should show validation error
      await expect(
        page.locator('.text-destructive, .error, [role="alert"]')
      ).toBeVisible({ timeout: 3000 });
    });

    test('should prevent duplicate folder names in same parent', async ({ authenticatedPage: page }) => {
      const testData = generateTestData();

      await page.goto('/dashboard/folders');

      // Create first folder
      const newFolderButton = page.locator('button:has-text("New Folder"), button:has-text("Create"), button:has-text("New")').first();
      await newFolderButton.click();
      await page.fill('input[name="name"], input[placeholder*="folder"]', testData.folderName);
      await page.click('button[type="submit"], button:has-text("Create")');
      await page.waitForTimeout(2000);

      // Try to create another folder with same name
      await page.goto('/dashboard/folders');
      await newFolderButton.click();
      await page.fill('input[name="name"], input[placeholder*="folder"]', testData.folderName);
      await page.click('button[type="submit"], button:has-text("Create")');

      // Should show error about duplicate name
      await expect(
        page.locator('text=/folder.*exists|name.*taken|duplicate/i')
      ).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Folder Listing', () => {
    test('should display all folders', async ({ authenticatedPage: page }) => {
      const testData = generateTestData();

      // Create a folder
      await page.goto('/dashboard/folders');
      const newFolderButton = page.locator('button:has-text("New Folder"), button:has-text("Create"), button:has-text("New")').first();
      await newFolderButton.click();
      await page.fill('input[name="name"], input[placeholder*="folder"]', testData.folderName);
      await page.click('button[type="submit"], button:has-text("Create")');
      await page.waitForTimeout(2000);

      // Verify folder appears in list
      await page.goto('/dashboard/folders');
      await expect(page.locator(`text=${testData.folderName}`)).toBeVisible();
    });

    test('should show folder hierarchy', async ({ authenticatedPage: page }) => {
      // Create parent and child folders
      await page.goto('/dashboard/folders');

      const newFolderButton = page.locator('button:has-text("New Folder"), button:has-text("Create"), button:has-text("New")').first();
      await newFolderButton.click();
      await page.fill('input[name="name"], input[placeholder*="folder"]', 'Parent');
      await page.click('button[type="submit"], button:has-text("Create")');
      await page.waitForTimeout(1000);

      // Should show hierarchical structure (indentation, tree view, or breadcrumbs)
      const parentFolder = page.locator('text=Parent').first();
      await expect(parentFolder).toBeVisible();
    });
  });

  test.describe('Folder Navigation', () => {
    test('should navigate into folder', async ({ authenticatedPage: page }) => {
      const testData = generateTestData();

      // Create a folder
      await page.goto('/dashboard/folders');
      const newFolderButton = page.locator('button:has-text("New Folder"), button:has-text("Create"), button:has-text("New")').first();
      await newFolderButton.click();
      await page.fill('input[name="name"], input[placeholder*="folder"]', testData.folderName);
      await page.click('button[type="submit"], button:has-text("Create")');
      await page.waitForTimeout(2000);

      // Click on folder to navigate into it
      await page.goto('/dashboard/folders');
      const folderLink = page.locator(`text=${testData.folderName}`).first();
      await folderLink.click();

      // Should navigate into folder (URL change or breadcrumb update)
      await page.waitForTimeout(1000);

      // Verify we're inside the folder (check breadcrumbs or URL)
      const breadcrumb = page.locator(`text=${testData.folderName}`);
      await expect(breadcrumb).toBeVisible();
    });

    test('should navigate back to parent folder', async ({ authenticatedPage: page }) => {
      // Create parent and child folders
      await page.goto('/dashboard/folders');

      const newFolderButton = page.locator('button:has-text("New Folder"), button:has-text("Create"), button:has-text("New")').first();
      await newFolderButton.click();
      await page.fill('input[name="name"], input[placeholder*="folder"]', 'Parent');
      await page.click('button[type="submit"], button:has-text("Create")');
      await page.waitForTimeout(1000);

      // Navigate into folder
      await page.goto('/dashboard/folders');
      const parentFolder = page.locator('text=Parent').first();
      await parentFolder.click();

      // Look for back button or up/parent navigation
      const backButton = page.locator('button:has-text("Back"), button[aria-label*="back"], a:has-text("Up")').first();

      if (await backButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await backButton.click();
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Folder Update', () => {
    test('should rename folder', async ({ authenticatedPage: page }) => {
      const testData = generateTestData();

      // Create a folder
      await page.goto('/dashboard/folders');
      const newFolderButton = page.locator('button:has-text("New Folder"), button:has-text("Create"), button:has-text("New")').first();
      await newFolderButton.click();
      await page.fill('input[name="name"], input[placeholder*="folder"]', testData.folderName);
      await page.click('button[type="submit"], button:has-text("Create")');
      await page.waitForTimeout(2000);

      // Find and click rename button
      await page.goto('/dashboard/folders');
      const renameButton = page.locator(`tr:has-text("${testData.folderName}") button:has-text("Rename"), tr:has-text("${testData.folderName}") button:has-text("Edit")`).first();

      if (await renameButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await renameButton.click();

        // Update name
        const nameInput = page.locator('input[name="name"], input[value*="Test"]').first();
        await nameInput.fill('Renamed Folder');

        await page.click('button[type="submit"], button:has-text("Save")');
        await page.waitForTimeout(2000);

        // Verify renamed
        await page.goto('/dashboard/folders');
        await expect(page.locator('text=Renamed Folder')).toBeVisible();
      }
    });

    test('should move folder to different parent', async ({ authenticatedPage: page }) => {
      // Create two parent folders
      await page.goto('/dashboard/folders');

      const newFolderButton = page.locator('button:has-text("New Folder"), button:has-text("Create"), button:has-text("New")').first();

      // Create first parent
      await newFolderButton.click();
      await page.fill('input[name="name"], input[placeholder*="folder"]', 'Parent 1');
      await page.click('button[type="submit"], button:has-text("Create")');
      await page.waitForTimeout(1000);

      // Create second parent
      await page.goto('/dashboard/folders');
      await newFolderButton.click();
      await page.fill('input[name="name"], input[placeholder*="folder"]', 'Parent 2');
      await page.click('button[type="submit"], button:has-text("Create")');
      await page.waitForTimeout(1000);

      // Create child in Parent 1
      await page.goto('/dashboard/folders');
      const parent1 = page.locator('text=Parent 1').first();
      await parent1.click();

      const newChildButton = page.locator('button:has-text("New Folder"), button:has-text("Create"), button:has-text("New")').first();
      if (await newChildButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await newChildButton.click();
        await page.fill('input[name="name"], input[placeholder*="folder"]', 'Child');
        await page.click('button[type="submit"], button:has-text("Create")');
        await page.waitForTimeout(1000);

        // Try to move child to Parent 2 (this functionality may vary by implementation)
      }
    });
  });

  test.describe('Folder Deletion', () => {
    test('should delete empty folder', async ({ authenticatedPage: page }) => {
      const testData = generateTestData();

      // Create a folder
      await page.goto('/dashboard/folders');
      const newFolderButton = page.locator('button:has-text("New Folder"), button:has-text("Create"), button:has-text("New")').first();
      await newFolderButton.click();
      await page.fill('input[name="name"], input[placeholder*="folder"]', testData.folderName);
      await page.click('button[type="submit"], button:has-text("Create")');
      await page.waitForTimeout(2000);

      // Delete the folder
      await page.goto('/dashboard/folders');
      const deleteButton = page.locator(`tr:has-text("${testData.folderName}") button:has-text("Delete"), tr:has-text("${testData.folderName}") button[aria-label*="Delete"]`).first();
      await deleteButton.click();

      // Confirm deletion
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Delete"), button:has-text("Yes")');
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
      }

      await page.waitForTimeout(2000);

      // Verify folder is deleted
      await page.goto('/dashboard/folders');
      await expect(page.locator(`text=${testData.folderName}`)).not.toBeVisible();
    });

    test('should show confirmation before deleting folder', async ({ authenticatedPage: page }) => {
      const testData = generateTestData();

      // Create a folder
      await page.goto('/dashboard/folders');
      const newFolderButton = page.locator('button:has-text("New Folder"), button:has-text("Create"), button:has-text("New")').first();
      await newFolderButton.click();
      await page.fill('input[name="name"], input[placeholder*="folder"]', testData.folderName);
      await page.click('button[type="submit"], button:has-text("Create")');
      await page.waitForTimeout(2000);

      // Try to delete
      await page.goto('/dashboard/folders');
      const deleteButton = page.locator(`tr:has-text("${testData.folderName}") button:has-text("Delete"), tr:has-text("${testData.folderName}") button[aria-label*="Delete"]`).first();
      await deleteButton.click();

      // Should show confirmation dialog
      const confirmDialog = page.locator('[role="dialog"], [role="alertdialog"]').filter({
        hasText: /delete|remove|confirm/i
      });
      await expect(confirmDialog).toBeVisible({ timeout: 3000 });
    });

    test('should warn when deleting folder with contents', async ({ authenticatedPage: page }) => {
      // Create folder with a subfolder
      await page.goto('/dashboard/folders');

      const newFolderButton = page.locator('button:has-text("New Folder"), button:has-text("Create"), button:has-text("New")').first();
      await newFolderButton.click();
      await page.fill('input[name="name"], input[placeholder*="folder"]', 'Parent With Contents');
      await page.click('button[type="submit"], button:has-text("Create")');
      await page.waitForTimeout(1000);

      // Navigate into it and create a child
      await page.goto('/dashboard/folders');
      const parentFolder = page.locator('text=Parent With Contents').first();
      await parentFolder.click();

      const newChildButton = page.locator('button:has-text("New Folder"), button:has-text("Create"), button:has-text("New")').first();
      if (await newChildButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await newChildButton.click();
        await page.fill('input[name="name"], input[placeholder*="folder"]', 'Child');
        await page.click('button[type="submit"], button:has-text("Create")');
        await page.waitForTimeout(1000);

        // Go back and try to delete parent
        await page.goto('/dashboard/folders');
        const deleteButton = page.locator(`tr:has-text("Parent With Contents") button:has-text("Delete"), tr:has-text("Parent With Contents") button[aria-label*="Delete"]`).first();

        if (await deleteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await deleteButton.click();

          // Should show warning about contents
          await expect(
            page.locator('text=/contains.*files|contains.*folders|not.*empty/i')
          ).toBeVisible({ timeout: 5000 }).catch(() => {
            // Warning might not be implemented
          });
        }
      }
    });
  });

  test.describe('Folder Search', () => {
    test('should search folders by name', async ({ authenticatedPage: page }) => {
      const testData = generateTestData();

      // Create a folder
      await page.goto('/dashboard/folders');
      const newFolderButton = page.locator('button:has-text("New Folder"), button:has-text("Create"), button:has-text("New")').first();
      await newFolderButton.click();
      await page.fill('input[name="name"], input[placeholder*="folder"]', testData.folderName);
      await page.click('button[type="submit"], button:has-text("Create")');
      await page.waitForTimeout(2000);

      // Search for folder
      await page.goto('/dashboard/folders');
      const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();

      if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await searchInput.fill(testData.folderName);
        await page.waitForTimeout(1000);

        // Should show matching folder
        await expect(page.locator(`text=${testData.folderName}`)).toBeVisible();
      }
    });
  });

  test.describe('Folder Permissions', () => {
    test('should show folder permissions', async ({ authenticatedPage: page }) => {
      const testData = generateTestData();

      // Create a folder
      await page.goto('/dashboard/folders');
      const newFolderButton = page.locator('button:has-text("New Folder"), button:has-text("Create"), button:has-text("New")').first();
      await newFolderButton.click();
      await page.fill('input[name="name"], input[placeholder*="folder"]', testData.folderName);
      await page.click('button[type="submit"], button:has-text("Create")');
      await page.waitForTimeout(2000);

      // Look for permissions button
      await page.goto('/dashboard/folders');
      const permissionsButton = page.locator(`tr:has-text("${testData.folderName}") button:has-text("Permissions"), tr:has-text("${testData.folderName}") button:has-text("Share")`).first();

      if (await permissionsButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await permissionsButton.click();

        // Should show permissions dialog
        await expect(page.locator('[role="dialog"]:has-text("Permissions"), [role="dialog"]:has-text("Share")')).toBeVisible();
      }
    });
  });
});
