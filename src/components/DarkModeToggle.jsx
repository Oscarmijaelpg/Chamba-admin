import React, { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';

export default function DarkModeToggle({ className = 'p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition' }) {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Check localStorage
    const stored = localStorage.getItem('darkMode') === 'true';
    setDarkMode(stored);
    
    // Apply to document
    if (stored) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const handleToggle = () => {
    const newValue = !darkMode;
    setDarkMode(newValue);
    localStorage.setItem('darkMode', newValue);
    
    if (newValue) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={className}
      title={darkMode ? 'Modo claro' : 'Modo oscuro'}
    >
      {darkMode ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
