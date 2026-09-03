import { test, expect, Page } from '@playwright/test';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function register(
  page: Page,
  opts: { username: string; email: string; password: string },
) {
  await page.goto('/?auth=register');
  await page.locator('#kdz-user').fill(opts.username);
  await page.locator('#kdz-email').fill(opts.email);
  await page.locator('#kdz-pw').fill(opts.password);
  await page.locator('#kdz-confirm').fill(opts.password);
  await page.locator('.kdz-submit').click();
  await page.waitForURL('/workspaces');
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test('ruta protegida redirige al formulario de login', async ({ page }) => {
  await page.goto('/workspaces');
  // La app debe redirigir a la landing con el panel de login visible
  await expect(page.locator('#kdz-email')).toBeVisible({ timeout: 8000 });
});

test('registrar usuario aleatorio y aterrizar en /workspaces', async ({ page }) => {
  const ts = Date.now();
  await register(page, {
    username: `e2e_${ts}`,
    email: `e2e_${ts}@test.local`,
    password: 'Password123!',
  });
  await expect(page).toHaveURL('/workspaces');
});