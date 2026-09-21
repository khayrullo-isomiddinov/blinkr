import React from 'react';

export default function ComingNextPage({ title }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">{title}</h1>
      <p className="text-sm text-gray-400">Coming next.</p>
    </div>
  );
}
