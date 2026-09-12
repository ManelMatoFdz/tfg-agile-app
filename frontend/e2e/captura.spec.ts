import { test, expect, Page } from '@playwright/test';

async function registrar(page: Page, ts: number) {
  await page.goto('/?auth=register');
  await page.locator('#kdz-user').fill(`hdr_${ts}`);
  await page.locator('#kdz-email').fill(`hdr_${ts}@test.local`);
  await page.locator('#kdz-pw').fill('Password123!');
  await page.locator('#kdz-confirm').fill('Password123!');
  await page.locator('.kdz-submit').click();
  await page.waitForURL('/workspaces');
}

test('captura de la cabecera de proyecto', async ({ page }) => {
  const ts = Date.now();
  await page.setViewportSize({ width: 1440, height: 900 });
  await registrar(page, ts);

  await page.getByRole('button', { name: 'Crear nuevo workspace' }).first().click();
  await page.getByPlaceholder('Mi empresa').fill(`Nexora ${ts}`);
  await page.getByRole('button', { name: 'Crear workspace' }).click();
  await page.waitForURL(/\/workspaces\/.+/);
  const ws = page.url();

  await page.goto(ws + '/teams');
  await page.getByRole('button', { name: 'Nuevo equipo' }).first().click();
  await page.getByPlaceholder('Frontend, Backend, QA…').fill('Plataforma');
  await page.getByRole('button', { name: 'Crear equipo' }).click();
  await expect(page.getByText('Plataforma')).toBeVisible({ timeout: 6000 });

  await page.goto(ws);
  await page.getByRole('button', { name: 'Crear proyecto' }).first().click();
  await page.getByPlaceholder('Mi proyecto').fill('Kadenza Web');
  await page.locator('select').first().selectOption({ label: 'Plataforma' });
  await page.getByRole('button', { name: 'Crear proyecto' }).last().click();
  await expect(page.getByText('Kadenza Web')).toBeVisible({ timeout: 8000 });

  await page.getByText('Kadenza Web').first().click();
  await page.waitForURL(/\/projects\/.+/);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: '/tmp/cabecera-claro.png' });
});
