import React, { useState } from 'react';
import { X, Shield, AlertTriangle, Ban, CheckCircle2, MessageSquare } from 'lucide-react';

export default function ModerationModal({ isOpen, onClose, item, onAction }) {
  const [reason, setReason] = useState('');
  const [actionType, setActionType] = useState('');

  if (!isOpen || !item) return null;

  const handleAction = (type) => {
    onAction?.(item.id, type, reason);
    setReason('');
    setActionType('');
    onClose?.();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-96 overflow-y-auto">
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0">
          <h2 className="text-xl font-bold text-slate-800">Moderación</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* User/Item Info */}
          <div className="bg-slate-50 p-4 rounded-lg">
            <p className="text-sm text-slate-600">Elemento</p>
            <p className="text-lg font-bold text-slate-800">{item.name || item.title || item.id}</p>
            {item.email && <p className="text-sm text-slate-600 mt-1">{item.email}</p>}
            {item.status && <p className="text-sm text-slate-600 mt-1">Status: {item.status}</p>}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Motivo de la acción
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe la razón de la acción..."
              className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              rows="4"
            />
          </div>

          {/* Actions */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleAction('approve')}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg font-medium transition"
            >
              <CheckCircle2 size={18} />
              Aprobar
            </button>

            <button
              onClick={() => handleAction('reject')}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-yellow-50 hover:bg-yellow-100 text-yellow-600 rounded-lg font-medium transition"
            >
              <AlertTriangle size={18} />
              Rechazar
            </button>

            <button
              onClick={() => handleAction('ban')}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-medium transition"
            >
              <Ban size={18} />
              Banear
            </button>
          </div>

          {/* Contact Option */}
          <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition">
            <MessageSquare size={18} />
            Enviar Mensaje
          </button>
        </div>
      </div>
    </div>
  );
}
