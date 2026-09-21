import React from 'react';
import { Link } from 'react-router-dom';

export default function AuthShell({ title, children, footer }) {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="block text-center text-2xl font-extrabold text-emerald-400 mb-6">
          Blinkr
        </Link>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h1 className="text-xl font-bold text-center mb-6">{title}</h1>
          {children}
        </div>
        {footer && <div className="text-center text-sm text-gray-400 mt-4">{footer}</div>}
      </div>
    </div>
  );
}

export function AuthField({ label, ...inputProps }) {
  return (
    <div className="mb-4">
      <label htmlFor={inputProps.id} className="block text-sm font-medium text-gray-300 mb-1">
        {label}
      </label>
      <input
        {...inputProps}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-emerald-600"
      />
    </div>
  );
}

export function AuthError({ children }) {
  if (!children) return null;
  return (
    <div className="mb-4 px-3 py-2 rounded-lg bg-red-950 border border-red-900 text-red-300 text-sm">
      {children}
    </div>
  );
}

export function AuthButton({ children, ...props }) {
  return (
    <button
      {...props}
      className="w-full py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 transition-colors"
    >
      {children}
    </button>
  );
}
