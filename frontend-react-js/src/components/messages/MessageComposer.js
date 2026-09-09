import React from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../../lib/api';

export default function MessageComposer({ setMessages }) {
  const [message, setMessage] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const params = useParams();

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!message.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/messages', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, user_receiver_handle: params.handle }),
      });
      const data = await res.json();
      if (res.status === 200) {
        setMessages((current) => [...current, data]);
        setMessage('');
      } else {
        console.log(res);
      }
    } catch (err) {
      console.log(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-space-sm p-space-sm border-t border-outline-variant/30 shrink-0">
      <input
        className="flex-1 bg-surface-container-high rounded-full px-space-md py-space-sm outline-none font-body-md text-body-md text-on-surface placeholder:text-outline"
        placeholder="Send a direct message..."
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <button
        type="submit"
        disabled={!message.trim() || submitting}
        className="w-10 h-10 rounded-full bg-primary-container hover:bg-inverse-primary text-on-primary-container flex items-center justify-center shrink-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="material-symbols-outlined text-[20px]">send</span>
      </button>
    </form>
  );
}
