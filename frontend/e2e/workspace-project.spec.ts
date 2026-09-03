import { test, expect, Page } from '@playwright/test';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function registerAndGoToWorkspaces(page: Page, ts: number) {
  await page.goto('/?auth=register');
  await page.locator('#kdz-user').fill(`ws_user_${ts}`);
  await page.locator('#kdz-email').fill(`ws_${ts}@test.local`);
  await page.locator('#kdz-pw').fill('Password123!');
  await page.locator('#kdz-confirm').fill('Password123!');
  await page.locator('.kdz-submit').click();
  await page.waitForURL('/workspaces');
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test('crear workspace, equipo y proyecto, verificar que aparecen', async ({ page }) => {
  const ts = Date.now();
  await registerAndGoToWorkspaces(page, ts);

  // ── Crear workspace ────────────────────────────────────────────────────────
  await page.getByRole('button', { name: 'Crear nuevo workspace' }).first().click();
  await page.getByPlaceholder('Mi empresa').fill(`WS E2E ${ts}`);
  await page.getByRole('button', { name: 'Crear workspace' }).click();

  // Debe redirigir al dashboard del workspace recién creado
  await page.waitForURL(/\/workspaces\/.+/);
  const workspaceUrl = page.url();

  // ── Crear equipo (requerido para crear proyecto) ───────────────────────────
  await page.goto(workspaceUrl + '/teams');
  await page.getByRole('button', { name: 'Nuevo equipo' }).first().click();
  await page.getByPlaceholder('Frontend, Backend, QA…').fill(`Equipo E2E ${ts}`);
  await page.getByRole('button', { name: 'Crear equipo' }).click();

  // Verificar que el equipo aparece en la lista
  await expect(page.getByText(`Equipo E2E ${ts}`)).toBeVisible({ timeout: 6000 });

  // ── Crear proyecto ─────────────────────────────────────────────────────────
  await page.goto(workspaceUrl);
  await page.getByRole('button', { name: 'Crear proyecto' }).first().click();

  // Formulario de proyecto
  await page.getByPlaceholder('Mi proyecto').fill(`Proyecto E2E ${ts}`);

  // Seleccionar el equipo recién creado
  await page.locator('select').first().selectOption({ label: `Equipo E2E ${ts}` });

  await page.getByRole('button', { name: 'Crear proyecto' }).last().click();

  // El proyecto debe aparecer en el dashboard
  await expect(page.getByText(`Proyecto E2E ${ts}`)).toBeVisible({ timeout: 8000 });
});