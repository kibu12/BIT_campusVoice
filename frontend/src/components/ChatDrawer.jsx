import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Send, Mic, MicOff, Volume2, VolumeX, Sparkles, 
  MapPin, Clock, ArrowRight, Bot, User, RotateCcw, Copy, Check
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { apiCall } from '../services/api';
import { useAuth } from '../context/AuthContext';
import CampusMapMiniCard from './CampusMapMiniCard';

const ChatDrawer = ({ isOpen, onClose, initialQuery = '', voiceLang = 'en-IN' }) => {
  const { user } = useAuth();
  const userKey = user?.roll || user?.roll_number || user?.email || 'student';
  const sessionId = `chat_session_${userKey}`;

  const [messages, setMessages] = useState([
    {
      id: 'init',
      text: "Hello! 👋 I'm your Virtual Campus Speaker. Ask me anything about admissions, departments, placements, hostel facilities, or campus navigation!",
      isAI: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Fetch past conversation history for current user when opened
  useEffect(() => {
    if (isOpen) {
      const loadHistory = async () => {
        try {
          const hist = await apiCall(`/chat/history?session_id=${sessionId}`);
          if (Array.isArray(hist) && hist.length > 0) {
            const formatted = [];
            hist.forEach(h => {
              formatted.push({
                id: `u_${h.id}`,
                text: h.message,
                isAI: false,
                timestamp: h.created_at ? new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
              });
              formatted.push({
                id: `a_${h.id}`,
                text: h.response,
                isAI: true,
                timestamp: h.created_at ? new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
              });
            });
            setMessages(formatted);
          }
        } catch (err) {
          console.warn("Could not load user chat history:", err);
        }
      };
      loadHistory();
    }
  }, [isOpen, sessionId]);

  useEffect(() => {
    if (initialQuery && isOpen) {
      sendMessage(initialQuery);
    }
  }, [initialQuery, isOpen]);

  const sendMessage = async (textToSend) => {
    const query = textToSend || inputMessage;
    if (!query.trim()) return;

    const userMsg = {
      id: 'user_' + Date.now(),
      text: query,
      isAI: false,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);

    // Build history payload for conversational memory
    const historyPayload = messages
      .filter(m => m.id !== 'init')
      .map(m => ({
        text: m.text,
        isAI: m.isAI
      }))
      .slice(-8);

    try {
      const res = await apiCall('/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: query,
          language: voiceLang.split('-')[0] || 'en',
          session_id: sessionId,
          user_name: user?.name || 'Sarathy',
          history: historyPayload
        })
      });

      const aiMsg = {
        id: 'ai_' + Date.now(),
        text: res.response || "I am glad to help you explore Bannari Amman Institute of Technology!",
        isAI: true,
        sources: res.sources || [],
        route: res.route || null,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error("Failed to fetch response:", err);
      const errorMsg = {
        id: 'err_' + Date.now(),
        text: "I am having trouble connecting to the campus knowledge server. Please verify the backend is running.",
        isAI: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-[#09090B] h-full flex flex-col justify-between shadow-2xl border-l border-slate-200 dark:border-zinc-800 animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="h-16 px-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-950 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Bot size={18} />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-zinc-50">Campus Dialogue Assistant</div>
              <div className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>BIT Knowledge Connected</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMessages([messages[0]])}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
              title="Reset Chat"
            >
              <RotateCcw size={15} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Message Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/50 dark:bg-zinc-900/30">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.isAI ? 'items-start' : 'items-end'}`}
            >
              <div className="flex items-start gap-2 max-w-[88%]">
                {msg.isAI && (
                  <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-1 shadow-2xs">
                    BIT
                  </div>
                )}
                <div
                  className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                    msg.isAI
                      ? 'bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 border border-slate-200/80 dark:border-zinc-800'
                      : 'bg-blue-600 text-white font-medium'
                  }`}
                >
                  {msg.isAI ? (
                    <div className="prose prose-xs dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <span>{msg.text}</span>
                  )}

                  {msg.route && <CampusMapMiniCard routeData={msg.route} />}

                  <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-slate-100 dark:border-zinc-800/80 text-[10px] text-slate-400">
                    <span>{msg.timestamp}</span>
                    {msg.isAI && (
                      <button 
                        onClick={() => copyToClipboard(msg.text, msg.id)}
                        className="hover:text-slate-600 dark:hover:text-zinc-300 cursor-pointer"
                      >
                        {copiedId === msg.id ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center gap-2 text-xs text-slate-400 italic">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]" />
              <span>Campus Voice is formulating answer...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="p-3 border-t border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your question about BIT..."
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-800 dark:text-zinc-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isTyping}
            className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-all cursor-pointer shadow-xs"
          >
            <Send size={15} />
          </button>
        </form>

      </div>
    </div>
  );
};

export default ChatDrawer;
