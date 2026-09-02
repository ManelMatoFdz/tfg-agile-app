import axios from 'axios';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('axios', () => {
  const { jest: jestObject } = require('@jest/globals');
  return {
    __esModule: true,
    default: { create: jestObject.fn(), post: jestObject.fn() },
  };
});

type RequestInterceptor = (config: { headers: Record<string, string> }) => { headers: Record<string, string> };
type ResponseErrorInterceptor = (error: unknown) => Promise<unknown>;

function createAxiosClientMock() {
  let requestInterceptor!: RequestInterceptor;
  let responseErrorInterceptor!: ResponseErrorInterceptor;
  const client = Object.assign(jest.fn(async (config: unknown) => ({ data: 'retried', config })), {
    get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn((handler: RequestInterceptor) => { requestInterceptor = handler; }) },
      response: { use: jest.fn((_success: unknown, failure: ResponseErrorInterceptor) => { responseErrorInterceptor = failure; }) },
    },
  });
  return { client, request: () => requestInterceptor, responseError: () => responseErrorInterceptor };
}

const clientModules = [
  ['user', () => import('./client'), '/api'],
  ['project', () => import('./projectClient'), '/project-api'],
  ['task', () => import('./taskClient'), '/task-api'],
  ['poker', () => import('./pokerClient'), '/poker-api'],
] as const;

async function loadClient(loader: () => Promise<{ default: unknown }>) {
  const mock = createAxiosClientMock();
  jest.mocked(axios.create).mockReturnValue(mock.client as never);
  let authStore!: typeof import('../store/authStore').useAuthStore;
  let exported: unknown;
  await jest.isolateModulesAsync(async () => {
    authStore = (await import('../store/authStore')).useAuthStore;
    exported = (await loader()).default;
  });
  return { ...mock, authStore, exported };
}

describe('API clients', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it.each(clientModules)('%s client configures its base URL and authorization header', async (_name, loader, baseURL) => {
    localStorage.setItem('accessToken', 'access');
    const loaded = await loadClient(loader);

    expect(axios.create).toHaveBeenCalledWith({
      baseURL,
      headers: { 'Content-Type': 'application/json' },
    });
    expect(loaded.request()({ headers: {} }).headers.Authorization).toBe('Bearer access');
    expect(loaded.exported).toBe(loaded.client);
  });

  it('leaves authorization absent when there is no access token', async () => {
    const loaded = await loadClient(() => import('./client'));
    expect(loaded.request()({ headers: {} }).headers.Authorization).toBeUndefined();
  });

  it('logs out after a 401 when no refresh token exists', async () => {
    localStorage.setItem('accessToken', 'expired');
    const loaded = await loadClient(() => import('./client'));
    loaded.authStore.setState({ accessToken: 'expired', refreshToken: null, user: null });
    const error = { response: { status: 401 }, config: { headers: {} } };

    await expect(loaded.responseError()(error)).rejects.toBe(error);
    expect(loaded.authStore.getState().accessToken).toBeNull();
  });

  it('refreshes tokens and retries the original request', async () => {
    localStorage.setItem('refreshToken', 'refresh');
    jest.mocked(axios.post).mockResolvedValue({ data: { accessToken: 'new-access', refreshToken: 'new-refresh' } });
    const loaded = await loadClient(() => import('./client'));
    loaded.authStore.setState({ accessToken: 'expired', refreshToken: 'refresh', user: null });
    const config = { headers: {} as Record<string, string> };

    await expect(loaded.responseError()({ response: { status: 401 }, config })).resolves.toMatchObject({ data: 'retried' });
    expect(axios.post).toHaveBeenCalledWith('/api/auth/refresh', { refreshToken: 'refresh' });
    expect(config.headers.Authorization).toBe('Bearer new-access');
    expect(loaded.authStore.getState()).toMatchObject({ accessToken: 'new-access', refreshToken: 'new-refresh' });
  });

  it('rejects and logs out when token refresh fails', async () => {
    const refreshError = new Error('refresh failed');
    jest.mocked(axios.post).mockRejectedValue(refreshError);
    const loaded = await loadClient(() => import('./taskClient'));
    loaded.authStore.setState({ accessToken: 'expired', refreshToken: 'refresh', user: null });

    await expect(loaded.responseError()({ response: { status: 401 }, config: { headers: {} } })).rejects.toBe(refreshError);
    expect(loaded.authStore.getState().accessToken).toBeNull();
  });

  it('passes through non-authentication failures', async () => {
    const loaded = await loadClient(() => import('./pokerClient'));
    const error = { response: { status: 500 }, config: { headers: {} } };
    await expect(loaded.responseError()(error)).rejects.toBe(error);
  });
});
