import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessagesSquare, Send, ArrowLeft, MessageCircle, Mail, MapPin, Paperclip, User, Search } from 'lucide-react';
import { useSupportChats, useChatMessages, useChatReply } from '../hooks/useSupportChats';
import EmailNotifyToggle from './EmailNotifyToggle';

const waLink = (num) => `https://wa.me/${String(num || '').replace(/[^0-9]/g, '')}`;

const stamp = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  return d.toDateString() === today.toDateString()
    ? d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('es-BO', { day: 'numeric', month: 'short' });
};

// Bandeja del chat de soporte: lo que el equipo le escribió a cada usuario
// (desde Chambas, Trabajos o Usuarios) y lo que le contestaron desde la app.
export default function MessagesView() {
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('chat');
  const [filter, setFilter] = useState('');
  const { data: chats = [], isLoading, error } = useSupportChats({ refetchInterval: 10_000 });

  const visible = useMemo(() => {
    const t = filter.trim().toLowerCase();
    if (!t) return chats;
    return chats.filter((c) => `${c.full_name} ${c.email} ${c.whatsapp ?? ''}`.toLowerCase().includes(t));
  }, [chats, filter]);
  const selected = chats.find((c) => c.id === selectedId) ?? null;
  const select = (id) => setParams(id ? { chat: id } : {});
  const unreadTotal = chats.reduce((n, c) => n + Number(c.unread || 0), 0);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Mensajes</h2>
        <p className="text-slate-500 text-sm mt-1">
          Tus chats con los usuarios como <b>Equipo Conecta2</b>. Les llega a la app y te pueden contestar.
          {unreadTotal > 0 && <span className="ml-1 font-bold text-primary-700">{unreadTotal} sin leer.</span>}
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden grid md:grid-cols-[320px_1fr] h-[calc(100vh-220px)] min-h-[480px]">
        {/* Lista */}
        <div className={`border-r border-slate-100 flex flex-col min-h-0 ${selected ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Buscar conversación…"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading && <p className="p-5 text-sm text-slate-400">Cargando…</p>}
            {error && <p className="p-5 text-sm text-red-500">No se pudieron cargar los chats.</p>}
            {!isLoading && !visible.length && (
              <div className="p-8 text-center">
                <MessagesSquare size={32} className="mx-auto text-slate-200" />
                <p className="text-sm text-slate-400 mt-2">Todavía no hay conversaciones. Escribile a alguien desde Usuarios, Chambas o Trabajos.</p>
              </div>
            )}
            {visible.map((c) => (
              <button key={c.id} onClick={() => select(c.id)}
                className={`w-full text-left flex gap-3 px-4 py-3 border-b border-slate-50 transition-all ${c.id === selectedId ? 'bg-primary-50' : 'hover:bg-slate-50'}`}>
                <Avatar chat={c} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm truncate ${Number(c.unread) ? 'font-black text-slate-900' : 'font-semibold text-slate-700'}`}>{c.full_name || 'Usuario'}</p>
                    <span className="text-[10px] text-slate-400 shrink-0">{stamp(c.updated_at)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-xs text-slate-400 truncate">{c.last_from_admin ? 'Vos: ' : ''}{c.last_message || '—'}</p>
                    {Number(c.unread) > 0 && (
                      <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-primary-500 text-dark text-[10px] font-black flex items-center justify-center">{c.unread}</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Conversación */}
        <div className={`flex-col min-h-0 ${selected ? 'flex' : 'hidden md:flex'}`}>
          {selected ? <Thread chat={selected} onBack={() => select(null)} /> : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <MessagesSquare size={40} className="text-slate-200" />
              <p className="text-sm text-slate-400 mt-2">Elegí una conversación.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Avatar({ chat }) {
  return (
    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-500 overflow-hidden shrink-0">
      {chat.avatar_url ? <img src={chat.avatar_url} alt="" className="w-full h-full object-cover" /> : (chat.full_name?.charAt(0) || <User size={18} />)}
    </div>
  );
}

function Thread({ chat, onBack }) {
  const { data: messages = [], isLoading } = useChatMessages(chat.id);
  const reply = useChatReply(chat.id);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [email, setEmail] = useState(false);
  const [sentNote, setSentNote] = useState('');
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [messages.length, chat.id]);

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setError('');
    try {
      const res = await reply.mutateAsync({ message: t, email });
      setText('');
      setSentNote(res?.emailed ? 'Enviado también por correo' : '');
      if (res?.emailed) setTimeout(() => setSentNote(''), 4000);
    } catch { setError('No se pudo enviar. Probá de nuevo.'); }
  };

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
        <button onClick={onBack} className="md:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><ArrowLeft size={18} /></button>
        <Avatar chat={chat} />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-slate-800 truncate">{chat.full_name}</p>
          <div className="flex flex-wrap gap-x-3 text-[11px] text-slate-400">
            {chat.email && <span className="inline-flex items-center gap-1"><Mail size={10} /> {chat.email}</span>}
            {chat.city && <span className="inline-flex items-center gap-1"><MapPin size={10} /> {chat.city}</span>}
          </div>
        </div>
        {chat.whatsapp && (
          <a href={waLink(chat.whatsapp)} target="_blank" rel="noreferrer" title="Abrir WhatsApp"
            className="p-2 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 transition-all"><MessageCircle size={18} /></a>
        )}
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50/60 px-4 py-4 space-y-2">
        {isLoading && <p className="text-sm text-slate-400">Cargando…</p>}
        {messages.map((m) => {
          // Todo lo que no escribió el usuario lo escribió el equipo.
          const mine = m.sender_id !== chat.user_id;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${mine ? 'bg-dark text-white rounded-br-md' : 'bg-white text-slate-700 border border-slate-100 rounded-bl-md'}`}>
                {m.image_url && (
                  <a href={m.image_url} target="_blank" rel="noreferrer"><img src={m.image_url} alt="" className="rounded-lg max-h-56 mb-1.5" /></a>
                )}
                {m.file_url && (
                  <a href={m.file_url} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-1 text-xs font-bold underline mb-1 ${mine ? 'text-primary-300' : 'text-blue-600'}`}>
                    <Paperclip size={11} /> {m.file_name || 'Archivo'}
                  </a>
                )}
                {m.content && <p className="whitespace-pre-line break-words">{m.content}</p>}
                <p className={`text-[10px] mt-1 text-right ${mine ? 'text-slate-400' : 'text-slate-400'}`}>
                  {stamp(m.created_at)}{mine ? (m.read_at ? ' · Leído' : ' · Enviado') : ''}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="p-3 border-t border-slate-100">
        {error && <p className="text-xs text-red-500 mb-1.5">{error}</p>}
        <div className="mb-2 flex items-center justify-between gap-2">
          <EmailNotifyToggle key={chat.id} userId={chat.user_id} checked={email} onChange={setEmail} compact />
          {sentNote && <span className="text-[11px] font-semibold text-green-600">{sentNote}</span>}
        </div>
        <div className="flex gap-2 items-end">
          <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Escribí una respuesta… (Enter envía, Shift+Enter salto de línea)"
            className="flex-1 resize-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          <button onClick={send} disabled={reply.isPending || !text.trim()}
            className="h-11 px-4 rounded-xl bg-primary-500 text-dark font-bold text-sm flex items-center gap-1.5 hover:bg-primary-400 transition-all disabled:opacity-50">
            <Send size={16} /> Enviar
          </button>
        </div>
      </div>
    </>
  );
}
