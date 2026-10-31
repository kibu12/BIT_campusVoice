import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Phone, Mail, Search, Shield, HeartPulse,
  Copy, Check,
  UserCheck, 
  Users,
  Lock, ArrowRight, X, CheckCircle2, School,
  Plus, Edit, Trash2, ShieldCheck, User, Sparkles
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import MobileNav from '../components/MobileNav';
import VoiceAssistantModal from '../components/VoiceAssistantModal';
import { useAuth } from '../context/AuthContext';
import { apiCall } from '../services/api';

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
  "Civil Engineering",
  "Agricultural Engineering",
  "Food Technology",
  "Biomedical Engineering",
  "Information Science and Engineering",
  "Computer Science and Business Systems",
  "Computer Science and Design",
  "Special Labs & Centers of Excellence",
  "School of Management Studies",
  "Physical Education & Sports",
  "Administration & M-Team",
  "IQAC & Administration"
];

const EMERGENCY_SERVICES = [
  {
    id: 'sos',
    name: 'Emergency SOS Hotline',
    timing: '24x7 Campus Hotline',
    number: '112',
    icon: Phone,
    color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-400',
    glowClass: 'hover:border-rose-400/60 dark:hover:border-rose-500/60 hover:shadow-[0_0_20px_-3px_rgba(244,63,94,0.3)]',
    topGlow: 'group-hover:via-rose-500/80',
    btnClass: 'bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40'
  },
  {
    id: 'security',
    name: 'Security & Vigilance Desk',
    timing: '24x7 Main Gate 1',
    number: '04295-226100',
    icon: Shield,
    color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-400',
    glowClass: 'hover:border-blue-400/60 dark:hover:border-blue-500/60 hover:shadow-[0_0_20px_-3px_rgba(59,130,246,0.3)]',
    topGlow: 'group-hover:via-blue-500/80',
    btnClass: 'bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40'
  },
  {
    id: 'medical',
    name: '24x7 Medical Centre / ICU',
    timing: 'Dr. Soundararajan & Desk',
    number: '04295-226108',
    icon: HeartPulse,
    color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400',
    glowClass: 'hover:border-emerald-400/60 dark:hover:border-emerald-500/60 hover:shadow-[0_0_20px_-3px_rgba(16,185,129,0.3)]',
    topGlow: 'group-hover:via-emerald-500/80',
    btnClass: 'bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40'
  },
  {
    id: 'women',
    name: 'Women Safety Helpline',
    timing: '24x7 Confidential Support',
    number: '04294 227777',
    icon: UserCheck,
    color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/60 dark:text-purple-400',
    glowClass: 'hover:border-purple-400/60 dark:hover:border-purple-500/60 hover:shadow-[0_0_20px_-3px_rgba(168,85,247,0.3)]',
    topGlow: 'group-hover:via-purple-500/80',
    btnClass: 'bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-900/40'
  },
];

const ContactsPage = () => {
  const { user, isVerifiedMember, isGuest, login, isStudent, isFaculty, isAdmin } = useAuth();
  
  const [facultyList, setFacultyList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [copiedValue, setCopiedValue] = useState(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  // Admin Contact CRUD states
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
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

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
        showToast(`Updated faculty: ${contactForm.name}`);
      } else {
        await apiCall('/admin/contacts', {
          method: 'POST',
          body: JSON.stringify(contactForm)
        });
        showToast(`Added new faculty: ${contactForm.name}`);
      }
      setIsContactModalOpen(false);
      fetchFaculty();
    } catch (err) {
      showToast('Error saving contact: ' + err.message);
    } finally {
      setSavingContact(false);
    }
  };

  const handleDeleteContact = async (c) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${c.name}" from the directory?`)) return;
    try {
      await apiCall(`/admin/contacts/${c.id}`, {
        method: 'DELETE'
      });
      showToast(`Deleted ${c.name} from directory.`);
      fetchFaculty();
    } catch (err) {
      showToast('Error deleting contact: ' + err.message);
    }
  };

  // Login modal for guest wall
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [modalRoll, setModalRoll] = useState('');
  const [modalName, setModalName] = useState('');
  const [modalGoogleEmail, setModalGoogleEmail] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalTab, setModalTab] = useState('student');

  const fetchFaculty = async () => {
    if (!isVerifiedMember) {
      setLoading(false);
      setFacultyList([]);
      return;
    }
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (selectedDept && selectedDept !== 'all') queryParams.append('department', selectedDept);
      if (search) queryParams.append('search', search);

      const res = await apiCall(`/faculty/directory?${queryParams.toString()}`);
      if (res && Array.isArray(res.faculty)) {
        setFacultyList(res.faculty);
      }
    } catch (e) {
      if (e?.status === 401 || e?.message?.includes('401')) {
        // Session expired / kicked out
        setFacultyList([]);
      }
      console.warn("Error fetching faculty directory:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaculty();
  }, [selectedDept, isVerifiedMember]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFaculty();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);




  const handleCopy = (val, id) => {
    if (!val || val.includes('Locked')) return;
    navigator.clipboard.writeText(val.replace(/\s+/g, ''));
    setCopiedValue(id);
    setTimeout(() => setCopiedValue(null), 2000);
  };

  const handleModalStudentVerify = async (e) => {
    e.preventDefault();
    setModalError('');
    if (!modalRoll.trim() && !modalName.trim()) {
      setModalError('Please enter your student name or roll number.');
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
    } catch (err) {
      setModalError(err.message || 'Student not found in official directory.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleModalGoogleVerify = async (e) => {
    e.preventDefault();
    setModalError('');
    const em = modalGoogleEmail.trim().toLowerCase();
    if (!em.endsWith('@bitsathy.ac.in')) {
      setModalError('Please use your official @bitsathy.ac.in email address.');
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
    } catch (err) {
      setModalError(err.message || 'Verification failed. Please check your email.');
    } finally {
      setModalLoading(false);
    }
  };

  const [departmentsList, setDepartmentsList] = useState([
    { id: 'all', label: 'All Departments' },
    { id: 'Artificial Intelligence and Data Science', label: 'AI & Data Science' },
    { id: 'Computer Science and Engineering', label: 'Computer Science (CSE)' },
    { id: 'Artificial Intelligence and Machine Learning', label: 'AI & Machine Learning' },
    { id: 'Information Technology', label: 'Information Tech (IT)' },
    { id: 'Electronics and Communication Engineering', label: 'ECE' },
    { id: 'Electrical and Electronics Engineering', label: 'EEE' },
    { id: 'Mechanical Engineering', label: 'Mechanical Engg' },
    { id: 'Mechatronics', label: 'Mechatronics' },
    { id: 'Biotechnology', label: 'Biotechnology' },
    { id: 'Special Labs & Centers of Excellence', label: 'Special Labs' },
    { id: 'IQAC & Administration', label: 'IQAC & Admin' },
  ]);

  // Load all departments dynamically from backend
  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await apiCall('/faculty/departments');
        if (res && Array.isArray(res.departments) && res.departments.length > 0) {
          const dynamic = [
            { id: 'all', label: 'All Departments' },
            ...res.departments.map(d => ({
              id: d,
              label: d
                .replace('Artificial Intelligence and Data Science', 'AI & Data Science')
                .replace('Artificial Intelligence and Machine Learning', 'AI & Machine Learning')
                .replace('Computer Science and Engineering', 'CSE')
                .replace('Computer Science and Business Systems', 'CS & Business')
                .replace('Computer Science and Design', 'CS & Design')
                .replace('Electronics and Communication Engineering', 'ECE')
                .replace('Electrical and Electronics Engineering', 'EEE')
                .replace('Electrical and Instrumentation Engineering', 'EIE')
                .replace('Information Science and Engineering', 'ISE')
                .replace('Information Technology', 'IT')
                .replace('Mechanical Engineering', 'Mechanical')
                .replace('Special Labs & Centers of Excellence', 'Special Labs')
                .replace('School of Management Studies', 'Management (SMS)')
                .replace('Administration & M-Team', 'Administration')
                .replace('IQAC & Administration', 'IQAC & Admin')
            }))
          ];
          setDepartmentsList(dynamic);
        }
      } catch (e) {
        // Keep default list on failure
      }
    };
    fetchDepts();
  }, []);

  const DEPARTMENTS_LIST = departmentsList;

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] dark:bg-[#09090B] text-slate-900 dark:text-zinc-100 font-sans antialiased">
      
      {/* 1. Left Sidebar */}
      <Sidebar />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        
        {/* Top Header */}
        <Header 
          title="SOS & Faculty Directory"
          subtitle="Official faculty directory, special labs incharges & campus emergency helplines"
        />

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-7 sm:space-y-9">
          
          {/* ========================================================================= */}
          {/* ACCESS GATE: Full lock for guests, green badge for verified */}
          {/* ========================================================================= */}
          {!isVerifiedMember ? (
            /* ── Full-Page Login Wall ── */
            <div className="flex flex-col items-center justify-center py-16 sm:py-24 gap-8">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-xl">
                <Lock size={36} />
              </div>
              <div className="text-center space-y-2 max-w-md">
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-zinc-50">
                  Student Login Required
                </h2>
                <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">
                  The Faculty & Staff Directory is exclusively available to verified BIT students, faculty, and staff. Sign in with your official BIT credentials to access all 500+ contacts.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => { setShowLoginModal(true); setModalTab('student'); }}
                  className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2"
                >
                  <School size={16} />
                  <span>Sign in with Roll / Name</span>
                  <ArrowRight size={14} />
                </button>
                <button
                  onClick={() => { setShowLoginModal(true); setModalTab('google'); }}
                  className="px-6 py-3 rounded-2xl bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-100 text-sm font-bold border border-slate-200 dark:border-zinc-700 transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2"
                >
                  <Mail size={16} className="text-blue-500" />
                  <span>Sign in with @bitsathy.ac.in</span>
                </button>
              </div>
              <p className="text-xs text-slate-400 dark:text-zinc-500 text-center">
                Emergency hotlines below are still publicly accessible
              </p>
            </div>
          ) : null}


          {/* ========================================================================= */}
          {/* 24x7 CAMPUS EMERGENCY SERVICES (Publicly Available) */}
          {/* ========================================================================= */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between pb-0.5">
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                <Shield size={16} className="text-blue-600" />
                <span>24x7 Campus Emergency Hotlines</span>
              </h2>
              <span className="text-xs text-slate-400 font-medium">Public Toll-Free Helplines</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
              {EMERGENCY_SERVICES.map((srv) => {
                const Icon = srv.icon;
                return (
                  <div
                    key={srv.id}
                    className={`relative overflow-hidden p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 ${srv.glowClass} shadow-xs transition-all duration-300 flex items-center justify-between gap-3 group`}
                  >
                    {/* Top edge glowing laser bar */}
                    <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-transparent to-transparent ${srv.topGlow} transition-all duration-500`} />
                    {/* Ambient corner glow */}
                    <div className="absolute -top-8 -right-8 w-20 h-20 bg-blue-500/10 dark:bg-blue-400/10 rounded-full blur-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${srv.color} group-hover:scale-105 transition-transform`}>
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-zinc-100 truncate">
                          {srv.name}
                        </h4>
                        <p className="text-xs text-slate-400 dark:text-zinc-400 truncate mt-1">
                          {srv.timing}
                        </p>
                      </div>
                    </div>
                    <a
                      href={`tel:${srv.number.replace(/[^0-9+]/g, '')}`}
                      className={`py-1.5 px-3 rounded-xl ${srv.btnClass} font-bold font-mono text-xs flex items-center gap-1.5 transition-colors shrink-0`}
                      title="Direct Call"
                    >
                      <Phone size={11} />
                      <span>{srv.number}</span>
                    </a>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SEARCH & DEPARTMENT FILTER TABS — only for verified users */}
          {/* ========================================================================= */}
          {isVerifiedMember && (
          <div className="space-y-4 sm:space-y-5">
            {isAdmin && (
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-blue-600/5 dark:from-blue-950/40 dark:via-indigo-950/40 dark:to-zinc-900 border border-blue-200/80 dark:border-blue-900/60 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                        Admin Directory Controls Active
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-600 text-white uppercase tracking-wider">
                        Full Access
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5">
                      You can add, edit, or delete faculty records directly from here or within the Command Center.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
                  <button
                    onClick={handleOpenAddContact}
                    className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Add New Contact</span>
                  </button>
                  <Link
                    to="/admin?tab=faculty_crud"
                    className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                  >
                    <span>Command Center</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            )}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
              
              {/* Department Selector Pills */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                {DEPARTMENTS_LIST.map((dept) => (
                  <button
                    key={dept.id}
                    onClick={() => setSelectedDept(dept.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      selectedDept === dept.id
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 font-medium hover:bg-slate-50 dark:hover:bg-zinc-800 border border-slate-200/80 dark:border-zinc-800'
                    }`}
                  >
                    <span>{dept.label}</span>
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative w-full md:w-80 shrink-0">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search faculty name, lab, cabin..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 text-xs sm:text-sm font-medium placeholder:font-normal text-slate-800 dark:text-zinc-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

            </div>

            {/* Total count */}
            <div className="text-xs text-slate-500 dark:text-zinc-400 font-medium flex items-center justify-between pt-0.5">
              <span>Showing <strong className="font-bold text-slate-800 dark:text-zinc-200">{facultyList.length}</strong> faculty & staff records</span>
              {!isVerifiedMember && (
                <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1.5">
                  <Lock size={12} /> Contact numbers masked for guest session
                </span>
              )}
            </div>

            {/* Directory Cards Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-4.5">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 animate-pulse space-y-3">
                    <div className="h-4 bg-slate-200 dark:bg-zinc-800 rounded-md w-3/4" />
                    <div className="h-3 bg-slate-100 dark:bg-zinc-800/60 rounded-md w-1/2" />
                    <div className="h-3 bg-slate-100 dark:bg-zinc-800/60 rounded-md w-5/6" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-4.5">
                {facultyList.map((contact) => (
                  <div
                    key={contact.id}
                    className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800/80 hover:border-blue-500/50 dark:hover:border-blue-400/50 shadow-xs hover:shadow-[0_0_22px_-2px_rgba(59,130,246,0.22)] dark:hover:shadow-[0_0_24px_-2px_rgba(59,130,246,0.32)] transition-all duration-300 ease-out flex flex-col justify-between gap-3.5 group hover:-translate-y-0.5 cursor-pointer"
                  >
                    {/* Top edge glowing laser bar */}
                    <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/0 to-transparent group-hover:via-blue-500/90 transition-all duration-500" />
                    {/* Ambient corner glow */}
                    <div className="absolute -top-10 -right-10 w-24 h-24 bg-blue-500/10 dark:bg-blue-400/15 rounded-full blur-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <div className="space-y-1.5 min-w-0">
                      <div>
                        <div className="flex items-start justify-between gap-2.5">
                          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {contact.name}
                          </h3>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {contact.intercom && (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-[10px] font-mono text-slate-700 dark:text-zinc-300 font-bold border border-slate-200/80 dark:border-zinc-700/80 shrink-0">
                                Ext: {contact.intercom}
                              </span>
                            )}
                            {isAdmin && (
                              <div className="flex items-center gap-1 shrink-0 ml-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditContact(contact);
                                  }}
                                  className="p-1 rounded-md bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40 transition-colors cursor-pointer"
                                  title="Edit faculty contact"
                                >
                                  <Edit size={11} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteContact(contact);
                                  }}
                                  className="p-1 rounded-md bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40 transition-colors cursor-pointer"
                                  title="Delete faculty contact"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 truncate mt-1">
                          {contact.designation}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                          {contact.department}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between gap-2.5 text-xs">
                      {contact.email ? (
                        <a 
                          href={`mailto:${contact.email}`}
                          className="text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 truncate flex items-center gap-1.5 min-w-0 text-[11px] font-medium"
                          title={contact.email}
                        >
                          <Mail size={12} className="text-slate-400 shrink-0" />
                          <span className="truncate">{contact.email}</span>
                        </a>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-400">Official Faculty</span>
                      )}

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isVerifiedMember ? (
                          contact.mobile ? (
                            <>
                              <a 
                                href={`tel:${contact.mobile}`}
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-mono text-xs font-bold flex items-center gap-1.5 transition-colors border border-emerald-200/70 dark:border-emerald-800/60"
                                title="Call faculty"
                              >
                                <Phone size={11} />
                                <span>{contact.mobile}</span>
                              </a>
                              <button
                                onClick={() => handleCopy(contact.mobile, `${contact.id}-p`)}
                                className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 cursor-pointer"
                                title="Copy mobile number"
                              >
                                {copiedValue === `${contact.id}-p` ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                              </button>
                            </>
                          ) : (
                            <span className="text-xs font-medium text-slate-400 italic">Email only</span>
                          )
                        ) : (
                          contact.mobile ? (
                            <button
                              onClick={() => setShowLoginModal(true)}
                              className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 font-mono text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-amber-200/70 dark:border-amber-900/60"
                              title="Verify Student ID to view phone number"
                            >
                              <Lock size={11} />
                              <span>98******19</span>
                            </button>
                          ) : (
                            <span className="text-xs font-medium text-slate-400 italic">Email only</span>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {facultyList.length === 0 && !loading && (
              <div className="p-12 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-center space-y-2">
                <Users size={32} className="mx-auto text-slate-300 dark:text-zinc-600" />
                <h3 className="text-sm font-bold text-slate-700 dark:text-zinc-300">No faculty records found</h3>
                <p className="text-xs text-slate-400">Try changing your search term or selecting "All Departments".</p>
              </div>
            )}

          </div>
          )} {/* end isVerifiedMember directory section */}

        </main>

      </div>

      {/* ========================================================================= */}
      {/* QUICK STUDENT / GOOGLE VERIFICATION MODAL */}
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
                    Verify BIT Student / Faculty Identity
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">Unlock full faculty phone numbers</p>
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
                    placeholder="e.g. chandrasekaran@bitsathy.ac.in"
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

      {/* Admin Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 sm:bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-slate-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl shadow-xl border border-slate-700/40 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 size={16} className="text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Admin Contact Add / Edit Modal (Full Admin Control) */}
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
                  placeholder="e.g. Dr. K. Saravanan"
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
                    placeholder="e.g. Associate Professor & Head"
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
                    placeholder="name@bitsathy.ac.in"
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
                    placeholder="e.g. 9842712345"
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
                    placeholder="e.g. 402"
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
                    placeholder="e.g. AS Block, Room 204"
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

export default ContactsPage;
