import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Controles de paginación reutilizables. Muestra el rango visible ("21–40 de 1324")
// y botones anterior/siguiente. `isFetching` atenúa los controles mientras carga la
// siguiente página sin ocultar la tabla actual.
export default function Pagination({ page, totalPages, total, pageSize, onPage, isFetching }) {
  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className={`flex items-center justify-between gap-3 px-1 py-2 ${isFetching ? 'opacity-60' : ''}`}>
      <p className="text-xs sm:text-sm text-slate-400">
        <span className="font-semibold text-slate-600">{from.toLocaleString()}–{to.toLocaleString()}</span> de{' '}
        <span className="font-semibold text-slate-600">{total.toLocaleString()}</span>
      </p>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1 || isFetching}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft size={15} /> Anterior
        </button>
        <span className="text-xs sm:text-sm text-slate-500 tabular-nums px-1">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages || isFetching}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          Siguiente <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
