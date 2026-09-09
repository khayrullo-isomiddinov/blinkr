import React from "react";
import { Auth } from 'aws-amplify';

import Sidebar from '../components/blinkr/Sidebar';
import MobileHeader from '../components/blinkr/MobileHeader';
import MobileNav from '../components/blinkr/MobileNav';
import RightSidebar from '../components/blinkr/RightSidebar';
import Composer from '../components/blinkr/Composer';
import FeedCard from '../components/blinkr/FeedCard';

export default function HomeFeedPage() {
  const [activities, setActivities] = React.useState([]);
  const [user, setUser] = React.useState(null);
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
              <header className="sticky top-0 z-20 backdrop-blur-xl bg-background/85 px-space-base pt-space-md pb-space-sm shadow-sm">
                <h1 className="font-headline-md text-headline-md text-on-background tracking-tight">Home</h1>
              </header>

              <Composer user={user} setActivities={setActivities} composerRef={composerRef} />

              <div className="flex flex-col gap-space-xs">
                {activities.map((activity) => (
                  <FeedCard key={activity.uuid} activity={activity} />
                ))}
              </div>

              {activities.length === 0 && (
                <div className="py-space-xl flex items-center justify-center text-outline font-label-sm text-label-sm">
                  No blinks yet.
                </div>
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
