import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import { Activity, Upload, User, ShieldCheck, UserPlus, Search, Users, ActivitySquare, Syringe, Bug, FlaskConical, AlertTriangle, Ruler, Scale, ClipboardList, Edit3, Save, Stethoscope, FileText, Pill, FileSignature, Settings, Link as LinkIcon, Inbox, Bell, Trash2, Mic, Square, BookOpen, HeartPulse, CheckCircle2, Info, X, Eye, Languages, Palette, Type, Scan, RefreshCw } from 'lucide-react';

const BACKEND_URL = "https://clinical-portal-backend-production.up.railway.app";

// ============================================================================
// 🚨 IRONCLAD REACT VIRTUAL-DOM PATCH FOR GOOGLE TRANSLATE
// Prevents React "NotFoundError: Failed to execute removeChild" crashes
// ============================================================================
if (typeof window !== 'undefined' && !window._reactDomPatched) {
  window._reactDomPatched = true;
  const rawRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function(child) {
    if (child.parentNode !== this) return child;
    return rawRemoveChild.call(this, child);
  };
  const rawInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function(newNode, refNode) {
    if (refNode && refNode.parentNode !== this) return newNode;
    return rawInsertBefore.call(this, newNode, refNode);
  };
}

// --- 🧭 THE 10 MASTER CHART TABS ---
const CHART_NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: HeartPulse, activeClass: 'bg-rose-50 text-rose-700 border-rose-200', iconClass: 'text-rose-600' },
  { id: 'profile', label: 'Profile', icon: ClipboardList, activeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', iconClass: 'text-emerald-600' },
  { id: 'visits', label: 'Encounters', icon: Stethoscope, activeClass: 'bg-purple-50 text-purple-700 border-purple-200', iconClass: 'text-purple-600' },
  { id: 'radiology', label: 'Radiology', icon: Scan, activeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200', iconClass: 'text-indigo-600' },
  { id: 'prescriptions', label: 'Rx & Meds', icon: Pill, activeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200', iconClass: 'text-cyan-600' },
  { id: 'orders', label: 'Orders', icon: FileSignature, activeClass: 'bg-pink-50 text-pink-700 border-pink-200', iconClass: 'text-pink-600' },
  { id: 'labs', label: 'Labs', icon: FlaskConical, activeClass: 'bg-blue-50 text-blue-700 border-blue-200', iconClass: 'text-blue-600' },
  { id: 'growth', label: 'Vitals', icon: Ruler, activeClass: 'bg-orange-50 text-orange-700 border-orange-200', iconClass: 'text-orange-600' },
  { id: 'vaccines', label: 'Vaccines', icon: Syringe, activeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200', iconClass: 'text-indigo-600' },
  { id: 'diseases', label: 'Screenings', icon: Bug, activeClass: 'bg-amber-50 text-amber-700 border-amber-200', iconClass: 'text-amber-600' },
];

const EcgLoader = ({ size = 48, className = "" }) => (
  <div className={`relative inline-block ${className}`} style={{ width: size, height: size }}>
    <Activity size={size} className="text-slate-200 absolute inset-0" />
    <Activity size={size} className="text-blue-600 absolute inset-0 animate-ecg" />
  </div>
);

const ToastBar = ({ toast, onClose }) => {
  if (!toast) return null;
  const icons = { success: CheckCircle2, error: AlertTriangle, info: Info };
  const Icon = icons[toast.type] || Info;
  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[999999] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl border bg-slate-900 text-white border-slate-800 animate-in fade-in slide-in-from-top-4 duration-300 max-w-md w-[90%]">
      <Icon size={20} className="shrink-0 text-amber-400" />
      <p className="text-sm font-semibold flex-grow">{toast.message}</p>
      <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"><X size={16}/></button>
    </div>
  );
};

// --- 🎙️ PROVIDER VOICE DICTATION (With explicit Patient Lockdown) ---
const EncounterVoiceNote = ({ targetPatient, visitDate, providerName, noteValue, setNoteValue, patientNoteValue, setPatientNoteValue, onSave, isPatient, showToast }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef(null); const audioChunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream); audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorderRef.current.onstop = async () => { await uploadVoiceNote(new Blob(audioChunksRef.current, { type: 'audio/webm' })); };
      mediaRecorderRef.current.start(); setIsRecording(true);
      showToast("Live dictation active. Speak clearly near microphone.", "info");
    } catch (err) { showToast("Microphone permissions denied by browser.", "error"); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop(); setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
  };

  const uploadVoiceNote = async (audioBlob) => {
    setIsProcessing(true); const fd = new FormData();
    fd.append("file", audioBlob, "dictation.webm"); fd.append("target_patient", targetPatient);
    fd.append("visit_date", visitDate); fd.append("provider_name", providerName);
    try {
      const res = await fetch(`${BACKEND_URL}/api/visit/voice`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.status === "success") { setNoteValue(data.note); showToast("Formatted successfully!", "success"); }
      else showToast("AI Failed: " + data.message, "error");
    } catch (err) { showToast("Upload failed. Network dropped.", "error"); } finally { setIsProcessing(false); }
  };

  // 🛡️ PATIENT GATEKEEPER: Totally strips dictation controls & edit access for patients
  if (isPatient) {
    return (
      <div className="flex flex-col h-full gap-4">
        {patientNoteValue && (
            <div className="bg-pink-50 p-4 rounded-xl border border-pink-100 shadow-sm">
                <p className="text-xs font-bold text-pink-700 uppercase mb-1 flex items-center gap-1"><HeartPulse size={14}/> Doctor's Explanation (For You)</p>
                <div className="text-sm text-pink-950 whitespace-pre-wrap">{patientNoteValue}</div>
            </div>
        )}
        <div className="flex-grow">
            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Official Physician Note</p>
            <div className="w-full p-4 border rounded-xl bg-slate-50 text-sm text-slate-700 font-mono min-h-[100px] whitespace-pre-wrap shadow-inner">
              {noteValue || "No clinical narrative appended for this visit."}
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[200px] gap-2">
      <div className="flex justify-between items-center mb-1">
        <p className="text-xs font-bold text-slate-500 uppercase">Physician Encounter Note</p>
        {isRecording ? (
          <button onClick={stopRecording} className="px-4 py-1.5 rounded-full text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-md flex items-center gap-2 animate-pulse cursor-pointer">
            <div className="flex items-center gap-0.5 h-3"><span className="w-1 bg-white animate-bounce h-full"></span><span className="w-1 bg-white animate-bounce h-2/3"></span></div>
            <span>Listening... Tap to End</span>
          </button>
        ) : (
          <button onClick={startRecording} disabled={isProcessing} className={`px-3 py-1.5 rounded-full text-xs font-bold text-white flex items-center gap-1 shadow-sm ${isProcessing ? "bg-slate-400" : "bg-blue-600 hover:bg-blue-700 cursor-pointer"}`}>
            {isProcessing ? "🤖 Formatting Note..." : <><Mic size={12}/> Dictate Note</>}
          </button>
        )}
      </div>
      <textarea value={noteValue} onChange={(e) => setNoteValue(e.target.value)} placeholder="Type clinical notes manually, or dictate..." className="w-full flex-grow p-3 border rounded-lg bg-white text-sm outline-none resize-none min-h-[100px] mb-3"></textarea>
      
      {patientNoteValue && (
          <div className="bg-pink-50 p-3 rounded-lg border border-pink-100">
              <p className="text-[10px] font-bold text-pink-700 uppercase mb-1 flex items-center gap-1"><HeartPulse size={12}/> AI Generated Patient Note</p>
              <textarea value={patientNoteValue} onChange={(e) => setPatientNoteValue(e.target.value)} className="w-full p-2 border rounded bg-white text-xs outline-none min-h-[60px] resize-none focus:ring-2 focus:ring-pink-500"></textarea>
          </div>
      )}

      <button onClick={onSave} className="w-full bg-purple-600 text-white font-bold py-2 rounded-lg hover:bg-purple-700 transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"><Save size={16}/> Save Visit Note</button>
    </div>
  );
};

const renderFormattedText = (text) => {
  if (!text) return "No specific metrics detected.";
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return (
      <div key={idx} className="min-h-[1em]">
        {parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="text-slate-900">{part.slice(2, -2)}</strong>;
          return <span key={i}>{part}</span>;
        })}
      </div>
    );
  });
};

export default function App() {
  // --- States ---
  const [accDrawerOpen, setAccDrawerOpen] = useState(false);
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem('cliniport_theme') || 'light');
  const [fontSizeMode, setFontSizeMode] = useState(() => localStorage.getItem('cliniport_font') || 'md');
  const [colorblindMode, setColorblindMode] = useState(() => localStorage.getItem('cliniport_cb') || 'none');

  const [splashState, setSplashState] = useState(() => {
    if (sessionStorage.getItem('cliniport_splashed')) return 'hidden';
    sessionStorage.setItem('cliniport_splashed', 'true'); return 'visible';
  });

  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'info') => { setToast({ message, type }); setTimeout(() => setToast(null), 4000); };

  const [user, setUser] = useState(() => { const savedUser = localStorage.getItem('cliniport_user'); return savedUser ? JSON.parse(savedUser) : null; });
  const [view, setView] = useState(user ? 'loading_session' : 'login'); 
  const [authError, setAuthError] = useState(''); const [isLoading, setIsLoading] = useState(false); 
  
  const [username, setUsername] = useState(''); const [password, setPassword] = useState('');
  const [regName, setRegName] = useState(''); const [regRole, setRegRole] = useState('Patient');
  const [regAge, setRegAge] = useState(''); const [regGender, setRegGender] = useState('Male');
  
  const [activePatient, setActivePatient] = useState(''); 
  const [patientData, setPatientData] = useState({ ai_summary: '', categories: {}, vitals: [], vaccines: [], diseases: [], radiology: [], profile: {}, visits: {}, prescriptions: [], ordered_tests: [] });
  const [activeCategory, setActiveCategory] = useState(''); const [selectedTestName, setSelectedTestName] = useState(''); 
  const [dashTab, setDashTab] = useState('overview'); const [mobileChartDrawerOpen, setMobileChartDrawerOpen] = useState(false);

  const [connectIdInput, setConnectIdInput] = useState(''); const [providerRoster, setProviderRoster] = useState([]); 
  const [familyMembers, setFamilyMembers] = useState([]); const [newFamilyMember, setNewFamilyMember] = useState({ name: '', age: '', gender: 'Male', username: '', password: '' });

  const [pendingRequests, setPendingRequests] = useState([]); const [notifications, setNotifications] = useState([]);

  // ==========================================================================
  // 🚨 CRITICAL FIX: null-safe derivation anchored to the VERY top of App()
  // ==========================================================================
  const totalUnreadCount = (pendingRequests?.length || 0) + (notifications?.length || 0);

  const [isIdUnlocked, setIsIdUnlocked] = useState(false); const [unlockPassword, setUnlockPassword] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false); const [scanModal, setScanModal] = useState(null); 
  const [selectedScanPatient, setSelectedScanPatient] = useState(''); const [isScanning, setIsScanning] = useState(false); const [isSaving, setIsSaving] = useState(false);

  const [vitalsInput, setVitalsInput] = useState({ height: '', weight: '' });
  const [isEditingProfile, setIsEditingProfile] = useState(false); const [profileForm, setProfileForm] = useState({ genetic_conditions: '', chronic_diseases: '', allergies: '', notes: '' });
  const [visitNotes, setVisitNotes] = useState({});
  const [visitPatientNotes, setVisitPatientNotes] = useState({});
  const [prescriptionInput, setPrescriptionInput] = useState({ medication_name: '', dosage: '', instructions: '' });
  const [orderInput, setOrderInput] = useState({ test_name: '', reason: '' });

  const [radioUploadAsset, setRadioUploadAsset] = useState({ title: '', note: '', file: null });

  useEffect(() => {
    if (!document.getElementById('google-translate-script')) {
      window.googleTranslateElementInit = () => { new window.google.translate.TranslateElement({ pageLanguage: 'en', layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE }, 'cliniport_google_translate_element'); };
      const s = document.createElement('script'); s.id = 'google-translate-script'; s.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'; s.async = true; document.body.appendChild(s);
    }
  }, []);

  const handleThemeChange = (mode) => { setThemeMode(mode); localStorage.setItem('cliniport_theme', mode); };
  const handleFontChange = (mode) => { setFontSizeMode(mode); localStorage.setItem('cliniport_font', mode); };
  const handleCbChange = (mode) => { setColorblindMode(mode); localStorage.setItem('cliniport_cb', mode); };

  const getTypographyClass = () => {
    switch (fontSizeMode) {
      case 'sm': return 'text-xs leading-normal';
      case 'lg': return 'text-lg leading-relaxed font-medium';
      case 'xl': return 'text-xl leading-loose font-bold tracking-wide';
      case 'dyslexia': return 'font-mono tracking-widest leading-loose text-base font-semibold';
      default: return 'text-base leading-normal';
    }
  };

  // --- 💥 MASTER OS HARD RESET FUNCTION ---
  const hardResetApp = async () => {
    if ('serviceWorker' in navigator) { const regs = await navigator.serviceWorker.getRegistrations(); for (let r of regs) await r.unregister(); }
    if ('caches' in window) { const cacheNames = await caches.keys(); for (let c of cacheNames) await caches.delete(c); }
    localStorage.clear(); sessionStorage.clear(); window.location.reload(true); 
  };

  useEffect(() => {
    if (splashState === 'visible') {
      const fadeTimer = setTimeout(() => { setSplashState('fading'); }, 2000);
      const hideTimer = setTimeout(() => { setSplashState('hidden'); }, 2500);
      return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer); };
    }
  }, [splashState]);

  const generateUID = (name, role) => {
    const parts = name.trim().split(' '); const initials = parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : (name.substring(0, 2)).toUpperCase();
    return role === 'Patient' ? `${initials}${Math.floor(100000 + Math.random() * 900000)}` : `D${initials}${Math.floor(1000 + Math.random() * 9000)}`;
  };

  const handleConnectInputMask = (raw) => {
    const cleaned = raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 2)} - ${cleaned.slice(2)}`;
    return `${cleaned.slice(0, 2)} - ${cleaned.slice(2, 6)} - ${cleaned.slice(6, 8)}`;
  };

  useEffect(() => {
    if (user && view === 'loading_session') {
      if (user.role === 'Patient') { setActivePatient(user.real_name); fetchPatientData(user.real_name); fetchPendingRequests(user.uid); fetchNotifications(user.uid); fetchFamilyMembers(user.uid); setView('dashboard');
      } else { fetchRoster(user.uid); setView('provider_roster'); }
    }
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== 'Patient') return;
    const interval = setInterval(() => { fetchPendingRequests(user.uid); fetchNotifications(user.uid); }, 5000); 
    return () => clearInterval(interval);
  }, [user]);

  const fetchPendingRequests = async (uid) => { try { const res = await fetch(`${BACKEND_URL}/api/connect/pending/${uid}`); if (res.ok) setPendingRequests(await res.json()); } catch (err) {} };
  const fetchNotifications = async (uid) => { try { const res = await fetch(`${BACKEND_URL}/api/notifications/${uid}`); if (res.ok) setNotifications(await res.json()); } catch (err) {} };
  const handleClearNotifications = async () => { try { await fetch(`${BACKEND_URL}/api/notifications/clear/${user.uid}`, { method: 'POST' }); setNotifications([]); showToast("Inbox cleared.", "info"); } catch (e) {} };

  useEffect(() => {
    if (patientData.profile) setProfileForm(patientData.profile);
    if (patientData.visits) {
      const initialDNotes = {}; const initialPNotes = {};
      Object.values(patientData.visits).forEach(v => { initialDNotes[v.date] = v.doctor_note || ''; initialPNotes[v.date] = v.patient_note || ''; });
      setVisitNotes(initialDNotes); setVisitPatientNotes(initialPNotes);
    }
  }, [patientData]);

  const fetchFamilyMembers = async (uid) => { try { const res = await fetch(`${BACKEND_URL}/api/family/${uid}`); if (res.ok) setFamilyMembers(await res.json()); } catch (err) {} };
  const fetchRoster = async (uid) => { try { const res = await fetch(`${BACKEND_URL}/api/roster/${uid}`); if (res.ok) setProviderRoster(await res.json()); } catch (err) {} };

  const handleLogin = async (e) => {
    e.preventDefault(); setAuthError(''); setIsLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
      if (!res.ok) throw new Error("Invalid username or credentials.");
      const data = await res.json();
      if (!data.uid) data.uid = generateUID(data.real_name, data.role);
      setTimeout(() => {
        setIsLoading(false); setUser(data); localStorage.setItem('cliniport_user', JSON.stringify(data)); setIsIdUnlocked(false);
        showToast(`Welcome back, ${data.real_name}!`, "success");
        if (data.role === 'Patient') { setActivePatient(data.real_name); fetchPatientData(data.real_name); fetchPendingRequests(data.uid); fetchNotifications(data.uid); fetchFamilyMembers(data.uid); setView('dashboard');
        } else { fetchRoster(data.uid); setView('provider_roster'); }
      }, 800);
    } catch (err) { setIsLoading(false); setAuthError("Failed to connect or invalid credentials."); }
  };

  const handleRegister = async (e) => {
    e.preventDefault(); setAuthError(''); setIsLoading(true);
    const generatedUID = generateUID(regName, regRole);
    try {
      const res = await fetch(`${BACKEND_URL}/api/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password, real_name: regName, role: regRole, uid: generatedUID }) });
      if (!res.ok) throw new Error("Username already exists.");
      setTimeout(() => { setIsLoading(false); showToast(`Account created successfully! ID: ${generatedUID}`, "success"); setView('login'); setPassword(''); }, 800);
    } catch (err) { setIsLoading(false); setAuthError(err.message); }
  };

  const handleAddFamilyMember = async (e) => {
    e.preventDefault();
    if (!newFamilyMember.username || !newFamilyMember.password) return showToast("Assign username and password.", "error");
    const childUid = generateUID(newFamilyMember.name, 'Patient');
    try {
      const res = await fetch(`${BACKEND_URL}/api/family/add`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parent_uid: user.uid, name: newFamilyMember.name, age: parseInt(newFamilyMember.age), gender: newFamilyMember.gender, child_uid: childUid, username: newFamilyMember.username, password: newFamilyMember.password }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.detail);
      showToast(data.message, "success"); fetchFamilyMembers(user.uid); setNewFamilyMember({ name: '', age: '', gender: 'Male', username: '', password: '' }); setView('dashboard');
    } catch (err) { showToast(err.message, "error"); }
  };

  const handleUnlockId = async (e) => {
    e.preventDefault(); setIsUnlocking(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: user.username, password: unlockPassword }) });
      if (!res.ok) throw new Error("Incorrect passcode.");
      setIsIdUnlocked(true); setUnlockPassword(''); setTimeout(() => setIsIdUnlocked(false), 30000); 
      showToast("ID unlocked for 30 seconds.", "info");
    } catch (err) { showToast(err.message, "error"); } finally { setIsUnlocking(false); }
  };

  const handleRequestConnection = async (e) => {
    e.preventDefault(); if (!connectIdInput) return;
    try {
      const unmaskedId = connectIdInput.replace(/\s|-/g, '');
      const res = await fetch(`${BACKEND_URL}/api/connect/request`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider_uid: user.uid, patient_uid: unmaskedId, provider_name: user.real_name }) });
      const data = await res.json(); showToast(data.message, "success"); setConnectIdInput('');
    } catch (err) { showToast("Failed to transmit request.", "error"); }
  };

  const handleAcceptRequest = async (req) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/connect/accept`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider_uid: req.doctorId, patient_uid: req.target_uid || user.uid }) });
      const data = await res.json(); showToast(data.message, "success"); fetchPendingRequests(user.uid);
    } catch (err) { showToast("Failed to authorize provider access.", "error"); }
  };

  const fetchPatientData = async (name) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/patient/${encodeURIComponent(name)}`);
      const data = await res.json(); setPatientData(data); setActivePatient(name);
      if (data.categories && Object.keys(data.categories).length > 0) {
          const firstCat = Object.keys(data.categories)[0]; setActiveCategory(firstCat);
          if (data.categories[firstCat].length > 0) setSelectedTestName(data.categories[firstCat][0].test_name);
      }
      setDashTab('overview'); setView('dashboard');
    } catch (err) {}
  };

  const processDocumentUpload = async (file, target, force = 'false') => {
    const fd = new FormData(); fd.append('file', file); fd.append('target_patient', target); fd.append('uploader_name', user?.real_name || "System"); fd.append('force_override', force); 
    try {
      const res = await fetch(`${BACKEND_URL}/api/upload`, { method: 'POST', body: fd }); const data = await res.json();
      if (data.status === 'warning') { const proceed = window.confirm(`An encounter record already exists for today. Append document for ${target}?`); if (proceed) await processDocumentUpload(file, target, 'true'); return; }
      fetchPatientData(target); showToast("Document mapped directly into master data trajectory!", "success");
    } catch(err) { showToast("Upload processing failed.", "error"); }
  };

  const handleRadiologyPacketSubmit = async (e) => {
    e.preventDefault();
    if (!radioUploadAsset.file || !radioUploadAsset.title) return showToast("Provide a DICOM/Image scan asset and title.", "error");
    setIsSaving(true);
    const fd = new FormData();
    fd.append("file", radioUploadAsset.file); fd.append("target_patient", activePatient);
    fd.append("scan_title", radioUploadAsset.title); fd.append("doctor_note", radioUploadAsset.note);
    fd.append("provider_name", user?.real_name || "Assigned Radiologist");
    try {
      const res = await fetch(`${BACKEND_URL}/api/radiology`, { method: "POST", body: fd });
      if (res.ok) { showToast("Radiology successfully synced!", "success"); fetchPatientData(activePatient); setRadioUploadAsset({ title: '', note: '', file: null }); }
    } catch (err) { showToast("Network error synchronizing scan.", "error"); } finally { setIsSaving(false); }
  };

  const handleSaveProfile = async () => {
    try { await fetch(`${BACKEND_URL}/api/profile`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target_patient: activePatient, ...profileForm }) }); showToast("Profile overview synced.", "success"); setIsEditingProfile(false); fetchPatientData(activePatient); } catch (err) { showToast("Failed to sync profile.", "error"); }
  };

  const handleSaveVisitNote = async (date) => {
    try { 
        await fetch(`${BACKEND_URL}/api/visit/note`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target_patient: activePatient, visit_date: date, note: visitNotes[date], patient_note: visitPatientNotes[date], provider_name: user?.real_name || "Unknown Provider" }) }); 
        showToast("Encounter narrative updated.", "success"); fetchPatientData(activePatient); 
    } catch (err) { showToast("Failed to save encounter note.", "error"); }
  };

  const handleLogVitals = async (e) => {
    e.preventDefault();
    if (!vitalsInput.height || !vitalsInput.weight) return showToast("Provide height and weight values.", "error");
    try { await fetch(`${BACKEND_URL}/api/vitals`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target_patient: activePatient, height_cm: parseFloat(vitalsInput.height), weight_kg: parseFloat(vitalsInput.weight) }) }); setVitalsInput({ height: '', weight: '' }); fetchPatientData(activePatient); showToast("Vitals mapped.", "success"); } catch (err) {}
  };

  const handleAddPrescription = async (e) => {
    e.preventDefault();
    try { await fetch(`${BACKEND_URL}/api/prescriptions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target_patient: activePatient, ...prescriptionInput }) }); setPrescriptionInput({ medication_name: '', dosage: '', instructions: '' }); fetchPatientData(activePatient); showToast("Prescription securely transmitted.", "success"); } catch (err) {}
  };

  const handleAddOrder = async (e) => {
    e.preventDefault();
    try { await fetch(`${BACKEND_URL}/api/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target_patient: activePatient, ...orderInput }) }); setOrderInput({ test_name: '', reason: '' }); fetchPatientData(activePatient); showToast("Diagnostic order authorized.", "success"); } catch (err) {}
  };

  const handleSmartScan = async (file) => {
    const fd = new FormData(); fd.append('file', file);
    if (user.role === 'Provider') fd.append('provider_uid', user.uid); else fd.append('patient_uid', user.uid);
    try {
        const res = await fetch(`${BACKEND_URL}/api/predict-patient`, { method: 'POST', body: fd }); const data = await res.json(); setIsScanning(false);
        if (data.matched_patients && data.matched_patients.length > 0) { setScanModal({ type: 'file', patients: data.matched_patients, payload: file }); setSelectedScanPatient(data.matched_patients[0]); } else { setScanModal({ type: 'manual_file', payload: file }); setSelectedScanPatient(''); }
    } catch (err) { setIsScanning(false); setScanModal({ type: 'manual_file', payload: file }); setSelectedScanPatient(''); }
  };

  const handleTextSmartScan = async (textString) => {
    const fd = new FormData(); fd.append('text_payload', textString);
    if (user.role === 'Provider') fd.append('provider_uid', user.uid); else fd.append('patient_uid', user.uid); 
    try {
        const res = await fetch(`${BACKEND_URL}/api/predict-patient`, { method: 'POST', body: fd }); const data = await res.json(); setIsScanning(false);
        if (data.matched_patients && data.matched_patients.length > 0) { setScanModal({ type: 'text', patients: data.matched_patients, payload: textString }); setSelectedScanPatient(data.matched_patients[0]); } else { setScanModal({ type: 'manual_text', payload: textString }); setSelectedScanPatient(''); }
    } catch (e) { setIsScanning(false); setScanModal({ type: 'manual_text', payload: textString }); setSelectedScanPatient(''); }
  };

  const confirmScanModal = async () => {
      if (!scanModal) return; const target = selectedScanPatient;
      if (!target) return showToast("Select target chart.", "error");
      setIsSaving(true); 
      if (scanModal.type === 'text' || scanModal.type === 'manual_text') {
          try { await fetch(`${BACKEND_URL}/api/visit/note`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target_patient: target, visit_date: new Date().toISOString().split('T')[0], note: `[Shared Text Message]:\n${scanModal.payload}`, provider_name: user?.real_name || "Unknown Provider" }) }); fetchPatientData(target); showToast("Message bonded to patient notes.", "success"); } catch(e) { }
      } else if (scanModal.type === 'file' || scanModal.type === 'manual_file') { await processDocumentUpload(scanModal.payload, target); }
      setIsSaving(false); setScanModal(null);
  };

  useEffect(() => {
    if (!user) return; 
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('incoming_share') === 'true') {
      setIsScanning(true); 
      (async () => {
        const cache = await caches.open('shared-files-cache'); const cachedFile = await cache.match('/latest-shared-file'); const cachedText = await cache.match('/latest-shared-text');
        if (cachedFile) { const blob = await cachedFile.blob(); handleSmartScan(new File([blob], cachedFile.headers.get('X-File-Name') || 'shared_document.pdf', { type: blob.type })); await cache.delete('/latest-shared-file');
        } else if (cachedText) { handleTextSmartScan(await cachedText.text()); await cache.delete('/latest-shared-text'); 
        } else { setIsScanning(false); setScanModal({ type: 'error', message: "The share was intercepted, but the payload was empty." }); }
        window.history.replaceState({}, document.title, "/");
      })();
    }
  }, [user]); 

  // --- 📂 FILE UPLOAD SUBMISSION HANDLER ---
  const handleFileUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const target = activePatient; if (!target) return showToast("Select a patient chart first.", "error");
    const proceed = window.confirm(`Upload diagnostic document for ${target}?`); if (!proceed) { e.target.value = null; return; }
    setIsSaving(true); await processDocumentUpload(file, target); setIsSaving(false); e.target.value = null;
    setView('dashboard'); // Instantly refreshes back to chart view
  };

  const handleCategoryClick = (category) => {
    setActiveCategory(category); 
    if (patientData.categories[category] && patientData.categories[category].length > 0) { setSelectedTestName(patientData.categories[category][0].test_name); } else { setSelectedTestName(''); }
  };

  return (
    <div className={`min-h-screen font-sans theme-${themeMode} ${getTypographyClass()}`} style={{ filter: colorblindMode === 'none' ? 'none' : `url(#cb-${colorblindMode})` }}>
      
      {/* 🎨 Master Theme Skins */}
      <style>{`
        .theme-light { background-color: #f8fafc; color: #1e293b; }
        .theme-dark { background-color: #020617 !important; color: #f8fafc !important; }
        .theme-dark .bg-white, .theme-dark .bg-slate-50, .theme-dark .bg-blue-50, .theme-dark .bg-emerald-50, .theme-dark .bg-pink-50, .theme-dark .bg-cyan-50, .theme-dark .bg-purple-50, .theme-dark .bg-orange-50, .theme-dark .bg-indigo-50 { background-color: #0f172a !important; color: #f8fafc !important; border-color: #1e293b !important; }
        .theme-dark .text-slate-800, .theme-dark .text-slate-700, .theme-dark .text-slate-600, .theme-dark .text-indigo-900, .theme-dark .text-indigo-950 { color: #f8fafc !important; }
        
        .theme-contrast { background-color: #000000 !important; color: #ffff00 !important; font-weight: 900 !important; letter-spacing: 0.05em; }
        .theme-contrast .bg-white, .theme-contrast .bg-slate-50, .theme-contrast .bg-blue-50, .theme-contrast .bg-emerald-50, .theme-contrast .bg-pink-50, .theme-contrast .bg-cyan-50, .theme-contrast .bg-purple-50, .theme-contrast .bg-orange-50, .theme-contrast .bg-indigo-50 { background-color: #000000 !important; color: #ffff00 !important; border-color: #ffff00 !important; border-width: 3px !important; box-shadow: none !important; }
        .theme-contrast .text-slate-800, .theme-contrast .text-slate-700, .theme-contrast .text-indigo-900, .theme-contrast .text-indigo-950, .theme-contrast .text-blue-600, .theme-contrast .text-emerald-700, .theme-contrast .text-pink-700 { color: #ffff00 !important; font-weight: 900 !important; }

        @keyframes dropIn { 0% { transform: translateY(-100vh) scaleY(1.5); opacity: 0; } 60% { opacity: 1; } 100% { transform: translateY(0) scale(1); opacity: 1; } } 
        @keyframes splashOut { 0% { transform: scale(0); opacity: 0.8; } 100% { transform: scale(25); opacity: 0; display: none; } } 
        .liquid-drop { animation: dropIn 0.6s cubic-bezier(0.25, 1, 0.5, 1) forwards; } 
        .liquid-ripple-1 { animation: splashOut 1.2s cubic-bezier(0.1, 0.8, 0.3, 1) forwards; animation-delay: 0.5s; } 
        .liquid-ripple-2 { animation: splashOut 1.2s cubic-bezier(0.1, 0.8, 0.3, 1) forwards; animation-delay: 0.65s; }
        @keyframes ecgWipe { 0% { clip-path: inset(0 100% 0 0); } 50% { clip-path: inset(0 0 0 0); } 100% { clip-path: inset(0 0 0 100%); } }
        .animate-ecg { animation: ecgWipe 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
      `}</style>

      {/* 👁️ Daltonization Matrices */}
      <svg className="hidden"><defs><filter id="cb-protanopia"><feColorMatrix type="matrix" values="0.56667 0.43333 0 0 0  0.55833 0.44167 0 0 0  0 0.24167 0.75833 0 0  0 0 0 1 0" /></filter><filter id="cb-deuteranopia"><feColorMatrix type="matrix" values="0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0" /></filter><filter id="cb-tritanopia"><feColorMatrix type="matrix" values="0.95 0.05 0 0 0  0 0.43333 0.56667 0 0  0 0.475 0.525 0 0  0 0 0 1 0" /></filter></defs></svg>

      {/* Floating Inline Toast Bar */}
      <ToastBar toast={toast} onClose={() => setToast(null)} />
      
      {splashState !== 'hidden' && (
        <div className={`fixed inset-0 z-[99999] flex items-center justify-center bg-blue-50 transition-opacity duration-700 ${splashState === 'fading' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <div className="absolute w-8 h-12 bg-blue-500 rounded-[50%_50%_50%_50%/60%_60%_40%_40%] liquid-drop shadow-xl"></div><div className="absolute w-24 h-24 border-8 border-blue-400 rounded-full opacity-0 liquid-ripple-1"></div><div className="absolute w-24 h-24 bg-blue-300 rounded-full opacity-0 liquid-ripple-2"></div>
        </div>
      )}

      {view === 'loading_session' ? (
        <div className="flex flex-col justify-center items-center min-h-screen bg-slate-50"><EcgLoader size={48} className="mb-4" /><p className="text-sm font-semibold text-slate-500 tracking-wide">Restoring Session...</p></div>
      ) : !user ? (
        <div className="flex flex-col justify-center items-center py-12 px-4 min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100">
          <div className="bg-white p-8 md:p-10 rounded-2xl shadow-xl w-full max-w-lg border border-slate-100 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {view === 'login' ? (
              <>
                <div className="flex justify-center mb-6"><div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full shadow-lg"><ShieldCheck size={32} className="text-white" /></div></div>
                <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">Clinical Portal</h2><p className="text-center text-slate-500 mb-8">Secure Access</p>
                {authError && (<div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-bold mb-6 border border-red-100 text-center">{authError}</div>)}
                <form onSubmit={handleLogin} className="space-y-5">
                  <input type="text" placeholder="Username" required className="w-full p-3 border rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" value={username} onChange={e => setUsername(e.target.value)} />
                  <input type="password" placeholder="Passcode" required className="w-full p-3 border rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" value={password} onChange={e => setPassword(e.target.value)} />
                  <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg flex items-center justify-center h-12 shadow-md cursor-pointer">{isLoading ? "Authenticating..." : "Secure Login"}</button>
                </form>
                <p className="text-center text-sm text-slate-500 mt-6">Don't have an account? <button type="button" onClick={() => {setView('register'); setAuthError('');}} className="text-blue-600 font-bold hover:underline cursor-pointer">Sign up</button></p>
              </>
            ) : (
              <>
                <div className="flex justify-center mb-6"><div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-full shadow-lg"><UserPlus size={32} className="text-white" /></div></div>
                <h2 className="text-2xl font-bold text-center text-slate-800 mb-8">Create Account</h2>
                {authError && (<div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-bold mb-6 border border-red-100 text-center">{authError}</div>)}
                <form onSubmit={handleRegister} className="space-y-4">
                  <input type="text" placeholder="Full Legal Name" required className="w-full p-3 border rounded-lg bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none" value={regName} onChange={e => setRegName(e.target.value)} />
                  <select className="w-full p-3 border rounded-lg bg-slate-50 text-slate-700 font-semibold focus:ring-2 outline-none" value={regRole} onChange={e => setRegRole(e.target.value)}>
                    <option value="Patient">I am a Patient</option><option value="Provider">Medical Provider</option>
                  </select>
                  <input type="text" placeholder="Choose Username" required className="w-full p-3 border rounded-lg bg-slate-50 mt-4 focus:ring-2 outline-none" value={username} onChange={e => setUsername(e.target.value)} />
                  <input type="password" placeholder="Choose Password" required className="w-full p-3 border rounded-lg bg-slate-50 focus:ring-2 outline-none" value={password} onChange={e => setPassword(e.target.value)} />
                  <button type="submit" disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg flex items-center justify-center shadow-md mt-2 cursor-pointer">{isLoading ? "Registering..." : "Register Now"}</button>
                </form>
                <p className="text-center text-sm text-slate-500 mt-6">Already have an account? <button type="button" onClick={() => {setView('login'); setAuthError('');}} className="text-emerald-600 font-bold hover:underline cursor-pointer">Back to Login</button></p>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in duration-700">
          <nav className="bg-white shadow-sm border-b px-4 md:px-8 py-4 flex flex-wrap gap-4 justify-between items-center fixed w-full z-20 top-0">
            <h1 className="text-xl font-bold text-blue-600 flex items-center gap-2"><Activity /> ClinicalPortal</h1>
            <div className="flex gap-2 md:gap-4 items-center">
              <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full hidden sm:block">ID: {isIdUnlocked ? user.uid : '••••••••'}</span>
              <button onClick={() => setAccDrawerOpen(true)} className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-blue-600 hover:text-white transition-all cursor-pointer flex items-center gap-1 font-bold text-xs"><Settings size={16} /> <span className="hidden md:inline">Accessibility Suite</span></button>
              <span className="text-xs md:text-sm font-medium bg-slate-100 px-3 py-1 rounded-full">{user.real_name}</span>
              <button onClick={hardResetApp} className="text-xs md:text-sm text-slate-400 hover:text-orange-500 font-bold ml-2 border-l border-slate-200 pl-3 cursor-pointer flex items-center gap-1"><RefreshCw size={14}/> Reset App</button>
              <button onClick={() => { localStorage.removeItem('cliniport_user'); setUser(null); setView('login'); showToast("Securely signed out.", "info"); }} className="text-sm text-slate-500 hover:text-red-500 font-medium cursor-pointer ml-2">Log Out</button>
            </div>
          </nav>

          <div className="pt-[110px] lg:pt-28 px-4 md:px-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8 pb-12">
            
            <div className="col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit lg:sticky lg:top-28">
              <div className="flex items-center gap-4 mb-6"><div className="h-12 w-12 bg-blue-100 text-blue-600 flex items-center justify-center rounded-full font-bold text-xl"><User /></div><div><p className="font-bold text-slate-800 leading-tight">{user.real_name}</p><p className="text-xs text-slate-500 font-mono">{user.role}</p></div></div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 text-center"><p className="text-xs text-slate-500 uppercase font-bold mb-1">Your CliniPort ID</p><p className="text-lg font-mono font-black text-blue-700 tracking-wider mb-2">{isIdUnlocked ? user.uid : '••••••••'}</p>{!isIdUnlocked ? (<form onSubmit={handleUnlockId} className="flex flex-col gap-2 mt-2"><input type="password" placeholder="Passcode to reveal" value={unlockPassword} onChange={(e) => setUnlockPassword(e.target.value)} className="w-full text-xs p-2 border rounded focus:ring-2 text-center outline-none" required /><button type="submit" className="w-full bg-slate-800 text-white text-xs font-bold py-2 rounded cursor-pointer">Unlock ID</button></form>) : (<button onClick={() => setIsIdUnlocked(false)} className="text-xs font-bold text-blue-600 hover:underline cursor-pointer">Lock Now</button>)}</div>
              <hr className="mb-4 border-slate-100" />

              {user.role === 'Patient' && (
                <div className="mb-4"><p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2 px-1">My Family</p><ul className="space-y-1 mb-3">{familyMembers.map((m, idx) => (<li key={idx}><button onClick={() => { fetchPatientData(m.name); setView('dashboard'); }} className={`w-full text-left p-2 rounded-lg text-sm cursor-pointer ${activePatient === m.name ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50 text-slate-600'}`}>{m.name}</button></li>))}</ul><button onClick={() => setView('add_family_member')} className="w-full text-left p-2 rounded-lg text-sm text-emerald-600 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"><UserPlus size={16}/> Add Member</button><hr className="my-4 border-slate-100" /></div>
              )}

              <ul className="space-y-2">
                {user.role === 'Provider' && (<><li><button onClick={() => {fetchRoster(user.uid); setView('provider_roster');}} className={`w-full text-left p-3 rounded-xl flex items-center gap-2 cursor-pointer ${view === 'provider_roster' ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50'}`}><Users size={18}/> My Roster</button></li><li><button onClick={() => setView('provider_search')} className={`w-full text-left p-3 rounded-xl flex items-center gap-2 cursor-pointer ${view === 'provider_search' ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50'}`}><Search size={18}/> Search</button></li></>)}
                {user.role === 'Patient' && (<li><button onClick={() => setView('patient_inbox')} className={`w-full text-left p-3 rounded-xl flex justify-between cursor-pointer ${view === 'patient_inbox' ? 'bg-emerald-50 text-emerald-700 font-bold' : 'hover:bg-slate-50'}`}><span className="flex items-center gap-2"><Bell size={18}/> Inbox</span>{totalUnreadCount > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{totalUnreadCount}</span>}</button></li>)}
                
                {/* --- 📂 LEFT SIDEBAR BUTTON FOR UPLOADS --- */}
                {activePatient && (
                  <li>
                    <button onClick={() => setView('upload')} className={`w-full text-left p-3 rounded-xl flex items-center gap-2 cursor-pointer ${view === 'upload' ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50'}`}>
                      <Upload size={18}/> Upload Document
                    </button>
                  </li>
                )}
              </ul>
            </div>

            <div className="col-span-1 lg:col-span-3 space-y-6">

              {view === 'add_family_member' && (
                 <div className="bg-white p-6 md:p-10 rounded-2xl shadow-sm border"><h3 className="text-xl font-bold mb-2 flex items-center gap-2"><UserPlus className="text-emerald-600"/> Add Family Member</h3><form onSubmit={handleAddFamilyMember} className="space-y-4"><div><input type="text" placeholder="Full Legal Name" required value={newFamilyMember.name} onChange={e => setNewFamilyMember({...newFamilyMember, name: e.target.value})} className="w-full p-3 border rounded-lg focus:ring-2 outline-none" /></div><div className="flex gap-4"><input type="number" placeholder="Age" required value={newFamilyMember.age} onChange={e => setNewFamilyMember({...newFamilyMember, age: e.target.value})} className="w-full border rounded-lg p-3 outline-none" /><select value={newFamilyMember.gender} onChange={e => setNewFamilyMember({...newFamilyMember, gender: e.target.value})} className="w-full border rounded-lg p-3 outline-none"><option>Male</option><option>Female</option></select></div><hr className="my-2" /><div><input type="text" placeholder="Assign a Username" required value={newFamilyMember.username} onChange={e => setNewFamilyMember({...newFamilyMember, username: e.target.value})} className="w-full p-3 border rounded-lg outline-none" /></div><div><input type="password" placeholder="Assign a Password" required value={newFamilyMember.password} onChange={e => setNewFamilyMember({...newFamilyMember, password: e.target.value})} className="w-full p-3 border rounded-lg outline-none" /></div><button type="submit" className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl cursor-pointer hover:bg-emerald-700 shadow-sm">Create Account</button></form></div>
              )}

              {view === 'provider_roster' && (
                 <div className="space-y-6"><div className="bg-white p-6 rounded-2xl border flex flex-col sm:flex-row gap-6 justify-between"><div><h3 className="text-xl font-bold mb-1 flex items-center gap-2"><LinkIcon className="text-blue-600"/> Connect Patient</h3><p className="text-sm text-slate-500">Auto-formats ID as you type.</p></div><form onSubmit={handleRequestConnection} className="flex gap-2 items-center"><input type="text" placeholder="JD - 1234 - 56" required className="p-3 border rounded-xl font-mono uppercase font-bold tracking-wider outline-none focus:ring-2 focus:ring-blue-500 w-48 text-center" value={connectIdInput} onChange={e => setConnectIdInput(handleConnectInputMask(e.target.value))} /><button type="submit" className="bg-blue-600 text-white px-6 py-3 font-bold rounded-xl cursor-pointer hover:bg-blue-700 shadow-sm">Request</button></form></div><div><h3 className="text-lg font-bold mb-4">My Assigned Patients</h3>{providerRoster.length === 0 ? (<div className="bg-white p-12 text-center rounded-2xl border border-dashed"><p className="text-slate-500">Roster empty.</p></div>) : (<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{providerRoster.map((pt, i) => (<div key={i} onClick={() => fetchPatientData(pt.name)} className="bg-white p-5 rounded-2xl border cursor-pointer hover:shadow-md"><div className="flex justify-between items-start mb-2"><h4 className="font-bold text-lg">{pt.name}</h4><span className="text-xs bg-slate-100 px-2 py-1 rounded border">{pt.uid}</span></div></div>))}</div>)}</div></div>
              )}

              {view === 'patient_inbox' && (
                 <div className="space-y-6"><div className="bg-white p-6 rounded-2xl border"><h3 className="text-xl font-bold mb-6 flex items-center gap-2"><UserPlus className="text-blue-600"/> Action Required</h3>{pendingRequests.map((req, i) => (<div key={i} className="flex justify-between items-center bg-blue-50 p-4 rounded-xl border mb-4"><div><p className="font-bold">Dr. {req.doctorName}</p><p className="text-sm">Requesting access.</p></div><div className="flex gap-2"><button onClick={() => handleAcceptRequest(req)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold cursor-pointer">Authorize</button></div></div>))}</div></div>
              )}

              {view === 'dashboard' && activePatient && (
                <div className="animate-in fade-in duration-500">
                  
                  {/* --- 🖥️ DESKTOP TABS --- */}
                  <div className="hidden lg:flex bg-white p-2 rounded-xl border gap-2 mb-6 overflow-x-auto">
                    {CHART_NAV_ITEMS.map(t => (
                      <button key={t.id} onClick={() => setDashTab(t.id)} className={`flex-1 min-w-[100px] py-2.5 rounded-lg font-bold flex items-center justify-center gap-1 transition-all cursor-pointer text-xs ${dashTab === t.id ? t.activeClass : 'text-slate-500 hover:bg-slate-50'}`}>
                        <t.icon size={14} className={dashTab === t.id ? t.iconClass : ''}/> {t.label}
                      </button>
                    ))}
                  </div>

                  {/* --- 📱 MOBILE MENU TRIGGER BUTTON --- */}
                  <div className="lg:hidden mb-4">
                    {(() => {
                      const curr = CHART_NAV_ITEMS.find(t => t.id === dashTab) || CHART_NAV_ITEMS[0]; const ActiveIcon = curr.icon;
                      return (<button onClick={() => setMobileChartDrawerOpen(true)} className="w-full bg-white border p-3.5 rounded-xl flex items-center justify-between font-bold text-slate-700 cursor-pointer"><div className="flex items-center gap-2.5"><div className={`p-1.5 rounded-lg bg-slate-100 ${curr.iconClass}`}><ActiveIcon size={20} /></div><span className="text-xs text-slate-400">Section:</span><span className="text-base">{curr.label}</span></div><span className="text-xs font-mono bg-rose-50 text-rose-600 px-3 py-1 rounded-full border">Change ▾</span></button>);
                    })()}
                  </div>

                  {/* --- 📱 MOBILE GLASS SIDEBAR DRAWER --- */}
                  {mobileChartDrawerOpen && (
                    <div className="fixed inset-0 z-[999999] bg-slate-900/60 backdrop-blur-xs flex animate-in fade-in duration-200 lg:hidden">
                      <div className="w-[85%] max-w-xs bg-white h-full shadow-2xl p-6 flex flex-col justify-between animate-in slide-in-from-left duration-300"><div><div className="flex items-center justify-between pb-4 border-b mb-6"><div><p className="text-xs font-bold text-slate-400 uppercase">Navigation</p><h3 className="font-black text-xl">{activePatient}</h3></div><button onClick={() => setMobileChartDrawerOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 font-bold flex items-center justify-center text-sm cursor-pointer">✕</button></div><div className="space-y-1">{CHART_NAV_ITEMS.map((item) => { const ItemIcon = item.icon; const isSelected = dashTab === item.id; return (<button key={item.id} onClick={() => { setDashTab(item.id); setMobileChartDrawerOpen(false); }} className={`w-full text-left p-3 rounded-xl font-bold flex items-center gap-3 text-sm cursor-pointer ${isSelected ? item.activeClass + ' border' : 'text-slate-600 hover:bg-slate-50'}`}><ItemIcon size={18} className={isSelected ? item.iconClass : 'text-slate-400'} /> {item.label}</button>); })}</div></div></div>
                      <div className="flex-1" onClick={() => setMobileChartDrawerOpen(false)} />
                    </div>
                  )}

                  {/* --- LANDING "OVERVIEW" DASHBOARD TAB --- */}
                  {dashTab === 'overview' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      <div className="bg-gradient-to-r from-rose-500 to-red-500 rounded-3xl p-8 text-white shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"><div><span className="bg-white/20 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider">Master Health Dashboard</span><h2 className="text-3xl font-black mt-2">Am I Okay?</h2><p className="text-rose-100 text-sm mt-1">Clinical telemetry & vital metrics are currently operating within expected standard trajectories.</p></div><button onClick={() => setDashTab('visits')} className="bg-white text-rose-900 font-black px-6 py-3 rounded-2xl shadow-md hover:bg-rose-50 transition cursor-pointer shrink-0">Review Doctor Notes ➔</button></div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6"><div onClick={() => setDashTab('growth')} className="bg-white p-6 rounded-2xl border shadow-xs hover:shadow-md transition cursor-pointer flex flex-col justify-between border-l-4 border-l-orange-500"><div><p className="text-xs font-bold text-slate-400 uppercase">Biometric Status</p><h4 className="text-2xl font-black mt-1">Latest BMI</h4></div><div className="mt-4 flex items-baseline justify-between"><span className="text-4xl font-black text-orange-600">{patientData.vitals?.[patientData.vitals.length-1]?.BMI || '22.4'}</span><span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border">Optimal</span></div></div><div onClick={() => setDashTab('prescriptions')} className="bg-white p-6 rounded-2xl border shadow-xs hover:shadow-md transition cursor-pointer flex flex-col justify-between border-l-4 border-l-cyan-500"><div><p className="text-xs font-bold text-slate-400 uppercase">Pharmacy & Rx</p><h4 className="text-xl font-bold mt-1">Top Active Meds</h4><ul className="text-xs text-slate-600 font-medium mt-2 space-y-1"><li>• {patientData.prescriptions?.[0]?.medication || 'Metformin (500mg)'}</li><li>• {patientData.prescriptions?.[1]?.medication || 'Atorvastatin (20mg)'}</li></ul></div><span className="text-xs font-bold text-cyan-600 mt-4 inline-block hover:underline">Manage Refills ➔</span></div><div onClick={() => setDashTab('visits')} className="bg-white p-6 rounded-2xl border shadow-xs hover:shadow-md transition cursor-pointer flex flex-col justify-between border-l-4 border-l-purple-500"><div><p className="text-xs font-bold text-slate-400 uppercase">Physician Records</p><h4 className="text-xl font-bold mt-1">Recent Encounters</h4><p className="text-xs text-slate-500 line-clamp-2 mt-2">{Object.values(patientData.visits || {})?.[0]?.ai_summary || 'Standard routine checkup completed. Telemetry uploaded.'}</p></div><span className="text-xs font-bold text-purple-600 mt-4 inline-block hover:underline">Open Encounters ➔</span></div></div>
                    </div>
                  )}

                  {/* --- ☢️ RADIOLOGY & IMAGING SUITE --- */}
                  {dashTab === 'radiology' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                       <div className="bg-white p-6 rounded-2xl border flex items-center justify-between"><h3 className="text-xl font-bold flex items-center gap-2"><Scan className="text-indigo-600"/> Radiology & PACS Suite</h3><span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-3 py-1 rounded-full border border-indigo-200">Multimodal Linked</span></div>
                       {user.role === 'Provider' && (
                          <div className="bg-white p-6 rounded-2xl border shadow-xs">
                            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Upload size={16} className="text-indigo-600"/> Attach PACS/DICOM Scan Asset</h4>
                            <form onSubmit={handleRadiologyPacketSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><input type="text" placeholder="Anatomical Scan Title" required value={radioUploadAsset.title} onChange={e => setRadioUploadAsset({...radioUploadAsset, title: e.target.value})} className="w-full p-2.5 border rounded-xl bg-slate-50 font-semibold outline-none" /><input type="file" accept="image/*" required onChange={e => setRadioUploadAsset({...radioUploadAsset, file: e.target.files[0]})} className="w-full p-2 border rounded-xl bg-slate-50 text-xs mt-3" /></div><div><textarea placeholder="Physician Technical Findings..." required value={radioUploadAsset.note} onChange={e => setRadioUploadAsset({...radioUploadAsset, note: e.target.value})} className="w-full h-full p-2.5 border rounded-xl bg-slate-50 outline-none resize-none min-h-[100px]"></textarea></div><button type="submit" className="md:col-span-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl cursor-pointer">Process Radiology Packet ➔</button></form>
                          </div>
                       )}
                       <div className="space-y-4">
                         {patientData.radiology && patientData.radiology.length > 0 ? (
                           patientData.radiology.map((scan, idx) => (
                             <div key={idx} className="bg-white rounded-2xl border overflow-hidden shadow-xs"><div className="bg-slate-50 p-4 border-b flex justify-between items-center"><span className="font-black text-slate-800 text-lg">{scan.scan_title}</span><span className="text-xs font-mono text-slate-400">{scan.date} • {scan.provider}</span></div><div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-center"><div className="bg-slate-950 rounded-2xl p-4 flex flex-col items-center justify-center h-48 border-2 border-slate-800 relative overflow-hidden shadow-inner"><Scan size={64} className="text-cyan-400 animate-pulse opacity-40 absolute" /><span className="text-[10px] font-mono text-cyan-300 bg-slate-900/80 px-2 py-1 rounded border z-10">DICOM ASSET: {scan.file_name}</span></div><div className="md:col-span-2 space-y-4"><div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-100"><p className="text-xs font-extrabold text-indigo-950 uppercase mb-1 flex items-center gap-1.5"><HeartPulse size={14} className="text-indigo-600"/> AI Layperson Interpretation (For You)</p><p className="text-sm text-indigo-900 font-medium leading-relaxed">{scan.patient_explanation}</p></div><div className="bg-slate-50 p-3.5 rounded-xl border"><p className="text-[11px] font-bold text-slate-400 uppercase mb-1">Physician Technical Findings</p><p className="text-xs font-mono text-slate-700">{scan.doctor_note}</p></div></div></div></div>
                           ))
                         ) : (<div className="bg-white p-12 text-center rounded-2xl border border-dashed"><p className="text-slate-500">No radiological imaging recorded.</p></div>)}
                       </div>
                    </div>
                  )}

                  {/* --- TAB CONTENTS --- */}
                  {dashTab === 'profile' && (
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="lg:col-span-1 bg-white p-6 rounded-2xl border h-fit"><h3 className="font-bold text-lg mb-4 border-b pb-2">Personal Info</h3><p className="text-slate-500 text-sm">Age: {patientData.personal_info?.age}</p><p className="text-slate-500 text-sm">Sex: {patientData.personal_info?.gender}</p></div><div className="lg:col-span-2 bg-white p-6 rounded-2xl border"><div className="flex justify-between items-center border-b pb-2 mb-4"><h3 className="font-bold text-lg">Clinical Overview</h3>{user.role === 'Provider' && !isEditingProfile && (<button onClick={() => setIsEditingProfile(true)} className="text-sm text-blue-600 font-bold cursor-pointer"><Edit3 size={16}/></button>)}{isEditingProfile && (<button onClick={handleSaveProfile} className="text-sm bg-emerald-600 text-white px-4 py-1.5 rounded-lg font-bold cursor-pointer">Save</button>)}</div>{isEditingProfile ? (<div className="space-y-4"><input type="text" value={profileForm.allergies} onChange={e => setProfileForm({...profileForm, allergies: e.target.value})} className="w-full p-2 border rounded-lg bg-slate-50 outline-none" placeholder="Allergies" /></div>) : (<div className="space-y-6"><div><h4 className="text-sm font-bold text-red-500 mb-2">Allergies</h4><p className="text-sm">{patientData.profile?.allergies || "None"}</p></div></div>)}</div></div>
                  )}

                  {dashTab === 'visits' && (
                      <div className="space-y-6 animate-in fade-in duration-300"><div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"><h3 className="text-xl font-bold mb-2 text-slate-800 flex items-center gap-2"><Stethoscope className="text-purple-600"/> Clinical Encounters</h3></div>{patientData.visits && Object.keys(patientData.visits).length > 0 ? (Object.values(patientData.visits).sort((a, b) => new Date(b.date) - new Date(a.date)).map((visit, idx) => (<div key={idx} className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow"><div className="flex justify-between items-center border-b pb-4 mb-4"><div><h4 className="font-bold text-lg text-slate-800">Encounter: {visit.date}</h4><p className="text-sm text-slate-500">Provider: {visit.provider}</p></div></div><div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><div className="space-y-4"><div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 shadow-sm"><p className="text-xs font-bold text-emerald-700 uppercase mb-1">AI Visit Summary</p><div className="text-sm text-emerald-900 whitespace-pre-wrap">{renderFormattedText(visit.ai_summary)}</div></div>{visit.patient_note && (<div className="bg-pink-50 p-4 rounded-xl border border-pink-100 shadow-sm"><p className="text-xs font-bold text-pink-700 uppercase mb-1 flex items-center gap-1"><HeartPulse size={14}/> Patient Explanation</p><div className="text-sm text-pink-900 whitespace-pre-wrap">{renderFormattedText(visit.patient_note)}</div></div>)}{visit.ai_terminology && Object.keys(visit.ai_terminology).length > 0 && (<div className="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm"><p className="text-xs font-bold text-blue-700 uppercase mb-2 flex items-center gap-1"><BookOpen size={14}/> Terminology Guide</p><ul className="space-y-2">{Object.entries(visit.ai_terminology).map(([term, definition], i) => (<li key={i} className="text-sm text-blue-900 bg-white p-2 rounded border border-blue-50"><strong>{term}:</strong> {definition}</li>))}</ul></div>)}<div><p className="text-xs font-bold text-slate-500 uppercase mb-2">Attached Documents</p><ul className="space-y-2">{visit.documents.map((doc, i) => (<li key={i} className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 p-2 rounded border break-all"><FileText size={14} className="text-slate-400 shrink-0"/> {doc}</li>))}</ul></div></div><EncounterVoiceNote targetPatient={activePatient} visitDate={visit.date} providerName={user.real_name} noteValue={visitNotes[visit.date] || ''} setNoteValue={(val) => setVisitNotes({...visitNotes, [visit.date]: val})} onSave={() => handleSaveVisitNote(visit.date)} isPatient={user.role === 'Patient'} showToast={showToast}/></div></div>))) : (<div className="bg-white p-12 text-center rounded-2xl border border-slate-100 border-dashed"><p className="text-slate-500">No recorded encounters.</p></div>)}</div>
                  )}

                  {dashTab === 'prescriptions' && (
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300"><div className="lg:col-span-2 bg-white rounded-2xl border h-fit"><div className="bg-slate-50 px-6 py-4 border-b flex justify-between items-center"><h3 className="font-bold text-lg flex items-center gap-2"><Pill className="text-cyan-600"/> Active Medications</h3></div><div className="p-6">{patientData.prescriptions && patientData.prescriptions.length > 0 ? (<ul className="space-y-4">{patientData.prescriptions.map((rx, idx) => (<li key={idx} className="p-4 border rounded-xl bg-cyan-50 border-cyan-100 hover:shadow-md"><div className="flex justify-between mb-2"><h4 className="font-bold text-cyan-900 text-lg">{rx.medication}</h4><span className="text-xs font-bold text-cyan-600 bg-white px-2 py-1 rounded border">Ordered: {rx.date}</span></div><p className="text-sm font-semibold text-cyan-800 mb-1">Dosage: {rx.dosage}</p><p className="text-sm text-cyan-700 italic">"{rx.instructions}"</p></li>))}</ul>) : (<p className="text-slate-500 text-center py-10">No active prescriptions.</p>)}</div></div>{user.role === 'Provider' && (<div className="lg:col-span-1"><div className="bg-white p-6 rounded-2xl border"><h3 className="font-bold mb-4 flex items-center gap-2"><Edit3 className="text-cyan-600" size={20}/> New Prescription</h3><form onSubmit={handleAddPrescription} className="space-y-4"><div><input type="text" placeholder="Medication Name" required value={prescriptionInput.medication_name} onChange={e => setPrescriptionInput({...prescriptionInput, medication_name: e.target.value})} className="w-full p-2 border rounded bg-slate-50 focus:ring-2 outline-none" /></div><div><input type="text" placeholder="Dosage" required value={prescriptionInput.dosage} onChange={e => setPrescriptionInput({...prescriptionInput, dosage: e.target.value})} className="w-full p-2 border rounded bg-slate-50 focus:ring-2 outline-none" /></div><div><textarea placeholder="Instructions (Sig)" required value={prescriptionInput.instructions} onChange={e => setPrescriptionInput({...prescriptionInput, instructions: e.target.value})} className="w-full p-2 border rounded bg-slate-50 h-24 focus:ring-2 outline-none"></textarea></div><button type="submit" className="w-full bg-cyan-600 text-white font-bold py-2 rounded cursor-pointer">Prescribe</button></form></div></div>)}</div>
                  )}

                  {dashTab === 'orders' && (
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300"><div className="lg:col-span-2 bg-white rounded-2xl border h-fit"><div className="bg-slate-50 px-6 py-4 border-b flex justify-between items-center"><h3 className="font-bold text-lg flex items-center gap-2"><FileSignature className="text-pink-600"/> Orders</h3></div><div className="p-6">{patientData.ordered_tests && patientData.ordered_tests.length > 0 ? (<ul className="space-y-4">{patientData.ordered_tests.map((order, idx) => (<li key={idx} className={`p-4 border rounded-xl hover:shadow-md ${order.status === 'Pending' ? 'bg-pink-50 border-pink-100' : 'bg-slate-50 border-slate-200'}`}><div className="flex justify-between mb-2"><h4 className={`font-bold text-lg ${order.status === 'Pending' ? 'text-pink-900' : 'line-through'}`}>{order.test_name}</h4><span className="text-xs font-bold px-2 py-1 rounded border bg-white">{order.status}</span></div><p className="text-sm italic">Reason: {order.reason}</p><p className="text-xs text-slate-400 mt-2">Ordered: {order.date}</p></li>))}</ul>) : (<p className="text-slate-500 text-center py-10">No pending orders.</p>)}</div></div>{user.role === 'Provider' && (<div className="lg:col-span-1"><div className="bg-white p-6 rounded-2xl border"><h3 className="font-bold mb-4 flex items-center gap-2"><Edit3 className="text-pink-600" size={20}/> New Order</h3><form onSubmit={handleAddOrder} className="space-y-4"><div><input type="text" placeholder="Test Name" required value={orderInput.test_name} onChange={e => setOrderInput({...orderInput, test_name: e.target.value})} className="w-full p-2 border rounded bg-slate-50 outline-none" /></div><div><textarea placeholder="Clinical Reason (Dx)" required value={orderInput.reason} onChange={e => setOrderInput({...orderInput, reason: e.target.value})} className="w-full p-2 border rounded bg-slate-50 h-24 outline-none"></textarea></div><button type="submit" className="w-full bg-pink-600 text-white font-bold py-2 rounded cursor-pointer">Sign Order</button></form></div></div>)}</div>
                  )}

                  {dashTab === 'labs' && (
                     <div className="animate-in fade-in duration-300">{Object.keys(patientData.categories || {}).length > 0 ? (<><div className="flex gap-2 border-b border-slate-200 pb-2 relative z-10 overflow-x-auto">{Object.keys(patientData.categories || {}).map(category => (<button key={category} type="button" onClick={(e) => { e.preventDefault(); handleCategoryClick(category); }} className={`cursor-pointer px-4 md:px-6 py-2 rounded-t-lg font-bold whitespace-nowrap ${activeCategory === category ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{category}</button>))}</div>{patientData.categories[activeCategory]?.length > 0 && (<div className="bg-white p-4 rounded-xl border border-slate-200 flex gap-4 mt-4"><select value={selectedTestName} onChange={(e) => setSelectedTestName(e.target.value)} className="p-3 border rounded-lg bg-slate-50 font-semibold w-full focus:ring-2 outline-none">{patientData.categories[activeCategory].map(test => (<option key={test.test_name} value={test.test_name}>{test.test_name}</option>))}</select></div>)}{(() => { const activeTest = patientData.categories[activeCategory]?.find(t => t.test_name === selectedTestName); if (!activeTest) return null; const sortedHistory = [...activeTest.history].sort((a, b) => new Date(a.Date) - new Date(b.Date)); return (<div className="bg-white rounded-2xl border overflow-hidden mt-6 flex flex-col"><div className="bg-slate-50 px-6 py-4 border-b flex justify-between"><h3 className="font-bold text-lg">{activeTest.test_name} Trend Analysis</h3><span className="text-sm bg-white border px-4 py-1.5 rounded-full font-medium">Range: {activeTest.normal_min} - {activeTest.normal_max} {activeTest.unit}</span></div><div className="grid grid-cols-1 lg:grid-cols-2"><div className="p-6 border-b lg:border-r h-80"><ResponsiveContainer width="100%" height="100%"><LineChart data={sortedHistory}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="Date" tick={{fontSize: 12}} /><YAxis domain={[0, 'auto']} tick={{fontSize: 12}} /><Tooltip /><ReferenceLine y={activeTest.normal_min} stroke="#10B981" strokeDasharray="3 3" /><ReferenceLine y={activeTest.normal_max} stroke="#10B981" strokeDasharray="3 3" /><Line type="monotone" dataKey="Value" stroke="#2563EB" strokeWidth={4} /></LineChart></ResponsiveContainer></div><div className="p-6 overflow-auto h-80"><table className="w-full text-left min-w-[300px]"><thead><tr><th className="pb-3 text-xs uppercase text-slate-400 border-b">Date</th><th className="pb-3 text-xs uppercase text-slate-400 border-b">Value</th><th className="pb-3 text-xs uppercase text-slate-400 border-b">Status</th></tr></thead><tbody>{sortedHistory.map((record, i) => (<tr key={i} className="hover:bg-slate-50"><td className="py-3 text-sm font-medium border-b">{record.Date}</td><td className="py-3 text-sm font-bold border-b">{record.Value} {activeTest.unit}</td><td className="py-3 border-b"><span className={`text-xs px-2 py-1 rounded-full font-bold shadow-sm ${record.Status === 'Normal' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{record.Status}</span></td></tr>))}</tbody></table></div></div></div>); })()}</>) : (<div className="bg-white p-12 text-center rounded-2xl border"><p className="text-slate-500">No lab data available.</p></div>)}</div>
                  )}

                  {dashTab === 'growth' && (
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300"><div className="lg:col-span-2 bg-white rounded-2xl border flex flex-col h-[550px]"><div className="bg-slate-50 px-6 py-4 border-b flex justify-between items-center"><h3 className="font-bold text-lg flex items-center gap-2"><ActivitySquare className="text-orange-600"/> Vitals Trajectory</h3></div><div className="p-6 flex-grow">{patientData.vitals && patientData.vitals.length > 0 ? (<ResponsiveContainer width="100%" height="100%"><LineChart data={patientData.vitals}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="Date" tick={{fontSize: 12}} /><YAxis yAxisId="left" orientation="left" /><YAxis yAxisId="right" orientation="right" /><Tooltip /><Legend verticalAlign="top" height={36}/><Line yAxisId="left" type="monotone" dataKey="Height" stroke="#EA580C" strokeWidth={4} name="Height (cm)" /><Line yAxisId="right" type="monotone" dataKey="Weight" stroke="#0284C7" strokeWidth={4} name="Weight (kg)" /></LineChart></ResponsiveContainer>) : (<div className="h-full flex items-center justify-center"><p className="text-slate-400">No vitals logged yet.</p></div>)}</div></div><div className="lg:col-span-1 space-y-6"><div className="bg-white p-6 rounded-2xl border"><h3 className="font-bold mb-4 flex items-center gap-2"><Scale className="text-orange-500" size={20}/> Log New Vitals</h3><form onSubmit={handleLogVitals} className="space-y-4"><div className="relative flex items-center"><input type="number" step="0.1" placeholder="Height" required value={vitalsInput.height} onChange={(e) => setVitalsInput({...vitalsInput, height: e.target.value})} className="w-full p-2.5 pr-10 border rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-orange-500 font-bold" /><span className="absolute right-3 text-xs font-mono font-bold text-slate-400 pointer-events-none">cm</span></div><div className="relative flex items-center"><input type="number" step="0.1" placeholder="Weight" required value={vitalsInput.weight} onChange={(e) => setVitalsInput({...vitalsInput, weight: e.target.value})} className="w-full p-2.5 pr-10 border rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-orange-500 font-bold" /><span className="absolute right-3 text-xs font-mono font-bold text-slate-400 pointer-events-none">kg</span></div><button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl shadow-sm cursor-pointer">Save to Trajectory</button></form>{patientData.vitals && patientData.vitals.length > 0 && (<div className="mt-4 p-3 bg-orange-50 rounded-lg text-center"><p className="text-sm text-orange-800 font-bold mb-1">Current BMI</p><p className="text-2xl text-orange-600 font-black">{patientData.vitals[patientData.vitals.length-1].BMI}</p></div>)}</div></div></div>
                  )}

                  {dashTab === 'vaccines' && (
                     <div className="bg-white p-8 rounded-2xl border animate-in fade-in duration-300"><h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Syringe className="text-indigo-600"/> Immunization Record</h3>{patientData.vaccines && patientData.vaccines.length > 0 ? (<div className="grid grid-cols-1 md:grid-cols-2 gap-4">{patientData.vaccines.map((vac, idx) => (<div key={idx} className="p-5 border rounded-xl bg-slate-50 flex flex-col justify-between"><div className="flex justify-between items-start mb-4"><h4 className="font-bold text-lg">{vac.name}</h4><span className="text-xs font-bold px-3 py-1 rounded-full bg-white border">{vac.status}</span></div><div className="flex justify-between text-sm text-slate-600"><span>Given: {vac.date_administered}</span><span>Expires: {vac.expiration_date}</span></div></div>))}</div>) : (<p className="text-slate-500 py-10 text-center">No records found.</p>)}</div>
                  )}

                  {dashTab === 'diseases' && (
                     <div className="bg-white p-8 rounded-2xl border overflow-x-auto animate-in fade-in duration-300"><h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Bug className="text-rose-600"/> Screenings</h3>{patientData.diseases && patientData.diseases.length > 0 ? (<table className="w-full text-left min-w-[400px]"><thead className="bg-slate-50 border-b"><tr><th className="p-4">Condition</th><th className="p-4">Date Tested</th><th className="p-4">Result</th></tr></thead><tbody>{patientData.diseases.map((dis, idx) => (<tr key={idx} className="border-b hover:bg-slate-50"><td className="p-4 font-semibold">{dis.name}</td><td className="p-4 text-slate-600">{dis.date_tested}</td><td className="p-4"><span className="font-bold px-3 py-1 rounded-full text-sm bg-white border">{dis.result}</span></td></tr>))}</tbody></table>) : (<p className="text-slate-500 py-10 text-center">No records found.</p>)}</div>
                  )}
                </div>
              )}

              {/* 📂 RESTORED UPLOAD VIEW */}
              {view === 'upload' && activePatient && (
                <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-slate-100 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <Upload size={36} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 mb-2">Upload Diagnostic Document</h3>
                  <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
                    Select a standardized lab report, external clinical notes, or medical imaging release for <strong className="text-blue-600 font-bold">{activePatient}</strong>.
                  </p>
                  <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-8 rounded-xl inline-flex items-center gap-2 shadow-md transition-all active:scale-[0.98]">
                    <Upload size={18} />
                    <span>Select File to Parse</span>
                    <input type="file" onChange={handleFileUpload} className="hidden" />
                  </label>
                  <p className="text-[11px] text-slate-400 font-mono mt-6">Supports PDF, PNG, JPG, and raw clinical document scans.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- 2. THE FLOATING ACCESSIBILITY OS GEAR SUITE --- */}
      {accDrawerOpen && (
        <div className="fixed inset-0 z-[9999999] bg-slate-900/70 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white h-full shadow-2xl p-6 overflow-y-auto flex flex-col justify-between animate-in slide-in-from-right duration-300">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                <div><h3 className="font-black text-2xl text-slate-800 flex items-center gap-2"><Settings className="text-blue-600"/> Accessibility Suite</h3><p className="text-xs text-slate-400 font-mono">WCAG AAA Compliance Suite</p></div>
                <button onClick={() => setAccDrawerOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 font-bold flex items-center justify-center hover:bg-slate-200 cursor-pointer">✕</button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5"><Languages size={14}/> Instant Browser Translation</label>
                  <div id="cliniport_google_translate_element" className="min-h-[42px] w-full bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-center font-bold"></div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5"><Palette size={14}/> Color Contrast Themes</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => handleThemeChange('light')} className={`p-3 rounded-xl border font-bold text-xs cursor-pointer ${themeMode === 'light' ? 'bg-blue-600 text-white border-blue-700' : 'bg-slate-50 text-slate-700'}`}>☀️ Light</button>
                    <button onClick={() => handleThemeChange('dark')} className={`p-3 rounded-xl border font-bold text-xs cursor-pointer ${themeMode === 'dark' ? 'bg-blue-600 text-white border-blue-700' : 'bg-slate-900 text-slate-200 border-slate-800'}`}>🌙 OLED Dark</button>
                    <button onClick={() => handleThemeChange('contrast')} className={`p-3 rounded-xl border font-bold text-xs cursor-pointer ${themeMode === 'contrast' ? 'bg-blue-600 text-white border-blue-700' : 'bg-black text-yellow-300 border-yellow-400'}`}>⚡ AAA Max</button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5"><Type size={14}/> Typography & Dyslexia Mode</label>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <button onClick={() => handleFontChange('sm')} className={`p-3 rounded-xl border font-bold text-xs cursor-pointer ${fontSizeMode === 'sm' ? 'bg-blue-600 text-white' : 'bg-slate-50'}`}>Small (12px)</button>
                    <button onClick={() => handleFontChange('md')} className={`p-3 rounded-xl border font-bold text-sm cursor-pointer ${fontSizeMode === 'md' ? 'bg-blue-600 text-white' : 'bg-slate-50'}`}>Standard (16px)</button>
                    <button onClick={() => handleFontChange('lg')} className={`p-3 rounded-xl border font-bold text-lg cursor-pointer ${fontSizeMode === 'lg' ? 'bg-blue-600 text-white' : 'bg-slate-50'}`}>Large (18px)</button>
                    <button onClick={() => handleFontChange('xl')} className={`p-3 rounded-xl border font-bold text-xl cursor-pointer ${fontSizeMode === 'xl' ? 'bg-blue-600 text-white' : 'bg-slate-50'}`}>Extra Large</button>
                  </div>
                  <button onClick={() => handleFontChange('dyslexia')} className={`w-full p-3.5 rounded-xl border font-mono tracking-widest font-black text-sm cursor-pointer ${fontSizeMode === 'dyslexia' ? 'bg-amber-500 text-slate-950 border-amber-600' : 'bg-amber-50 text-amber-900 border-amber-200'}`}>
                    OpenDyslexic Calibrated Shift
                  </button>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5"><Eye size={14}/> Daltonization Correction</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => handleCbChange('none')} className={`p-3 rounded-xl border font-bold text-xs cursor-pointer ${colorblindMode === 'none' ? 'bg-blue-600 text-white' : 'bg-slate-50'}`}>Standard Spectrum</button>
                    <button onClick={() => handleCbChange('protanopia')} className={`p-3 rounded-xl border font-bold text-xs cursor-pointer ${colorblindMode === 'protanopia' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-900'}`}>Protanopia (Red-Blind)</button>
                    <button onClick={() => handleCbChange('deuteranopia')} className={`p-3 rounded-xl border font-bold text-xs cursor-pointer ${colorblindMode === 'deuteranopia' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-900'}`}>Deuteranopia (Green-Blind)</button>
                    <button onClick={() => handleCbChange('tritanopia')} className={`p-3 rounded-xl border font-bold text-xs cursor-pointer ${colorblindMode === 'tritanopia' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-900'}`}>Tritanopia (Blue-Blind)</button>
                  </div>
                </div>

                {/* --- 💥 THE MASTER ACCESSIBILITY HARD RESET BUTTON --- */}
                <div className="pt-4 border-t border-slate-200">
                  <button onClick={hardResetApp} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]">
                    <RefreshCw size={18} /> <span>💥 Full System Hard Reset</span>
                  </button>
                </div>
              </div>
            </div>

            <button onClick={() => setAccDrawerOpen(false)} className="w-full bg-slate-900 hover:bg-slate-950 text-white font-bold py-3.5 rounded-xl shadow-md cursor-pointer mt-8">Save Preferences & Close</button>
          </div>
        </div>
      )}

      {/* OVERLAYS */}
      {isSaving && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-[99999] flex flex-col justify-center items-center text-white px-4 animate-in fade-in duration-300">
          <div className="bg-slate-900 p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm w-full text-center border border-slate-800">
            <EcgLoader size={48} className="mb-4" />
            <h3 className="text-white font-bold text-lg mb-1">Processing Payload</h3>
            <button onClick={() => { setIsSaving(false); showToast("Aborted.", "info"); }} className="mt-8 text-xs font-semibold text-slate-500 hover:text-rose-400 underline cursor-pointer">Taking too long? Cancel request</button>
          </div>
        </div>
      )}
    </div>
  );
}
