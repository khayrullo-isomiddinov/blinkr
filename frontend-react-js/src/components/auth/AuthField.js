import React from 'react';

export default function AuthField({ label, ...rest }) {
  return (
    <div className="flex flex-col gap-space-2xs">
      <label className="font-label-sm text-label-sm text-on-surface-variant">{label}</label>
      <input
        className="bg-surface-container-high rounded-xl px-space-md py-space-sm outline-none font-body-md text-body-md text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary-container transition-all"
        {...rest}
      />
    </div>
  );
}
