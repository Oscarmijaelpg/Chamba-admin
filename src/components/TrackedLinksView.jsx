import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Link2, Plus, Copy, Check, Trash2, ExternalLink, Smartphone, Globe,
  TrendingUp, Loader2, Power,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import ConfirmModal from './ConfirmModal';

// Enlaces con seguimiento para saber de dónde viene la gente (Facebook,
// WhatsApp, flyer…). Cada link es conecta2.dev/i/<slug>:
//   - "Ir al inicio": abre la web normal y registra la visita.
//   - "Directo a Play Store": en Android manda derecho a la tienda; en iOS y
//     escritorio no hay app, así que cae al inicio igual.
const SITE_URL = 'https://conecta2.dev';

const slugify = (s) =>
  s.toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // saca tildes
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

export default function TrackedLinksView() {
  const qc = useQueryClient();
  const [label, setLabel] = useState('');
  const [slug, setSlug] = useState('');
  const [source, setSource] = useState('');
  const [mode, setMode] = useState('landing');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const { data: links = [], isLoading } = useQuery({
    queryKey: ['tracked-links'],
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from('tracked_link_stats')
        .select('*')
        .order('created_at', { ascending: false });
      if (err) throw err;
      return data ?? [];
    },
  });

  const createLink = useMutation({
    mutationFn: async () => {
      const finalSlug = slugify(slug || label);
      if (!label.trim()) throw new Error('Poné un nombre para identificarlo.');
      if (finalSlug.length < 2) throw new Error('El identificador debe tener al menos 2 caracteres.');
      const { error: err } = await supabase.from('tracked_links').insert({
        slug: finalSlug,
        label: label.trim(),
        source: source.trim() || null,
        mode,
      });
      if (err) throw new Error(err.code === '23505' ? 'Ya existe un enlace con ese identificador.' : err.message);
    },
    onSuccess: () => {
      setLabel(''); setSlug(''); setSource(''); setMode('landing'); setError('');
      qc.invalidateQueries({ queryKey: ['tracked-links'] });
    },
    onError: (e) => setError(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }) => {
      const { error: err } = await supabase.from('tracked_links').update({ is_active: !is_active }).eq('id', id);
      if (err) throw err;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tracked-links'] }),
  });

  const removeLink = useMutation({
    mutationFn: async (id) => {
      const { error: err } = await supabase.from('tracked_links').delete().eq('id', id);
      if (err) throw err;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tracked-links'] }),
  });

  const fullUrl = (s) => `${SITE_URL}/i/${s}`;

  const copy = async (s) => {
    try {
      await navigator.clipboard.writeText(fullUrl(s));
      setCopied(s);
      setTimeout(() => setCopied(null), 1800);
    } catch { /* clipboard bloqueado */ }
  };

  const totalVisits = links.reduce((a, l) => a + Number(l.visits || 0), 0);
  const totalStore = links.reduce((a, l) => a + Number(l.sent_to_store || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-1">Enlaces de campaña</h2>
        <p className="text-slate-500">
          Generá un link por cada lugar donde publicités (Facebook, WhatsApp, flyer…) y mirá de dónde llega la gente.
        </p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Link2} label="Enlaces activos" value={links.filter((l) => l.is_active).length} />
        <StatCard icon={TrendingUp} label="Visitas totales" value={totalVisits} />
        <StatCard icon={Smartphone} label="Enviados a Play Store" value={totalStore} />
      </div>

      {/* Crear */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Plus size={18} /> Nuevo enlace</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Nombre" hint="Para identificarlo acá">
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Post de Facebook — agosto"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-400 outline-none" />
          </Field>
          <Field label="Identificador (URL)" hint={`${SITE_URL}/i/${slugify(slug || label) || '...'}`}>
            <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="facebook-agosto"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-400 outline-none" />
          </Field>
          <Field label="Origen" hint="Opcional: facebook, whatsapp…">
            <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="facebook"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-400 outline-none" />
          </Field>
        </div>

        <div className="mt-4">
          <p className="text-sm font-semibold text-slate-700 mb-2">¿A dónde lleva?</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ModeOption
              active={mode === 'landing'} onClick={() => setMode('landing')}
              icon={Globe} title="Ir al inicio"
              desc="Abre la web tal cual y registra la visita."
            />
            <ModeOption
              active={mode === 'store'} onClick={() => setMode('store')}
              icon={Smartphone} title="Directo a Play Store"
              desc="En Android va derecho a la tienda. En iPhone y computadora abre la web."
            />
          </div>
        </div>

        {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}

        <button
          onClick={() => createLink.mutate()}
          disabled={createLink.isPending}
          className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 disabled:opacity-60"
        >
          {createLink.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Crear enlace
        </button>
      </div>

      {/* Listado */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-slate-400"><Loader2 size={22} className="animate-spin mx-auto" /></div>
        ) : links.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            Todavía no creaste ningún enlace. Creá el primero arriba y compartilo.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {links.map((l) => (
              <div key={l.id} className={`p-4 sm:p-5 ${l.is_active ? '' : 'opacity-60'}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-800">{l.label}</span>
                      {l.mode === 'store' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-50 text-blue-600">Play Store</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-600">Inicio</span>
                      )}
                      {!l.is_active && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-700">Pausado</span>}
                      {l.source && <span className="text-xs text-slate-400">· {l.source}</span>}
                    </div>
                    <code className="mt-1 block text-xs text-slate-500 break-all">{fullUrl(l.slug)}</code>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <IconBtn onClick={() => copy(l.slug)} title="Copiar enlace">
                      {copied === l.slug ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                    </IconBtn>
                    <a href={fullUrl(l.slug)} target="_blank" rel="noreferrer"
                      className="p-2 rounded-lg text-slate-500 hover:bg-slate-100" title="Abrir">
                      <ExternalLink size={16} />
                    </a>
                    <IconBtn onClick={() => toggleActive.mutate({ id: l.id, is_active: l.is_active })}
                      title={l.is_active ? 'Pausar' : 'Reactivar'}>
                      <Power size={16} />
                    </IconBtn>
                    <IconBtn onClick={() => setToDelete(l)} title="Eliminar" danger>
                      <Trash2 size={16} />
                    </IconBtn>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                  <Metric label="Visitas" value={l.visits} strong />
                  <Metric label="7 días" value={l.visits_7d} />
                  <Metric label="30 días" value={l.visits_30d} />
                  <Metric label="Android" value={l.visits_android} />
                  {l.mode === 'store' && <Metric label="A la tienda" value={l.sent_to_store} />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400">
        Las visitas se cuentan acá. Las <b>instalaciones reales</b> las reporta Google Play Console: a los enlaces
        que van a la tienda se les agrega el parámetro <code>referrer</code>, así aparecen atribuidas a cada campaña
        en Play Console → Adquisición de usuarios.
      </p>

      <ConfirmModal
        isOpen={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => { removeLink.mutate(toDelete.id); setToDelete(null); }}
        title="Eliminar enlace"
        message={`Se elimina "${toDelete?.label}" y todas sus visitas registradas. Si ya lo compartiste, dejará de funcionar.`}
        confirmLabel="Eliminar"
      />
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
      <span className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
        <Icon size={20} />
      </span>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400 break-all">{hint}</p>}
    </div>
  );
}

function ModeOption({ active, onClick, icon: Icon, title, desc }) {
  return (
    <button type="button" onClick={onClick}
      className={`text-left p-3.5 rounded-xl border-2 transition-colors ${
        active ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'
      }`}>
      <span className={`flex items-center gap-2 font-bold ${active ? 'text-emerald-700' : 'text-slate-700'}`}>
        <Icon size={16} /> {title}
      </span>
      <span className="block mt-1 text-xs text-slate-500">{desc}</span>
    </button>
  );
}

function Metric({ label, value, strong }) {
  return (
    <span className={strong ? 'text-slate-800 font-bold' : 'text-slate-500'}>
      {label}: <span className={strong ? '' : 'font-semibold text-slate-700'}>{Number(value || 0)}</span>
    </span>
  );
}

function IconBtn({ onClick, title, danger, children }) {
  return (
    <button type="button" onClick={onClick} title={title}
      className={`p-2 rounded-lg transition-colors ${danger ? 'text-red-500 hover:bg-red-50' : 'text-slate-500 hover:bg-slate-100'}`}>
      {children}
    </button>
  );
}
