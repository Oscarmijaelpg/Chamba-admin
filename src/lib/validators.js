export const validateEmail = (email) => {
  if (!email) {
    return { valid: false, error: 'Email es requerido' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Email inválido' };
  }

  return { valid: true };
};

export const validatePassword = (password) => {
  if (!password) {
    return { valid: false, error: 'Contraseña es requerida' };
  }

  if (password.length < 6) {
    return { valid: false, error: 'Contraseña debe tener al menos 6 caracteres' };
  }

  return { valid: true };
};

export const validateLoginForm = (email, password) => {
  const errors = {};

  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    errors.email = emailValidation.error;
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    errors.password = passwordValidation.error;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};
