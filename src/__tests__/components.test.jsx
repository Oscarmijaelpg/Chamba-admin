import React from 'react';
import { render, screen } from '@testing-library/react';
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
    },
  },
}));

// ─── StatCard (defined inline in App.jsx – reproduce it here for unit testing) ──
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
import ModerationModal from '../components/ModerationModal';

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

// ─── 5. ModerationModal ──────────────────────────────────────────────────────
describe('ModerationModal', () => {
  const mockItem = { id: '1', name: 'Test User', email: 'test@example.com', status: 'active' };

  it('does NOT render when isOpen is false', () => {
    render(
      <ModerationModal
        isOpen={false}
        item={mockItem}
        onClose={vi.fn()}
        onAction={vi.fn()}
      />
    );
    expect(screen.queryByText('Moderación')).not.toBeInTheDocument();
  });

  it('does NOT render when item is null even if isOpen is true', () => {
    render(
      <ModerationModal
        isOpen={true}
        item={null}
        onClose={vi.fn()}
        onAction={vi.fn()}
      />
    );
    expect(screen.queryByText('Moderación')).not.toBeInTheDocument();
  });

  it('DOES render when isOpen is true and item is provided', () => {
    render(
      <ModerationModal
        isOpen={true}
        item={mockItem}
        onClose={vi.fn()}
        onAction={vi.fn()}
      />
    );
    expect(screen.getByText('Moderación')).toBeInTheDocument();
  });

  it('shows item name in the modal when open', () => {
    render(
      <ModerationModal
        isOpen={true}
        item={mockItem}
        onClose={vi.fn()}
        onAction={vi.fn()}
      />
    );
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('shows item email when provided', () => {
    render(
      <ModerationModal
        isOpen={true}
        item={mockItem}
        onClose={vi.fn()}
        onAction={vi.fn()}
      />
    );
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('renders action buttons when open', () => {
    render(
      <ModerationModal
        isOpen={true}
        item={mockItem}
        onClose={vi.fn()}
        onAction={vi.fn()}
      />
    );
    expect(screen.getByText('Aprobar')).toBeInTheDocument();
    expect(screen.getByText('Rechazar')).toBeInTheDocument();
    expect(screen.getByText('Banear')).toBeInTheDocument();
  });
});
