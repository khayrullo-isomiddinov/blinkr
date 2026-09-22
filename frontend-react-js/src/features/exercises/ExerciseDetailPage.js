import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { Loading, LoadError } from '../../components/PageState';
import { PlayCircle, ChevronLeft } from '../../components/icons';
import { ExerciseLogo } from './ExercisesPage';
import { exerciseIconUrl } from '../../lib/exerciseIcons';

export default function ExerciseDetailPage() {
  const { id } = useParams();
  const { status, data: exercise, error, reload } = useLoad(`/api/exercises/${id}`);

  if (status === 'loading') return <div className="mx-auto max-w-2xl px-4 pt-6"><Loading label="Loading exercise" /></div>;
  if (status === 'error') {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <div className="card m-4 max-w-lg p-6">
          <p className="mb-3 text-sm text-fg-soft">That exercise was not found.</p>
          <Link to="/exercises">Back to exercises</Link>
        </div>
      );
    }
    return <div className="mx-auto max-w-2xl px-4 pt-6"><LoadError error={error} onRetry={reload} /></div>;
  }

  const iconSrc = exerciseIconUrl(exercise.name);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-12 pt-6 sm:pt-10">
      <Link to="/exercises" className="mb-4 inline-flex items-center gap-1 text-sm text-fg-mute hover:no-underline">
        <ChevronLeft width={16} height={16} />Back to exercises
      </Link>
      <div className="flex items-center gap-4">
        <ExerciseLogo exercise={exercise} size={56} />
        <div>
          <h1 className="font-display text-[32px] font-extrabold leading-none tracking-tight">{exercise.name}</h1>
          <div className="mt-2 flex gap-2 text-sm">
            <span className="chip capitalize">{exercise.muscle_group}</span>
            {exercise.equipment && <span className="chip">{exercise.equipment}</span>}
          </div>
        </div>
      </div>

      {iconSrc && (
        <figure className="card mt-6 flex flex-col items-center overflow-hidden p-8">
          <img src={iconSrc} alt={exercise.name} className="h-48 w-48 object-contain" />
          <figcaption className="mt-2 text-xs text-fg-mute">
            Illustration by Bryl Lim, adapted from Everkinetic — CC BY-SA 4.0
          </figcaption>
        </figure>
      )}

      <div className="card mt-6 flex flex-col items-center gap-3 border-dashed p-10 text-center">
        <PlayCircle width={40} height={40} className="text-fg-mute" />
        <p className="text-sm font-medium text-fg-soft">Form demonstration coming soon</p>
        <p className="max-w-sm text-xs text-fg-mute">
          This is a placeholder for a correct-form video. It is not linked to any content yet.
        </p>
      </div>
    </div>
  );
}
