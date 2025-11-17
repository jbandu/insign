# E2E Testing Guide

This document describes the end-to-end testing setup for the Insign platform using Playwright.

## 📋 Table of Contents

- [Overview](#overview)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Coverage](#test-coverage)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

## Overview

The Insign platform uses [Playwright](https://playwright.dev/) for comprehensive end-to-end testing. Our test suite covers all major user flows and features across multiple browsers.

### Why Playwright?

- ✅ **Multi-browser support** - Test in Chromium, Firefox, and WebKit
- ✅ **Auto-wait** - Automatically waits for elements to be ready
- ✅ **Parallel execution** - Run tests concurrently for faster feedback
- ✅ **Rich debugging** - UI mode, trace viewer, and screenshots
- ✅ **Mobile testing** - Test responsive layouts on mobile viewports

## Test Structure

```
e2e/
├── fixtures/
│   ├── auth.fixture.ts        # Authentication fixtures for logged-in tests
│   └── test-document.pdf      # Sample PDF for upload tests
├── utils/
│   ├── test-helpers.ts        # Common helper functions
│   └── db-helpers.ts          # Database utilities for test setup
├── auth.spec.ts               # Authentication flow tests
├── documents.spec.ts          # Document management tests
├── users.spec.ts              # User management tests
├── folders.spec.ts            # Folder management tests
├── roles.spec.ts              # Role-based access control tests
└── signatures.spec.ts         # Signature workflow tests
```

### Test Files

| File | Test Count | Description |
|------|-----------|-------------|
| `auth.spec.ts` | 10+ | Signup, login, session management, protected routes |
| `documents.spec.ts` | 12+ | Upload, download, delete, search, organize documents |
| `users.spec.ts` | 15+ | Create, update, delete users, role assignment |
| `folders.spec.ts` | 12+ | Create, navigate, organize, delete folders |
| `roles.spec.ts` | 10+ | Role management, permissions, access control |
| `signatures.spec.ts` | 15+ | Create requests, sign documents, track status |

**Total:** 60+ comprehensive test scenarios

## Running Tests

### Prerequisites

```bash
# Install dependencies
npm install

# Ensure environment variables are set in .env.local
DATABASE_URL=your_neon_connection_string
NEXTAUTH_SECRET=your_secret
NEXTAUTH_URL=http://localhost:3000
```

### Testing Against Different Environments

By default, tests run against your **local development server** (http://localhost:3000), which is automatically started before tests run.

To test against a **deployed environment** (e.g., Vercel), set the `PLAYWRIGHT_BASE_URL` environment variable:

```bash
# Test against Vercel production
PLAYWRIGHT_BASE_URL=https://insign-pi.vercel.app npm run test:e2e

# Test against Vercel preview deployment
PLAYWRIGHT_BASE_URL=https://insign-<branch>-<hash>.vercel.app npm run test:e2e

# Test against staging environment
PLAYWRIGHT_BASE_URL=https://staging.insign.app npm run test:e2e
```

**Note:** When `PLAYWRIGHT_BASE_URL` is set, the local dev server will NOT be started automatically. This is useful for:
- Testing production deployments
- Running tests in CI/CD against Vercel
- Testing preview deployments
- Faster test execution (no build time)

### Basic Commands

```bash
# Run all tests (headless mode)
npm run test:e2e

# Run tests with interactive UI
npm run test:e2e:ui

# Run tests with browser visible
npm run test:e2e:headed

# Debug a specific test
npm run test:e2e:debug

# Run tests in specific browser
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit

# View HTML report
npm run test:e2e:report
```

### Running Specific Tests

```bash
# Run a specific test file
npx playwright test e2e/auth.spec.ts

# Run a specific test by name
npx playwright test -g "should successfully create a new organization"

# Run tests matching a pattern
npx playwright test e2e/documents

# Run in UI mode for specific file
npx playwright test e2e/auth.spec.ts --ui
```

### Advanced Options

```bash
# Run tests in parallel
npx playwright test --workers=4

# Run tests with retries
npx playwright test --retries=2

# Generate trace for debugging
npx playwright test --trace=on

# Run only failed tests
npx playwright test --last-failed

# Update snapshots
npx playwright test --update-snapshots
```

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    // Navigate
    await page.goto('/dashboard');

    // Interact
    await page.click('button:has-text("New")');
    await page.fill('input[name="title"]', 'Test Title');

    // Assert
    await expect(page.locator('text=Test Title')).toBeVisible();
  });
});
```

### Using Authentication Fixture

For tests that require a logged-in user:

```typescript
import { test, expect } from './fixtures/auth.fixture';

test('should access protected page', async ({ authenticatedPage: page, adminUser }) => {
  await page.goto('/dashboard/users');

  // You're already logged in!
  await expect(page).toHaveURL(/\/dashboard\/users/);

  // adminUser contains the test user credentials
  console.log(adminUser.email); // admin-1234567890@test.com
});
```

### Using Test Helpers

```typescript
import { generateTestData, waitForToast, verifyTableRowExists } from './utils/test-helpers';

test('should create item', async ({ page }) => {
  const testData = generateTestData();

  await page.fill('input[name="name"]', testData.folderName);
  await page.click('button[type="submit"]');

  // Wait for success toast
  await waitForToast(page, 'Created successfully');

  // Verify item in table
  await verifyTableRowExists(page, testData.folderName);
});
```

### Database Cleanup

For tests that modify the database:

```typescript
import { cleanupTestData } from './utils/db-helpers';

test('should create and cleanup user', async ({ page }) => {
  const email = 'test@example.com';

  // ... test code ...

  // Cleanup after test
  await cleanupTestData(email);
});
```

## Test Coverage

### Authentication (auth.spec.ts)
- ✅ Organization and user registration
- ✅ Login with valid/invalid credentials
- ✅ Password validation
- ✅ Session persistence
- ✅ Protected route access
- ✅ Duplicate domain detection

### Document Management (documents.spec.ts)
- ✅ File upload (single and multiple)
- ✅ Document listing and search
- ✅ Document download
- ✅ Document deletion with confirmation
- ✅ Storage quota display
- ✅ Folder organization

### User Management (users.spec.ts)
- ✅ Create user with validation
- ✅ Duplicate email detection
- ✅ User listing and search
- ✅ Update user details
- ✅ Change user role
- ✅ Delete user with confirmation
- ✅ Prevent self-deletion
- ✅ User status management

### Folder Management (folders.spec.ts)
- ✅ Create folder with validation
- ✅ Nested folder creation
- ✅ Folder navigation
- ✅ Rename folder
- ✅ Delete folder with confirmation
- ✅ Folder hierarchy display
- ✅ Search folders

### Role-Based Access Control (roles.spec.ts)
- ✅ Create custom roles
- ✅ List system and custom roles
- ✅ Assign permissions to roles
- ✅ Delete custom roles
- ✅ Protect system roles from deletion
- ✅ Role assignment to users
- ✅ Access control enforcement

### Signature Workflows (signatures.spec.ts)
- ✅ Create signature request
- ✅ Add multiple signers
- ✅ Sequential vs parallel workflow
- ✅ Document field placement
- ✅ Send signature request
- ✅ Public signing page access
- ✅ Cancel request
- ✅ Download completed document
- ✅ Signature templates

## CI/CD Integration

### GitHub Actions

Tests automatically run on:
- Push to `main`, `develop`, or `claude/**` branches
- Pull requests to `main` or `develop`
- Manual workflow dispatch

**Important:** GitHub Actions tests run against the **Vercel production deployment** (https://insign-pi.vercel.app), not a local build. This ensures tests verify the actual deployed application and run faster without needing to build the app in CI.

See `.github/workflows/e2e-tests.yml` for configuration.

### Required Secrets

Configure these secrets in your GitHub repository:

- `DATABASE_URL` - Neon database connection string
- `NEXTAUTH_SECRET` - NextAuth.js secret key
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob storage token

### Test Artifacts

On test failure, the following artifacts are uploaded:
- HTML test report (30 days retention)
- Screenshots and videos (7 days retention)
- Trace files for debugging

### Viewing CI Results

1. Go to **Actions** tab in GitHub
2. Click on the latest workflow run
3. Download artifacts to view test results
4. Check the **Summary** for pass/fail status

## Troubleshooting

### Tests Failing Locally

**Issue:** Tests fail with "timeout" errors

**Solution:**
```bash
# Increase timeout in playwright.config.ts
timeout: 60000 // 60 seconds

# Or run with more time
npx playwright test --timeout=90000
```

**Issue:** Database connection errors

**Solution:**
```bash
# Verify DATABASE_URL in .env.local
# Ensure Neon database is accessible
# Check firewall/network settings
```

### Tests Failing in CI

**Issue:** Tests pass locally but fail in CI

**Solution:**
- Check that all required secrets are set in GitHub
- Verify database is accessible from GitHub Actions
- Review CI logs for specific error messages
- Enable debug logging: Add `DEBUG=pw:api` to environment

### Flaky Tests

**Issue:** Tests sometimes pass, sometimes fail

**Solution:**
```typescript
// Use proper waits instead of timeouts
await page.waitForLoadState('networkidle');
await page.waitForSelector('button:has-text("Submit")');

// Add retries for specific tests
test.describe.configure({ retries: 2 });

// Use Playwright's auto-waiting
await expect(page.locator('text=Success')).toBeVisible();
```

### Debugging Tips

1. **Use UI Mode** for visual debugging:
   ```bash
   npm run test:e2e:ui
   ```

2. **Enable trace recording**:
   ```bash
   npx playwright test --trace=on
   ```

3. **View trace files**:
   ```bash
   npx playwright show-trace trace.zip
   ```

4. **Use debug mode** to step through tests:
   ```bash
   npm run test:e2e:debug
   ```

5. **Add screenshots** for debugging:
   ```typescript
   await page.screenshot({ path: 'debug.png' });
   ```

## Best Practices

### ✅ Do's

- Use semantic selectors (text, labels, roles) over CSS selectors
- Leverage Playwright's auto-waiting
- Create reusable fixtures and helpers
- Clean up test data after tests
- Use meaningful test descriptions
- Group related tests with `test.describe()`
- Add comments for complex test logic

### ❌ Don'ts

- Don't use arbitrary `page.waitForTimeout(1000)`
- Don't hardcode test data (use generators)
- Don't test implementation details
- Don't skip cleanup in test teardown
- Don't create tests that depend on other tests
- Don't use flaky selectors (nth-child, etc.)

## Contributing

When adding new features:

1. Write E2E tests for the feature
2. Ensure tests pass locally
3. Run tests in all browsers: `npm run test:e2e`
4. Update this documentation if needed
5. Include test coverage in pull request

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [CI Integration](https://playwright.dev/docs/ci)
- [Trace Viewer](https://playwright.dev/docs/trace-viewer)

---

**Last Updated:** November 2025
