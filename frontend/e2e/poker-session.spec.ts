/**
 * poker-session.spec.ts
 *
 * Demuestra la ventaja clave de Playwright frente a Cypress:
 * dos BrowserContexts independientes simulando dos usuarios reales
 * que votan simultáneamente en la misma sesión de Planning Poker.
 *
 * Estrategia de setup:
 *   – El estado previo (workspace, equipo, proyecto, tarea, sesión) se crea
 *     vía API directa usando `request` de Playwright (sin browser, sin CORS).
 *   – Solo la interacción con la sala de poker (join, vote, reveal) usa la UI.
 */

import { test, expect, APIRequestContext } from '@playwright/test';

// ── Constantes de backend ─────────────────────────────────────────────────────

const USER_API = 'http://localhost:8081';
const PROJECT_API = 'http://localhost:8082';
const TASK_API = 'http://localhost:8083';
const POKER_API = 'http://localhost:8084';

// ── Helpers de API ────────────────────────────────────────────────────────────

async function apiRegister(
  req: APIRequestContext,
  username: string,
  email: string,
) {
  const res = await req.post(`${USER_API}/auth/register`, {
    data: { username, email, password: 'Password123!' },
  });
  expect(res.ok()).toBeTruthy();
  return res.json() as Promise<{ accessToken: string; user: { id: string } }>;
}

async function apiPost<T>(
  req: APIRequestContext,
  url: string,
  token: string,
  data: object,
): Promise<T> {
  const res = await req.post(url, {
    headers: { Authorization: `Bearer ${token}` },
    data,
  });
  expect(res.ok()).toBeTruthy();
  return res.json();
}

// ── Test ──────────────────────────────────────────────────────────────────────

test('dos usuarios votan en Planning Poker y ambos ven los votos al revelar', async ({
  browser,
  request,
}) => {
  test.setTimeout(120_000);
  const ts = Date.now();

  // ── Setup vía API (no browser) ─────────────────────────────────────────────

  // Registrar user A (facilitador) y user B (votante)
  const authA = await apiRegister(request, `poker_a_${ts}`, `poker_a_${ts}@test.local`);
  const authB = await apiRegister(request, `poker_b_${ts}`, `poker_b_${ts}@test.local`);
  const tokenA = authA.accessToken;
  const tokenB = authB.accessToken;
  const userBId = authB.user.id;

  // Crear workspace
  const workspace = await apiPost<{ id: string }>(
    request, `${PROJECT_API}/workspaces`, tokenA,
    { name: `Poker WS ${ts}` },
  );

  // Añadir user B al workspace
  await apiPost(request, `${PROJECT_API}/workspaces/${workspace.id}/members`, tokenA, {
    userId: userBId,
    role: 'MEMBER',
  });

  // Crear equipo e incluir a user B (da acceso al proyecto)
  const team = await apiPost<{ id: string }>(
    request, `${PROJECT_API}/workspaces/${workspace.id}/teams`, tokenA,
    { name: `Team ${ts}` },
  );
  await apiPost(request, `${PROJECT_API}/teams/${team.id}/members/${userBId}`, tokenA, {});

  // Crear proyecto vinculado al equipo
  const project = await apiPost<{ id: string }>(
    request, `${PROJECT_API}/workspaces/${workspace.id}/projects`, tokenA,
    { name: `Project ${ts}`, teamId: team.id, visibility: 'WORKSPACE' },
  );

  // Crear tarea en el backlog (necesaria para iniciar una ronda)
  const task = await apiPost<{ id: string }>(
    request, `${TASK_API}/projects/${project.id}/tasks`, tokenA,
    { title: `Tarea E2E ${ts}`, priority: 'MEDIUM' },
  );

  // Crear sesión de Planning Poker
  const session = await apiPost<{ id: string }>(
    request, `${POKER_API}/projects/${project.id}/poker/sessions`, tokenA,
    { name: `Sesión E2E ${ts}`, deck: 'FIBONACCI' },
  );

  const pokerUrl = `/workspaces/${workspace.id}/projects/${project.id}/poker/${session.id}`;

  // ── Dos contextos de navegador independientes ─────────────────────────────
  const locale = { locale: 'es-ES' };
  const ctxA = await browser.newContext(locale);
  const ctxB = await browser.newContext(locale);
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  // ── User A: login e ir a la sala ──────────────────────────────────────────
  await pageA.goto('/?auth=login');
  await pageA.locator('#kdz-email').fill(`poker_a_${ts}@test.local`);
  await pageA.locator('#kdz-pw').fill('Password123!');
  await pageA.locator('.kdz-submit').click();
  await pageA.waitForURL('/workspaces');
  await pageA.goto(pokerUrl);

  // Modal de join: esperar a que el WebSocket cargue la sesión y muestre el modal
  await pageA.getByRole('button', { name: 'Unirse' }).waitFor({ state: 'visible', timeout: 20_000 });
  await pageA.getByRole('button', { name: 'Unirse' }).click();
  await expect(pageA.getByText('Sesión activa')).toBeVisible({ timeout: 10_000 });

  // ── User B: login e ir a la sala ──────────────────────────────────────────
  await pageB.goto('/?auth=login');
  await pageB.locator('#kdz-email').fill(`poker_b_${ts}@test.local`);
  await pageB.locator('#kdz-pw').fill('Password123!');
  await pageB.locator('.kdz-submit').click();
  await pageB.waitForURL('/workspaces');
  await pageB.goto(pokerUrl);

  await pageB.getByRole('button', { name: 'Unirse' }).waitFor({ state: 'visible', timeout: 20_000 });
  await pageB.getByRole('button', { name: 'Unirse' }).click();
  await expect(pageB.getByText('Sesión activa')).toBeVisible({ timeout: 10_000 });

  // ── User A (facilitador) selecciona tarea e inicia ronda ─────────────────
  await pageA.getByRole('button', { name: 'Seleccionar tarea' }).click();
  await pageA.getByText(`Tarea E2E ${ts}`).click();
  // Selecting a task only sets pendingTask; the round starts with "Iniciar votación"
  await pageA.getByRole('button', { name: 'Iniciar votación' }).click();

  // User A es MODERATOR: ve el botón de revelar.
  // User B es VOTER: ve las cartas de voto.
  await expect(pageA.getByRole('button', { name: 'Revelar votos' })).toBeVisible({ timeout: 8000 });
  await expect(pageB.getByText('Tu voto')).toBeVisible({ timeout: 8000 });

  // ── Solo User B (VOTER) vota ──────────────────────────────────────────────
  await pageB.getByRole('button', { name: '8', exact: true }).click();

  // ── User A (facilitador) revela los votos ─────────────────────────────────
  await pageA.getByRole('button', { name: 'Revelar votos' }).click();

  // ── Verificar que ambas páginas muestran los resultados ───────────────────
  // El componente VoteResults muestra "Votos del equipo" (poker.room.teamVotes)
  await expect(pageA.getByText('Votos del equipo')).toBeVisible({ timeout: 8000 });
  await expect(pageB.getByText('Votos del equipo')).toBeVisible({ timeout: 8000 });

  // Verificar que el voto de User B aparece en las cartas de resultados
  // Localizar dentro del grid de votos para evitar colisiones con el timestamp en el nombre del workspace
  await expect(pageA.locator('span').filter({ hasText: /^8$/ }).first()).toBeVisible();
  await expect(pageB.locator('span').filter({ hasText: /^8$/ }).first()).toBeVisible();

  await ctxA.close();
  await ctxB.close();
});