import { useState, useEffect } from 'react';

// Retrasa la propagación de un valor (p. ej. el texto de búsqueda) para no
// disparar una query por cada tecla. Devuelve el valor "estabilizado".
export function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
}
