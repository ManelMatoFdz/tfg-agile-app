import type { ReactElement, ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, type RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '../i18n';

interface TestRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
  path?: string;
  queryClient?: QueryClient;
}

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
}

export function renderWithProviders(
  ui: ReactElement,
  { route = '/', path, queryClient = createTestQueryClient(), ...options }: TestRenderOptions = {},
) {
  function Wrapper({ children }: { children: ReactNode }) {
    const content = path ? <Routes><Route path={path} element={children} /></Routes> : children;
    return (
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[route]}>{content}</MemoryRouter>
        </QueryClientProvider>
      </I18nextProvider>
    );
  }

  return { user: userEvent.setup(), queryClient, ...render(ui, { wrapper: Wrapper, ...options }) };
}
