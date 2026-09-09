import React from 'react';

const MAX_CHARS = 280;
const CIRCUMFERENCE = 2 * Math.PI * 9;

export default function Composer({ user, setActivities, composerRef }) {
  const [message, setMessage] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');

  const length = message.length;
  const overLimit = length > MAX_CHARS;
  const progress = Math.min(length / MAX_CHARS, 1);
  const offset = CIRCUMFERENCE - progress * CIRCUMFERENCE;

  const onChange = (event) => {
    setMessage(event.target.value);
    event.target.style.height = 'auto';
    event.target.style.height = `${event.target.scrollHeight}px`;
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!message.trim() || overLimit || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const backend_url = `${process.env.REACT_APP_BACKEND_URL}/api/activities`;
      const res = await fetch(backend_url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, ttl: '7-days' }),
      });
      const data = await res.json();
      if (res.status === 200) {
        setActivities((current) => [data, ...current]);
        setMessage('');
      } else {
        setError('Could not post -- please try again.');
      }
    } catch (err) {
      setError('Could not post -- please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  const initial = (user.display_name || user.handle || '?').charAt(0).toUpperCase();

  return (
    <section className="p-space-base bg-surface-container-lowest my-space-xs rounded-xl shadow-md">
      <form onSubmit={onSubmit} className="flex gap-space-md">
        <span className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center font-headline-sm text-headline-sm text-primary font-bold shrink-0">
          {initial}
        </span>
        <div className="flex-1 flex flex-col gap-space-sm min-w-0">
          <div className="flex items-center gap-space-xs text-outline">
            <span className="font-label-xs text-label-xs bg-surface-container px-space-xs py-space-2xs rounded text-primary font-medium">
              Markdown Supported
            </span>
            <span className="text-[10px]">•</span>
            <span className="font-label-xs text-label-xs">LaTeX enabled</span>
          </div>
          <textarea
            ref={composerRef}
            className="w-full bg-transparent resize-none border-0 outline-none font-body-lg text-body-lg text-on-surface placeholder:text-outline/70 focus:ring-0 leading-relaxed"
            placeholder="What's resonating with you today?"
            rows={2}
            value={message}
            onChange={onChange}
          />
          {error && <div className="font-body-sm text-body-sm text-error">{error}</div>}
          <div className="flex items-center">
            <button
              type="button"
              className="flex items-center gap-space-xs px-space-sm py-space-2xs rounded-full bg-surface-container hover:bg-surface-container-high text-primary font-label-xs text-label-xs transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">public</span>
              <span>Everyone can reply</span>
              <span className="material-symbols-outlined text-[12px] text-outline">expand_more</span>
            </button>
          </div>
          <div className="flex items-center justify-between pt-space-xs">
            <div className="flex items-center gap-space-xs">
              <span className="w-8 h-8 rounded-full flex items-center justify-center text-primary hover:bg-primary-container/15 transition-colors">
                <span className="material-symbols-outlined text-[18px]">image</span>
              </span>
              <span className="w-8 h-8 rounded-full flex items-center justify-center text-secondary hover:bg-secondary-container/15 transition-colors">
                <span className="material-symbols-outlined text-[18px]">code_blocks</span>
              </span>
              <span className="w-8 h-8 rounded-full flex items-center justify-center text-tertiary hover:bg-tertiary-container/15 transition-colors">
                <span className="material-symbols-outlined text-[18px]">ballot</span>
              </span>
              <span className="w-8 h-8 rounded-full flex items-center justify-center text-primary hover:bg-primary-container/15 transition-colors">
                <span className="material-symbols-outlined text-[18px]">sentiment_satisfied</span>
              </span>
              <span className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container transition-colors">
                <span className="material-symbols-outlined text-[18px]">schedule</span>
              </span>
            </div>
            <div className="flex items-center gap-space-md">
              <div className="relative w-6 h-6 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 24 24">
                  <circle className="text-surface-container-high" cx="12" cy="12" fill="none" r="9" stroke="currentColor" strokeWidth="2" />
                  <circle
                    className={overLimit ? 'text-error' : 'text-primary-container'}
                    cx="12"
                    cy="12"
                    fill="none"
                    r="9"
                    stroke="currentColor"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    strokeWidth="2"
                  />
                </svg>
                {length > MAX_CHARS - 40 && (
                  <span className="font-label-xs text-[9px] text-outline font-bold absolute">
                    {MAX_CHARS - length}
                  </span>
                )}
              </div>
              <button
                type="submit"
                disabled={!message.trim() || overLimit || submitting}
                className="px-space-md py-space-xs bg-primary-container hover:bg-inverse-primary active:scale-95 text-on-primary-container font-label-md text-label-md font-semibold rounded-full shadow-sm flex items-center gap-space-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{submitting ? 'Posting…' : 'Blink'}</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </section>
  );
}
