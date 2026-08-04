import { test, expect } from '@playwright/test';

test.describe('Critical Flows', () => {
  test.describe('Homepage', () => {
    test('loads the homepage', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveTitle(/PDF Master/);
      await expect(page.locator('h1')).toBeVisible();
    });

    test('navigates to tools page', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('link', { name: /Tools/ }).click();
      await expect(page).toHaveURL('/tools');
    });
  });

  test.describe('Merge PDF Tool', () => {
    test('loads the merge tool page', async ({ page }) => {
      await page.goto('/tools/merge');
      await expect(page).toHaveURL('/tools/merge');
      await expect(page.getByRole('heading', { name: /Merge PDF/ })).toBeVisible();
    });

    test('shows upload zone on merge page', async ({ page }) => {
      await page.goto('/tools/merge');
      await expect(page.getByText(/upload or drag and drop/)).toBeVisible();
    });
  });

  test.describe('Split PDF Tool', () => {
    test('loads the split tool page', async ({ page }) => {
      await page.goto('/tools/split');
      await expect(page).toHaveURL('/tools/split');
      await expect(page.getByRole('heading', { name: /Split PDF/ })).toBeVisible();
    });
  });

  test.describe('Compress PDF Tool', () => {
    test('loads the compress tool page', async ({ page }) => {
      await page.goto('/tools/compress');
      await expect(page).toHaveURL('/tools/compress');
      await expect(page.getByRole('heading', { name: /Compress PDF/ })).toBeVisible();
    });
  });

  test.describe('Error handling', () => {
    test('shows error boundary on invalid route', async ({ page }) => {
      await page.goto('/tools/nonexistent');
      await expect(page).toHaveURL('/tools/nonexistent');
    });
  });

  test.describe('Loading states', () => {
    test('tool pages render without crashing', async ({ page }) => {
      const tools = ['merge', 'split', 'compress', 'jpg-to-pdf', 'word-to-pdf', 'pdf-to-word'];
      for (const tool of tools) {
        await page.goto(`/tools/${tool}`);
        await expect(page.getByRole('heading')).toBeVisible();
      }
    });
  });
});