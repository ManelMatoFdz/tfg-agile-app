import { useState, useCallback } from 'react';
import type { AxiosError } from 'axios';
import i18next from 'i18next';

interface ApiActionState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  success: boolean;
}

export function useApiAction<T = unknown>() {
  const [state, setState] = useState<ApiActionState<T>>({
    data: null,
    loading: false,
    error: null,
    success: false,
  });

  const run = useCallback(async (promise: Promise<{ data: T }>): Promise<T | null> => {
    setState({ data: null, loading: true, error: null, success: false });
    try {
      const res = await promise;
      setState({ data: res.data, loading: false, error: null, success: true });
      return res.data;
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string; errorCode?: string; error?: string }>;
      const errorCode = axiosErr.response?.data?.errorCode ?? axiosErr.response?.data?.error;
      const fallbackCode = axiosErr.response?.status === 403
        ? 'FORBIDDEN'
        : axiosErr.response?.status === 404
          ? 'NOT_FOUND'
          : axiosErr.response?.status === 409
            ? 'CONFLICT'
            : axiosErr.response?.status === 400
              ? 'BAD_REQUEST'
              : 'INTERNAL_ERROR';
      const code = errorCode ?? fallbackCode;
      const translated = i18next.t(`errors.${code}`);
      const message = translated === `errors.${code}` ? i18next.t(`errors.${fallbackCode}`) : translated;
      setState({ data: null, loading: false, error: message, success: false });
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null, success: false });
  }, []);

  return { ...state, run, reset };
}