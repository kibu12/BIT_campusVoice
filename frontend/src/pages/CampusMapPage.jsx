import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Search, Navigation, Layers, Compass, ZoomIn, ZoomOut, RotateCcw, 
  MapPin, X, ArrowRightLeft, Clock, Footprints, ChevronDown, 
  Info, Sparkles, Building, GraduationCap, Utensils, Trophy, Home, Cpu,
  Phone, ArrowRight, ExternalLink, Box, Eye
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import MobileNav from '../components/MobileNav';
import VoiceAssistantModal from '../components/VoiceAssistantModal';
import { useTheme } from '../context/ThemeContext';
import { 
  MAP_DIMENSIONS, CATEGORIES, DETAILED_TAGS, OVERVIEW_TAGS, SEARCH_INDEX, DETAILS_MAP 
} from '../data/campus_map_full_dataset';
import { CAMPUS_PLACES } from '../data/campus_map_data';
import { findShortestRoadRoute } from '../data/campus_road_navigator';
import CampusRoutesSvg from '../components/CampusRoutesSvg';

const QUICK_NAV_PLACES = [
  {
    id: 'library',
    name: 'Library',
    sub: 'Central Library',
    walkTime: '5 min walk',
    icon: Building,
    accent: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border-blue-100 dark:border-blue-900/50'
  },
  {
    id: 'ib-block-2',
    name: 'CSE Block (IB)',
    sub: 'Computer Science Dept.',
    walkTime: '7 min walk',
    icon: Cpu,
    accent: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/50'
  },
  {
    id: 'sapphire',
    name: 'Hostel (Boys)',
    sub: 'Boys Hostel',
    walkTime: '10 min walk',
    icon: Home,
    accent: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border-amber-100 dark:border-amber-900/50'
  },
  {
    id: 'placement',
    name: 'Placement Cell',
    sub: 'Training & Placement',
    walkTime: '8 min walk',
    icon: GraduationCap,
    accent: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50'
  },
];

const CampusMapPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { theme } = useTheme();

  // Map layer: 'light' | 'dark' | 'sat'
  const [activeLayer, setActiveLayer] = useState(() => theme === 'dark' ? 'dark' : 'light');
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [activeFloorTab, setActiveFloorTab] = useState(0);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [is3DMode, setIs3DMode] = useState(false);

  // Road Navigation state
  const [isNavigating, setIsNavigating] = useState(false);
  const [fromPlaceId, setFromPlaceId] = useState('main-gate');
  const [toPlaceId, setToPlaceId] = useState('');
  const [activeRouteSegments, setActiveRouteSegments] = useState([]);
  const [routeDistance, setRouteDistance] = useState(0);

  // Pan & Zoom state (Coordinate space: 2280 x 2584)
  const [scale, setScale] = useState(0.55);
  const [position, setPosition] = useState({ x: -280, y: -350 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Multi-touch tracking for pinch-to-zoom
  const touchStateRef = useRef({
    initialDist: 0,
    initialScale: 0.55,
    initialPos: { x: 0, y: 0 }
  });

  const containerRef = useRef(null);

  // Auto-center map on initial load based on screen size
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const initialScale = Math.min(Math.max(rect.width / 2280, 0.42), 0.75);
      setScale(initialScale);
      setPosition({
        x: (rect.width - 2280 * initialScale) / 2,
        y: Math.max((rect.height - 2584 * initialScale) / 2, -280)
      });
    }
  }, []);

  // Update theme sync
  useEffect(() => {
    if (activeLayer !== 'sat') {
      setActiveLayer(theme === 'dark' ? 'dark' : 'light');
    }
  }, [theme]);

  // Center map on specific (x, y) coordinates with smooth transition
  const centerOnCoordinates = useCallback((targetX, targetY, targetScale = null) => {
    if (!containerRef.current) return;
    const currentScale = targetScale || scale;
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    const newX = (containerWidth / 2) - (targetX * currentScale);
    const newY = (containerHeight / 2) - (targetY * currentScale);

    if (targetScale) setScale(targetScale);
    setPosition({ x: newX, y: newY });
  }, [scale]);

  // Helper to resolve coordinates for any place ID
  const getPlaceCoordinates = useCallback((id) => {
    const known = CAMPUS_PLACES.find(p => p.id === id);
    if (known) return { x: known.x, y: known.y };

    const tagL4 = DETAILED_TAGS.find(t => t.id === id);
    if (tagL4) {
      return {
        x: Math.round(parseInt(tagL4.left, 10) / 1.5) + 22,
        y: Math.round(parseInt(tagL4.top, 10) / 1.5) + 12
      };
    }

    const tagL3 = OVERVIEW_TAGS.find(t => t.id === id);
    if (tagL3) {
      return {
        x: parseInt(tagL3.left, 10) + 22,
        y: parseInt(tagL3.top, 10) + 12
      };
    }

    if (id.includes('ib') || id.includes('placement') || id.includes('training')) return { x: 775, y: 1490 };
    if (id.includes('sf') || id.includes('sunflower')) return { x: 1330, y: 1300 };
    if (id.includes('as')) return { x: 1050, y: 1490 };
    if (id.includes('mechanic')) return { x: 1390, y: 1413 };

    return { x: 1050, y: 1490 };
  }, []);

  // Handle URL Query Params
  useEffect(() => {
    const toParam = searchParams.get('to');
    const fromParam = searchParams.get('from');

    if (toParam) {
      const match = SEARCH_INDEX.find(s => s.id === toParam || s.match.toLowerCase() === toParam.toLowerCase())
        || CAMPUS_PLACES.find(p => p.id === toParam);
      
      if (match) {
        selectSearchResult(match);
        if (fromParam) {
          setIsNavigating(true);
          setFromPlaceId(fromParam);
          setToPlaceId(match.id);
        }
      }
    }
  }, [searchParams]);

  // Live search filtering
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.toLowerCase().trim();
    const results = SEARCH_INDEX.filter(item => 
      item.match.toLowerCase().includes(q) || 
      item.name?.toLowerCase().includes(q) ||
      item.floor?.toLowerCase().includes(q)
    ).slice(0, 12);
    setSearchResults(results);
  }, [searchQuery]);

  // Recalculate route using Official Vector Road Segments
  useEffect(() => {
    if (isNavigating && fromPlaceId && toPlaceId) {
      const result = findShortestRoadRoute(fromPlaceId, toPlaceId);
      setActiveRouteSegments(result.segments || []);
      setRouteDistance(result.distance || 0);

      const startPlace = getPlaceCoordinates(fromPlaceId);
      const endPlace = getPlaceCoordinates(toPlaceId);

      if (startPlace && endPlace) {
        const midX = (startPlace.x + endPlace.x) / 2;
        const midY = (startPlace.y + endPlace.y) / 2;
        centerOnCoordinates(midX, midY, 0.85);
      }
    } else {
      setActiveRouteSegments([]);
      setRouteDistance(0);
    }
  }, [isNavigating, fromPlaceId, toPlaceId, centerOnCoordinates, getPlaceCoordinates]);

  // Select Search Result
  const selectSearchResult = (item) => {
    setSearchQuery(item.match);
    setIsSearchFocused(false);

    const details = DETAILS_MAP[item.id] || {};
    const coords = getPlaceCoordinates(item.id);

    const placeObj = {
      id: item.id,
      name: item.match || details.name || item.name,
      shortName: details.main || item.name,
      category: item.category || 'academic',
      x: coords.x,
      y: coords.y,
      description: details.description || `${item.match || details.name} located in Bannari Amman Institute of Technology (${item.floor || 'Campus Hub'}).`,
      details: {
        head: details.head || '',
        floors: details.floors || []
      }
    };

    setSelectedPlace(placeObj);
    setActiveFloorTab(item.floorIdx || 0);
    centerOnCoordinates(coords.x, coords.y, 1.2);
  };

  // Helper to get minimum scale that fills container nicely
  const getMinScale = useCallback(() => {
    if (!containerRef.current) return 0.42;
    const rect = containerRef.current.getBoundingClientRect();
    return Math.max(rect.width / 2280, rect.height / 2584, 0.42);
  }, []);

  // Clamp position to keep map within reasonable viewport bounds
  const clampPosition = useCallback((pos, curScale) => {
    if (!containerRef.current) return pos;
    const rect = containerRef.current.getBoundingClientRect();
    const mapW = 2280 * curScale;
    const mapH = 2584 * curScale;

    // Allowed drag slack (200px)
    const minX = Math.min(0, rect.width - mapW - 150);
    const maxX = Math.max(0, 150);
    const minY = Math.min(0, rect.height - mapH - 150);
    const maxY = Math.max(0, 150);

    return {
      x: Math.min(Math.max(pos.x, minX), maxX),
      y: Math.min(Math.max(pos.y, minY), maxY)
    };
  }, []);

  // Double-Click to Move Map to Clicked Point
  const handleDoubleClick = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickClientX = e.clientX - rect.left;
    const clickClientY = e.clientY - rect.top;

    const mapX = (clickClientX - position.x) / scale;
    const mapY = (clickClientY - position.y) / scale;

    const targetScale = Math.min(scale * 1.35, 2.2);
    const rawPos = {
      x: (rect.width / 2) - (mapX * targetScale),
      y: (rect.height / 2) - (mapY * targetScale)
    };
    setScale(Number(targetScale.toFixed(2)));
    setPosition(clampPosition(rawPos, targetScale));
  };

  // Mouse Drag / Pan handlers
  const handleMouseDown = (e) => {
    if (e.target.closest('.no-drag') || e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) {
      return;
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const rawPos = {
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    };
    setPosition(clampPosition(rawPos, scale));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch Handlers for 2-Finger Pinch Zoom & 1-Finger Pan
  const handleTouchStart = (e) => {
    if (
      e.target.closest('.no-drag') || 
      e.target.closest('.popup-card') || 
      e.target.closest('.road-nav-card') || 
      e.target.closest('button') || 
      e.target.closest('input')
    ) return;

    if (e.touches.length === 2) {
      // 2 Finger Pinch
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      touchStateRef.current.initialDist = dist;
      touchStateRef.current.initialScale = scale;
      touchStateRef.current.initialPos = { ...position };
    } else if (e.touches.length === 1) {
      // 1 Finger Pan
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y
      });
    }
  };

  const handleTouchMove = (e) => {
    if (
      e.target.closest('.no-drag') || 
      e.target.closest('.popup-card') || 
      e.target.closest('.road-nav-card')
    ) return;

    if (e.touches.length === 2 && touchStateRef.current.initialDist > 0) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const ratio = dist / touchStateRef.current.initialDist;
      const minS = getMinScale();
      const newScale = Math.min(Math.max(touchStateRef.current.initialScale * ratio, minS), 2.4);

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const midX = (t1.clientX + t2.clientX) / 2 - rect.left;
        const midY = (t1.clientY + t2.clientY) / 2 - rect.top;

        const rawX = midX - (midX - touchStateRef.current.initialPos.x) * (newScale / touchStateRef.current.initialScale);
        const rawY = midY - (midY - touchStateRef.current.initialPos.y) * (newScale / touchStateRef.current.initialScale);

        setScale(Number(newScale.toFixed(3)));
        setPosition(clampPosition({ x: rawX, y: rawY }, newScale));
      }
    } else if (e.touches.length === 1 && isDragging) {
      const rawPos = {
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y
      };
      setPosition(clampPosition(rawPos, scale));
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    touchStateRef.current.initialDist = 0;
  };

  // Zoom Button Controls
  const handleZoom = (delta) => {
    const minS = getMinScale();
    setScale(prev => {
      const newScale = Math.min(Math.max(prev + delta, minS), 2.4);
      return Number(newScale.toFixed(2));
    });
  };

  const handleResetView = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const initialScale = Math.min(Math.max(rect.width / 2280, 0.44), 0.75);
      setScale(initialScale);
      const initialPos = {
        x: (rect.width - 2280 * initialScale) / 2,
        y: Math.max((rect.height - 2584 * initialScale) / 2, -220)
      };
      setPosition(clampPosition(initialPos, initialScale));
      setIs3DMode(false);
      setSelectedPlace(null);
    }
  };

  const swapNavigation = () => {
    setFromPlaceId(toPlaceId);
    setToPlaceId(fromPlaceId);
  };

  const startNavigationTo = (place) => {
    setIsNavigating(true);
    setToPlaceId(place.id);
    if (!fromPlaceId || fromPlaceId === place.id) {
      setFromPlaceId('main-gate');
    }
  };

  const isZoomedIn = scale >= 0.85;
  const walkMinutes = Math.max(1, Math.round(routeDistance / 75));
  const startCoords = isNavigating ? getPlaceCoordinates(fromPlaceId) : null;
  const endCoords = isNavigating ? getPlaceCoordinates(toPlaceId) : null;

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] dark:bg-[#09090B] text-slate-900 dark:text-zinc-100 font-sans antialiased">
      
      {/* 1. Left Sidebar */}
      <Sidebar />

      {/* 2. Main Content */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        
        {/* Top Header */}
        <Header 
          title="Campus Map"
          subtitle="Interactive campus navigation & official floor directory"
        />

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-4">
          
          {/* ========================================================================= */}
          {/* SLEEK, MODERN SEARCH BAR (Full Width, No Clutter, Instant Suggestions) */}
          {/* ========================================================================= */}
          <div className="relative w-full">
            <div className="relative flex items-center">
              <Search size={18} className="absolute left-4 text-blue-600 dark:text-blue-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                placeholder="Search any room, faculty cabin, lab, rib (e.g. WW102, AI Lab, CSE Block, Library)..."
                className="w-full pl-11 pr-24 py-3 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 text-xs sm:text-sm font-semibold text-slate-800 dark:text-zinc-100 shadow-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/25 transition-all"
              />
              <div className="absolute right-3.5 flex items-center gap-2">
                {searchQuery ? (
                  <button 
                    onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                ) : (
                  <span className="hidden sm:inline-flex px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-[10px] font-bold text-slate-500">
                    496+ Places
                  </span>
                )}
              </div>
            </div>

            {/* Search Suggestions Dropdown */}
            {isSearchFocused && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl p-2 z-50 animate-in fade-in space-y-1 max-h-80 overflow-y-auto custom-scrollbar">
                {searchResults.map((item, idx) => (
                  <button
                    key={`${item.id}-${idx}`}
                    onClick={() => selectSearchResult(item)}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-zinc-800/80 flex items-center justify-between text-xs transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <MapPin size={14} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 dark:text-zinc-100 truncate">{item.match}</div>
                        <div className="text-[10px] text-slate-400 truncate">{item.name || item.match}</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold shrink-0 ml-2 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-md">
                      {item.floor || item.category || 'View on map'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* MAIN INTERACTIVE MAP CANVAS CONTAINER */}
          {/* ========================================================================= */}
          <div 
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onDoubleClick={handleDoubleClick}
            className={`relative w-full h-[calc(100vh-175px)] min-h-[580px] rounded-3xl overflow-hidden ${
              activeLayer === 'light' ? 'bg-[#2a374b]' : activeLayer === 'dark' ? 'bg-[#09090b]' : 'bg-[#1e293b]'
            } border border-slate-200/90 dark:border-zinc-800 shadow-md select-none touch-none ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          >
            
            {/* Gesture Hint Banner (Mobile) */}
            <div className="sm:hidden absolute top-3 left-3 z-30 pointer-events-none px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-xs text-[10px] font-semibold text-white/80 flex items-center gap-1.5">
              <span>🤏 Pinch with 2 fingers to zoom</span>
            </div>

            {/* Layer Switcher Pill (Top Right) */}
            <div className="absolute top-3 right-3 z-30 no-drag flex items-center gap-1 p-1 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-xl backdrop-blur-md">
              <button
                onClick={() => setActiveLayer('light')}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                  activeLayer === 'light'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Light
              </button>
              <button
                onClick={() => setActiveLayer('dark')}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                  activeLayer === 'dark'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Dark
              </button>
              <button
                onClick={() => setActiveLayer('sat')}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                  activeLayer === 'sat'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Satellite
              </button>
            </div>

            {/* ROAD NAVIGATOR FLOATING PANEL */}
            {isNavigating && (
              <div 
                onWheel={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
                className="road-nav-card absolute top-3 left-3 z-40 max-w-xs sm:max-w-sm w-full p-3 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 shadow-2xl text-white space-y-2 no-drag animate-in fade-in slide-in-from-top-4"
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                    <Navigation size={13} />
                    <span>Campus Road Navigator</span>
                  </div>
                  <button 
                    onClick={() => setIsNavigating(false)}
                    className="text-slate-400 hover:text-white p-0.5 rounded-lg cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="w-9 text-slate-400 font-semibold text-[10px] shrink-0">From:</span>
                    <select
                      value={fromPlaceId}
                      onChange={(e) => setFromPlaceId(e.target.value)}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-white outline-hidden cursor-pointer"
                    >
                      {CAMPUS_PLACES.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-center">
                    <button 
                      onClick={swapNavigation}
                      className="p-1 rounded-full bg-slate-800 text-slate-300 hover:text-emerald-400 hover:bg-slate-700 transition-colors cursor-pointer"
                      title="Swap Start and Destination"
                    >
                      <ArrowRightLeft size={12} />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="w-9 text-slate-400 font-semibold text-[10px] shrink-0">To:</span>
                    <select
                      value={toPlaceId}
                      onChange={(e) => setToPlaceId(e.target.value)}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-white outline-hidden cursor-pointer"
                    >
                      <option value="">-- Choose Destination --</option>
                      {CAMPUS_PLACES.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {activeRouteSegments.length > 0 && (
                  <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px] bg-slate-800/60 px-2 py-1.5 rounded-lg">
                    <div className="flex items-center gap-1 text-emerald-400 font-bold">
                      <Footprints size={12} />
                      <span>~{routeDistance}m</span>
                    </div>
                    <div className="flex items-center gap-1 text-amber-400 font-bold">
                      <Clock size={12} />
                      <span>~{walkMinutes} min walk</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TRANSFORM CANVAS FOR VECTOR LAYOUT, ROAD SEGMENTS & LABELS */}
            <div 
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) ${is3DMode ? 'rotateX(20deg) rotateZ(-5deg)' : ''}`,
                transformOrigin: '0 0',
                transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                width: `${MAP_DIMENSIONS.width}px`,
                height: `${MAP_DIMENSIONS.height}px`
              }}
              className="absolute top-0 left-0 relative"
            >
              
              {/* Layer 1: Official Vector Campus Background */}
              {activeLayer === 'light' && (
                <img 
                  src="/map/campus-light.svg" 
                  alt="BIT Campus Light Vector Map"
                  className="absolute inset-0 w-full h-full pointer-events-none object-fill bg-[#2a374b]"
                  draggable={false}
                />
              )}
              {activeLayer === 'dark' && (
                <img 
                  src="/map/campus-dark.svg" 
                  alt="BIT Campus Dark Vector Map"
                  className="absolute inset-0 w-full h-full pointer-events-none object-fill bg-[#09090b]"
                  draggable={false}
                />
              )}
              {activeLayer === 'sat' && (
                <img 
                  src="/map/campus-sat.webp" 
                  alt="BIT Campus Satellite Aerial"
                  className="absolute inset-0 w-full h-full pointer-events-none object-fill"
                  draggable={false}
                />
              )}

              {/* Layer 2: Road Route Navigation Overlay (Green Illuminated Paths) */}
              <CampusRoutesSvg activeSegments={activeRouteSegments} />

              {/* Navigation Start & Destination Animated Pins */}
              {isNavigating && startCoords && (
                <div 
                  style={{
                    top: `${startCoords.y}px`,
                    left: `${startCoords.x}px`,
                    transform: 'translate(-50%, -100%)'
                  }}
                  className="absolute z-50 pointer-events-none animate-bounce"
                >
                  <div className="flex flex-col items-center">
                    <div className="px-2.5 py-1 rounded-xl bg-emerald-500 text-slate-950 text-[11px] font-extrabold shadow-2xl border border-white whitespace-nowrap">
                      START
                    </div>
                    <div className="w-3 h-3 bg-emerald-500 rotate-45 -mt-1 border-r border-b border-white" />
                  </div>
                </div>
              )}

              {isNavigating && endCoords && (
                <div 
                  style={{
                    top: `${endCoords.y}px`,
                    left: `${endCoords.x}px`,
                    transform: 'translate(-50%, -100%)'
                  }}
                  className="absolute z-50 pointer-events-none animate-bounce"
                >
                  <div className="flex flex-col items-center">
                    <div className="px-2.5 py-1 rounded-xl bg-rose-500 text-white text-[11px] font-extrabold shadow-2xl border border-white whitespace-nowrap">
                      DESTINATION
                    </div>
                    <div className="w-3 h-3 bg-rose-500 rotate-45 -mt-1 border-r border-b border-white" />
                  </div>
                </div>
              )}

              {/* Layer 3: ALL UNIFIED OFFICIAL CAMPUS BUILDING & LAB TAGS */}
              {(isZoomedIn ? DETAILED_TAGS : OVERVIEW_TAGS).map((tag, idx) => {
                const rawLeft = parseInt(tag.left, 10);
                const rawTop = parseInt(tag.top, 10);
                const seOffsetX = 22;
                const seOffsetY = 12;
                const normalizedX = (isZoomedIn ? Math.round(rawLeft / 1.5) : rawLeft) + seOffsetX;
                const normalizedY = (isZoomedIn ? Math.round(rawTop / 1.5) : rawTop) + seOffsetY;

                const isSelected = selectedPlace?.id === tag.id;
                const isFrom = fromPlaceId === tag.id;
                const isTo = toPlaceId === tag.id;

                return (
                  <div
                    key={`tag-${isZoomedIn ? 'det' : 'ov'}-${idx}`}
                    style={{
                      top: `${normalizedY}px`,
                      left: `${normalizedX}px`,
                      transform: 'translate(-50%, -50%)'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      const det = DETAILS_MAP[tag.id] || {};
                      const known = CAMPUS_PLACES.find(p => p.id === tag.id);

                      const placeObj = {
                        id: tag.id,
                        name: tag.name || det.name || known?.name || 'Campus Building',
                        shortName: det.main || known?.shortName || tag.name,
                        category: known?.category || 'academic',
                        x: normalizedX,
                        y: normalizedY,
                        description: known?.description || det.description || `${tag.name} - official department and research facility at BIT.`,
                        details: known?.details || { head: det.head || '', floors: det.floors || [] }
                      };

                      setSelectedPlace(placeObj);
                      setActiveFloorTab(0);
                    }}
                    className={`absolute z-20 cursor-pointer no-drag transition-transform ${
                      isSelected || isFrom || isTo ? 'scale-125 z-40' : 'hover:scale-115 hover:z-30'
                    }`}
                  >
                    <span 
                      className={`inline-block text-center whitespace-normal break-normal transition-all ${
                        isFrom
                          ? 'px-2 py-0.5 rounded-md bg-emerald-500 text-slate-950 text-[10px] font-bold ring-2 ring-emerald-300 shadow-xl'
                          : isTo
                          ? 'px-2 py-0.5 rounded-md bg-rose-500 text-white text-[10px] font-bold ring-2 ring-rose-300 shadow-xl'
                          : isSelected
                          ? 'px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-bold ring-2 ring-blue-300 shadow-xl'
                          : 'px-1.5 py-0.5 rounded-[4px] font-semibold text-slate-100 hover:text-white max-w-[90px]'
                      }`}
                      style={!isSelected && !isFrom && !isTo ? {
                        fontSize: '9px',
                        transform: 'scale(0.72)',
                        transformOrigin: 'center center',
                        backgroundColor: 'rgba(15, 23, 42, 0.65)',
                        border: '1px solid rgba(255, 255, 255, 0.25)',
                        backdropFilter: 'blur(2px)',
                        textShadow: '0 1px 2px #000',
                        lineHeight: '1.15'
                      } : {
                        fontSize: '9.5px'
                      }}
                    >
                      {tag.name}
                    </span>
                  </div>
                );
              })}

            </div>

            {/* Floating Zoom & 3D Controls (Bottom Right) */}
            <div className="absolute bottom-4 right-4 z-30 flex flex-col gap-2 no-drag">
              <button
                onClick={() => handleZoom(0.25)}
                className="w-10 h-10 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-white shadow-xl flex items-center justify-center hover:bg-slate-800 cursor-pointer active:scale-95 transition-transform"
                title="Zoom In"
              >
                <ZoomIn size={17} />
              </button>
              <button
                onClick={() => handleZoom(-0.25)}
                className="w-10 h-10 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-white shadow-xl flex items-center justify-center hover:bg-slate-800 cursor-pointer active:scale-95 transition-transform"
                title="Zoom Out"
              >
                <ZoomOut size={17} />
              </button>
              <button
                onClick={handleResetView}
                className="w-10 h-10 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-white shadow-xl flex items-center justify-center hover:bg-slate-800 cursor-pointer active:scale-95 transition-transform"
                title="Reset View"
              >
                <RotateCcw size={16} />
              </button>
              <button
                onClick={() => setIs3DMode(!is3DMode)}
                className={`w-10 h-10 rounded-2xl border shadow-xl flex items-center justify-center cursor-pointer font-black text-xs transition-all active:scale-95 ${
                  is3DMode 
                    ? 'bg-blue-600 text-white border-blue-600 shadow-blue-500/30' 
                    : 'bg-slate-900/90 text-slate-200 border-slate-700/80 hover:bg-slate-800'
                }`}
                title="Toggle 3D Perspective Tilt"
              >
                3D
              </button>
            </div>

            {/* Double-Click Hint (Desktop) */}
            <div className="absolute bottom-4 left-4 z-20 hidden md:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-800 text-[11px] text-slate-400 pointer-events-none">
              <span>💡 Double-click anywhere to center on map</span>
            </div>

            {/* PLACE DETAIL SLIDE-OVER CARD WITH FULL FLOOR DIRECTORY */}
            {selectedPlace && (
              <div 
                onWheel={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
                className="popup-card absolute bottom-3 left-3 right-3 sm:left-auto sm:right-3 sm:w-[360px] z-40 bg-slate-900/95 backdrop-blur-xl border border-slate-700/90 rounded-2xl p-3.5 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200 no-drag text-white space-y-2.5"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2">
                  <div className="space-y-0.5 min-w-0">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      {selectedPlace.category || 'Academic Block'}
                    </span>
                    <h3 className="text-xs font-bold text-white truncate mt-0.5">
                      {selectedPlace.name}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedPlace(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Description & Head */}
                <div className="text-[11px] text-slate-300 space-y-1.5">
                  <p className="leading-relaxed text-slate-300 line-clamp-2">
                    {selectedPlace.description}
                  </p>
                  {selectedPlace.details?.head && (
                    <div className="flex items-center gap-1.5 bg-slate-800/60 p-1.5 rounded-lg border border-slate-700/40 text-emerald-300 text-[10px]">
                      <Info size={12} className="shrink-0 text-emerald-400" />
                      <span className="truncate">{selectedPlace.details.head}</span>
                    </div>
                  )}
                </div>

                {/* Interactive Floor Directory Tabs */}
                {selectedPlace.details?.floors && selectedPlace.details.floors.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                      Floor Directory & Labs:
                    </div>
                    
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
                      {selectedPlace.details.floors.map((floor, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveFloorTab(idx)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                            activeFloorTab === idx
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {floor.name}
                        </button>
                      ))}
                    </div>

                    <div className="bg-slate-950/80 rounded-lg p-2 border border-slate-800 max-h-24 overflow-y-auto space-y-1 custom-scrollbar">
                      {selectedPlace.details.floors[activeFloorTab]?.rooms?.map((room, rIdx) => (
                        <div key={rIdx} className="flex items-center gap-1.5 text-[10px] text-slate-200">
                          <span className="w-1 h-1 rounded-full bg-blue-400 shrink-0" />
                          <span className="truncate">{room}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-1.5 border-t border-slate-800 flex items-center gap-2">
                  <button
                    onClick={() => startNavigationTo(selectedPlace)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <Navigation size={12} />
                    <span>Navigate Here</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsNavigating(true);
                      setFromPlaceId(selectedPlace.id);
                      if (!toPlaceId || toPlaceId === selectedPlace.id) {
                        setToPlaceId('library');
                      }
                    }}
                    className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-[11px] font-bold border border-slate-700 transition-colors cursor-pointer"
                  >
                    From Here
                  </button>
                </div>

              </div>
            )}

          </div>

        </main>

      </div>

      {/* 3. Voice Assistant Modal */}
      <VoiceAssistantModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
      />

      {/* 4. Mobile Bottom Navigation Bar */}
      <MobileNav onOpenVoiceAssistant={() => setIsVoiceModalOpen(true)} />

    </div>
  );
};

export default CampusMapPage;
