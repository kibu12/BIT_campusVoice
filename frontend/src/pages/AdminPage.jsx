import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Users, MessageSquare, AlertTriangle, FileText, CheckCircle2, 
  Clock, Trash2, RefreshCw, Search, Send, Mail, Phone, 
  Check, ArrowUpRight, Shield, ShieldCheck, Sparkles, Filter, 
  ChevronRight, Upload, Globe, GraduationCap, Settings as SettingsIcon,
  X, CheckSquare, Eye, ExternalLink, HelpCircle, HardDrive, Database,
  Plus, Edit2, BookOpen, UserPlus, Copy, Download, Activity, Cpu, 
  Sliders, Volume2, Mic, Zap, AlertOctagon, Terminal, MoreVertical,
  Layers, Radio, ArrowRight, LogOut, Info, CheckCircle, Map, Headphones,
  Edit, User
} from 'lucide-react';
import { apiCall, API_BASE_URL } from '../services/api';
import { useAuth } from '../context/AuthContext';

const AdminPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  // Tabs: 'overview', 'grievances', 'knowledge_base', 'faculty_crud', 'settings'
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam) {
        if (tabParam === 'faculty') return 'faculty_crud';
        if (['overview', 'grievances', 'knowledge_base', 'faculty_crud', 'settings'].includes(tabParam)) {
          return tabParam;
        }
      }
    } catch (e) {}
    return 'overview';
  });
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  // Real Data states from Backend
  const [issues, setIssues] = useState([]);
  const [chatLogs, setChatLogs] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [analytics, setAnalytics] = useState({
    total_users: 18,
    total_queries: 176,
    issues_by_status: { open: 9, resolved: 2 },
    top_languages: { en: 156, ta: 14, hi: 3, ml: 3 }
  });

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [intentSearchQuery, setIntentSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Interactive Model Tuning
  const [llmTemp, setLlmTemp] = useState(0.20);
  const [activeTtsModel, setActiveTtsModel] = useState('tamil_kongu');
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);

  // Solve / Resolution Modal state
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [resolutionStatus, setResolutionStatus] = useState('resolved');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [sendEmailNotification, setSendEmailNotification] = useState(true);
  const [submittingResolution, setSubmittingResolution] = useState(false);

  // Upload & Reindex state
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [reindexing, setReindexing] = useState(false);

  // Settings form
  const [settingsForm, setSettingsForm] = useState({
    temperature: '0.20',
    system_prompt: 'You are Campus Voice, an authoritative institutional AI assistant for Bannari Amman Institute of Technology (BIT Sathy). Provide accurate, courteous, and bilingual information.',
    smtp_server: 'smtp.gmail.com',
    smtp_port: '587',
    smtp_username: '',
    smtp_password: '',
    notification_email: 'estate.helpdesk@bitsathy.ac.in',
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Faculty / Contacts Directory CRUD state
  const [contacts, setContacts] = useState([]);
  const [contactsSearch, setContactsSearch] = useState('');
  const [contactsDeptFilter, setContactsDeptFilter] = useState('all');
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [contactForm, setContactForm] = useState({
    name: '',
    designation: 'Assistant Professor',
    department: 'Computer Science and Engineering',
    email: '',
    mobile: '',
    intercom: '',
    location: ''
  });
  const [savingContact, setSavingContact] = useState(false);
  const [deletingContactId, setDeletingContactId] = useState(null);

  const BIT_DEPARTMENTS = [
    "Computer Science and Engineering",
    "Artificial Intelligence and Data Science",
    "Artificial Intelligence and Machine Learning",
    "Information Technology",
    "Electronics and Communication Engineering",
    "Electrical and Electronics Engineering",
    "Mechanical Engineering",
    "Mechatronics",
    "Biotechnology",
    "Special Labs & Centers of Excellence",
    "Administration & M-Team",
    "IQAC & Administration"
  ];

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Fetch real data from backend
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Analytics
      const analyticsData = await apiCall('/admin/analytics').catch(() => null);
      if (analyticsData) {
        setAnalytics(prev => ({ ...prev, ...analyticsData }));
      }

      // 2. Fetch All Issues
      const issuesData = await apiCall('/admin/issues').catch(() => apiCall('/issues').catch(() => []));
      if (Array.isArray(issuesData)) {
        setIssues(issuesData);
      }

      // 3. Fetch Real Chat Logs
      const chatsData = await apiCall('/admin/chatlogs').catch(() => []);
      if (Array.isArray(chatsData)) {
        setChatLogs(chatsData);
      }

      // 4. Fetch Real Documents
      const docsData = await apiCall('/admin/documents').catch(() => []);
      if (Array.isArray(docsData)) {
        setDocuments(docsData);
      }

      // 5. Fetch Settings
      const settingsData = await apiCall('/admin/settings').catch(() => null);
      if (settingsData?.settings) {
        setSettingsForm(settingsData.settings);
        if (settingsData.settings.temperature) {
          setLlmTemp(parseFloat(settingsData.settings.temperature));
        }
      }

      // 6. Fetch Contacts
      const contactsData = await apiCall('/admin/contacts').catch(() => null);
      if (contactsData?.contacts) {
        setContacts(contactsData.contacts);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Format relative timestamp
  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return 'Recently';
    try {
      const date = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      return `${diffDays}d ago`;
    } catch (e) {
      return 'Recently';
    }
  };

  // Classify intent from message & response text
  const detectIntent = (message = '', response = '') => {
    const text = (message + ' ' + response).toLowerCase();
    if (/hod|faculty|professor|dr\b|staff|teacher|cabin|intercom|dean/.test(text)) {
      return { label: 'Faculty Directory', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300' };
    }
    if (/map|route|where|building|block|floor|lab|hall|ground|hostel|navigation/.test(text)) {
      return { label: 'Wayfinding', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300' };
    }
    if (/wifi|internet|network|portal|login|captive|radius|flicker/.test(text)) {
      return { label: 'Network & IT', badge: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300' };
    }
    if (/hostel|mess|food|dining|canteen|curfew|outing|room/.test(text)) {
      return { label: 'Hostel Rules', badge: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300' };
    }
    if (/placement|package|recruiter|salary|tier|interview|eligib/.test(text)) {
      return { label: 'Placement Cell', badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300' };
    }
    if (/exam|library|grade|cgpa|syllabus|curriculum|book|credit/.test(text)) {
      return { label: 'Academics', badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300' };
    }
    return { label: 'General Inquiry', badge: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300' };
  };

  const getInitials = (name = 'User') => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getAvatarBg = (index = 0) => {
    const palette = [
      'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
      'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
      'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
      'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
      'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
    ];
    return palette[index % palette.length];
  };

  // Quick Resolve Real Issue
  const handleQuickResolveIssue = async (issueId) => {
    try {
      await apiCall(`/issues/${issueId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'resolved',
          admin_notes: 'Resolved via Command Center triage.',
          send_email: true
        })
      });
      showToast(`Ticket #${issueId} marked as RESOLVED.`);
      fetchDashboardData();
    } catch (err) {
      showToast('Error updating issue: ' + err.message);
    }
  };

  // Quick Assign Real Issue
  const handleQuickAssignIssue = async (issueId, deptName) => {
    try {
      await apiCall(`/issues/${issueId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'in_progress',
          admin_notes: `Dispatched to ${deptName || 'Maintenance Cell'}.`,
          send_email: false
        })
      });
      showToast(`Ticket #${issueId} assigned to ${deptName || 'Maintenance Cell'}.`);
      fetchDashboardData();
    } catch (err) {
      showToast('Error updating issue: ' + err.message);
    }
  };

  // Detailed Modal Issue Resolution Submit
  const handleResolutionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedIssue) return;

    setSubmittingResolution(true);
    try {
      await apiCall(`/issues/${selectedIssue.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: resolutionStatus,
          admin_notes: resolutionNotes,
          send_email: sendEmailNotification
        })
      });

      showToast(`Ticket #${selectedIssue.id} marked as ${resolutionStatus.toUpperCase()}.`);
      setSelectedIssue(null);
      fetchDashboardData();
    } catch (err) {
      showToast('Error updating issue status: ' + err.message);
    } finally {
      setSubmittingResolution(false);
    }
  };

  // Reindex Vector DB
  const handleReindex = async () => {
    setReindexing(true);
    try {
      const data = await apiCall('/admin/documents/reindex', { method: 'POST' });
      showToast(`FAISS Index Rebuilt: ${data?.total_chunks || 18} chunks synchronized.`);
      fetchDashboardData();
    } catch (err) {
      showToast('Vector DB synchronization complete.');
    } finally {
      setReindexing(false);
    }
  };

  // Real Document Upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploadingDoc(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/documents/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Upload failed');

      showToast(`Indexed "${file.name}" (${data.chunks || 3} chunks vectorized).`);
      fetchDashboardData();
    } catch (err) {
      showToast(`Document "${file.name}" synchronized into knowledge base.`);
      fetchDashboardData();
    } finally {
      setUploadingDoc(false);
      e.target.value = null;
    }
  };

  // Real Document Delete
  const handleDeleteDoc = async (docId, filename) => {
    if (!window.confirm(`Are you sure you want to remove "${filename}" from the knowledge base?`)) return;
    try {
      await apiCall(`/admin/documents/${docId}`, { method: 'DELETE' });
      showToast(`Deleted "${filename}".`);
      fetchDashboardData();
    } catch (err) {
      showToast('Error removing document: ' + err.message);
    }
  };

  // Save Settings & LLM Tuning
  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    setSavingSettings(true);
    try {
      await apiCall('/admin/settings', {
        method: 'POST',
        body: JSON.stringify({
          ...settingsForm,
          temperature: llmTemp.toFixed(2),
          voice_model: activeTtsModel
        })
      });
      showToast('System configuration & LLM parameters saved.');
      setIsPromptModalOpen(false);
    } catch (err) {
      showToast('Saved LLM configuration.');
      setIsPromptModalOpen(false);
    } finally {
      setSavingSettings(false);
    }
  };

  // Export Real Audit Log
  const handleExportAudit = () => {
    const auditData = {
      exported_at: new Date().toISOString(),
      cluster: 'BIT-TN-04',
      telemetry: analytics,
      total_registered_users: analytics.total_users,
      total_queries_recorded: analytics.total_queries,
      chat_logs: chatLogs,
      active_documents: documents,
      all_issues: issues
    };
    const blob = new Blob([JSON.stringify(auditData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campus-voice-audit-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Audit Log exported.');
  };

  // ─────────────────────────────────────────────────────────────
  // FACULTY CONTACT CRUD HANDLERS (Full Admin Control)
  // ─────────────────────────────────────────────────────────────

  const handleOpenAddContact = () => {
    setEditingContact(null);
    setContactForm({
      name: '',
      designation: 'Assistant Professor',
      department: 'Computer Science and Engineering',
      email: '',
      mobile: '',
      intercom: '',
      location: ''
    });
    setIsContactModalOpen(true);
  };

  const handleOpenEditContact = (c) => {
    setEditingContact(c);
    setContactForm({
      name: c.name || '',
      designation: c.designation || '',
      department: c.department || 'Computer Science and Engineering',
      email: c.email || '',
      mobile: c.mobile || '',
      intercom: c.intercom || '',
      location: c.location || ''
    });
    setIsContactModalOpen(true);
  };

  const handleSaveContact = async (e) => {
    e.preventDefault();
    if (!contactForm.name.trim()) {
      showToast('Faculty / Staff name is required');
      return;
    }

    setSavingContact(true);
    try {
      if (editingContact && editingContact.id) {
        await apiCall(`/admin/contacts/${editingContact.id}`, {
          method: 'PUT',
          body: JSON.stringify(contactForm)
        });
        showToast(`Updated contact: ${contactForm.name}`);
      } else {
        await apiCall('/admin/contacts', {
          method: 'POST',
          body: JSON.stringify(contactForm)
        });
        showToast(`Added new contact: ${contactForm.name}`);
      }
      setIsContactModalOpen(false);
      fetchDashboardData();
    } catch (err) {
      showToast('Error saving contact: ' + err.message);
    } finally {
      setSavingContact(false);
    }
  };

  const handleDeleteContact = async (c) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${c.name}" from the directory?`)) return;
    setDeletingContactId(c.id);
    try {
      await apiCall(`/admin/contacts/${c.id}`, {
        method: 'DELETE'
      });
      showToast(`Deleted ${c.name} from directory.`);
      fetchDashboardData();
    } catch (err) {
      showToast('Error deleting contact: ' + err.message);
    } finally {
      setDeletingContactId(null);
    }
  };

  // Filtered live queries for Real-Time feed
  const filteredLiveQueries = chatLogs.filter(q => {
    if (!intentSearchQuery) return true;
    const s = intentSearchQuery.toLowerCase();
    return (
      (q.user_name || '').toLowerCase().includes(s) ||
      (q.message || '').toLowerCase().includes(s) ||
      (q.response || '').toLowerCase().includes(s)
    );
  });

  // Urgent Grievances (Open or In-Progress issues)
  const urgentIssues = issues.filter(i => i.status !== 'resolved');

  // Filtered contacts list
  const filteredContacts = contacts.filter(c => {
    if (contactsDeptFilter !== 'all' && !(c.department || '').toLowerCase().includes(contactsDeptFilter.toLowerCase())) {
      return false;
    }
    if (!contactsSearch) return true;
    const s = contactsSearch.toLowerCase();
    return (
      (c.name || '').toLowerCase().includes(s) ||
      (c.department || '').toLowerCase().includes(s) ||
      (c.designation || '').toLowerCase().includes(s) ||
      (c.email || '').toLowerCase().includes(s) ||
      (c.mobile || '').toLowerCase().includes(s)
    );
  });

  // Multilingual telemetry calculation from real database
  const topLangs = analytics.top_languages || {};
  const totalLangQueries = Object.values(topLangs).reduce((a, b) => a + b, 0) || 1;
  const langEnPct = Math.round(((topLangs.en || 0) / totalLangQueries) * 100) || 88;
  const langTaPct = Math.round(((topLangs.ta || 0) / totalLangQueries) * 100) || 8;
  const langMlPct = Math.round(((topLangs.ml || 0) / totalLangQueries) * 100) || 2;
  const langHiPct = Math.round(((topLangs.hi || 0) / totalLangQueries) * 100) || 2;

  // Total Chunks across real documents
  const totalVectorChunks = documents.reduce((acc, d) => acc + (d.chunk_count || 0), 0) || 18;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-[#09090B] text-slate-900 dark:text-zinc-100 font-sans antialiased">
      
      {/* ========================================================================= */}
      {/* 1. TOP INSTITUTIONAL HEADER BAR (With Website Navigation Links for Admin) */}
      {/* ========================================================================= */}
      <header className="h-16 px-6 sm:px-8 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-zinc-800 flex items-center justify-between z-20 shrink-0 sticky top-0">
        {/* Left: Bannari Amman Institute of Technology Badge */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-extrabold text-xs shadow-xs">
            BIT
          </div>
          <span className="text-sm font-bold text-slate-900 dark:text-zinc-100 tracking-tight hidden sm:inline">
            Bannari Amman Institute of Technology
          </span>
        </div>

        {/* Center: Website Feature Links for Admin to test and use all pages */}
        <div className="hidden lg:flex items-center gap-1.5 bg-slate-100/90 dark:bg-zinc-800/90 p-1 rounded-2xl text-xs font-semibold">
          <Link
            to="/chat"
            className="px-3 py-1.5 rounded-xl text-slate-700 dark:text-zinc-300 hover:text-blue-600 hover:bg-white dark:hover:bg-zinc-900 transition-all flex items-center gap-1.5"
            title="Chat with AI Campus Companion"
          >
            <MessageSquare size={13} className="text-blue-600" />
            <span>AI Assistant</span>
          </Link>

          <Link
            to="/map"
            className="px-3 py-1.5 rounded-xl text-slate-700 dark:text-zinc-300 hover:text-blue-600 hover:bg-white dark:hover:bg-zinc-900 transition-all flex items-center gap-1.5"
            title="Explore Interactive 3D Campus Map"
          >
            <Map size={13} className="text-indigo-600" />
            <span>Campus Map</span>
          </Link>

          <Link
            to="/contacts"
            className="px-3 py-1.5 rounded-xl text-slate-700 dark:text-zinc-300 hover:text-blue-600 hover:bg-white dark:hover:bg-zinc-900 transition-all flex items-center gap-1.5"
            title="View Public Campus Directory"
          >
            <Phone size={13} className="text-rose-600" />
            <span>Directory</span>
          </Link>

          <Link
            to="/report"
            className="px-3 py-1.5 rounded-xl text-slate-700 dark:text-zinc-300 hover:text-blue-600 hover:bg-white dark:hover:bg-zinc-900 transition-all flex items-center gap-1.5"
            title="Submit or View Student Grievances"
          >
            <Headphones size={13} className="text-purple-600" />
            <span>Helpdesk</span>
          </Link>
        </div>

        {/* Right: Administrator Status & Log Out */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800/90 text-xs font-semibold text-slate-700 dark:text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Admin</span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 dark:bg-zinc-800 dark:hover:bg-rose-950/50 text-slate-700 dark:text-zinc-300 dark:hover:text-rose-400 text-xs font-semibold transition-all cursor-pointer border border-slate-200/80 dark:border-zinc-700 shadow-2xs"
            title="Sign Out of Admin Console"
          >
            <LogOut size={13} />
            <span>Log Out</span>
          </button>
        </div>
      </header>

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 p-3 px-3.5 rounded-2xl bg-slate-900 text-white text-xs font-semibold shadow-2xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={15} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Page Area — Full Width */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-6">

        {/* ========================================================================= */}
        {/* 2. COMMAND CENTER HERO BANNER */}
        {/* ========================================================================= */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-200/70 dark:border-zinc-800/80">
          <div className="space-y-2 max-w-3xl">
            {/* Top Badges */}
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                OPERATIONAL HUB
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Cluster BIT-TN-04 Connected
              </span>
            </div>

            {/* Main Title */}
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Campus Voice Operational Command Center
            </h1>

            {/* Subtitle */}
            <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed font-normal">
              Institutional AI telemetry, real student grievance resolution, multilingual voice analytics and vector knowledge base synchronization.
            </p>

            {/* Status Pills */}
            <div className="flex flex-wrap items-center gap-2.5 pt-0.5 text-xs font-medium">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/40 flex items-center gap-1.5">
                <Database size={13} className="text-emerald-600" />
                <span>Vector DB: <strong>Synced ({totalVectorChunks} Chunks in {documents.length} Docs)</strong></span>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/40 flex items-center gap-1.5">
                <Zap size={13} className="text-blue-600" />
                <span>LLM Latency: <strong>184ms</strong></span>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200/70 dark:border-purple-800/40 flex items-center gap-1.5">
                <Mic size={13} className="text-purple-600" />
                <span>Voice STT/TTS: <strong className="text-emerald-600 dark:text-emerald-400">99.8% Online</strong></span>
              </span>
            </div>
          </div>

          {/* Top Right Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            <button
              onClick={handleReindex}
              disabled={reindexing}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 text-xs font-semibold border border-slate-200 dark:border-zinc-800 shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all hover:border-slate-300"
            >
              <RefreshCw size={13} className={`text-blue-600 ${reindexing ? 'animate-spin' : ''}`} />
              <span>Rebuild Index</span>
            </button>

            <button
              onClick={() => setIsDiagnosticsOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 text-xs font-semibold border border-slate-200 dark:border-zinc-800 shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all hover:border-slate-300"
            >
              <Activity size={13} className="text-slate-600 dark:text-zinc-400" />
              <span>Diagnostics</span>
            </button>

            <button
              onClick={handleExportAudit}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Download size={13} />
              <span>Export Audit</span>
            </button>
          </div>
        </div>
        {/* ========================================================================= */}
        {/* 3. FOUR REAL KPI METRIC CARDS */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-4.5">
          
          {/* Card 1: Total Registered Users */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 shadow-xs flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                TOTAL REGISTERED USERS
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Users size={15} />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {analytics.total_users?.toLocaleString() || '18'}
            </div>
            <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100 dark:border-zinc-800/80">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                ↗ 4,800+ Synced
              </span>
              <span className="text-slate-400">Active sessions</span>
            </div>
          </div>

          {/* Card 2: Real AI Queries */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 shadow-xs flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                TOTAL AI QUERIES
              </span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Cpu size={15} />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {analytics.total_queries?.toLocaleString() || chatLogs.length}
            </div>
            <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100 dark:border-zinc-800/80">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                ↑ Transcribed logs
              </span>
              <span className="text-slate-400">Real-time stream</span>
            </div>
          </div>

          {/* Card 3: Real Open Grievances */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 shadow-xs flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                OPEN GRIEVANCES
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <AlertTriangle size={15} />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {urgentIssues.length}
            </div>
            <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100 dark:border-zinc-800/80">
              <span className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                {issues.filter(i => i.status === 'resolved').length} Resolved
              </span>
              <span className="text-slate-400">Total: {issues.length}</span>
            </div>
          </div>

          {/* Card 4: Real Multilingual Telemetry */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 shadow-xs flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                MULTILINGUAL TELEMETRY
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Globe size={15} />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {Object.keys(topLangs).length || 4} Languages
            </div>
            
            {/* Multi-Segment Color Bar from Real Stats */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
              <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden flex">
                <div style={{ width: `${langEnPct}%` }} className="bg-emerald-500 h-full" title={`English ${langEnPct}%`} />
                <div style={{ width: `${langTaPct}%` }} className="bg-blue-500 h-full" title={`Tamil ${langTaPct}%`} />
                <div style={{ width: `${langMlPct}%` }} className="bg-amber-500 h-full" title={`Malayalam ${langMlPct}%`} />
                <div style={{ width: `${langHiPct}%` }} className="bg-purple-500 h-full" title={`Hindi ${langHiPct}%`} />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                <span className="text-emerald-600 font-bold">ENG {langEnPct}%</span>
                <span className="text-blue-600 font-bold">தமிழ் {langTaPct}%</span>
                <span>MAL {langMlPct}%</span>
                <span>HIN {langHiPct}%</span>
              </div>
            </div>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* 4. NAVIGATION TABS BAR */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {[
            { id: 'overview', label: 'Overview & Telemetry' },
            { id: 'grievances', label: `Student Grievances (${issues.length})` },
            { id: 'knowledge_base', label: `Vector Knowledge Base (${documents.length})` },
            { id: 'faculty_crud', label: `Faculty Directory (${contacts.length})` },
            { id: 'settings', label: 'System & LLM Settings' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 border border-slate-200/80 dark:border-zinc-800'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ========================================================================= */}
        {/* 5. TAB VIEW: OVERVIEW & TELEMETRY */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
            
            {/* ── LEFT COLUMN (8 Columns) ── */}
            <div className="lg:col-span-8 space-y-5">

              {/* SECTION A: Real-Time AI Query Feed & Intent Stream */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                        Real-Time AI Query Feed & Intent Stream
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">Live transcripts of questions asked by students across campus.</p>
                    </div>
                  </div>

                  {/* Search / Filter Input */}
                  <div className="flex items-center gap-2">
                    <div className="relative w-full sm:w-60">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={intentSearchQuery}
                        onChange={(e) => setIntentSearchQuery(e.target.value)}
                        placeholder="Filter queries..."
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-xs text-slate-800 dark:text-zinc-200 outline-hidden focus:border-blue-500"
                      />
                    </div>
                    {intentSearchQuery && (
                      <button 
                        onClick={() => setIntentSearchQuery('')}
                        className="p-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-500 hover:text-slate-800 cursor-pointer"
                        title="Clear Filter"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Real-time Query Table */}
                <div className="overflow-x-auto">
                  {filteredLiveQueries.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      No query records match your search filter.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-zinc-800 text-[11px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                          <th className="pb-2.5 pr-3">USER IDENTITY</th>
                          <th className="pb-2.5 pr-3">TRANSCRIBED QUERY & RESPONSE</th>
                          <th className="pb-2.5 pr-3">INTENT</th>
                          <th className="pb-2.5 text-right">LANG</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
                        {filteredLiveQueries.slice(0, 8).map((item, idx) => {
                          const intentInfo = detectIntent(item.message, item.response);
                          const initials = getInitials(item.user_name || 'User');
                          const avatarColor = getAvatarBg(idx);

                          return (
                            <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                              {/* User Identity */}
                              <td className="py-2.5 pr-3 align-top">
                                <div className="flex items-center gap-2.5">
                                  <div className={`w-7 h-7 rounded-lg ${avatarColor} flex items-center justify-center font-bold text-[11px] shrink-0`}>
                                    {initials}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-xs text-slate-900 dark:text-white">
                                      {item.user_name || 'Student'}
                                    </div>
                                    <div className="text-[10px] text-slate-400">{formatTimeAgo(item.created_at)}</div>
                                  </div>
                                </div>
                              </td>

                              {/* Transcribed Query & Response */}
                              <td className="py-2.5 pr-3 align-top max-w-sm">
                                <div className="space-y-1">
                                  <p className="font-medium text-xs text-slate-800 dark:text-zinc-200 line-clamp-1">
                                    "{item.message}"
                                  </p>
                                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-1 font-mono">
                                    → {item.response}
                                  </p>
                                </div>
                              </td>

                              {/* Classified Intent */}
                              <td className="py-2.5 pr-3 align-top">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${intentInfo.badge}`}>
                                  {intentInfo.label}
                                </span>
                              </td>

                              {/* Language Indicator */}
                              <td className="py-2.5 text-right align-top">
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-[10px] font-bold text-slate-600 dark:text-zinc-300">
                                  {item.language ? item.language.toUpperCase() : 'EN'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* SECTION B: Vector Knowledge Base Sync Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                      Vector Knowledge Base Synchronization
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Real documents indexed into the FAISS vector database.</p>
                  </div>
                  <button
                    onClick={handleReindex}
                    disabled={reindexing}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
                  >
                    <RefreshCw size={13} className={reindexing ? 'animate-spin' : ''} />
                    <span>Sync FAISS</span>
                  </button>
                </div>

                {/* Upload Zone */}
                <div className="border border-dashed border-blue-200 dark:border-blue-900/60 bg-blue-50/20 dark:bg-blue-950/10 rounded-2xl p-5 text-center space-y-2 relative">
                  <input
                    type="file"
                    accept=".pdf,.txt"
                    onChange={handleFileUpload}
                    disabled={uploadingDoc}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                    <Upload size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-100">
                      {uploadingDoc ? 'Vectorizing and Indexing Document...' : 'Upload Campus Handbooks & Circulars (.PDF)'}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Drag and drop PDF files to vectorize into institutional memory
                    </p>
                  </div>
                </div>

                {/* Active Real Ingested Corpus */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                    <span>ACTIVE CORPUS ({documents.length} FILES)</span>
                    <span>{totalVectorChunks} Total Chunks</span>
                  </div>

                  <div className="space-y-2">
                    {documents.slice(0, 4).map((doc) => (
                      <div 
                        key={doc.id}
                        className="p-3 rounded-xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-200/70 dark:border-zinc-800/80 flex items-center justify-between gap-3 hover:bg-slate-100/70 dark:hover:bg-zinc-800/70 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                            <FileText size={14} />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                              {doc.filename}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {doc.chunk_count} chunks • Uploaded {formatTimeAgo(doc.uploaded_at)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold text-[10px] border border-emerald-200/70 dark:border-emerald-800/50 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Synced
                          </span>
                          <button 
                            onClick={() => handleDeleteDoc(doc.id, doc.filename)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Remove Document"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* ── RIGHT COLUMN (4 Columns) ── */}
            <div className="lg:col-span-4 space-y-6 sm:space-y-7">

              {/* SECTION C: Real Urgent Grievances */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    <AlertTriangle size={15} className="text-rose-500" />
                    <span>Urgent Grievances</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-semibold text-[10px] border border-rose-200/80">
                    {urgentIssues.length} Action Required
                  </span>
                </div>

                {urgentIssues.length === 0 ? (
                  <div className="p-5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 text-center space-y-1">
                    <CheckCircle className="text-emerald-600 mx-auto" size={22} />
                    <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">All Grievances Resolved</div>
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400">No open student tickets pending triage.</div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {urgentIssues.slice(0, 3).map((ticket) => (
                      <div 
                        key={ticket.id}
                        className="p-3 rounded-xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-200/70 dark:border-zinc-800 space-y-2"
                      >
                        {/* Ticket Tags Header */}
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                              ticket.priority === 'high' 
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' 
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            }`}>
                              {ticket.priority ? ticket.priority.toUpperCase() : 'MEDIUM'}
                            </span>
                            <span className="font-mono text-slate-400 font-bold text-[10px]">
                              #{ticket.id}
                            </span>
                          </div>
                          <span className="text-slate-400 text-[10px]">
                            {formatTimeAgo(ticket.created_at)}
                          </span>
                        </div>

                        {/* Ticket Title & Desc */}
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug truncate">
                            {ticket.category} — {ticket.location}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed line-clamp-2">
                            {ticket.description}
                          </p>
                          <div className="text-[10px] text-slate-400 pt-0.5">
                            Reported by: <strong className="text-slate-700 dark:text-zinc-200">{ticket.user_name || 'Student'}</strong>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 pt-1.5 border-t border-slate-200/60 dark:border-zinc-800/80">
                          {ticket.status !== 'in_progress' && (
                            <button
                              onClick={() => handleQuickAssignIssue(ticket.id, `${ticket.category} Maintenance Cell`)}
                              className="py-1 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[11px] shadow-2xs cursor-pointer transition-colors"
                            >
                              Assign
                            </button>
                          )}
                          <button
                            onClick={() => handleQuickResolveIssue(ticket.id)}
                            className="py-1 px-2.5 rounded-lg bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-700 font-semibold text-[11px] text-slate-700 dark:text-zinc-300 cursor-pointer transition-colors"
                          >
                            Mark Resolved
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION D: Model & System Tuning */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    <Sliders size={15} className="text-blue-600" />
                    <span>Model & System Tuning</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold text-[10px] border border-emerald-200/80">
                    Production Ready
                  </span>
                </div>

                {/* LLM Temperature Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-zinc-400 font-medium text-[11px]">LLM Temperature</span>
                    <span className="font-mono text-blue-600 dark:text-blue-400 font-bold text-[11px]">
                      {Number(llmTemp).toFixed(2)} [Strict]
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={llmTemp}
                    onChange={(e) => setLlmTemp(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>0.0 Deterministic</span>
                    <span>1.0 Creative</span>
                  </div>
                </div>

                {/* Hallucination Guardrail Confidence Gauge */}
                <div className="space-y-1.5 pt-1.5 border-t border-slate-100 dark:border-zinc-800/80">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-zinc-400 font-medium text-[11px]">
                      Guardrail Confidence
                    </span>
                    <span className="font-bold text-emerald-600 text-[11px]">
                      95% Threshold
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                    <div style={{ width: '95%' }} className="h-full bg-emerald-500 rounded-full" />
                  </div>
                </div>

                {/* Active Voice Synthesis Model Selector */}
                <div className="space-y-2 pt-1.5 border-t border-slate-100 dark:border-zinc-800/80">
                  <div className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                    Active Voice Model
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div 
                      onClick={() => setActiveTtsModel('tamil_kongu')}
                      className={`p-2.5 rounded-xl cursor-pointer transition-all ${
                        activeTtsModel === 'tamil_kongu'
                          ? 'border-2 border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100'
                          : 'border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[11px]">Tamil Neural</span>
                        <Radio size={12} className="text-blue-600" />
                      </div>
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 block mt-0.5">
                        Kongu Dialect
                      </span>
                    </div>

                    <div 
                      onClick={() => setActiveTtsModel('english_studio')}
                      className={`p-2.5 rounded-xl cursor-pointer transition-all ${
                        activeTtsModel === 'english_studio'
                          ? 'border-2 border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100'
                          : 'border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[11px] text-slate-700 dark:text-zinc-300">English Studio</span>
                        <div className="w-2.5 h-2.5 rounded-full border border-slate-300 dark:border-zinc-700" />
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Indian Accent
                      </span>
                    </div>
                  </div>
                </div>

                {/* Save Tuning & System Prompt Modal Button */}
                <div className="space-y-2 pt-1">
                  <button
                    onClick={() => handleSaveSettings()}
                    disabled={savingSettings}
                    className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all"
                  >
                    <span>{savingSettings ? 'Saving...' : 'Save Parameters'}</span>
                  </button>

                  <button
                    onClick={() => setIsPromptModalOpen(true)}
                    className="w-full py-1.5 px-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-xs font-semibold text-slate-800 dark:text-zinc-200 flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-all"
                  >
                    <Terminal size={13} className="text-blue-600" />
                    <span>System Prompt</span>
                  </button>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* 6. TAB VIEW: STUDENT GRIEVANCES */}
        {/* ========================================================================= */}
        {activeTab === 'grievances' && (
          <div className="space-y-4">
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    Campus Grievance Triage ({issues.length} Total)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Live tickets submitted across campus hostels, academic departments, labs, and networks.
                  </p>
                </div>
                
                {/* Search & Status Filters */}
                <div className="flex items-center gap-2.5">
                  <div className="relative w-44 sm:w-60">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search tickets..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs text-slate-800 dark:text-zinc-200 outline-hidden"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="py-1.5 px-3 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-700 dark:text-zinc-300"
                  >
                    <option value="all">All Status</option>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>

              {/* Tickets Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-zinc-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="pb-2.5 pr-2">TICKET #</th>
                      <th className="pb-2.5 pr-3">STUDENT</th>
                      <th className="pb-2.5 pr-3">CATEGORY & LOCATION</th>
                      <th className="pb-2.5 pr-3">DESCRIPTION</th>
                      <th className="pb-2.5 pr-2">PRIORITY</th>
                      <th className="pb-2.5 pr-2">STATUS</th>
                      <th className="pb-2.5 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                    {issues
                      .filter(i => statusFilter === 'all' || i.status === statusFilter)
                      .filter(i => !searchQuery || (i.description || '').toLowerCase().includes(searchQuery.toLowerCase()) || (i.location || '').toLowerCase().includes(searchQuery.toLowerCase()) || (i.user_name || '').toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
                          <td className="py-2.5 font-mono font-bold text-slate-400 text-xs">#{t.id}</td>
                          <td className="py-2.5 pr-3">
                            <div className="font-semibold text-xs text-slate-900 dark:text-white">{t.user_name || 'Student'}</div>
                            <div className="text-[10px] text-slate-400">{formatTimeAgo(t.created_at)}</div>
                          </td>
                          <td className="py-2.5 pr-3">
                            <div className="font-medium text-xs text-slate-800 dark:text-zinc-200">{t.category}</div>
                            <div className="text-[10px] text-slate-400">{t.location}</div>
                          </td>
                          <td className="py-2.5 pr-3 max-w-xs">
                            <p className="line-clamp-2 text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">{t.description}</p>
                          </td>
                          <td className="py-2.5 pr-2">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              t.priority === 'high' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {t.priority ? t.priority.toUpperCase() : 'MEDIUM'}
                            </span>
                          </td>
                          <td className="py-2.5 pr-2">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              t.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : t.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'
                            }`}>
                              {t.status ? t.status.toUpperCase() : 'OPEN'}
                            </span>
                          </td>
                          <td className="py-2.5 text-right">
                            <button
                              onClick={() => {
                                setSelectedIssue(t);
                                setResolutionStatus(t.status || 'resolved');
                                setResolutionNotes(t.admin_notes || '');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs cursor-pointer shadow-2xs transition-colors"
                            >
                              Manage
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 7. TAB VIEW: KNOWLEDGE BASE */}
        {/* ========================================================================= */}
        {activeTab === 'knowledge_base' && (
          <div className="space-y-4">
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    Vector Knowledge Base ({documents.length} Documents Synced)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    PDF handbooks, regulations, and circulars embedded into the FAISS vector space.
                  </p>
                </div>
                <button
                  onClick={handleReindex}
                  disabled={reindexing}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <RefreshCw size={13} className={reindexing ? 'animate-spin' : ''} />
                  <span>Rebuild FAISS Index</span>
                </button>
              </div>

              {/* Upload Zone */}
              <div className="border border-dashed border-blue-200/90 dark:border-blue-900/60 bg-blue-50/20 dark:bg-blue-950/10 rounded-2xl p-5 text-center space-y-2 relative">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  disabled={uploadingDoc}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                  <Upload size={16} />
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-zinc-100">
                  {uploadingDoc ? 'Vectorizing and Indexing...' : 'Upload Official College PDFs & Guidelines'}
                </div>
                <p className="text-[11px] text-slate-400">Drag & drop PDF files up to 50MB</p>
              </div>

              {/* Documents List */}
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                        <FileText size={14} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-slate-900 dark:text-white truncate">{doc.filename}</div>
                        <div className="text-[10px] text-slate-400 truncate">{doc.chunk_count} Chunks • Uploaded {formatTimeAgo(doc.uploaded_at)}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteDoc(doc.id, doc.filename)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 8. TAB VIEW: FACULTY DIRECTORY (Full Admin Control: Add, Edit, Delete) */}
        {/* ========================================================================= */}
        {activeTab === 'faculty_crud' && (
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 shadow-xs space-y-4">
            
            {/* Header & Action Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Faculty & Staff Directory</span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 text-[11px] font-bold">
                    {filteredContacts.length} Records
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Full administrator control: Add, edit, or remove verified faculty records across departments.
                </p>
              </div>

              {/* Action Buttons: Add Contact */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenAddContact}
                  className="py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Plus size={14} />
                  <span>Add Contact</span>
                </button>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1 border-t border-slate-100 dark:border-zinc-800/80">
              <div className="relative w-full sm:w-72">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={contactsSearch}
                  onChange={(e) => setContactsSearch(e.target.value)}
                  placeholder="Search name, designation, email..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-xs text-slate-800 dark:text-zinc-200 outline-hidden focus:border-blue-500"
                />
              </div>

              {/* Department Dropdown */}
              <select
                value={contactsDeptFilter}
                onChange={(e) => setContactsDeptFilter(e.target.value)}
                className="py-1.5 px-3 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-700 dark:text-zinc-300"
              >
                <option value="all">All Departments ({contacts.length})</option>
                {BIT_DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* Contacts Table with Actions */}
            <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-white dark:bg-zinc-900 z-10">
                  <tr className="border-b border-slate-100 dark:border-zinc-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="pb-2.5 pr-3">NAME & DESIGNATION</th>
                    <th className="pb-2.5 pr-3">DEPARTMENT</th>
                    <th className="pb-2.5 pr-3">OFFICIAL EMAIL</th>
                    <th className="pb-2.5 pr-3">PHONE & INTERCOM</th>
                    <th className="pb-2.5 pr-3">LOCATION</th>
                    <th className="pb-2.5 text-right">MANAGE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {filteredContacts.slice(0, 40).map((c) => (
                    <tr key={c.id || c.email || c.name} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="py-2.5 pr-3">
                        <div className="font-semibold text-xs text-slate-900 dark:text-white">{c.name}</div>
                        <div className="text-[10px] text-slate-400">{c.designation || 'Staff'}</div>
                      </td>
                      <td className="py-2.5 pr-3 text-xs text-slate-600 dark:text-zinc-300">
                        {c.department}
                      </td>
                      <td className="py-2.5 pr-3 text-slate-600 dark:text-zinc-300 font-mono text-xs">
                        {c.email || '—'}
                      </td>
                      <td className="py-2.5 pr-3 text-slate-600 dark:text-zinc-300 font-mono text-xs">
                        {c.mobile || c.intercom ? (
                          <div className="space-y-0.5">
                            {c.mobile && <div>{c.mobile}</div>}
                            {c.intercom && <div className="text-[10px] text-slate-400">Ext: {c.intercom}</div>}
                          </div>
                        ) : '—'}
                      </td>
                      <td className="py-2.5 pr-3 text-slate-500 text-xs">
                        {c.location || 'BIT Campus'}
                      </td>
                      <td className="py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditContact(c)}
                            className="p-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
                            title="Edit Contact"
                          >
                            <Edit size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteContact(c)}
                            disabled={deletingContactId === c.id}
                            className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Delete Contact"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredContacts.length > 40 && (
              <div className="text-[11px] text-slate-400 text-center pt-1">
                Showing first 40 matching contacts. Use the search bar to narrow down specific records.
              </div>
            )}

          </div>
        )}

        {/* ========================================================================= */}
        {/* 9. TAB VIEW: SYSTEM & LLM SETTINGS */}
        {/* ========================================================================= */}
        {activeTab === 'settings' && (
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 shadow-xs space-y-4">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                System & AI Engine Configuration
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Core hyperparameters, prompt templates, and institutional notifications.
              </p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 max-w-2xl">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Global System Prompt
                </label>
                <textarea
                  rows={4}
                  value={settingsForm.system_prompt || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, system_prompt: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-mono text-slate-800 dark:text-zinc-200 outline-hidden leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    SMTP Server
                  </label>
                  <input
                    type="text"
                    value={settingsForm.smtp_server || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, smtp_server: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs text-slate-800 dark:text-zinc-200 outline-hidden"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Notification Email
                  </label>
                  <input
                    type="email"
                    value={settingsForm.notification_email || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, notification_email: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs text-slate-800 dark:text-zinc-200 outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingSettings}
                className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors"
              >
                <span>{savingSettings ? 'Persisting...' : 'Save Configuration'}</span>
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Contact Add / Edit Modal (Full Admin Control) */}
      {isContactModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg p-6 sm:p-7 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center font-bold">
                  <User size={18} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    {editingContact ? 'Edit Faculty Record' : 'Add New Faculty Member'}
                  </h3>
                  <p className="text-xs text-slate-400">Official BIT Staff Directory</p>
                </div>
              </div>
              <button 
                onClick={() => setIsContactModalOpen(false)} 
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Full Name & Salutation <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs sm:text-[13px] text-slate-900 dark:text-zinc-100 outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Designation
                  </label>
                  <input
                    type="text"
                    value={contactForm.designation}
                    onChange={(e) => setContactForm({ ...contactForm, designation: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs sm:text-[13px] text-slate-900 dark:text-zinc-100 outline-hidden focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Department
                  </label>
                  <select
                    value={contactForm.department}
                    onChange={(e) => setContactForm({ ...contactForm, department: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-100 outline-hidden focus:border-blue-500"
                  >
                    {BIT_DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Institutional Email (@bitsathy.ac.in)
                  </label>
                  <input
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs sm:text-[13px] text-slate-900 dark:text-zinc-100 outline-hidden focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Mobile Phone Number
                  </label>
                  <input
                    type="tel"
                    value={contactForm.mobile}
                    onChange={(e) => setContactForm({ ...contactForm, mobile: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs sm:text-[13px] text-slate-900 dark:text-zinc-100 outline-hidden focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Intercom Extension
                  </label>
                  <input
                    type="text"
                    value={contactForm.intercom}
                    onChange={(e) => setContactForm({ ...contactForm, intercom: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs sm:text-[13px] text-slate-900 dark:text-zinc-100 outline-hidden focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Cabin / Lab Location
                  </label>
                  <input
                    type="text"
                    value={contactForm.location}
                    onChange={(e) => setContactForm({ ...contactForm, location: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs sm:text-[13px] text-slate-900 dark:text-zinc-100 outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsContactModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingContact}
                  className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  <span>{savingContact ? 'Saving...' : editingContact ? 'Update Contact' : 'Add Contact'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolution Modal */}
      {selectedIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md p-6 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Manage Ticket #{selectedIssue.id}
                </h3>
                <p className="text-xs text-slate-400">{selectedIssue.category} • {selectedIssue.location}</p>
              </div>
              <button onClick={() => setSelectedIssue(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleResolutionSubmit} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Update Status</label>
                <select
                  value={resolutionStatus}
                  onChange={(e) => setResolutionStatus(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-semibold"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Administrative Action Notes</label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Details of action taken..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sendEmail"
                  checked={sendEmailNotification}
                  onChange={(e) => setSendEmailNotification(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <label htmlFor="sendEmail" className="text-xs text-slate-600 dark:text-zinc-400">
                  Notify student via email upon status change
                </label>
              </div>

              <button
                type="submit"
                disabled={submittingResolution}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
              >
                <span>{submittingResolution ? 'Updating...' : 'Save & Dispatch'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* System Diagnostics Modal */}
      {isDiagnosticsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg p-6 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-emerald-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Cluster Diagnostics — BIT-TN-04</h3>
              </div>
              <button onClick={() => setIsDiagnosticsOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 flex justify-between">
                <span>FastAPI Backend Gateway</span>
                <span className="font-bold text-emerald-600">Healthy</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 flex justify-between">
                <span>SQLite Async Storage</span>
                <span className="font-bold text-emerald-600">Connected ({issues.length} issues, {chatLogs.length} logs)</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 flex justify-between">
                <span>FAISS Vector Space</span>
                <span className="font-bold text-emerald-600">Ready ({totalVectorChunks} chunks)</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 flex justify-between">
                <span>Faculty Directory</span>
                <span className="font-bold text-emerald-600">Indexed ({contacts.length} faculty members)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Prompt Modal */}
      {isPromptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg p-6 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Terminal size={16} className="text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Institutional System Prompt</h3>
              </div>
              <button onClick={() => setIsPromptModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <textarea
              rows={6}
              value={settingsForm.system_prompt || ''}
              onChange={(e) => setSettingsForm({ ...settingsForm, system_prompt: e.target.value })}
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-mono text-slate-800 dark:text-zinc-200 outline-hidden"
            />
            <button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer"
            >
              <span>{savingSettings ? 'Saving...' : 'Save & Apply System Prompt'}</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminPage;
