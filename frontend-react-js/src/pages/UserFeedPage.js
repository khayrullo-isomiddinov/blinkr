import React from "react";
import { useParams } from 'react-router-dom';

import AppShell from '../components/layout/AppShell';
import FeedCard from '../components/feed/FeedCard';
import ProfileHeader from '../components/profile/ProfileHeader';
import { useAuthUser } from '../lib/useAuthUser';
import { apiFetch } from '../lib/api';

const TABS = ['Blinks', 'Replies', 'Highlights', 'Media', 'Likes'];

export default function UserFeedPage() {
  const [activities, setActivities] = React.useState([]);
  const [activeTab, setActiveTab] = React.useState('Blinks');
  const dataFetchedRef = React.useRef(false);
  const params = useParams();
  const user = useAuthUser();

  const handle = params.handle;
  const title = `@${handle}`;

  React.useEffect(() => {
    if (dataFetchedRef.current) return;
    dataFetchedRef.current = true;

    apiFetch(`/api/activities/${title}`)
      .then((res) => res.json())
      .then((resJson) => setActivities(resJson))
      .catch((err) => console.log(err));
  }, [title]);

  const displayName = activities[0]?.display_name;
  const isOwnProfile = !!user && user.handle === handle;

  return (
    <AppShell user={user} active={isOwnProfile ? 'profile' : undefined}>
      <ProfileHeader
        handle={handle}
        displayName={displayName}
        blinkCount={activities.length}
        isOwnProfile={isOwnProfile}
      />

      <div className="sticky top-12 z-10 backdrop-blur-xl bg-background/95 flex items-center justify-between px-space-xs bg-surface-container-lowest/40 rounded-xl mb-space-md">
        <nav className="flex items-center w-full justify-between">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative py-space-md px-space-sm font-label-md text-label-md transition-all flex-1 text-center ${
                activeTab === tab ? 'text-primary font-semibold' : 'text-outline hover:text-on-surface'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-1/4 right-1/4 h-[2px] bg-primary rounded-full" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {activeTab !== 'Blinks' ? (
        <div className="py-space-xl flex items-center justify-center text-outline font-label-sm text-label-sm">
          {activeTab} is coming soon.
        </div>
      ) : (
        <div className="flex flex-col gap-space-md">
          {activities.map((activity) => (
            <FeedCard key={activity.uuid} activity={activity} />
          ))}
          {activities.length === 0 && (
            <div className="py-space-xl flex items-center justify-center text-outline font-label-sm text-label-sm">
              No blinks yet.
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
