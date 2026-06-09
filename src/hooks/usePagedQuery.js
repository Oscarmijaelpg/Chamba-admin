import { useState, useEffect, useRef } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';

// Núcleo de paginación server-side sobre Supabase/PostgREST.
//
// queryFn recibe { from, to, page } y debe devolver { rows, total }, donde
// `total` sale del count exacto de la query (head no, lo necesitamos por página).
// Usa placeholderData: keepPreviousData para que al cambiar de página la tabla no
// "parpadee" a vacío mientras llega la siguiente.
//
// `deps` son los filtros/búsqueda: al cambiar cualquiera, se vuelve a la página 1.
export function usePagedQuery({ key, pageSize = 20, deps = [], queryFn }) {
  const [page, setPage] = useState(1);
  const firstRun = useRef(true);

  useEffect(() => {
    // No resetear en el primer render (la página ya es 1); sí en cambios de filtros.
    if (firstRun.current) { firstRun.current = false; return; }
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const query = useQuery({
    queryKey: [...key, { page, deps }],
    queryFn: () => queryFn({ from: (page - 1) * pageSize, to: page * pageSize - 1, page }),
    placeholderData: keepPreviousData,
  });

  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    rows: query.data?.rows ?? [],
    total,
    page,
    setPage,
    pageSize,
    totalPages,
    loading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error ? (query.error.message ?? 'Error al cargar') : null,
    refetch: query.refetch,
  };
}
