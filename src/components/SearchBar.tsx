import React, { useState } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, placeholder = "Search nodes..." }) => {
  const [query, setQuery] = useState('');

  const handleSearch = (value: string) => {
    setQuery(value);
    onSearch(value);
  };

  const clearSearch = () => {
    setQuery('');
    onSearch('');
  };

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-4 w-4 text-gray-400" />
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
      />
      {query && (
        <button
          onClick={clearSearch}
          className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600"
        >
          <X className="h-4 w-4 text-gray-400" />
        </button>
      )}
    </div>
  );
};
