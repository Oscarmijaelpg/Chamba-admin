import { describe, it, expect } from 'vitest';
import { validateEmail, validatePassword, validateLoginForm } from '../lib/validators';

describe('Validators', () => {
  describe('validateEmail', () => {
    it('returns error for empty email', () => {
      const result = validateEmail('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Email es requerido');
    });

    it('returns error for invalid email format', () => {
      const result = validateEmail('invalid-email');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Email inválido');
    });

    it('returns valid for correct email format', () => {
      const result = validateEmail('test@example.com');
      expect(result.valid).toBe(true);
    });

    it('accepts emails with subdomains', () => {
      const result = validateEmail('user@mail.example.co.uk');
      expect(result.valid).toBe(true);
    });
  });

  describe('validatePassword', () => {
    it('returns error for empty password', () => {
      const result = validatePassword('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Contraseña es requerida');
    });

    it('returns error for password less than 6 characters', () => {
      const result = validatePassword('12345');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Contraseña debe tener al menos 6 caracteres');
    });

    it('returns valid for password with 6 characters', () => {
      const result = validatePassword('123456');
      expect(result.valid).toBe(true);
    });

    it('returns valid for long password', () => {
      const result = validatePassword('this-is-a-very-secure-password');
      expect(result.valid).toBe(true);
    });
  });

  describe('validateLoginForm', () => {
    it('returns all errors for empty form', () => {
      const result = validateLoginForm('', '');
      expect(result.valid).toBe(false);
      expect(result.errors.email).toBeDefined();
      expect(result.errors.password).toBeDefined();
    });

    it('returns only email error for invalid email', () => {
      const result = validateLoginForm('invalid', '123456');
      expect(result.valid).toBe(false);
      expect(result.errors.email).toBeDefined();
      expect(result.errors.password).toBeUndefined();
    });

    it('returns only password error for short password', () => {
      const result = validateLoginForm('test@example.com', '123');
      expect(result.valid).toBe(false);
      expect(result.errors.email).toBeUndefined();
      expect(result.errors.password).toBeDefined();
    });

    it('returns valid for correct credentials', () => {
      const result = validateLoginForm('test@example.com', '123456');
      expect(result.valid).toBe(true);
      expect(Object.keys(result.errors).length).toBe(0);
    });
  });
});
