import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase before any imports
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
    },
  },
}));

import LoginView from '../components/LoginView';
import { supabase } from '../lib/supabase';

describe('LoginView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form with email and password fields', () => {
    render(<LoginView />);

    expect(screen.getByPlaceholderText('admin@chamba.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument();
  });

  it('displays "CHAMBA Admin Panel" header', () => {
    render(<LoginView />);

    expect(screen.getByText('CHAMBA')).toBeInTheDocument();
    expect(screen.getByText(/Admin Panel/i)).toBeInTheDocument();
  });

  it('allows user to input email and password', () => {
    render(<LoginView />);

    const emailInput = screen.getByPlaceholderText('admin@chamba.com');
    const passwordInput = screen.getByPlaceholderText('••••••••');

    fireEvent.change(emailInput, { target: { value: 'test@chamba.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(emailInput.value).toBe('test@chamba.com');
    expect(passwordInput.value).toBe('password123');
  });

  it('calls supabase.auth.signInWithPassword on form submit', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({ error: null });

    render(<LoginView />);

    const emailInput = screen.getByPlaceholderText('admin@chamba.com');
    const passwordInput = screen.getByPlaceholderText('••••••••');
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });

    fireEvent.change(emailInput, { target: { value: 'test@chamba.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@chamba.com',
        password: 'password123',
      });
    });
  });

  it('displays error message on failed login', async () => {
    const errorMsg = 'Invalid login credentials';
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      error: new Error(errorMsg),
    });

    render(<LoginView />);

    const emailInput = screen.getByPlaceholderText('admin@chamba.com');
    const passwordInput = screen.getByPlaceholderText('••••••••');
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });

    fireEvent.change(emailInput, { target: { value: 'test@chamba.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(errorMsg)).toBeInTheDocument();
    });
  });

  it('disables submit button while loading', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ error: null }), 100))
    );

    render(<LoginView />);

    const emailInput = screen.getByPlaceholderText('admin@chamba.com');
    const passwordInput = screen.getByPlaceholderText('••••••••');
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });

    fireEvent.change(emailInput, { target: { value: 'test@chamba.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    expect(submitButton).toBeDisabled();
    expect(screen.getByRole('button', { name: /iniciando sesión/i })).toBeInTheDocument();
  });

  it('requires email field', () => {
    render(<LoginView />);

    const emailInput = screen.getByPlaceholderText('admin@chamba.com');
    expect(emailInput).toBeRequired();
  });

  it('requires password field', () => {
    render(<LoginView />);

    const passwordInput = screen.getByPlaceholderText('••••••••');
    expect(passwordInput).toBeRequired();
  });

  it('has correct input types', () => {
    render(<LoginView />);

    const emailInput = screen.getByPlaceholderText('admin@chamba.com');
    const passwordInput = screen.getByPlaceholderText('••••••••');

    expect(emailInput).toHaveAttribute('type', 'email');
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('renders with proper styling classes', () => {
    const { container } = render(<LoginView />);

    const formContainer = container.querySelector('.bg-white.rounded-3xl');
    expect(formContainer).toBeInTheDocument();
  });
});
