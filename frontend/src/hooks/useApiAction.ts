import { useState, useCallback } from 'react';
import type { AxiosError } from 'axios';

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
      const axiosErr = err as AxiosError<{ message?: string }>;
      const message =
        axiosErr.response?.data?.message ??
        (axiosErr.response?.status === 403
          ? 'No tienes permisos para esta acción.'
          : axiosErr.response?.status === 400
            ? 'Datos inválidos. Revisa los campos.'
            : 'Ha ocurrido un error. Inténtalo de nuevo.');
      setState({ data: null, loading: false, error: message, success: false });
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null, success: false });
  }, []);

  return { ...state, run, reset };
}
