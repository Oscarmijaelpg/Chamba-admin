import React, { useState } from 'react';
import { Info } from 'lucide-react';

// Ícono de ayuda que muestra una explicación al pasar el mouse (desktop) o al
// tocarlo (móvil). El click alterna el popover; el hover lo muestra/oculta.
export default function InfoTip({ text }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label="Más información"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="text-slate-300 hover:text-slate-500 transition-colors"
      >
        <Info size={13} />
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute z-50 right-0 top-5 w-52 rounded-xl bg-slate-800 text-white text-[11px] leading-relaxed font-medium px-3 py-2 shadow-xl normal-case tracking-normal"
        >
          {text}
        </span>
      )}
    </span>
  );
}
