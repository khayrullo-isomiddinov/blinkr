import React from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../lib/api';
import { describeApiError } from '../../lib/apiErrors';

export function useStartWorkout() {
  const navigate = useNavigate();
  const [starting, setStarting] = React.useState(false);
  const [error, setError] = React.useState('');

  const start = React.useCallback(async () => {
    setStarting(true);
    setError('');
    try {
      const session = await apiRequest('/api/workout-sessions', { method: 'POST', body: { started_at: new Date().toISOString() } });
      navigate(`/workouts/${session.id}`);
    } catch (err) {
      setError(describeApiError(err));
      setStarting(false);
    }
  }, [navigate]);

  return { start, starting, error };
}
