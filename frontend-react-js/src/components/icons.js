import React from 'react';

const base = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };

export const ChevronLeft = (props) => <svg {...base} {...props}><path d="M15 5l-7 7 7 7" /></svg>;
export const ChevronRight = (props) => <svg {...base} {...props}><path d="M9 5l7 7-7 7" /></svg>;
export const Plus = (props) => <svg {...base} strokeWidth={2.5} {...props}><path d="M12 5v14M5 12h14" /></svg>;
export const Lock = (props) => <svg {...base} {...props}><rect x="5" y="11" width="14" height="9" rx="1.5" /><path d="M8 11V8a4 4 0 018 0v3" /></svg>;
export const ListIcon = (props) => <svg {...base} {...props}><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" /></svg>;
export const Dumbbell = (props) => <svg {...base} {...props}><path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" /></svg>;
export const SignOut = (props) => <svg {...base} {...props}><path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9" /></svg>;
export const Minus = (props) => <svg {...base} strokeWidth={2.5} {...props}><path d="M5 12h14" /></svg>;
export const Check = (props) => <svg {...base} strokeWidth={3} {...props}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;
export const CalendarIcon = (props) => <svg {...base} {...props}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>;
export const ChevronUp = (props) => <svg {...base} {...props}><path d="M5 15l7-7 7 7" /></svg>;
export const ChevronDown = (props) => <svg {...base} {...props}><path d="M5 9l7 7 7-7" /></svg>;
export const ArrowUp = (props) => <svg {...base} {...props}><path d="M12 19V5M5 12l7-7 7 7" /></svg>;
export const Close = (props) => <svg {...base} {...props}><path d="M6 6l12 12M18 6L6 18" /></svg>;
