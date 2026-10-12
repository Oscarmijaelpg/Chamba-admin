import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase before any imports that use it
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        count: 'exact',
        head: true,
        neq: vi.fn(() => ({ count: 'exact', head: true })),
        eq: vi.fn(function () { return this; }),
        order: vi.fn(function () { return this; }),
        limit: vi.fn(function () { return this; }),
        in: vi.fn(function () { return this; }),
        single: vi.fn(async () => ({ data: null, error: null })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(async () => ({ error: null })),
      })),
    })),
    auth: {
      getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: vi.fn(async () => ({ error: null })),
    },
  },
}));

// ─── StatCard (lives in DashboardView.jsx — reproduced aquí para test unitario) ──
const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-slate-500 text-sm font-medium">{title}</p>
        <h3 className="text-2xl font-bold mt-2 text-slate-800">{value}</h3>
      </div>
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
    </div>
  </div>
);

// Minimal stand-in icon for StatCard tests
const TestIcon = ({ size, className }) => (
  <svg data-testid="stat-icon" width={size} height={size} className={className} />
);

// ─── Component imports ────────────────────────────────────────────────────────
import DarkModeToggle from '../components/DarkModeToggle';
import TableSearch from '../components/TableSearch';
import TableActions from '../components/TableActions';
import ModerationActionModal from '../components/ModerationActionModal';

// ─── 1. StatCard ─────────────────────────────────────────────────────────────
describe('StatCard', () => {
  it('renders title and value', () => {
    render(
      <StatCard
        title="Total Usuarios"
        value={42}
        icon={TestIcon}
        color="bg-blue-500"
      />
    );
    expect(screen.getByText('Total Usuarios')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders the icon element', () => {
    render(
      <StatCard
        title="Chambas"
        value="100"
        icon={TestIcon}
        color="bg-primary-500"
      />
    );
    expect(screen.getByTestId('stat-icon')).toBeInTheDocument();
  });

  it('applies the color class to the icon wrapper', () => {
    const { container } = render(
      <StatCard
        title="Revenue"
        value="Bs. 5000"
        icon={TestIcon}
        color="bg-amber-500"
      />
    );
    const iconWrapper = container.querySelector('.bg-amber-500');
    expect(iconWrapper).toBeInTheDocument();
  });
});

// ─── 2. DarkModeToggle ───────────────────────────────────────────────────────
describe('DarkModeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders without crashing', () => {
    render(<DarkModeToggle />);
  });

  it('renders a button element', () => {
    render(<DarkModeToggle />);
    const btn = screen.getByRole('button');
    expect(btn).toBeInTheDocument();
  });

  it('button has a title attribute indicating the toggle action', () => {
    render(<DarkModeToggle />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('title');
  });
});

// ─── 3. TableSearch ──────────────────────────────────────────────────────────
describe('TableSearch', () => {
  it('renders an input element', () => {
    render(<TableSearch />);
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
  });

  it('uses the placeholder prop when provided', () => {
    render(<TableSearch placeholder="Buscar usuarios..." />);
    expect(screen.getByPlaceholderText('Buscar usuarios...')).toBeInTheDocument();
  });

  it('falls back to default placeholder when none is provided', () => {
    render(<TableSearch />);
    expect(screen.getByPlaceholderText('Buscar...')).toBeInTheDocument();
  });

  it('renders the filter button', () => {
    render(<TableSearch />);
    expect(screen.getByText(/Filtros/i)).toBeInTheDocument();
  });
});

// ─── 4. TableActions ─────────────────────────────────────────────────────────
describe('TableActions', () => {
  it('renders without crashing', () => {
    render(<TableActions />);
  });

  it('renders the export CSV button', () => {
    render(<TableActions />);
    expect(screen.getByText(/Exportar CSV/i)).toBeInTheDocument();
  });

  it('does NOT show bulk-action buttons when selectedCount is 0', () => {
    render(<TableActions selectedCount={0} />);
    expect(screen.queryByText(/Aprobar/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Rechazar/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Eliminar/i)).not.toBeInTheDocument();
  });

  it('shows bulk-action buttons when selectedCount > 0', () => {
    render(<TableActions selectedCount={3} />);
    expect(screen.getByText(/Aprobar/i)).toBeInTheDocument();
    expect(screen.getByText(/Rechazar/i)).toBeInTheDocument();
    expect(screen.getByText(/Eliminar/i)).toBeInTheDocument();
  });

  it('shows the correct selected count label', () => {
    render(<TableActions selectedCount={2} />);
    expect(screen.getByText(/2 seleccionados/i)).toBeInTheDocument();
  });
});

// ─── 5. ModerationActionModal ────────────────────────────────────────────────
describe('ModerationActionModal', () => {
  const base = { action: 'ban', entityType: 'user', targetName: 'Test User', onClose: vi.fn(), onConfirm: vi.fn() };

  it('does NOT render when isOpen is false', () => {
    render(<ModerationActionModal {...base} isOpen={false} />);
    expect(screen.queryByText('Suspender a Test User')).not.toBeInTheDocument();
  });

  it('shows the title and the honest suspension text', () => {
    render(<ModerationActionModal {...base} isOpen={true} />);
    expect(screen.getByText('Suspender a Test User')).toBeInTheDocument();
    expect(screen.getByText(/no puede publicar ni postular/i)).toBeInTheDocument();
    expect(screen.queryByText(/iniciar sesión/i)).not.toBeInTheDocument();
  });

  it('uses the server default message as placeholder and notifies by default', () => {
    render(<ModerationActionModal {...base} isOpen={true} />);
    expect(screen.getByPlaceholderText('Tu cuenta fue suspendida por incumplir las normas de la comunidad.')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('sends the typed message and the notify flag on confirm', () => {
    const onConfirm = vi.fn();
    render(<ModerationActionModal {...base} action="warn" isOpen={true} onConfirm={onConfirm} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  Publicaste datos falsos.  ' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByText('Advertir'));
    expect(onConfirm).toHaveBeenCalledWith({ message: 'Publicaste datos falsos.', notify: false });
  });

  it('has no message field when dismissing a report', () => {
    render(<ModerationActionModal {...base} action="dismiss" isOpen={true} />);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText('Descartar reporte')).toBeInTheDocument();
  });

  it('shows the error and disables the buttons while loading', () => {
    render(<ModerationActionModal {...base} isOpen={true} loading={true} error="No se puede suspender a un administrador." />);
    expect(screen.getByRole('alert')).toHaveTextContent('No se puede suspender a un administrador.');
    expect(screen.getByText('Cancelar')).toBeDisabled();
  });
});
