import { useState, useEffect } from "react";

export function PageLoader() {
  const [loading, setLoading] = useState(true);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Start fading out at 3.5s
    const fadeTimer = setTimeout(() => setIsFading(true), 3500);
    // Remove from DOM at 4s
    const hideTimer = setTimeout(() => setLoading(false), 4000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!loading) return null;

  return (
    <div className={`fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-[#C8A2C8] transition-opacity duration-500 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
      <div className="relative flex flex-col items-center">
        {/* Xbox Logo Container */}
        <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(255,255,255,0.4)] animate-pulse">
          <svg viewBox="0 0 100 100" className="w-24 h-24 text-[#C8A2C8]">
             {/* Xbox Sphere X Shape */}
             <path 
                fill="currentColor" 
                d="M50 0C22.3858 0 0 22.3858 0 50C0 77.6142 22.3858 100 50 100C77.6142 100 100 77.6142 100 50C100 22.3858 77.6142 0 50 0ZM50 9.375C60.2539 9.375 69.8242 12.8906 77.4414 18.75L50 46.3086L22.5586 18.75C30.1758 12.8906 39.7461 9.375 50 9.375ZM15.8203 25.4883L43.2617 53.0273L15.8203 80.5664C11.7188 72.168 9.375 62.793 9.375 52.832C9.375 42.8711 11.7188 33.4961 15.8203 25.4883ZM50 59.7656L77.4414 87.207C69.8242 93.0664 60.2539 96.582 50 96.582C39.7461 96.582 30.1758 93.0664 22.5586 87.207L50 59.7656ZM84.1797 80.5664L56.7383 53.0273L84.1797 25.4883C88.2812 33.4961 90.625 42.8711 90.625 52.832C90.625 62.793 88.2812 72.168 84.1797 80.5664Z"
             />
          </svg>
        </div>

        {/* Text */}
        <div className="mt-8 text-white font-black tracking-[0.3em] italic text-3xl animate-bounce">
          BETTER SOCIAL
        </div>
        
        {/* Loading Bar */}
        <div className="mt-4 w-48 h-1 bg-white/20 rounded-full overflow-hidden">
           <div className="h-full bg-white animate-[loading_4s_linear_forwards]" />
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes loading {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}} />
    </div>
  );
}
