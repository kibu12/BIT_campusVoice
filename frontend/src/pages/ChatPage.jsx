import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Keyboard, Mic, MicOff, Volume2, VolumeX, Sparkles,
  GraduationCap, Users, Briefcase, Calendar, MapPin,
  Headphones, Phone, ArrowRight, ChevronRight, Megaphone,
  AudioLines, Globe, Bot, ShieldCheck, Map, Send, RotateCcw,
  Copy, Check, User, Info, MessageSquare, X, Compass, Building2, ExternalLink, Clock
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import MobileNav from '../components/MobileNav';
import InteractiveStudent3D from '../components/InteractiveStudent3D';
import CampusMapMiniCard from '../components/CampusMapMiniCard';
import VoiceAssistantModal from '../components/VoiceAssistantModal';
import ChatDrawer from '../components/ChatDrawer';
import { useAuth } from '../context/AuthContext';
import { apiCall } from '../services/api';

const SUPPORTED_LANGUAGES = [
  { code: 'en-IN', langKey: 'en', label: 'English', native: 'English' },
  { code: 'ta-IN', langKey: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'ml-IN', langKey: 'ml', label: 'Malayalam', native: 'മലയാളം' },
  { code: 'hi-IN', langKey: 'hi', label: 'Hindi', native: 'हिंदी' }
];

const WELCOME_MESSAGES = {
  'en-IN': "Hello! 👋 I'm your Virtual Campus Speaker. Ask me anything or explore admissions, departments, placements, hostel facilities, or campus routes with me!",
  'ta-IN': "வணக்கம்! 👋 நான் உங்கள் கேம்பஸ் வாய்ஸ் (Campus Voice). வகுப்பறைகள், சேர்க்கை, வேலைவாய்ப்பு அல்லது வழிகள் பற்றி என்னிடம் கேளுங்கள்!",
  'ml-IN': "നമസ്കാരം! 👋 ഞാൻ നിങ്ങളുടെ കാമ്പസ് വോയ്സ് (Campus Voice). ബിറ്റ് കാമ്പസ്, ഡിപ്പാർട്ട്‌മെന്റുകൾ, പ്ലേസ്‌മെന്റുകൾ, ഹോസ്റ്റൽ എന്നിവയെക്കുറിച്ച് ചോദിക്കൂ!",
  'hi-IN': "नमस्ते! 👋 मैं आपका वर्चुअल कैंपस स्पीकर हूँ। मुझसे दाखिले, विभाग, प्लेसमेंट, हॉस्टल या कैंपस रूट के बारे में कुछ भी पूछें!"
};

export const CAMPUS_DESTINATIONS = [
  {
    id: 'as-main-right',
    name: 'Special Research Labs & CoE Center',
    shortName: 'Special Research Labs',
    x: 1020,
    y: 1200,
    category: 'labs',
    floor: 'Ground & 1st Floor (AS Block)',
    keywords: ['special lab', 'special labs', 'coe center', 'research lab', 'research labs', 'innovation center', 'innovation centre', 'opal-rt', 'virtusa', 'bosch lab']
  },
  {
    id: 'as-main-left',
    name: 'AS Block (Applied Science & Humanities)',
    shortName: 'AS Block',
    x: 1050,
    y: 1490,
    category: 'academic',
    floor: 'Ground to 2nd Floor',
    keywords: ['as block', 'applied science', 'humanities block', 'first year block', 'praveena', 'parimala', 'sadasivam']
  },
  {
    id: 'sf-block',
    name: 'Sunflower (SF) Block (ECE & EEE)',
    shortName: 'SF Block (ECE & EEE)',
    x: 1330,
    y: 1300,
    category: 'academic',
    floor: 'Ground to 3rd Floor',
    keywords: ['sf block', 'sunflower block', 'sunflower', 'ece dept', 'ece block', 'eee dept', 'eee block', 'eie dept', 'electronics block', 'vlsi lab', 'dsp lab', 'prakash', 'maheswari']
  },
  {
    id: 'mechanic-back',
    name: 'Mechanical & Mechatronics Block',
    shortName: 'Mechanical Block',
    x: 1390,
    y: 1413,
    category: 'academic',
    floor: 'Ground to 2nd Floor',
    keywords: ['mechanic block', 'mechanical block', 'mechatronics block', 'mechanic', 'workshop', 'cad/cam', 'cad cam', 'cnc', 'robotics lab', 'thermal lab', 'ravi kumar', 'senthil kumar']
  },
  {
    id: 'library',
    name: 'Dr. S.V. Balasubramaniam Central Library',
    shortName: 'Central Library',
    x: 920,
    y: 1805,
    category: 'amenities',
    floor: 'Ground to 3rd Floor',
    keywords: ['central library', 'library', 'dr svb', 'dr. s.v.b', 'reading hall', 'digital library', 'நூலகம்']
  },
  {
    id: 'placement',
    name: 'Training & Placement Centre (Level 1)',
    shortName: 'Placement Cell',
    x: 775,
    y: 1490,
    category: 'academic',
    floor: 'Level 1 (IB Block)',
    keywords: ['placement cell', 'placement office', 'training and placement', 'placement centre', 'recruitment hall', 'nirmal kumar', 'mathan kumar']
  },
  {
    id: 'medical-centre',
    name: '24/7 Campus Medical Centre & Hospital',
    shortName: 'Medical Centre (24x7)',
    x: 290,
    y: 1930,
    category: 'amenities',
    floor: 'Ground Floor',
    keywords: ['medical centre', 'medical center', 'hospital', 'health centre', 'health center', 'clinic', 'doctor', 'ambulance', 'soundararajan', 'sandhya', 'மருத்துவ']
  },
  {
    id: 'central-canteen',
    name: 'Central Food Court & Cafeteria',
    shortName: 'Campus Food Court',
    x: 1200,
    y: 1550,
    category: 'dining',
    floor: 'Ground Floor',
    keywords: ['canteen', 'food court', 'cafeteria', 'mess', 'dining hall', 'food street', 'உணவகம்']
  },
  {
    id: 'sports-stadium',
    name: 'Indoor Sports Stadium & Grounds',
    shortName: 'Sports Complex',
    x: 1800,
    y: 1750,
    category: 'sports',
    floor: 'Ground Floor',
    keywords: ['sports complex', 'sports ground', 'indoor stadium', 'badminton', 'gym', 'cricket ground', 'football ground', 'tennis court']
  },
  {
    id: 'main-auditorium',
    name: 'Main Auditorium (Vedanayagam Auditorium)',
    shortName: 'Main Auditorium',
    x: 910,
    y: 1700,
    category: 'amenities',
    floor: 'Ground & Balcony',
    keywords: ['auditorium', 'vedanayagam', 'convention centre', 'audi']
  },
  {
    id: 'principal-office',
    name: 'Administrative Block & Principal Office',
    shortName: 'Admin & Principal Office',
    x: 1290,
    y: 950,
    category: 'amenities',
    floor: 'Ground & 1st Floor',
    keywords: ['principal office', 'admin block', 'administrative office', 'admissions office', 'cashier counter', 'palanisamy']
  },
  {
    id: 'main-gate',
    name: 'BIT Main Gate 1 & Security Desk',
    shortName: 'Main Gate 1',
    x: 500,
    y: 1400,
    category: 'gates',
    floor: 'Ground Floor',
    keywords: ['main gate', 'gate 1', 'entrance gate', 'security desk', 'நுழைவாயில்']
  },
  {
    id: 'sapphire',
    name: "Sapphire Men's Hostel",
    shortName: 'Sapphire Hostel',
    x: 1650,
    y: 1100,
    category: 'hostels',
    floor: 'Hostel Block',
    keywords: ['sapphire', 'boys hostel', 'mens hostel']
  },
  {
    id: 'emerald',
    name: "Emerald Men's Hostel",
    shortName: 'Emerald Hostel',
    x: 1550,
    y: 1100,
    category: 'hostels',
    floor: 'Hostel Block',
    keywords: ['emerald']
  },
  {
    id: 'diamond',
    name: "Diamond Men's Hostel",
    shortName: 'Diamond Hostel',
    x: 1450,
    y: 1100,
    category: 'hostels',
    floor: 'Hostel Block',
    keywords: ['diamond']
  },
  {
    id: 'ruby',
    name: "Ruby Women's Hostel",
    shortName: 'Ruby Hostel',
    x: 1850,
    y: 1100,
    category: 'hostels',
    floor: 'Hostel Block',
    keywords: ['ruby', 'girls hostel', 'womens hostel']
  },
  {
    id: 'coral',
    name: "Coral Women's Hostel",
    shortName: 'Coral Hostel',
    x: 1950,
    y: 1100,
    category: 'hostels',
    floor: 'Hostel Block',
    keywords: ['coral']
  },
  {
    id: 'smart-agri-fields',
    name: 'Smart Agriculture & Biotech Research Grounds',
    shortName: 'Agri Fields & Biotech',
    x: 1070,
    y: 930,
    category: 'labs',
    floor: 'Ground Floor',
    keywords: ['agri fields', 'biotech ground', 'polyhouse', 'drone station']
  },
  {
    id: 'ib-block-2',
    name: 'IB Block (Information & Computing Block)',
    shortName: 'IB Block (CSE, IT, AI)',
    x: 775,
    y: 1490,
    category: 'academic',
    floor: 'Ground to 3rd Floor',
    keywords: ['ib block', 'information block', 'computing center', 'cse block', 'cse dept', 'it block', 'it dept', 'ai&ds dept', 'ai&ml dept', 'aids dept', 'aiml dept', 'data science dept', 'machine learning dept', 'sandbox', 'sasikala', 'gomathi', 'bharathi', 'naveena']
  }
];

export function detectNavigationPlace(query = '', responseText = '', isInitial = false) {
  if (isInitial || (!query && !responseText)) return null;

  const q = (query || '').toLowerCase().trim();
  const r = (responseText || '').toLowerCase().trim();

  // Navigation intent indicators in student query
  const queryNavKeywords = [
    'where is', 'where are', 'where can i find', 'where to find', 'how to go', 'how to reach',
    'how do i get to', 'how can i get to', 'how to get', 'direction', 'directions', 'route', 'navigate', 'locate',
    'location', 'way to', 'walk to', 'path to', 'find the', 'show me on map', 'on the map',
    'map of', 'map for', 'situated at', 'situated in', 'where situated', 'distance to',
    'see her', 'see him', 'see them', 'meet her', 'meet him', 'meet them', 'meet dr', 'meet prof',
    'want to meet', 'need to meet', 'need to see', 'want to see', 'visit her', 'visit him', 'visit dr',
    'visit the', 'reach the', 'reach dr', 'where is her', 'where is his', 'where is the office',
    'where is cabin', 'office location', 'room location', 'which block', 'which floor', 'which building',
    'how do i reach', 'take me to', 'take me', 'guide me to', 'lead to', 'go to',
    // Tamil
    'எங்கு', 'எங்கே', 'எப்படி செல்வது', 'எப்படி போவது', 'வழி',
    // Hindi
    'कहाँ', 'कहा', 'कैसे जाए', 'कैसे जाएं', 'रास्ता',
    // Malayalam
    'എവിടെ', 'എവിടെയാണ്', 'വഴി', 'എങ്ങനെ പോകാം'
  ];

  // Specific response phrasing when AI assistant explicitly gives campus navigation
  const responseNavKeywords = [
    'pinned it on the interactive campus map', 'pinned on the map',
    'interactive campus map', 'campus route navigator', 'step-by-step route directions',
    'starting from', 'walk towards', 'take the pathway', 'located opposite to', 'located next to',
    'map below highlights', 'the map below', 'office is on the',
    'cabin is on', 'situated on the', 'floor of', 'block for easy navigation',
    'directions to'
  ];

  const hasQueryNavIntent = queryNavKeywords.some(kw => q.includes(kw));
  const hasResponseNavIntent = responseNavKeywords.some(kw => r.includes(kw));

  if (!hasQueryNavIntent && !hasResponseNavIntent) {
    return null;
  }

  // STEP 1: Query Match FIRST (Highest priority — what the student explicitly asked for!)
  for (const dest of CAMPUS_DESTINATIONS) {
    if (dest.keywords.some(kw => q.includes(kw))) {
      return dest;
    }
  }

  // STEP 2: Response text match (for person/cabin inquiries where the response gives the location)
  for (const dest of CAMPUS_DESTINATIONS) {
    if (dest.keywords.some(kw => r.includes(kw))) {
      return dest;
    }
  }

  return null;
}

const getChatSessionId = (currentUser) => {
  try {
    const userKey = currentUser?.roll || currentUser?.roll_number || currentUser?.email || 'student';
    let sid = sessionStorage.getItem(`chat_session_${userKey}`);
    if (!sid) {
      sid = `sess_${userKey}_${Date.now()}`;
      sessionStorage.setItem(`chat_session_${userKey}`, sid);
    }
    return sid;
  } catch {
    return 'sess_' + Date.now();
  }
};

const ChatPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Voice & Language states
  const [voiceLang, setVoiceLang] = useState('en-IN');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [characterState, setCharacterState] = useState('idle');

  // Dialogue & Output states (Persisted across page navigation)
  const [conversationList, setConversationList] = useState(() => {
    try {
      const saved = sessionStorage.getItem('campus_conversation_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [userQueryText, setUserQueryText] = useState(() => {
    try {
      return sessionStorage.getItem('last_user_query') || '';
    } catch {
      return '';
    }
  });
  const [liveTranscript, setLiveTranscript] = useState('');
  const [aiResponseData, setAiResponseData] = useState(() => {
    try {
      const saved = sessionStorage.getItem('last_ai_response');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Could not parse saved chat session:", e);
    }
    return {
      text: WELCOME_MESSAGES['en-IN'],
      sources: [],
      route: null,
      isInitial: true
    };
  });
  const [textInputValue, setTextInputValue] = useState('');
  const [copiedResponse, setCopiedResponse] = useState(false);

  // Modals
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [selectedInitialQuery, setSelectedInitialQuery] = useState('');

  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const vadTimerRef = useRef(null);
  const accumulatedTranscriptRef = useRef('');

  // TTS Speech Output Function — chunks sentences for natural flow
  const speakText = useCallback((text) => {
    if (isMuted || !synthRef.current) return;
    synthRef.current.cancel();

    let plainText = (typeof text === 'string' ? text : String(text || ''));

    // 1. Remove markdown links [text](url) -> keep text only
    plainText = plainText.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    // 2. Remove URLs
    plainText = plainText.replace(/https?:\/\/\S+/gi, '');
    // 3. Remove code blocks
    plainText = plainText.replace(/```[\s\S]*?```/g, '');
    plainText = plainText.replace(/`[^`]*`/g, '');
    // 4. Remove citation brackets e.g. [1], [2], [1, 2]
    plainText = plainText.replace(/\[\s*\d+(?:\s*,\s*\d+)*\s*\]/g, ' ');
    // 5. Remove all bracket types: (), [], {}, <>, 【】, 〔〕, （）, ［］, ｛｝, «», ‹› so voice never says "bracket" or "parenthesis"
    plainText = plainText.replace(/[()[\]{}<>【】〔〕（）［］｛｝«»‹›]/g, ' ');
    // 6. Remove quotes, markdown formatting, slashes, and symbols: *, _, #, ~, |, ^, +, =, \, /, @, $, %, &, bullets, quotes
    plainText = plainText.replace(/[*_#~|^+=\\/@$%&•–—"“"''`]/g, ' ');
    // 7. Remove hyphens/dashes
    plainText = plainText.replace(/[-]/g, ' ');
    // 8. Replace colons not in time (e.g. Note:, Location:) with pause comma
    plainText = plainText.replace(/(?<!\d):|:(?!\d)/g, ', ');
    // 9. Remove emojis and pictographs
    plainText = plainText.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}]/gu, '');
    // 10. Clean up whitespace and punctuation spacing
    plainText = plainText
      .replace(/\s+/g, ' ')
      .replace(/\s+([.,?!])/g, '$1')
      .replace(/[.,]{2,}/g, '.')
      .trim();

    if (!plainText) return;

    // Split into sentences for natural voice flow
    const sentences = plainText
      .split(/(?<=[.!?])\s+/)
      .filter(s => s.trim().length > 1);

    if (sentences.length === 0) return;

    setIsSpeaking(true);
    setCharacterState('responding');

    let currentIdx = 0;
    const speakNext = () => {
      if (currentIdx >= sentences.length) {
        setIsSpeaking(false);
        setCharacterState('idle');
        return;
      }
      const utterance = new SpeechSynthesisUtterance(sentences[currentIdx]);
      utterance.lang = voiceLang;
      utterance.rate = 1.28; // Increased brisk speaking speed
      utterance.pitch = 1.05;
      utterance.onend = () => {
        currentIdx++;
        speakNext();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        setCharacterState('idle');
      };
      synthRef.current.speak(utterance);
    };
    speakNext();
  }, [isMuted, voiceLang]);


  // Query Backend AI Service
  const handleUserQuery = useCallback(async (queryText) => {
    if (!queryText || !queryText.trim()) return;

    const cleanQuery = queryText.trim();
    setUserQueryText(cleanQuery);
    setLiveTranscript('');
    setIsTyping(true);
    setCharacterState('think');

    setAiResponseData({
      text: "Thinking... Retrieving verified BIT campus knowledge...",
      sources: [],
      route: null,
      isInitial: false
    });

    // Build recent history for conversational memory
    const historyPayload = conversationList.flatMap(item => [
      { text: item.query, isAI: false },
      { text: typeof item.response === 'string' ? item.response : (item.response?.text || ''), isAI: true }
    ]).slice(-6);

    const sessionId = getChatSessionId(user);

    try {
      const res = await apiCall('/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: cleanQuery,
          language: voiceLang.split('-')[0] || 'en',
          session_id: sessionId,
          user_name: user?.name || 'Sarathy',
          history: historyPayload
        })
      });

      // Backend returns `response` in schema
      const reply = res.response || res.reply || (typeof res === 'string' ? res : "I am glad to help you explore Bannari Amman Institute of Technology!");

      // Clean and ensure sources are array of strings
      const safeSources = Array.isArray(res.sources)
        ? res.sources.map(s => {
          if (typeof s === 'string') return s;
          if (s && typeof s === 'object') return s.title || s.name || s.document || s.category || 'BIT Database';
          return 'BIT Official';
        })
        : [];

      const newResponseData = {
        text: typeof reply === 'string' ? reply : String(reply),
        sources: safeSources,
        route: res.route || null,
        isInitial: false
      };

      setAiResponseData(newResponseData);

      const turn = {
        id: 'turn_' + Date.now(),
        query: cleanQuery,
        response: newResponseData,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setConversationList(prev => {
        const nextList = [...prev, turn];
        try {
          sessionStorage.setItem('campus_conversation_history', JSON.stringify(nextList.slice(-20)));
          sessionStorage.setItem('last_user_query', cleanQuery);
          sessionStorage.setItem('last_ai_response', JSON.stringify(newResponseData));
        } catch (e) {
          console.warn("Could not cache chat state:", e);
        }
        return nextList;
      });

      speakText(reply);
    } catch (err) {
      console.error("Chat query error:", err);
      const fallback = "Bannari Amman Institute of Technology (BIT) is a premier Autonomous Engineering Institution established in 1996, offering 20+ UG & PG programs, cutting-edge AI laboratories, and a 95%+ placement record!";
      const fallbackData = {
        text: fallback,
        sources: ['BIT Knowledge Base'],
        route: null,
        isInitial: false
      };
      setAiResponseData(fallbackData);
      try {
        sessionStorage.setItem('last_user_query', cleanQuery);
        sessionStorage.setItem('last_ai_response', JSON.stringify(fallbackData));
      } catch { }
      speakText(fallback);
    } finally {
      setIsTyping(false);
    }
  }, [voiceLang, user, speakText, conversationList]);

  // =========================================================================
  // Web Speech API with 2-Second VAD (Voice Activity Detection)
  // =========================================================================
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = voiceLang;

      recognition.onstart = () => {
        setIsListening(true);
        setCharacterState('listening');
        accumulatedTranscriptRef.current = '';
        setLiveTranscript('');
      };

      recognition.onresult = (event) => {
        let currentInterim = '';
        let currentFinal = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            currentFinal += event.results[i][0].transcript + ' ';
          } else {
            currentInterim += event.results[i][0].transcript;
          }
        }

        if (currentFinal) {
          accumulatedTranscriptRef.current += currentFinal;
        }

        const fullSpokenText = (accumulatedTranscriptRef.current + currentInterim).trim();
        setLiveTranscript(fullSpokenText);

        // =======================================================
        // VAD: Reset 2-Second Silence Timer on Speech Activity
        // =======================================================
        if (vadTimerRef.current) {
          clearTimeout(vadTimerRef.current);
        }

        if (fullSpokenText.length > 0) {
          vadTimerRef.current = setTimeout(() => {
            console.log("VAD: 2 seconds of silence detected. Submitting query:", fullSpokenText);
            recognition.stop();
            setIsListening(false);
            if (fullSpokenText.trim()) {
              handleUserQuery(fullSpokenText);
            }
          }, 2000); // 2 seconds silence VAD
        }
      };

      recognition.onerror = (event) => {
        console.warn("Speech recognition error:", event.error);
        if (vadTimerRef.current) clearTimeout(vadTimerRef.current);
        setIsListening(false);
        setCharacterState('idle');
      };

      recognition.onend = () => {
        if (vadTimerRef.current) clearTimeout(vadTimerRef.current);
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (vadTimerRef.current) clearTimeout(vadTimerRef.current);
    };
  }, [voiceLang, handleUserQuery]);

  // Toggle Voice Recognition Button
  const toggleListen = () => {
    if (isListening) {
      if (vadTimerRef.current) clearTimeout(vadTimerRef.current);
      recognitionRef.current?.stop();
      setIsListening(false);
      if (liveTranscript.trim()) {
        handleUserQuery(liveTranscript);
      }
    } else {
      if (synthRef.current) synthRef.current.cancel();
      try {
        recognitionRef.current?.start();
      } catch (e) {
        setIsVoiceModalOpen(true);
      }
    }
  };

  const handleResetChat = () => {
    try {
      sessionStorage.removeItem('last_user_query');
      sessionStorage.removeItem('last_ai_response');
      sessionStorage.removeItem('campus_conversation_history');
      const userKey = user?.roll || user?.roll_number || user?.email || 'student';
      sessionStorage.removeItem(`chat_session_${userKey}`);
    } catch { }
    setUserQueryText('');
    setLiveTranscript('');
    setTextInputValue('');
    setConversationList([]);
    if (synthRef.current && isSpeaking) synthRef.current.cancel();
    setIsSpeaking(false);
    setCharacterState('idle');
    setAiResponseData({
      text: WELCOME_MESSAGES[voiceLang] || WELCOME_MESSAGES['en-IN'],
      sources: [],
      route: null,
      isInitial: true
    });
  };

  const handleLanguageChange = (code) => {
    setVoiceLang(code);
    try {
      sessionStorage.removeItem('last_user_query');
      sessionStorage.removeItem('last_ai_response');
      sessionStorage.removeItem('campus_conversation_history');
    } catch { }
    setUserQueryText('');
    setLiveTranscript('');
    setConversationList([]);
    setAiResponseData({
      text: WELCOME_MESSAGES[code] || WELCOME_MESSAGES['en-IN'],
      sources: [],
      route: null,
      isInitial: true
    });
  };

  const copyResponseToClipboard = () => {
    navigator.clipboard.writeText(aiResponseData.text);
    setCopiedResponse(true);
    setTimeout(() => setCopiedResponse(false), 2000);
  };

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] dark:bg-[#09090B] text-slate-900 dark:text-zinc-100 font-sans antialiased">

      {/* 1. Left Sidebar Matching Exact Mockup */}
      <Sidebar />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">

        {/* Top Header */}
        <Header
          title={
            <span>
              Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">Virtual Campus Speaker</span>
            </span>
          }
          subtitle="Ask me anything or explore the campus with me."
          customActions={
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-2 py-1">
                <Globe size={13} className="text-blue-600" />
                <select
                  value={voiceLang}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
                >
                  {SUPPORTED_LANGUAGES.map(l => (
                    <option key={l.code} value={l.code} className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">
                      {l.label} ({l.native})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          }
        />

        {/* Main Assistant Body (Centered and fitted to viewport) */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full flex flex-col justify-center">

          {/* ========================================================================= */}
          {/* HERO SHOWCASE STAGE: 3D ANIMATED CHARACTER + LIVE DIALOGUE OUTPUT */}
          {/* ========================================================================= */}
          {(() => {
            const hasActiveQuery = !aiResponseData.isInitial || Boolean(userQueryText && userQueryText.trim()) || Boolean(liveTranscript && liveTranscript.trim());

            return (
              <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-blue-100/60 via-indigo-50/40 to-white dark:from-zinc-900 dark:via-zinc-900/90 dark:to-zinc-950 border border-slate-200/90 dark:border-zinc-800 shadow-sm p-4 sm:p-6 lg:p-8 transition-all duration-500 ease-out flex flex-col justify-between min-h-[calc(100vh-155px)]">

                {/* Ambient Lighting */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400/10 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-400/10 dark:bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center min-h-[380px] lg:min-h-[420px]">

                  {/* LEFT STAGE: 3D ANIMATED CHARACTER (Anchored & Smooth across all states) */}
                  <div className="lg:col-span-4 flex flex-col items-center justify-center h-60 sm:h-72 lg:h-[400px] relative transition-all duration-500 ease-out">
                    <InteractiveStudent3D
                      currentState={characterState}
                      isSpeaking={isSpeaking}
                      isListening={isListening}
                      isTyping={isTyping}
                    />
                  </div>

                  {/* RIGHT STAGE: DYNAMIC INTERACTIVE CONTENT (Smooth cross-fade & expansion) */}
                  <div className="lg:col-span-8 flex flex-col justify-center space-y-3.5 w-full transition-all duration-500 ease-out min-h-[320px]">

                    {/* ------------------------------------------------------------- */}
                    {/* STATE A: ACTIVE CONVERSATION (Shown when question is asked)  */}
                    {/* ------------------------------------------------------------- */}
                    {hasActiveQuery ? (
                      <div className="w-full space-y-3 animate-in fade-in zoom-in-95 duration-500">

                        {/* Previous Conversation Turns in this Session */}
                        {conversationList.length > 1 && (
                          <div className="w-full p-3 rounded-2xl bg-white/80 dark:bg-zinc-900/80 border border-slate-200/80 dark:border-zinc-800 shadow-2xs backdrop-blur-sm space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar">
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-zinc-400">
                              <span className="flex items-center gap-1.5">
                                <Clock size={12} className="text-blue-600 dark:text-blue-400" />
                                <span>Recent Conversation ({conversationList.length - 1} earlier turn{conversationList.length - 1 > 1 ? 's' : ''})</span>
                              </span>
                              <button
                                onClick={handleResetChat}
                                className="text-[11px] text-slate-400 hover:text-red-500 dark:hover:text-red-400 flex items-center gap-1 cursor-pointer transition-colors font-medium"
                                title="Start a fresh conversation"
                              >
                                <RotateCcw size={11} />
                                <span>New Chat</span>
                              </button>
                            </div>
                            <div className="space-y-1.5">
                              {conversationList.slice(0, -1).map((turn, tIdx) => (
                                <div key={turn.id || tIdx} className="text-xs p-2.5 rounded-xl bg-slate-50/80 dark:bg-zinc-800/60 border border-slate-200/50 dark:border-zinc-800/60">
                                  <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-zinc-200 text-[11px]">
                                    <span className="w-4 h-4 rounded-md bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[9px] font-extrabold shrink-0">Q</span>
                                    <span className="truncate">{turn.query}</span>
                                    <span className="ml-auto text-[10px] text-slate-400 font-normal shrink-0">{turn.timestamp}</span>
                                  </div>
                                  <div className="mt-1 text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-2 pl-5 font-normal">
                                    {typeof turn.response === 'string' ? turn.response : (turn.response?.text || '')}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* User Question Banner */}
                        {(liveTranscript || userQueryText) && (
                          <div className="w-full p-3.5 rounded-2xl bg-blue-50/90 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-900/60 text-xs text-blue-950 dark:text-blue-200 flex items-start gap-2.5 shadow-2xs">
                            <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 font-bold text-[11px] shadow-2xs">
                              YOU
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                                  {isListening ? '🎙️ Speaking (VAD 2s Auto-Stop)...' : 'Question Asked:'}
                                </span>
                                <button
                                  onClick={handleResetChat}
                                  className="text-[11px] font-medium text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 cursor-pointer transition-colors"
                                  title="Reset to Welcome Stage"
                                >
                                  <RotateCcw size={12} />
                                  <span className="hidden sm:inline">Reset</span>
                                </button>
                              </div>
                              <div className="font-semibold text-slate-800 dark:text-zinc-100 mt-0.5 text-xs sm:text-sm break-words">
                                {liveTranscript || userQueryText}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Main AI Response Speech Bubble Card */}
                        <div className="w-full p-5 sm:p-6 rounded-3xl bg-white/95 dark:bg-zinc-900/95 border border-slate-200/90 dark:border-zinc-800 shadow-sm backdrop-blur-md relative max-h-[380px] overflow-y-auto custom-scrollbar space-y-3">

                          {/* Card Header & Controls */}
                          <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shadow-2xs">
                                BIT
                              </div>
                              <div>
                                <span className="text-xs font-extrabold text-slate-900 dark:text-zinc-100">
                                  Campus Voice Response
                                </span>
                                {isTyping && (
                                  <span className="ml-2 inline-flex items-center text-[10px] text-blue-600 dark:text-blue-400 animate-pulse font-medium">
                                    Generating answer...
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => speakText(aiResponseData.text)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                                title="Replay Voice Response"
                              >
                                <Volume2 size={15} />
                              </button>
                              <button
                                onClick={copyResponseToClipboard}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                                title="Copy Answer"
                              >
                                {copiedResponse ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                              </button>
                            </div>
                          </div>

                          {/* Markdown Answer Text */}
                          <div className="text-xs sm:text-sm text-slate-800 dark:text-zinc-200 leading-relaxed prose prose-xs dark:prose-invert max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {String(aiResponseData.text || '')}
                            </ReactMarkdown>
                          </div>

                          {/* Campus Directions & Map Look (Shown ONLY for navigation questions) */}
                          {(() => {
                            const navPlace = detectNavigationPlace(userQueryText || liveTranscript, aiResponseData.text, false);
                            if (!navPlace && !aiResponseData.route) return null;

                            const placeId = navPlace?.id || (typeof aiResponseData.route === 'string' ? aiResponseData.route : aiResponseData.route?.destination?.id || 'ib-block-2');

                            return (
                              <div className="pt-3 space-y-3">
                                {/* 1. Interactive Mini Map Preview Card */}
                                <CampusMapMiniCard place={navPlace} routeData={aiResponseData.route} />

                                {/* 2. Prominent Interactive Navigation Button */}
                                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                                  <button
                                    onClick={() => navigate(`/map?to=${placeId}&nav=1`)}
                                    className="py-2 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer group"
                                  >
                                    <Compass size={14} className="group-hover:rotate-45 transition-transform" />
                                    <span>Open Campus Map & Directions {navPlace?.shortName ? `(${navPlace.shortName})` : ''}</span>
                                    <ArrowRight size={13} />
                                  </button>
                                </div>
                              </div>
                            );
                          })()}

                        </div>

                      </div>
                    ) : (
                      /* ------------------------------------------------------------- */
                      /* STATE B: INITIAL WELCOME HUB (Interactive, Modern & Clean)    */
                      /* ------------------------------------------------------------- */
                      <div className="w-full space-y-3.5 animate-in fade-in zoom-in-95 duration-500">

                        {/* Welcome Speech & Interactive Action Card */}
                        <div className="w-full p-5 sm:p-6 rounded-3xl bg-white/95 dark:bg-zinc-900/95 border border-slate-200/90 dark:border-zinc-800 shadow-sm backdrop-blur-md relative overflow-hidden space-y-3.5">

                          {/* Top Live AI Header */}
                          <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/80 pb-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xs font-black shadow-2xs">
                                BIT
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-xs font-extrabold text-slate-900 dark:text-zinc-100 tracking-tight">
                                  Campus AI Speaker
                                </span>
                              </div>
                            </div>

                            <button
                              onClick={() => speakText(aiResponseData.text)}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                              title="Listen to Welcome Greeting"
                            >
                              <Volume2 size={16} />
                            </button>
                          </div>

                          {/* Welcome Text */}
                          <div className="text-xs sm:text-sm text-slate-800 dark:text-zinc-200 leading-relaxed font-medium">
                            {String(aiResponseData.text || '')}
                          </div>

                          {/* Quick Interactive Actions */}
                          <div className="pt-1 flex flex-wrap items-center gap-2.5">
                            <button
                              onClick={() => setIsVoiceModalOpen(true)}
                              className="inline-flex items-center gap-2 py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer group"
                            >
                              <Sparkles size={13} />
                              <span>Let's Explore</span>
                              <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                            </button>

                            <button
                              onClick={toggleListen}
                              className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                            >
                              <Mic size={13} className="text-blue-600 dark:text-blue-400" />
                              <span>Voice Talk</span>
                            </button>

                            <button
                              onClick={() => navigate('/map')}
                              className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                            >
                              <MapPin size={13} className="text-indigo-600 dark:text-indigo-400" />
                              <span>Campus Map</span>
                            </button>
                          </div>

                        </div>

                        {/* Interactive Topic Exploration Pills (Clickable & Engaging) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">

                          <button
                            onClick={() => handleUserQuery('Where is Central Library and Dr. SVB Library located?')}
                            className="p-3 rounded-2xl bg-white/90 dark:bg-zinc-900/90 hover:bg-white dark:hover:bg-zinc-800 border border-slate-200/80 dark:border-zinc-800 shadow-2xs hover:shadow-xs transition-all flex items-center gap-3 group cursor-pointer text-left"
                          >
                            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                              <MapPin size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                                Where is Central Library?
                              </div>
                              <div className="text-[10px] text-slate-400 dark:text-zinc-400 truncate">Directions & landmark route</div>
                            </div>
                          </button>

                          <button
                            onClick={() => handleUserQuery('What are the highest placement packages and top recruiters at BIT?')}
                            className="p-3 rounded-2xl bg-white/90 dark:bg-zinc-900/90 hover:bg-white dark:hover:bg-zinc-800 border border-slate-200/80 dark:border-zinc-800 shadow-2xs hover:shadow-xs transition-all flex items-center gap-3 group cursor-pointer text-left"
                          >
                            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                              <Sparkles size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors truncate">
                                Highest Placements & CTCs
                              </div>
                              <div className="text-[10px] text-slate-400 dark:text-zinc-400 truncate">40+ LPA records & recruiters</div>
                            </div>
                          </button>

                          <button
                            onClick={() => handleUserQuery('Tell me about BIT Admissions, courses, and cutoff details.')}
                            className="p-3 rounded-2xl bg-white/90 dark:bg-zinc-900/90 hover:bg-white dark:hover:bg-zinc-800 border border-slate-200/80 dark:border-zinc-800 shadow-2xs hover:shadow-xs transition-all flex items-center gap-3 group cursor-pointer text-left"
                          >
                            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                              <GraduationCap size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                                Admissions & Cutoffs
                              </div>
                              <div className="text-[10px] text-slate-400 dark:text-zinc-400 truncate">20+ UG & PG programs</div>
                            </div>
                          </button>

                          <button
                            onClick={() => handleUserQuery('Tell me about hostel facilities, rooms, and mess food at BIT.')}
                            className="p-3 rounded-2xl bg-white/90 dark:bg-zinc-900/90 hover:bg-white dark:hover:bg-zinc-800 border border-slate-200/80 dark:border-zinc-800 shadow-2xs hover:shadow-xs transition-all flex items-center gap-3 group cursor-pointer text-left"
                          >
                            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                              <ShieldCheck size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                                Hostel & Dining Facilities
                              </div>
                              <div className="text-[10px] text-slate-400 dark:text-zinc-400 truncate">Hostel blocks & food courts</div>
                            </div>
                          </button>

                        </div>

                      </div>
                    )}

                  </div>

                </div>

                {/* ========================================================================= */}
                {/* FLOATING ACTION CONTROL PILL & INLINE PROMPT INPUT BAR */}
                {/* ========================================================================= */}
                <div className="mt-5 pt-4 border-t border-slate-200/60 dark:border-zinc-800/60 space-y-3 relative z-20">

                  {/* Inline Prompt Input Form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (textInputValue.trim()) {
                        handleUserQuery(textInputValue);
                        setTextInputValue('');
                      }
                    }}
                    className="w-full max-w-2xl mx-auto flex items-center gap-2"
                  >
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={textInputValue}
                        onChange={(e) => setTextInputValue(e.target.value)}
                        placeholder="Type any question about BIT campus, courses, labs, hostels..."
                        className="w-full pl-4 pr-10 py-3 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 text-xs sm:text-sm text-slate-900 dark:text-zinc-100 shadow-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                      />
                      {textInputValue && (
                        <button
                          type="button"
                          onClick={() => setTextInputValue('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={!textInputValue.trim() || isTyping}
                      className="py-3 px-5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0"
                    >
                      <Send size={14} />
                      <span className="hidden sm:inline">Ask</span>
                    </button>
                  </form>

                  {/* Controls Strip (Keyboard Drawer, Glowing Mic, Speaker, Live Status) */}
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-1">

                    {/* Keyboard / Chat History Drawer Button */}
                    <button
                      onClick={() => setIsChatDrawerOpen(true)}
                      className="px-3.5 h-11 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 shadow-xs flex items-center gap-2 text-xs font-bold cursor-pointer transition-transform active:scale-95"
                      title="Open My Chat History & Conversation Drawer"
                    >
                      <MessageSquare size={16} className="text-blue-600 dark:text-blue-400" />
                      <span className="hidden sm:inline">My Chats</span>
                    </button>

                    {/* Big Glowing Voice Mic Button with VAD */}
                    <button
                      onClick={toggleListen}
                      className={`w-13 h-13 rounded-full flex items-center justify-center text-white cursor-pointer shadow-lg transition-all active:scale-95 ${isListening
                          ? 'bg-rose-600 ring-4 ring-rose-500/30 scale-110 animate-pulse'
                          : 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 hover:opacity-95 shadow-blue-500/30'
                        }`}
                      title={isListening ? "Listening... (Stops automatically after 2s silence)" : "Click to Speak"}
                    >
                      {isListening ? <MicOff size={22} /> : <Mic size={22} />}
                    </button>

                    {/* Speaker / Mute Toggle */}
                    <button
                      onClick={() => {
                        if (synthRef.current && isSpeaking) synthRef.current.cancel();
                        setIsMuted(!isMuted);
                      }}
                      className="w-11 h-11 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 shadow-xs flex items-center justify-center cursor-pointer transition-transform active:scale-95"
                      title={isMuted ? "Unmute Voice Responses" : "Mute Voice Responses"}
                    >
                      {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>

                    {/* Dynamic Voice Status Badge (Appears when active) */}
                    {(isListening || isTyping || isSpeaking) && (
                      <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/90 dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800 text-xs font-semibold text-slate-600 dark:text-zinc-300 shadow-2xs animate-in fade-in duration-200">
                        <div className="flex items-center gap-0.5">
                          <span className="w-0.5 bg-blue-600 rounded-full animate-wave-1" />
                          <span className="w-0.5 bg-blue-600 rounded-full animate-wave-2" />
                          <span className="w-0.5 bg-blue-600 rounded-full animate-wave-3" />
                        </div>
                        <span>
                          {isListening
                            ? 'Listening (VAD auto-stop)...'
                            : isTyping
                              ? 'Formulating response...'
                              : 'Speaking...'}
                        </span>
                      </div>
                    )}

                  </div>

                </div>

              </div>
            );
          })()}

        </main>

      </div>

      {/* 3. Voice Assistant Modal Overlay with VAD */}
      <VoiceAssistantModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
      />

      {/* 4. Chat Drawer for Conversation History & Markdown */}
      <ChatDrawer
        isOpen={isChatDrawerOpen}
        onClose={() => setIsChatDrawerOpen(false)}
        initialQuery={selectedInitialQuery}
        voiceLang={voiceLang}
      />

      {/* 5. Mobile Bottom Navigation */}
      <MobileNav onOpenVoiceAssistant={() => setIsVoiceModalOpen(true)} />

    </div>
  );
};

export default ChatPage;
