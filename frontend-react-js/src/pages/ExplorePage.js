import React from "react";

import AppShell from '../components/layout/AppShell';
import FeedCard from '../components/feed/FeedCard';
import SpotlightBanner from '../components/explore/SpotlightBanner';
import TrendingCard from '../components/explore/TrendingCard';
import CreatorCard from '../components/explore/CreatorCard';
import { useAuthUser } from '../lib/useAuthUser';
import { apiFetch } from '../lib/api';

const FILTERS = ['Trending', 'Technology', 'Design & UI', 'Startups', 'Open Source', 'AI & ML'];

const TRENDING_TOPICS = [
  { rank: '01', category: 'Technology', topic: '#TypeScript5', description: 'Major compiler speedups & granular return type inferences hit beta.', count: '24.8K Blinks' },
  { rank: '02', category: 'Design & Craft', topic: 'Spatial UI', description: 'Deconstructing the mathematical grids and typographic hierarchy of modern design systems.', count: '18.2K Blinks' },
  { rank: '03', category: 'Systems Programming', topic: '#RustLang', description: 'New discussions on memory safety guarantees without garbage collection.', count: '19.2K Blinks' },
  { rank: '04', category: 'AI', topic: 'Autonomous Agents', description: 'Multi-step tool-using agents move from research demos to production.', count: '42.1K Blinks' },
];

export default function ExplorePage() {
  const [activities, setActivities] = React.useState([]);
  const [activeFilter, setActiveFilter] = React.useState('Trending');
  const dataFetchedRef = React.useRef(false);
  const user = useAuthUser();

  React.useEffect(() => {
    if (dataFetchedRef.current) return;
    dataFetchedRef.current = true;

    apiFetch('/api/activities/home')
      .then((res) => res.json())
      .then((resJson) => setActivities(resJson))
      .catch((err) => console.log(err));
  }, []);

  const creators = React.useMemo(() => {
    const seen = new Map();
    activities.forEach((activity) => {
      if (activity.handle && activity.handle !== user?.handle && !seen.has(activity.handle)) {
        seen.set(activity.handle, {
          display_name: activity.display_name,
          handle: activity.handle,
          latestMessage: activity.message,
        });
      }
    });
    return Array.from(seen.values()).slice(0, 4);
  }, [activities, user]);

  return (
    <AppShell user={user} active="explore" suggestedUsers={creators}>
      <div className="sticky top-0 z-20 bg-surface/90 backdrop-blur-md pt-space-xs pb-space-sm shadow-sm flex flex-col gap-space-sm">
        <div className="relative flex items-center w-full bg-surface-container-high rounded-full px-space-md py-space-xs">
          <span className="material-symbols-outlined text-outline text-[20px] mr-space-xs">travel_explore</span>
          <input
            className="w-full bg-transparent border-0 outline-none font-body-sm text-body-sm text-on-surface placeholder:text-outline"
            placeholder="Explore topics, tags, or authors..."
            type="text"
          />
        </div>
        <div className="flex items-center gap-space-xs overflow-x-auto py-space-2xs">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-space-md py-space-2xs rounded-full font-label-sm text-label-sm whitespace-nowrap transition-all shrink-0 ${
                activeFilter === filter
                  ? 'bg-primary-container text-on-primary-container font-semibold shadow-sm'
                  : 'bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-space-xl mt-space-md">
        <SpotlightBanner />

        <section className="flex flex-col gap-space-md">
          <div className="flex items-center justify-between">
            <span className="font-headline-sm text-headline-sm text-on-surface">Trending Radar</span>
            <span className="font-label-xs text-label-xs px-space-xs py-space-2xs rounded-full bg-surface-container-highest text-secondary font-semibold">
              Real-time
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm">
            {TRENDING_TOPICS.map((topic) => (
              <TrendingCard key={topic.topic} {...topic} />
            ))}
          </div>
        </section>

        {creators.length > 0 && (
          <section className="flex flex-col gap-space-md">
            <span className="font-headline-sm text-headline-sm text-on-surface">Pioneers to Follow</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm">
              {creators.map((person) => (
                <CreatorCard key={person.handle} person={person} />
              ))}
            </div>
          </section>
        )}

        <section className="flex flex-col gap-space-md">
          <span className="font-headline-sm text-headline-sm text-on-surface">Popular Blinks</span>
          <div className="flex flex-col gap-space-base">
            {activities.map((activity, i) => (
              <FeedCard key={activity.uuid} activity={activity} badge={i === 0 ? 'Featured' : undefined} />
            ))}
            {activities.length === 0 && (
              <div className="py-space-xl flex items-center justify-center text-outline font-label-sm text-label-sm">
                No blinks yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
