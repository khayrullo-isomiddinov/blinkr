import React from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../lib/api';
import { describeApiError } from '../../lib/apiErrors';

// Starts a normal workout_session from a planned workout, then opens it.
export function useStartPlanned() {
  const navigate = useNavigate();
  const [busyId, setBusyId] = React.useState(null);
  const [error, setError] = React.useState('');

  const start = React.useCallback(async (plannedWorkoutId) => {
    setBusyId(plannedWorkoutId);
    setError('');
    try {
      const session = await apiRequest(`/api/plan/workouts/${plannedWorkoutId}/start`, {
        method: 'POST',
        body: { started_at: new Date().toISOString() },
      });
      navigate(`/workouts/${session.id}`);
    } catch (err) {
      setError(describeApiError(err));
      setBusyId(null);
    }
  }, [navigate]);

  return { start, busyId, error };
}
