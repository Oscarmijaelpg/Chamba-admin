import React from 'react';
import { Users, Briefcase, Wallet, Activity } from 'lucide-react';
import { useActivityFeed } from '../hooks/useActivityFeed';
import { formatActivity } from '../lib/activity';
import Pagination from './Pagination';

const ICONS = { user: Users, briefcase: Briefcase, wallet: Wallet };

export default function ActivityView() {
  const { rows, loading, isFetching, page, setPage, totalPages, total, pageSize } = useActivityFeed();
  const items = rows.map(formatActivity);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Actividad de la plataforma</h2>
        <p className="text-slate-500 text-sm mt-1">
          Registros de usuarios, chambas y movimientos de billetera, del más reciente al más antiguo.
          (Para el detalle de acciones administrativas, ve a Auditoría.)
        </p>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto" />
            <p className="mt-4 text-sm">Cargando actividad...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-slate-400">Sin actividad registrada.</div>
        ) : (
          <ul className="divide-y divide-slate-50">
            {items.map((it) => {
              const Icon = ICONS[it.icon] || Activity;
              return (
                <li key={it.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/60 transition-all">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                    <Icon size={16} />
                  </div>
                  <p className="text-sm font-medium text-slate-800 min-w-0 flex-1 truncate">{it.text}</p>
                  <span className="text-xs text-slate-400 whitespace-nowrap">{it.time}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        onPage={setPage}
        isFetching={isFetching}
      />
    </div>
  );
}
