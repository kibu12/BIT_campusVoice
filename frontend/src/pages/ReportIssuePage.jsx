import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Headphones, HelpCircle, Monitor, Utensils, Bus, 
  GraduationCap, Package, Plus, Clock, CheckCircle2, 
  AlertCircle, ChevronRight, X, Send, MapPin, Sparkles, Filter,
  Lock, ArrowRight, ShieldCheck, School
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import MobileNav from '../components/MobileNav';
import VoiceAssistantModal from '../components/VoiceAssistantModal';
import { useAuth } from '../context/AuthContext';
import { apiCall } from '../services/api';

const HELPDESK_CATEGORIES = [
  { id: 'General Enquiry', name: 'General Enquiry', count: '1 Issue', icon: HelpCircle, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-400' },
  { id: 'IT Support', name: 'IT Support', count: '2 Issues', icon: Monitor, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-400' },
  { id: 'Hostel & Mess', name: 'Hostel & Mess', count: '1 Issue', icon: Utensils, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-400' },
  { id: 'Transport', name: 'Transport', count: '0 Issues', icon: Bus, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400' },
  { id: 'Academics', name: 'Academics', count: '2 Issues', icon: GraduationCap, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/60 dark:text-purple-400' },
  { id: 'Other', name: 'Other', count: '1 Issue', icon: Package, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-400' },
];

const DEFAULT_RECENT_REQUESTS = [
  {
    id: 'req-101',
    title: 'Wi-Fi not working in hostel',
    category: 'IT Support',
    status: 'In Progress',
    date: '20 May 2025',
    location: 'Emerald Hostel Block B'
  },
  {
    id: 'req-102',
    title: 'Mess food quality issue',
    category: 'Hostel & Mess',
    status: 'Resolved',
    date: '18 May 2025',
    location: 'North Dining Hall'
  },
  {
    id: 'req-103',
    title: 'Bus pass renewal issue',
    category: 'Transport',
    status: 'Open',
    date: '17 May 2025',
    location: 'Transport Desk'
  }
];

const ReportIssuePage = () => {
  const { user, isGuest, isVerifiedMember, login, isFaculty } = useAuth();
  const navigate = useNavigate();
  const [recentRequests, setRecentRequests] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('IT Support');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Quick Login Modal for Guests
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [modalRoll, setModalRoll] = useState('');
  const [modalName, setModalName] = useState('');
  const [modalGoogleEmail, setModalGoogleEmail] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalTab, setModalTab] = useState('student');

  // Form state
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [submitting, setSubmitting] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const fetchIssues = async () => {
    if (!isVerifiedMember) return;
    try {
      const data = await apiCall('/issues');
      if (Array.isArray(data)) {
        const formatted = data.map(item => ({
          id: `req-${item.id}`,
          title: item.description?.substring(0, 42) || `${item.category} Request`,
          category: item.category,
          status: item.status === 'resolved' ? 'Resolved' : item.status === 'in_progress' ? 'In Progress' : 'Open',
          date: new Date(item.created_at || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          location: item.location || 'BIT Campus'
        }));
        setRecentRequests(formatted);
      }
    } catch (err) {
      console.warn("Error fetching requests:", err);
      setRecentRequests([]);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [isVerifiedMember]);

  const handleOpenCategory = (catName) => {
    if (!isVerifiedMember) {
      setShowLoginModal(true);
      return;
    }
    setSelectedCategory(catName);
    setIsModalOpen(true);
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!isVerifiedMember) {
      setShowLoginModal(true);
      return;
    }

    if (!description.trim() || !location.trim()) {
      showToast('Please specify location and description.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        category: selectedCategory,
        location,
        description: title ? `${title} - ${description}` : description,
        priority,
        user_type: isFaculty ? 'faculty' : 'student',
        user_name: user?.name || 'Arikrishnan R',
        user_email: user?.email || '7376232ad110@bitsathy.ac.in'
      };

      await apiCall('/issues', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const newReq = {
        id: `req-${Date.now().toString().slice(-3)}`,
        title: title || description.slice(0, 30),
        category: selectedCategory,
        status: 'Open',
        date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        location
      };

      setRecentRequests(prev => [newReq, ...prev]);
      showToast('Helpdesk request submitted successfully!');
      setIsModalOpen(false);
      setTitle('');
      setLocation('');
      setDescription('');
    } catch (err) {
      console.error("Submit error:", err);
      showToast(err.message || 'Error submitting request. Please sign in with BIT credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleModalStudentVerify = async (e) => {
    e.preventDefault();
    setModalError('');
    if (!modalRoll.trim() && !modalName.trim()) {
      setModalError('Please enter your student roll number or name.');
      return;
    }

    setModalLoading(true);
    try {
      const data = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          roll_number: modalRoll.trim().toUpperCase(),
          name: modalName.trim(),
          department: 'Engineering'
        })
      });

      login({
        name: data.name,
        roll: data.roll_number,
        dept: data.department,
        year: data.year,
        role: 'student',
        email: data.email,
        isVerified: true,
        id: data.user_id
      }, data.access_token);

      setShowLoginModal(false);
      setIsModalOpen(true);
    } catch (err) {
      setModalError(err.message || 'Student not found in BIT directory.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleModalGoogleVerify = async (e) => {
    e.preventDefault();
    setModalError('');
    const em = modalGoogleEmail.trim().toLowerCase();
    if (!em.endsWith('@bitsathy.ac.in')) {
      setModalError('Please enter your official @bitsathy.ac.in email address.');
      return;
    }

    setModalLoading(true);
    try {
      const data = await apiCall('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ email: em, name: '' })
      });

      login({
        name: data.name || em.split('@')[0],
        roll: data.roll_number,
        dept: data.department,
        designation: data.designation,
        role: data.role,
        email: em,
        year: data.year,
        isVerified: true,
        id: data.user_id
      }, data.access_token);

      setShowLoginModal(false);
      setIsModalOpen(true);
    } catch (err) {
      setModalError(err.message || 'Verification failed.');
    } finally {
      setModalLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'Resolved') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-900/50">
          Resolved
        </span>
      );
    }
    if (status === 'In Progress') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/80 dark:border-amber-900/50">
          In Progress
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/50">
        Open
      </span>
    );
  };

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] dark:bg-[#09090B] text-slate-900 dark:text-zinc-100 font-sans antialiased">
      
      {/* 1. Left Sidebar */}
      <Sidebar />

      {/* 2. Main Content */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        
        {/* Top Header */}
        <Header 
          title="Helpdesk & Grievance Portal"
          subtitle="Submit campus maintenance tickets, lab issues, hostel requests & academic feedback"
        />

        {/* Toast Alert */}
        {toastMessage && (
          <div className="fixed top-20 right-6 z-50 p-3.5 rounded-2xl bg-slate-900 text-white text-xs font-semibold shadow-xl flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Main Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 sm:space-y-8">
          
          {/* ========================================================================= */}
          {/* ACCESS CONTROL NOTICE */}
          {/* ========================================================================= */}
          {isVerifiedMember ? null : (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 border border-amber-300 dark:border-amber-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Lock size={18} />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                    <span>Grievance & Issue Submission Restricted</span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                      Student Verification Required
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-zinc-400 mt-0.5">
                    To maintain accountability, campus maintenance issues can only be filed by verified BIT students or faculty members.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowLoginModal(true)}
                className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 shrink-0"
              >
                <School size={14} />
                <span>Verify BIT Student Identity</span>
                <ArrowRight size={13} />
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* CATEGORIES GRID */}
          {/* ========================================================================= */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100">
                  Select Grievance Category
                </h2>
                <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                  Choose a department to submit your ticket
                </p>
              </div>
              {isVerifiedMember && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Plus size={13} />
                  <span>New Request</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {HELPDESK_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleOpenCategory(cat.id)}
                    className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 hover:border-blue-500/50 hover:shadow-md transition-all text-left group cursor-pointer flex flex-col justify-between space-y-3"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cat.color} group-hover:scale-105 transition-transform`}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {cat.name}
                      </h4>
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                        {isVerifiedMember ? 'Submit Ticket' : 'Verification Required'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* RECENT REQUESTS LIST */}
          {/* ========================================================================= */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                <Clock size={16} className="text-blue-600" />
                <span>My Active Helpdesk Requests</span>
              </h2>
            </div>

            {isVerifiedMember ? (
              recentRequests.length > 0 ? (
                <div className="space-y-2.5">
                  {recentRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-2xs hover:border-slate-300 dark:hover:border-zinc-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate">
                            {req.title}
                          </span>
                          {getStatusBadge(req.status)}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 dark:text-zinc-500">
                          <span className="flex items-center gap-1">
                            <MapPin size={12} className="text-rose-500" />
                            {req.location}
                          </span>
                          <span>•</span>
                          <span>{req.category}</span>
                          <span>•</span>
                          <span>{req.date}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-400 self-start sm:self-auto">
                        #{req.id}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-center text-xs text-slate-400 space-y-1">
                  <p className="font-bold text-slate-700 dark:text-zinc-300">No open requests</p>
                  <p>Click "New Request" above to file an issue for IT, Hostel, Transport, or Academics.</p>
                </div>
              )
            ) : (
              <div className="p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-center space-y-3">
                <Lock size={28} className="mx-auto text-amber-500" />
                <div className="max-w-md mx-auto space-y-1">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                    Sign in with BIT student credentials to view your tickets
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Only enrolled BIT students can file grievances and track ticket resolution statuses.
                  </p>
                </div>
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <School size={14} />
                  <span>Verify Student ID</span>
                </button>
              </div>
            )}

          </div>

        </main>

      </div>

      {/* ========================================================================= */}
      {/* SUBMIT ISSUE MODAL */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg clean-card p-6 sm:p-7 space-y-5 shadow-2xl animate-in zoom-in-95 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/80 dark:text-blue-400 flex items-center justify-center font-bold">
                  <Plus size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-50">
                    Submit Helpdesk Request
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">Category: {selectedCategory}</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="space-y-4">
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Issue Summary / Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Wi-Fi disconnection in IB Lab 3"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs sm:text-sm outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Exact Campus Location *
                </label>
                <input
                  type="text"
                  placeholder="e.g. IB Block Rib 2 Room 204 or Emerald Hostel Block B"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs sm:text-sm outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Detailed Description *
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe the issue in detail..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs sm:text-sm outline-hidden focus:border-blue-500 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Priority
                </label>
                <div className="flex items-center gap-2">
                  {['low', 'medium', 'high', 'urgent'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                        priority === p
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 text-[11px] text-slate-500 dark:text-zinc-400 flex items-center justify-between">
                <span>Filing as: <strong>{user?.name}</strong> ({user?.roll || user?.role})</span>
                <span className="text-blue-600 dark:text-blue-400 font-semibold">{user?.dept || 'BIT'}</span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-2 shadow-xs cursor-pointer flex items-center justify-center mt-2"
              >
                <span>{submitting ? 'Submitting Request...' : 'Submit to Campus Maintenance'}</span>
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* QUICK STUDENT VERIFICATION MODAL (FOR GUESTS) */}
      {/* ========================================================================= */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md clean-card p-6 sm:p-7 space-y-5 shadow-2xl animate-in zoom-in-95 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/80 dark:text-blue-400 flex items-center justify-center font-bold">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-50">
                    Verify BIT Student / Teacher ID
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">Unlock Helpdesk Issue Submission</p>
                </div>
              </div>
              <button
                onClick={() => setShowLoginModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-zinc-900 text-xs font-bold">
              <button
                onClick={() => { setModalTab('student'); setModalError(''); }}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                  modalTab === 'student'
                    ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-600 dark:text-zinc-400'
                }`}
              >
                Student Name / Roll
              </button>
              <button
                onClick={() => { setModalTab('google'); setModalError(''); }}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                  modalTab === 'google'
                    ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-600 dark:text-zinc-400'
                }`}
              >
                Google @bitsathy ID
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 font-medium">
                {modalError}
              </div>
            )}

            {modalTab === 'student' ? (
              <form onSubmit={handleModalStudentVerify} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Roll Number (e.g. 7376232AD110)
                  </label>
                  <input
                    type="text"
                    value={modalRoll}
                    onChange={(e) => setModalRoll(e.target.value)}
                    placeholder="7376232AD110"
                    autoFocus
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs sm:text-sm uppercase font-mono outline-hidden focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Student Full Name
                  </label>
                  <input
                    type="text"
                    value={modalName}
                    onChange={(e) => setModalName(e.target.value)}
                    placeholder="ARIKRISHNAN R"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs sm:text-sm outline-hidden focus:border-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={modalLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-2 shadow-xs cursor-pointer flex items-center justify-center mt-2"
                >
                  <span>{modalLoading ? 'Checking Student Directory...' : 'Verify Student Directory'}</span>
                  <ArrowRight size={14} />
                </button>
              </form>
            ) : (
              <form onSubmit={handleModalGoogleVerify} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    BIT Institutional Email (Student / Faculty)
                  </label>
                  <input
                    type="email"
                    value={modalGoogleEmail}
                    onChange={(e) => setModalGoogleEmail(e.target.value)}
                    placeholder="e.g. 7376232ad110@bitsathy.ac.in"
                    autoFocus
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs sm:text-sm outline-hidden focus:border-blue-500"
                  />
                  <span className="text-[10px] text-slate-400">
                    Must end with <strong>@bitsathy.ac.in</strong>
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={modalLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-2 shadow-xs cursor-pointer flex items-center justify-center mt-2"
                >
                  <span>{modalLoading ? 'Authenticating...' : 'Sign In with BIT Google ID'}</span>
                  <ArrowRight size={14} />
                </button>
              </form>
            )}

          </div>
        </div>
      )}

      {/* Voice Assistant Modal Overlay */}
      <VoiceAssistantModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
      />

      {/* Mobile Bottom Navigation */}
      <MobileNav onOpenVoiceAssistant={() => setIsVoiceModalOpen(true)} />

    </div>
  );
};

export default ReportIssuePage;
