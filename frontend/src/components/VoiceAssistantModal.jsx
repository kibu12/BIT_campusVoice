import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, Mic, MicOff, Volume2, VolumeX, Sparkles, Send, 
  MapPin, Clock, ArrowRight, Globe, AudioLines, Copy, Check, Compass, Building2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import InteractiveStudent3D from './InteractiveStudent3D';
import CampusMapMiniCard from './CampusMapMiniCard';
import { apiCall } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { detectNavigationPlace } from '../pages/ChatPage';

const QUICK_VOICE_QUERIES = [
  'Tell me about BIT Admissions & Fees',
  'How to reach Central Library?',
  'What are the highest placement CTCs?',
  'Hostel & mess timings'
];

const VoiceAssistantModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [voiceLang, setVoiceLang] = useState('en-IN');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [userQueryText, setUserQueryText] = useState('');
  const [characterState, setCharacterState] = useState('idle');
  const [responseSpeech, setResponseSpeech] = useState("Hi! I'm your Campus Voice. How can I assist you today?");
  const [routeData, setRouteData] = useState(null);
  const [voiceTurns, setVoiceTurns] = useState([]);
  
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const vadTimerRef = useRef(null);
  const accumulatedTranscriptRef = useRef('');

  // Handle TTS
  const speakText = useCallback((text) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();

    let plainText = (typeof text === 'string' ? text : String(text || ''));

    // 1. Remove markdown links [text](url) -> keep text
    plainText = plainText.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    // 2. Remove URLs
    plainText = plainText.replace(/https?:\/\/\S+/gi, '');
    // 3. Remove code blocks
    plainText = plainText.replace(/```[\s\S]*?```/g, '');
    plainText = plainText.replace(/`[^`]*`/g, '');
    // 4. Remove citation brackets e.g. [1], [2]
    plainText = plainText.replace(/\[\s*\d+(?:\s*,\s*\d+)*\s*\]/g, ' ');
    // 5. Remove all bracket types: (), [], {}, <>, 【】, 〔〕, （）, ［］, ｛｝, «», ‹› so voice never says "bracket" or "parenthesis"
    plainText = plainText.replace(/[()[\]{}<>【】〔〕（）［］｛｝«»‹›]/g, ' ');
    // 6. Remove quotes, markdown formatting, slashes, and symbols: *, _, #, ~, |, ^, +, =, \, /, @, $, %, &, bullets, quotes
    plainText = plainText.replace(/[*_#~|^+=\\/@$%&•–—"“"''`]/g, ' ');
    // 7. Remove hyphens/dashes
    plainText = plainText.replace(/[-]/g, ' ');
    // 8. Replace colons not in time with pause comma
    plainText = plainText.replace(/(?<!\d):|:(?!\d)/g, ', ');
    // 9. Remove emojis and pictographs
    plainText = plainText.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}]/gu, '');
    // 10. Clean spaces & repeated punctuation
    plainText = plainText
      .replace(/\s+/g, ' ')
      .replace(/\s+([.,?!])/g, '$1')
      .replace(/[.,]{2,}/g, '.')
      .trim();

    if (!plainText) return;

    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.lang = voiceLang;
    utterance.rate = 1.28; // Increased brisk speaking speed
    utterance.pitch = 1.05;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setCharacterState('responding');
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setCharacterState('idle');
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setCharacterState('idle');
    };

    synthRef.current.speak(utterance);
  }, [voiceLang]);

  // Handle Query
  const handleUserQuery = useCallback(async (queryText) => {
    if (!queryText || !queryText.trim()) return;
    const cleanQuery = queryText.trim();
    setUserQueryText(cleanQuery);
    setLiveTranscript('');
    setIsTyping(true);
    setCharacterState('think');
    setResponseSpeech("Thinking... Searching BIT Campus database...");
    setRouteData(null);

    const historyPayload = voiceTurns.flatMap(item => [
      { text: item.query, isAI: false },
      { text: item.reply, isAI: true }
    ]).slice(-6);

    const userKey = user?.roll || user?.roll_number || user?.email || 'student';
    const sessionId = `chat_session_${userKey}`;

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

      const reply = res.response || res.reply || (typeof res === 'string' ? res : "I am glad to help you explore Bannari Amman Institute of Technology!");
      const replyStr = typeof reply === 'string' ? reply : String(reply);
      setResponseSpeech(replyStr);
      setVoiceTurns(prev => [...prev, { query: cleanQuery, reply: replyStr }]);
      if (res.route) setRouteData(res.route);
      speakText(reply);
    } catch (err) {
      console.error("Chat error in voice modal:", err);
      const fallback = "Here is what I know about BIT: Established in 1996, offering 20+ engineering programs, premier hostels, and top placements!";
      setResponseSpeech(fallback);
      speakText(fallback);
    } finally {
      setIsTyping(false);
    }
  }, [voiceLang, speakText, voiceTurns, user]);

  // Speech Recognition with 2-Second VAD
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

        // VAD: Reset 2-Second Silence Timer
        if (vadTimerRef.current) clearTimeout(vadTimerRef.current);

        if (fullSpokenText.length > 0) {
          vadTimerRef.current = setTimeout(() => {
            console.log("VAD (Modal): 2s silence detected. Auto-submitting:", fullSpokenText);
            recognition.stop();
            setIsListening(false);
            if (fullSpokenText.trim()) {
              handleUserQuery(fullSpokenText);
            }
          }, 2000);
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
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
        console.warn("Recognition already active", e);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-blue-900/90 via-indigo-950/95 to-slate-950 rounded-3xl border border-blue-500/30 shadow-2xl p-5 sm:p-6 flex flex-col items-center justify-between min-h-[640px] text-white overflow-hidden">
        
        {/* Glowing Ambient Background */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* Top Bar with Language Selector & Close */}
        <div className="w-full flex items-center justify-between z-10 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
              <AudioLines size={18} className="text-cyan-400" />
            </div>
            <div>
              <div className="text-xs font-bold tracking-tight">Campus Voice AI</div>
              <div className="text-[10px] text-cyan-300">Live 3D Virtual Speaker</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={voiceLang}
              onChange={(e) => setVoiceLang(e.target.value)}
              className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl px-2.5 py-1 text-xs font-semibold text-white focus:outline-none cursor-pointer"
            >
              <option value="en-IN" className="bg-zinc-900 text-white">English</option>
              <option value="ta-IN" className="bg-zinc-900 text-white">தமிழ் (Tamil)</option>
              <option value="ml-IN" className="bg-zinc-900 text-white">മലയാളം (Malayalam)</option>
              <option value="hi-IN" className="bg-zinc-900 text-white">हिंदी (Hindi)</option>
            </select>

            <button 
              onClick={() => {
                if (synthRef.current) synthRef.current.cancel();
                onClose();
              }}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* User Question / Live Speech Box */}
        {(liveTranscript || userQueryText) && (
          <div className="relative z-10 w-full max-w-lg mt-2 p-2.5 rounded-xl bg-blue-500/20 border border-blue-400/30 text-xs flex items-center gap-2 animate-in fade-in">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-cyan-300 font-semibold">{isListening ? 'You are saying:' : 'You asked:'}</span>
            <span className="text-white font-bold truncate">{liveTranscript || userQueryText}</span>
          </div>
        )}

        {/* AI Speech Bubble with Markdown & Mini-Card */}
        <div className="relative z-10 max-w-lg w-full mt-2 p-4 rounded-2xl bg-white/95 text-slate-900 shadow-xl border border-white/30 backdrop-blur-md max-h-56 overflow-y-auto custom-scrollbar">
          <div className="text-xs sm:text-sm font-semibold prose prose-xs max-w-none leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {responseSpeech}
            </ReactMarkdown>
          </div>

          {(() => {
            const query = userQueryText || liveTranscript;
            const navPlace = detectNavigationPlace(query, responseSpeech);
            const placeId = navPlace?.id || (typeof routeData === 'string' ? routeData : routeData?.destination?.id || 'ib-block-2');

            if (navPlace || routeData) {
              return (
                <div className="pt-2 space-y-2.5">
                  <CampusMapMiniCard place={navPlace} routeData={routeData} />

                  <div className="flex items-center gap-2 pt-1 border-t border-slate-200">
                    <button
                      onClick={() => {
                        onClose();
                        navigate(`/map?to=${placeId}&nav=1`);
                      }}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                    >
                      <Compass size={13} />
                      <span>Start Navigation on Map</span>
                      <ArrowRight size={12} />
                    </button>
                    <button
                      onClick={() => {
                        onClose();
                        navigate('/contacts');
                      }}
                      className="py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Building2 size={12} />
                      <span>Directory</span>
                    </button>
                  </div>
                </div>
              );
            }
            return null;
          })()}
        </div>

        {/* 3D Animated Character Stage */}
        <div className="relative z-10 w-full h-64 flex items-center justify-center my-1">
          <InteractiveStudent3D
            currentState={characterState}
            isSpeaking={isSpeaking}
            isListening={isListening}
            isTyping={isTyping}
          />
        </div>

        {/* Quick Query Pills */}
        <div className="w-full flex flex-wrap items-center justify-center gap-2 z-10 my-1">
          {QUICK_VOICE_QUERIES.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleUserQuery(q)}
              className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white/90 hover:text-white transition-all cursor-pointer backdrop-blur-sm shadow-xs"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Bottom Giant Mic / Tap to Talk Action Bar with 2s VAD */}
        <div className="w-full max-w-md z-10 pt-1">
          <button
            onClick={toggleListen}
            className={`w-full py-3 px-5 rounded-2xl flex items-center justify-between transition-all cursor-pointer shadow-xl ${
              isListening
                ? 'bg-gradient-to-r from-rose-500 to-pink-600 ring-4 ring-rose-500/30 animate-pulse'
                : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-95'
            }`}
          >
            {/* Waveform indicator */}
            <div className="flex items-center gap-1">
              <span className={`w-1 bg-white rounded-full ${isListening ? 'animate-wave-1' : 'h-3'}`} />
              <span className={`w-1 bg-white rounded-full ${isListening ? 'animate-wave-2' : 'h-5'}`} />
              <span className={`w-1 bg-white rounded-full ${isListening ? 'animate-wave-3' : 'h-2'}`} />
              <span className={`w-1 bg-white rounded-full ${isListening ? 'animate-wave-4' : 'h-4'}`} />
            </div>

            <span className="font-bold text-xs sm:text-sm tracking-wide">
              {isListening ? 'Listening (Stops after 2s silence)...' : isTyping ? 'Processing query...' : 'Tap to talk'}
            </span>

            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </div>
          </button>
        </div>

      </div>
    </div>
  );
};

export default VoiceAssistantModal;
