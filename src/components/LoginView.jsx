import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { validateLoginForm } from '../lib/validators';

export default function LoginView() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    // Validate form
    const validation = validateLoginForm(email, password);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      return;
    }

    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    }
    // On success, onAuthStateChange in App.jsx handles the transition
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-black text-primary-600 tracking-tighter">
            CHAMBA
            <span className="text-slate-400 text-xs font-bold uppercase tracking-widest block mt-1">
              Admin Panel
            </span>
          </h1>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                fieldErrors.email ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-primary-500'
              }`}
              placeholder="admin@chamba.com"
            />
            {fieldErrors.email && (
              <p className="text-red-500 text-xs font-medium mt-1">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                fieldErrors.password ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-primary-500'
              }`}
              placeholder="••••••••"
            />
            {fieldErrors.password && (
              <p className="text-red-500 text-xs font-medium mt-1">{fieldErrors.password}</p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary-500 text-white font-bold rounded-xl hover:bg-primary-600 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-primary-200"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}
