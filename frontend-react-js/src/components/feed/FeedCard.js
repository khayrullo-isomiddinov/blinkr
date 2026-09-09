import React from 'react';
import { relativeTime } from '../../lib/time';

export default function FeedCard({ activity, badge }) {
  const [liked, setLiked] = React.useState(false);
  const [likeCount, setLikeCount] = React.useState(activity.likes_count || 0);

  const toggleLike = () => {
    setLiked((prev) => {
      const next = !prev;
      setLikeCount((count) => count + (next ? 1 : -1));
      return next;
    });
  };

  const initial = (activity.display_name || activity.handle || '?').charAt(0).toUpperCase();

  return (
    <article className="p-space-base bg-surface-container-lowest rounded-xl flex flex-col gap-space-sm hover:bg-surface-container/30 transition-colors shadow-sm">
      {badge && (
        <div className="flex items-center gap-space-xs text-secondary">
          <span className="material-symbols-outlined text-[13px]">bolt</span>
          <span className="font-label-xs text-label-xs font-semibold">{badge}</span>
        </div>
      )}
      <div className="flex items-start gap-space-md">
        <span className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center font-headline-sm text-headline-sm text-primary font-bold shrink-0">
          {initial}
        </span>
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-xs min-w-0 flex-wrap">
              <span className="font-label-md text-label-md font-semibold text-on-surface truncate">
                {activity.display_name || activity.handle}
              </span>
              <span className="font-body-sm text-body-sm text-outline truncate">@{activity.handle}</span>
              <span className="text-outline text-body-sm">·</span>
              <span className="font-body-sm text-body-sm text-outline">{relativeTime(activity.created_at)}</span>
            </div>
          </div>
          <p className="font-body-md text-body-md text-on-surface mt-space-xs leading-relaxed whitespace-pre-wrap">
            {activity.message}
          </p>

          <div className="flex items-center justify-between text-outline mt-space-md pt-space-xs">
            <span className="flex items-center gap-space-xs text-body-sm">
              <span className="material-symbols-outlined text-[18px]">chat_bubble_outline</span>
              <span className="font-label-sm text-label-sm">{activity.replies_count || 0}</span>
            </span>
            <span className="flex items-center gap-space-xs text-body-sm">
              <span className="material-symbols-outlined text-[18px]">repeat</span>
              <span className="font-label-sm text-label-sm">{activity.reposts_count || 0}</span>
            </span>
            <button
              onClick={toggleLike}
              className={`flex items-center gap-space-xs transition-colors text-body-sm ${liked ? 'text-error' : 'hover:text-error'}`}
            >
              <span
                className="material-symbols-outlined text-[18px]"
                style={{ fontVariationSettings: liked ? "'FILL' 1" : "'FILL' 0" }}
              >
                {liked ? 'favorite' : 'favorite_border'}
              </span>
              <span className="font-label-sm text-label-sm">{likeCount}</span>
            </button>
            <span className="flex items-center gap-space-xs hover:text-primary transition-colors text-body-sm">
              <span className="material-symbols-outlined text-[18px]">bookmark_border</span>
            </span>
            <span className="hover:text-on-surface transition-colors">
              <span className="material-symbols-outlined text-[18px]">share</span>
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
