import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Rangos etarios para la distribución.
const RANGES = [
  { label: '< 18', min: 0, max: 17 },
  { label: '18-24', min: 18, max: 24 },
  { label: '25-34', min: 25, max: 34 },
  { label: '35-44', min: 35, max: 44 },
  { label: '45+', min: 45, max: 200 },
];

const EMPTY = {
  total: 0,
  withAge: 0,
  avg: null,
  median: null,
  min: null,
  max: null,
  coverage: 0,
  distribution: RANGES.map((r) => ({ rango: r.label, usuarios: 0 })),
};

export function useAgeAnalytics() {
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      const { data: rows, error } = await supabase.from('users').select('age');
      if (!active) return;
      if (error || !rows) {
        setLoading(false);
        return;
      }

      const total = rows.length;
      // Edades válidas, ordenadas (para mediana/min/max).
      const ages = rows
        .map((r) => r.age)
        .filter((a) => a != null && a > 0)
        .sort((a, b) => a - b);
      const withAge = ages.length;

      const round1 = (n) => Math.round(n * 10) / 10;
      const avg = withAge ? round1(ages.reduce((s, a) => s + a, 0) / withAge) : null;
      const median = withAge
        ? withAge % 2
          ? ages[(withAge - 1) / 2]
          : round1((ages[withAge / 2 - 1] + ages[withAge / 2]) / 2)
        : null;

      const distribution = RANGES.map((r) => ({
        rango: r.label,
        usuarios: ages.filter((a) => a >= r.min && a <= r.max).length,
      }));

      setData({
        total,
        withAge,
        avg,
        median,
        min: withAge ? ages[0] : null,
        max: withAge ? ages[withAge - 1] : null,
        coverage: total ? Math.round((withAge / total) * 100) : 0,
        distribution,
      });
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, []);

  return { ...data, loading };
}
