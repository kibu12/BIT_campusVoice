import React, { useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MapPin, Compass, ArrowRight, ExternalLink, 
  Sparkles, Building2
} from 'lucide-react';
import { CAMPUS_PLACES, MAP_DIMENSIONS } from '../data/campus_map_data';
import { DETAILED_TAGS, OVERVIEW_TAGS, DETAILS_MAP } from '../data/campus_map_full_dataset';
import { useTheme } from '../context/ThemeContext';

export function getPlaceCoordinates(place) {
  if (!place) return { x: 1200, y: 1400 };
  if (typeof place.x === 'number' && typeof place.y === 'number') {
    return { x: place.x, y: place.y };
  }

  const placeId = typeof place === 'string' ? place : place.id || '';
  const placeName = typeof place === 'string' ? place : place.name || place.shortName || '';
  
  // Match in DETAILED_TAGS or OVERVIEW_TAGS
  const tag = DETAILED_TAGS.find(t => t.id === placeId) || OVERVIEW_TAGS.find(t => t.id === placeId);
  if (tag) {
    const rawLeft = parseInt(tag.left, 10);
    const rawTop = parseInt(tag.top, 10);
    const isDet = DETAILED_TAGS.some(t => t.id === placeId);
    const x = (isDet ? Math.round(rawLeft / 1.5) : rawLeft) + 22;
    const y = (isDet ? Math.round(rawTop / 1.5) : rawTop) + 12;
    return { x, y };
  }

  // Match in CAMPUS_PLACES by id or name
  const cp = CAMPUS_PLACES.find(p => 
    p.id === placeId || 
    (placeName && p.name.toLowerCase().includes(placeName.toLowerCase())) ||
    (placeName && p.shortName?.toLowerCase().includes(placeName.toLowerCase()))
  );
  if (cp && typeof cp.x === 'number') {
    return { x: cp.x, y: cp.y };
  }

  // Fallback default coordinates (central campus)
  return { x: 1200, y: 1400 };
}

const CampusMapMiniCard = ({ place, routeData }) => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const containerRef = useRef(null);

  // Normalize place object from any prop format safely
  const resolvedPlace = useMemo(() => {
    if (place && typeof place === 'object') return place;
    if (routeData && typeof routeData === 'object') {
      return routeData.destination || routeData.place || routeData;
    }
    if (typeof routeData === 'string' && routeData.trim()) {
      return { id: routeData, name: routeData };
    }
    if (typeof place === 'string' && place.trim()) {
      return { id: place, name: place };
    }
    return { id: 'library', name: 'Central Library' };
  }, [place, routeData]);

  const destCoords = useMemo(() => getPlaceCoordinates(resolvedPlace), [resolvedPlace]);

  // Viewport dimensions for mini preview
  const previewWidth = 440;
  const previewHeight = 180;
  const zoomScale = 0.55;

  const targetX = destCoords ? destCoords.x : 1200;
  const targetY = destCoords ? destCoords.y : 1400;
  
  const translateX = (previewWidth / 2) - (targetX * zoomScale);
  const translateY = (previewHeight / 2) - (targetY * zoomScale);

  const placeId = resolvedPlace.id || 'library';
  const placeDetails = DETAILS_MAP[placeId] || {};
  const placeTitle = resolvedPlace.shortName || resolvedPlace.name || placeDetails.name || 'Campus Location';
  const floorInfo = resolvedPlace.floor || placeDetails.floor || (resolvedPlace.details?.floors ? `${resolvedPlace.details.floors.length} Floors` : null);

  const handleCardClick = () => {
    navigate(`/map?to=${placeId}`);
  };

  return (
    <div 
      onClick={handleCardClick}
      title="Click to open full campus interactive map"
      className="mt-3.5 rounded-2xl overflow-hidden border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm transition-all hover:shadow-md cursor-pointer group select-none"
    >
      
      {/* Top Header Bar */}
      <div className="px-3.5 py-2.5 bg-slate-50/90 dark:bg-zinc-900/90 border-b border-slate-200/80 dark:border-zinc-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-rose-600/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <MapPin size={14} className="fill-rose-500 text-rose-600" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-100 truncate">
              {placeTitle}
            </h4>
            {floorInfo && (
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 truncate">
                {floorInfo}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[10px] font-bold shrink-0 border border-blue-100 dark:border-blue-900/40">
          <Sparkles size={10} />
          <span>Location Highlight</span>
        </div>
      </div>

      {/* Interactive Mini-Map Preview Container */}
      <div 
        ref={containerRef}
        className={`relative w-full h-[180px] ${theme === 'dark' ? 'bg-[#09090b]' : 'bg-[#2a374b]'} overflow-hidden`}
      >
        {/* Scaled & Centered Map Canvas */}
        <div 
          style={{
            width: `${MAP_DIMENSIONS.width}px`,
            height: `${MAP_DIMENSIONS.height}px`,
            transform: `translate(${translateX}px, ${translateY}px) scale(${zoomScale})`,
            transformOrigin: '0 0',
            transition: 'transform 0.3s ease-out'
          }}
          className="absolute inset-0 pointer-events-none"
        >
          {/* Map Base Layer */}
          <img 
            src={theme === 'dark' ? '/map/campus-dark.svg' : '/map/campus-light.svg'} 
            alt="BIT Campus Map Preview"
            className="absolute inset-0 w-full h-full object-fill bg-[#2a374b]"
          />

          {/* Highlighted Destination Glowing Radar & Pin */}
          {destCoords && (
            <div 
              style={{
                top: `${destCoords.y}px`,
                left: `${destCoords.x}px`,
                transform: 'translate(-50%, -100%)'
              }}
              className="absolute z-50 pointer-events-none"
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-rose-500/20 rounded-full animate-ping pointer-events-none" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-rose-500/30 rounded-full animate-pulse pointer-events-none" />

              <div className="flex flex-col items-center animate-bounce">
                <div className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-extrabold shadow-2xl border-2 border-white whitespace-nowrap flex items-center gap-1">
                  <MapPin size={12} className="fill-white" />
                  <span>{placeTitle}</span>
                </div>
                <div className="w-2.5 h-2.5 bg-rose-600 rotate-45 -mt-1 border-r-2 border-b-2 border-white" />
              </div>
            </div>
          )}
        </div>

        {/* Floating Hint Overlay on Hover */}
        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/25 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-all transform group-hover:scale-100 scale-95 px-3 py-1.5 rounded-xl bg-slate-900/90 text-white text-xs font-bold shadow-xl border border-white/20 backdrop-blur-md flex items-center gap-1.5">
            <span>Open Complete Map Design</span>
            <ExternalLink size={12} />
          </div>
        </div>
      </div>

      {/* Bottom CTA Action Bar */}
      <div className="px-3.5 py-2.5 bg-slate-50/90 dark:bg-zinc-900/90 border-t border-slate-200/80 dark:border-zinc-800 flex items-center justify-between gap-2 text-xs">
        <span className="text-[11px] text-slate-500 dark:text-zinc-400">
          Click card to explore complete interactive campus map
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleCardClick();
          }}
          className="btn-primary py-1 px-3 text-[11px] font-bold gap-1 rounded-lg shrink-0 shadow-xs"
        >
          <span>View Full Map Design</span>
          <ArrowRight size={12} />
        </button>
      </div>

    </div>
  );
};

export default CampusMapMiniCard;
