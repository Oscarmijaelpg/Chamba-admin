import React from 'react';
import { Download, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function TableActions({ selectedCount, onExport, onBulkAction, onDelete }) {
  return (
    <div className="flex gap-3 items-center mb-6">
      {/* Export */}
      <button
        onClick={() => onExport?.()}
        className="flex items-center gap-2 px-4 py-2 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-lg font-medium transition"
      >
        <Download size={18} />
        Exportar CSV
      </button>

      {/* Bulk Actions (if selected) */}
      {selectedCount > 0 && (
        <>
          <div className="text-sm text-slate-600">
            {selectedCount} seleccionado{selectedCount > 1 ? 's' : ''}
          </div>

          <button
            onClick={() => onBulkAction?.('approve')}
            className="flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg font-medium transition"
          >
            <CheckCircle2 size={18} />
            Aprobar
          </button>

          <button
            onClick={() => onBulkAction?.('reject')}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-600 rounded-lg font-medium transition"
          >
            <AlertTriangle size={18} />
            Rechazar
          </button>

          <button
            onClick={() => onDelete?.()}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-medium transition"
          >
            <Trash2 size={18} />
            Eliminar
          </button>
        </>
      )}
    </div>
  );
}
