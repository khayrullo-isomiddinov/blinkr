import React from "react";
import { Auth } from 'aws-amplify';

import Sidebar from '../components/blinkr/Sidebar';
import MobileHeader from '../components/blinkr/MobileHeader';
import MobileNav from '../components/blinkr/MobileNav';
import RightSidebar from '../components/blinkr/RightSidebar';
import Composer from '../components/blinkr/Composer';
import FeedCard from '../components/blinkr/FeedCard';

const TABS = [
  { key: 'for-you', label: 'For You' },
  { key: 'following', label: 'Following' },
  { key: 'systems-ai', label: 'Systems & AI' },
];

export default function HomeFeedPage() {
  const [activities, setActivities] = React.useState([]);
  const [user, setUser] = React.useState(null);
  const [activeTab, setActiveTab] = React.useState('for-you');
  const dataFetchedRef = React.useRef(false);
  const composerRef = React.useRef(null);

  const loadData = async () => {
    try {
      const backend_url = `${process.env.REACT_APP_BACKEND_URL}/api/activities/home`
      const access_token = localStorage.getItem('access_token');
      const headers = {};
      if (access_token) {
        headers['Authorization'] = `Bearer ${access_token}`;
      }
      const res = await fetch(backend_url, {
        method: "GET",
        headers: headers
      });
      let resJson = await res.json();
      if (res.status === 200) {
        setActivities(resJson)
      } else {
        console.log(res)
      }
    } catch (err) {
      console.log(err);
    }
  };

  const checkAuth = async () => {
    Auth.currentAuthenticatedUser({
      bypassCache: false
    })
    .then((cognito_user) => {
      setUser({
        display_name: cognito_user.attributes.name,
        handle: cognito_user.attributes.preferred_username
      })
    })
    .catch((err) => {
      console.log(err);
      setUser(null);
    });
  };

  React.useEffect(()=>{
    //prevents double call
    if (dataFetchedRef.current) return;
    dataFetchedRef.current = true;

    loadData();
    checkAuth();
  }, [])

  const focusComposer = () => {
    composerRef.current?.focus();
  };

  const suggestedUsers = React.useMemo(() => {
    const seen = new Map();
    activities.forEach((activity) => {
      if (activity.handle && activity.handle !== user?.handle && !seen.has(activity.handle)) {
        seen.set(activity.handle, { display_name: activity.display_name, handle: activity.handle });
      }
    });
    return Array.from(seen.values()).slice(0, 3);
  }, [activities, user]);

  return (
    <div className="bg-background min-h-screen">
      <MobileHeader user={user} />
      <Sidebar user={user} active="home" onComposeClick={focusComposer} />

      <div className="md:pl-col-sidebar-left min-h-screen">
        <div className="max-w-7xl mx-auto flex justify-center">
          <main className="w-full max-w-col-feed-max pt-14 md:pt-0 pb-20 md:pb-space-3xl px-space-base bg-background min-h-screen">
            <div className="flex flex-col w-full">
              <header className="sticky top-0 z-20 backdrop-blur-xl bg-background/85 px-space-base pt-space-md pb-space-sm flex flex-col gap-space-sm shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-space-sm">
                    <h1 className="font-headline-md text-headline-md text-on-background tracking-tight">Home</h1>
                    <span className="px-space-xs py-space-2xs rounded-full bg-primary-container/20 text-primary font-label-xs text-label-xs font-semibold">
                      Pulse
                    </span>
                  </div>
                  <span className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-outline hover:text-on-surface transition-colors">
                    <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                  </span>
                </div>
                <div className="flex items-center bg-surface-container-low p-space-2xs rounded-full relative">
                  {TABS.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex-1 relative py-space-xs text-center rounded-full font-label-md text-label-md transition-all z-10 ${
                        activeTab === tab.key ? 'text-on-surface font-semibold' : 'text-outline hover:text-on-surface'
                      }`}
                    >
                      {tab.label}
                      {activeTab === tab.key && (
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-[2.5px] rounded-full bg-primary-container" />
                      )}
                    </button>
                  ))}
                </div>
              </header>

              <Composer user={user} setActivities={setActivities} composerRef={composerRef} />

              {activeTab !== 'for-you' ? (
                <div className="py-space-xl flex items-center justify-center text-outline font-label-sm text-label-sm">
                  {TABS.find((t) => t.key === activeTab).label} is coming soon.
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-space-xs">
                    {activities.map((activity) => (
                      <FeedCard key={activity.uuid} activity={activity} />
                    ))}
                  </div>

                  {activities.length === 0 ? (
                    <div className="py-space-xl flex items-center justify-center text-outline font-label-sm text-label-sm">
                      No blinks yet.
                    </div>
                  ) : (
                    <div className="py-space-xl flex items-center justify-center">
                      <div className="flex items-center gap-space-sm px-space-md py-space-xs rounded-full bg-surface-container-low text-outline">
                        <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse" />
                        <span className="font-label-xs text-label-xs uppercase tracking-wider font-semibold">
                          Live stream active · Catching new Blinks
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </main>

          <RightSidebar user={user} suggestedUsers={suggestedUsers} />
        </div>
      </div>

      <MobileNav active="home" onComposeClick={focusComposer} />
    </div>
  );
}
