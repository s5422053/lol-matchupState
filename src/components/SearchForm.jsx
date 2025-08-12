import React, { useState } from 'react';

const SearchForm = ({ onSearch, loading }) => {
  const [riotId, setRiotId] = useState('Hide on bush#KR1');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!loading) {
      onSearch(riotId);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full sm:max-w-md">
      <input
        type="text"
        value={riotId}
        onChange={(e) => setRiotId(e.target.value)}
        
        className="flex-grow bg-gray-800 border border-gray-700 rounded-md px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors"
        disabled={loading}
      />
      <button type="submit" className="bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-md transition-colors duration-200" disabled={loading}>
        {loading ? '検索中...' : '検索'}
      </button>
    </form>
  );
};

export default SearchForm;

