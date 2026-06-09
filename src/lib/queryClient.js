import { QueryClient } from '@tanstack/react-query';

// Cliente único de React Query para todo el panel.
// - staleTime 30s: evita refetches al cambiar de pestaña y volver enseguida.
// - gcTime 5min: mantiene en caché los datos de vistas ya visitadas.
// - refetchOnWindowFocus off: en un panel admin no queremos recargar al volver al tab.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
