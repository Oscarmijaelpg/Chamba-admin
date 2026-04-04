import React, { useState } from 'react';
import { Search, X } from 'lucide-react';

export default function TableSearch({ placeholder, onSearch, onFilter }) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});

  const handleSearch = (value) => {
    setSearch(value);
    onSearch?.(value);
  };

  const handleFilterChange = (filterKey, value) => {
    const newFilters = { ...filters, [filterKey]: value };
    setFilters(newFilters);
    onFilter?.(newFilters);
  };

  return (
    <div className="flex gap-4 items-center mb-6">
      {/* Search */}
      <div className="flex-1 relative">
        <Search size={18} className="absolute left-3 top-3 text-slate-400" />
        <input
          type="text"
          placeholder={placeholder || 'Buscar...'}
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        {search && (
          <button
            onClick={() => handleSearch('')}
            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Filter Button */}
      <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 transition">
        ⚙️ Filtros
      </button>
    </div>
  );
}
