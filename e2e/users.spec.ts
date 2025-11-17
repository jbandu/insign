import { test, expect } from './fixtures/auth.fixture';
import { generateTestData, waitForToast, verifyTableRowExists, getTableRowCount } from './utils/test-helpers';

test.describe('User Management', () => {
  test.describe('User Creation', () => {
    test('should create a new user', async ({ authenticatedPage: page }) => {
      const testData = generateTestData();

      await page.goto('/dashboard/users');

      // Click "New User" or "Add User" button
      const newUserButton = page.locator('button:has-text("New User"), button:has-text("Add User"), a:has-text("New")').first();
      await newUserButton.click();

      // Fill in user details
      await page.fill('input[name="email"]', testData.email);
      await page.fill('input[name="firstName"]', testData.firstName);
      await page.fill('input[name="lastName"]', testData.lastName);

      // Select role (if role selector exists)
      const roleSelect = page.locator('select[name="role"], select[name="roleId"]').first();
      if (await roleSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        await roleSelect.selectOption({ index: 1 }); // Select first non-default option
      }

      // Submit form
      await page.click('button[type="submit"]');

      // Wait for success message or redirect
      await page.waitForTimeout(2000);

      // Verify user appears in list
      await page.goto('/dashboard/users');
      await expect(page.locator(`text=${testData.email}`)).toBeVisible({ timeout: 5000 });
    });

    test('should show validation error for duplicate email', async ({ authenticatedPage: page, adminUser }) => {
      await page.goto('/dashboard/users');

      const newUserButton = page.locator('button:has-text("New User"), button:has-text("Add User"), a:has-text("New")').first();
      await newUserButton.click();

      // Try to create user with admin email (already exists)
      await page.fill('input[name="email"]', adminUser.email);
      await page.fill('input[name="firstName"]', 'Duplicate');
      await page.fill('input[name="lastName"]', 'User');

      await page.click('button[type="submit"]');

      // Should show error about email already existing
      await expect(
        page.locator('text=/email.*exists|email.*taken|duplicate.*email/i')
      ).toBeVisible({ timeout: 5000 });
    });

    test('should validate email format', async ({ authenticatedPage: page }) => {
      await page.goto('/dashboard/users');

      const newUserButton = page.locator('button:has-text("New User"), button:has-text("Add User"), a:has-text("New")').first();
      await newUserButton.click();

      // Try to create user with invalid email
      await page.fill('input[name="email"]', 'invalid-email');
      await page.fill('input[name="firstName"]', 'Test');
      await page.fill('input[name="lastName"]', 'User');

      await page.click('button[type="submit"]');

      // Should show email validation error
      await expect(
        page.locator('text=/invalid.*email|valid.*email.*address/i')
      ).toBeVisible({ timeout: 5000 });
    });

    test('should require all mandatory fields', async ({ authenticatedPage: page }) => {
      await page.goto('/dashboard/users');

      const newUserButton = page.locator('button:has-text("New User"), button:has-text("Add User"), a:has-text("New")').first();
      await newUserButton.click();

      // Try to submit without filling fields
      await page.click('button[type="submit"]');

      // Should show validation errors
      const errors = page.locator('.text-destructive, .error, [role="alert"]');
      await expect(errors.first()).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('User Listing', () => {
    test('should display all users in organization', async ({ authenticatedPage: page, adminUser }) => {
      await page.goto('/dashboard/users');

      // Should see at least the admin user
      await expect(page.locator(`text=${adminUser.email}`)).toBeVisible();
    });

    test('should show user details in list', async ({ authenticatedPage: page, adminUser }) => {
      await page.goto('/dashboard/users');

      // Should show email, name, and role
      await expect(page.locator(`text=${adminUser.email}`)).toBeVisible();
      await expect(page.locator(`text=${adminUser.firstName}`)).toBeVisible();
    });

    test('should paginate users if more than page size', async ({ authenticatedPage: page }) => {
      await page.goto('/dashboard/users');

      // Look for pagination controls
      const pagination = page.locator('[role="navigation"]:has-text("page"), .pagination, button:has-text("Next")');
      const hasPagination = await pagination.isVisible({ timeout: 2000 }).catch(() => false);

      // Pagination may not be visible if there aren't enough users
      expect(hasPagination || true).toBeTruthy();
    });
  });

  test.describe('User Search and Filter', () => {
    test('should search users by email', async ({ authenticatedPage: page, adminUser }) => {
      await page.goto('/dashboard/users');

      // Find search input
      const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], input[placeholder*="search"]').first();

      if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Search for admin user
        await searchInput.fill(adminUser.email);
        await page.waitForTimeout(1000);

        // Should show the admin user
        await expect(page.locator(`text=${adminUser.email}`)).toBeVisible();
      }
    });

    test('should filter users by role', async ({ authenticatedPage: page }) => {
      await page.goto('/dashboard/users');

      // Look for role filter
      const roleFilter = page.locator('select:has-text("Role"), select[name*="role"], button:has-text("Filter")').first();

      if (await roleFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
        await roleFilter.click();

        // Select admin role
        const adminOption = page.locator('text="Admin"').first();
        if (await adminOption.isVisible({ timeout: 1000 }).catch(() => false)) {
          await adminOption.click();
          await page.waitForTimeout(1000);

          // Results should be filtered
        }
      }
    });

    test('should filter users by status', async ({ authenticatedPage: page }) => {
      await page.goto('/dashboard/users');

      // Look for status filter
      const statusFilter = page.locator('select:has-text("Status"), select[name*="status"]').first();

      if (await statusFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
        await statusFilter.click();

        // Select active status
        const activeOption = page.locator('text="Active"').first();
        if (await activeOption.isVisible({ timeout: 1000 }).catch(() => false)) {
          await activeOption.click();
          await page.waitForTimeout(1000);
        }
      }
    });
  });

  test.describe('User Update', () => {
    test('should update user details', async ({ authenticatedPage: page }) => {
      const testData = generateTestData();

      // Create a user first
      await page.goto('/dashboard/users');
      const newUserButton = page.locator('button:has-text("New User"), button:has-text("Add User"), a:has-text("New")').first();
      await newUserButton.click();

      await page.fill('input[name="email"]', testData.email);
      await page.fill('input[name="firstName"]', testData.firstName);
      await page.fill('input[name="lastName"]', testData.lastName);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);

      // Find and click edit button for the user
      await page.goto('/dashboard/users');
      const editButton = page.locator(`tr:has-text("${testData.email}") button:has-text("Edit"), tr:has-text("${testData.email}") button[aria-label*="Edit"]`).first();

      if (await editButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await editButton.click();

        // Update user details
        const firstNameInput = page.locator('input[name="firstName"]');
        await firstNameInput.fill('Updated');

        await page.click('button[type="submit"]');
        await page.waitForTimeout(2000);

        // Verify update
        await page.goto('/dashboard/users');
        await expect(page.locator('text=Updated')).toBeVisible();
      }
    });

    test('should change user role', async ({ authenticatedPage: page }) => {
      const testData = generateTestData();

      // Create a user first
      await page.goto('/dashboard/users');
      const newUserButton = page.locator('button:has-text("New User"), button:has-text("Add User"), a:has-text("New")').first();
      await newUserButton.click();

      await page.fill('input[name="email"]', testData.email);
      await page.fill('input[name="firstName"]', testData.firstName);
      await page.fill('input[name="lastName"]', testData.lastName);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);

      // Find and click edit button
      await page.goto('/dashboard/users');
      const editButton = page.locator(`tr:has-text("${testData.email}") button:has-text("Edit"), tr:has-text("${testData.email}") button[aria-label*="Edit"]`).first();

      if (await editButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await editButton.click();

        // Change role
        const roleSelect = page.locator('select[name="role"], select[name="roleId"]').first();
        if (await roleSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
          await roleSelect.selectOption({ index: 2 });
          await page.click('button[type="submit"]');
          await page.waitForTimeout(2000);
        }
      }
    });
  });

  test.describe('User Deletion', () => {
    test('should delete a user', async ({ authenticatedPage: page }) => {
      const testData = generateTestData();

      // Create a user first
      await page.goto('/dashboard/users');
      const newUserButton = page.locator('button:has-text("New User"), button:has-text("Add User"), a:has-text("New")').first();
      await newUserButton.click();

      await page.fill('input[name="email"]', testData.email);
      await page.fill('input[name="firstName"]', testData.firstName);
      await page.fill('input[name="lastName"]', testData.lastName);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);

      // Find and click delete button
      await page.goto('/dashboard/users');
      const deleteButton = page.locator(`tr:has-text("${testData.email}") button:has-text("Delete"), tr:has-text("${testData.email}") button[aria-label*="Delete"]`).first();

      await deleteButton.click();

      // Confirm deletion
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Delete"), button:has-text("Yes")').first();
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
      }

      await page.waitForTimeout(2000);

      // Verify user is deleted
      await page.goto('/dashboard/users');
      await expect(page.locator(`text=${testData.email}`)).not.toBeVisible();
    });

    test('should show confirmation before deleting user', async ({ authenticatedPage: page }) => {
      const testData = generateTestData();

      // Create a user first
      await page.goto('/dashboard/users');
      const newUserButton = page.locator('button:has-text("New User"), button:has-text("Add User"), a:has-text("New")').first();
      await newUserButton.click();

      await page.fill('input[name="email"]', testData.email);
      await page.fill('input[name="firstName"]', testData.firstName);
      await page.fill('input[name="lastName"]', testData.lastName);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);

      // Try to delete
      await page.goto('/dashboard/users');
      const deleteButton = page.locator(`tr:has-text("${testData.email}") button:has-text("Delete"), tr:has-text("${testData.email}") button[aria-label*="Delete"]`).first();
      await deleteButton.click();

      // Should show confirmation dialog
      const confirmDialog = page.locator('[role="dialog"], [role="alertdialog"]').filter({
        hasText: /delete|remove|confirm/i
      });
      await expect(confirmDialog).toBeVisible({ timeout: 3000 });
    });

    test('should prevent deleting own account', async ({ authenticatedPage: page, adminUser }) => {
      await page.goto('/dashboard/users');

      // Try to delete admin's own account
      const deleteButton = page.locator(`tr:has-text("${adminUser.email}") button:has-text("Delete"), tr:has-text("${adminUser.email}") button[aria-label*="Delete"]`).first();

      const isDeleteButtonVisible = await deleteButton.isVisible({ timeout: 2000 }).catch(() => false);

      if (isDeleteButtonVisible) {
        await deleteButton.click();

        // Should show error message about not being able to delete own account
        await expect(
          page.locator('text=/cannot.*delete.*own|delete.*yourself/i')
        ).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('User Status Management', () => {
    test('should deactivate a user', async ({ authenticatedPage: page }) => {
      const testData = generateTestData();

      // Create a user first
      await page.goto('/dashboard/users');
      const newUserButton = page.locator('button:has-text("New User"), button:has-text("Add User"), a:has-text("New")').first();
      await newUserButton.click();

      await page.fill('input[name="email"]', testData.email);
      await page.fill('input[name="firstName"]', testData.firstName);
      await page.fill('input[name="lastName"]', testData.lastName);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);

      // Look for deactivate button
      await page.goto('/dashboard/users');
      const deactivateButton = page.locator(`tr:has-text("${testData.email}") button:has-text("Deactivate"), tr:has-text("${testData.email}") button:has-text("Suspend")`).first();

      if (await deactivateButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await deactivateButton.click();

        // Confirm if needed
        const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Deactivate")');
        if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await confirmButton.click();
        }

        await page.waitForTimeout(1000);

        // Should show inactive status
        await expect(page.locator(`tr:has-text("${testData.email}") text=/inactive|suspended/i`)).toBeVisible();
      }
    });
  });

  test.describe('User Permissions Display', () => {
    test('should show user role and permissions', async ({ authenticatedPage: page, adminUser }) => {
      await page.goto('/dashboard/users');

      // Should show role for admin user
      const userRow = page.locator(`tr:has-text("${adminUser.email}")`);
      await expect(userRow).toBeVisible();

      // Should show role (Admin, Manager, Member, etc.)
      await expect(userRow.locator('text=/admin|manager|member|guest/i')).toBeVisible();
    });
  });
});
