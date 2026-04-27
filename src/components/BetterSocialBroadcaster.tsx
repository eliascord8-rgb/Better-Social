import * as React from 'react'
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function BetterSocialBroadcaster() {
  const userId = typeof window !== 'undefined' ? localStorage.getItem('bq_user_id') as Id<'users'> : null
  const { data: me } = useSuspenseQuery(convexQuery(api.users.getMe, { userId: userId ?? undefined }));
  const { data: latestNotification } = useSuspenseQuery(convexQuery(api.chat.getLatestGlobalNotification, {}));
  const [show, setShow] = React.useState(false);
  const [isFading, setIsFading] = React.useState(false);
  const [lastId, setLastId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!latestNotification) return;

    // Use session storage to ensure we only show each notification ONCE per session
    const seenId = sessionStorage.getItem(`bq_seen_notif_€{latestNotification._id}`);
    
    if (latestNotification._id !== lastId && !seenId) {
      const isRecent = Date.now() - latestNotification._creationTime < 5000;
      if (isRecent) {
        // Special logic for chat notifications: Only show to admins/owners/mods
        if (latestNotification.type === 'chat') {
          if (!me || (me.role !== 'admin' && me.role !== 'owner' && me.role !== 'moderator')) {
            return;
          }
        }

        setLastId(latestNotification._id);
        sessionStorage.setItem(`bq_seen_notif_€{latestNotification._id}`, "true");
        setShow(true);
        setIsFading(false);

        const duration = latestNotification.type === 'login' ? 3000 : 4000;
        
        const fadeTimer = setTimeout(() => {
          setIsFading(true);
        }, duration - 500);

        const hideTimer = setTimeout(() => {
          setShow(false);
          setIsFading(false);
        }, duration);

        return () => {
          clearTimeout(fadeTimer);
          clearTimeout(hideTimer);
        };
      } else {
        setLastId(latestNotification._id);
        setShow(false);
      }
    }
  }, [latestNotification, lastId, me]);

  React.useEffect(() => {
    if (show) {
      const safetyTimer = setTimeout(() => {
        setShow(false);
        setIsFading(false);
      }, 5000);
      return () => clearTimeout(safetyTimer);
    }
  }, [show]);

  if (!show || !latestNotification) return null;

  const getTheme = () => {
    switch (latestNotification.type) {
      case 'deposit': return { 
        color: '#107C10', // Xbox Green
        text: 'ACHIEVEMENT UNLOCKED', 
        sub: `€{latestNotification.username} deposited €€{latestNotification.content}` 
      };
      case 'order': return { 
        color: '#0078D4', // Xbox Blue
        text: 'NEW ORDER RECEIVED', 
        sub: `€{latestNotification.username} ordered €{latestNotification.content} units` 
      };
      case 'login': return { 
        color: '#C8A2C8', // Lilac
        text: 'PLAYER JOINED', 
        sub: `€{latestNotification.username} is now online (Level €{latestNotification.level})` 
      };
      case 'chat': return { 
        color: '#525252', // Dark Grey
        text: 'NEW MESSAGE', 
        sub: `€{latestNotification.username}: €{latestNotification.content}` 
      };
      default: return { color: '#C8A2C8', text: 'NOTIFICATION', sub: '' };
    }
  };

  const theme = getTheme();

  return (
    <div key={latestNotification._id} className={`fixed inset-x-0 bottom-12 z-[9999] flex items-center justify-center pointer-events-none transition-all duration-500 €{isFading ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'}`}>
      
      <div className="relative flex items-center group">
        {/* Xbox Sphere Logo */}
        <div 
          className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.3)] z-20 animate-[xboxPulse_2s_infinite]"
          style={{ border: `3px solid €{theme.color}` }}
        >
          <svg viewBox="0 0 100 100" className="w-10 h-10" style={{ color: theme.color }}>
             <path 
                fill="currentColor" 
                d="M50 0C22.3858 0 0 22.3858 0 50C0 77.6142 22.3858 100 50 100C77.6142 100 100 77.6142 100 50C100 22.3858 77.6142 0 50 0ZM50 9.375C60.2539 9.375 69.8242 12.8906 77.4414 18.75L50 46.3086L22.5586 18.75C30.1758 12.8906 39.7461 9.375 50 9.375ZM15.8203 25.4883L43.2617 53.0273L15.8203 80.5664C11.7188 72.168 9.375 62.793 9.375 52.832C9.375 42.8711 11.7188 33.4961 15.8203 25.4883ZM50 59.7656L77.4414 87.207C69.8242 93.0664 60.2539 96.582 50 96.582C39.7461 96.582 30.1758 93.0664 22.5586 87.207L50 59.7656ZM84.1797 80.5664L56.7383 53.0273L84.1797 25.4883C88.2812 33.4961 90.625 42.8711 90.625 52.832C90.625 62.793 88.2812 72.168 84.1797 80.5664Z"
             />
          </svg>
        </div>

        {/* Achievement Bar */}
        <div className="ml-[-32px] pl-12 pr-8 py-3 bg-black/90 backdrop-blur-xl border border-white/10 rounded-r-full flex flex-col justify-center min-w-[300px] animate-[xboxSlide_0.5s_ease-out_forwards]">
           <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70 mb-0.5" style={{ color: theme.color }}>
             {theme.text}
           </span>
           <span className="text-sm font-bold text-white truncate max-w-[400px]">
             {theme.sub}
           </span>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes xboxPulse {
          0% { transform: scale(1); box-shadow: 0 0 20px rgba(255,255,255,0.2); }
          50% { transform: scale(1.05); box-shadow: 0 0 40px rgba(255,255,255,0.4); }
          100% { transform: scale(1); box-shadow: 0 0 20px rgba(255,255,255,0.2); }
        }
        @keyframes xboxSlide {
          0% { transform: translateX(-50px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
      `}} />
    </div>
  );
}
