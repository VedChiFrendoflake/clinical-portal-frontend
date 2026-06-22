import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import { Activity, Upload, User, ShieldCheck, UserPlus, Search, Users, ActivitySquare, Syringe, Bug, FlaskConical, AlertTriangle, Ruler, Scale, ClipboardList, Edit3, Save, Stethoscope, FileText, Pill, FileSignature, Settings, Link as LinkIcon, Inbox, Bell, Trash2, Mic, Square, BookOpen, HeartPulse } from 'lucide-react';

const BACKEND_URL = "https://clinical-portal-backend-production.up.railway.app";

// --- 🫀 SUB-COMPONENT: LEFT-TO-RIGHT ECG LOADER ---
const EcgLoader = ({ size = 48, className = "" }) => (
  <div className={`relative inline-block ${className}`} style={{ width: size, height: size }}>
    <Activity size={size} className="text-slate-200 absolute inset-0" />
    <Activity size={size} className="text-blue-600 absolute inset-0 animate-ecg" />
  </div>
);

// --- 🎙️ SUB-COMPONENT: AI VOICE DICTATION FOR PROVIDERS ---
const EncounterVoiceNote = ({ targetPatient, visitDate, providerName, noteValue, setNoteValue, patientNoteValue, setPatientNoteValue, onSave, isPatient }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await uploadVoiceNote(audioBlob);
      };
      mediaRecorderRef.current.start(); setIsRecording(true);
    } catch (err) { alert("Microphone access denied."); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop(); setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
  };

  const uploadVoiceNote = async (audioBlob) => {
    setIsProcessing(true);
    const formData = new FormData();
    formData.append("file", audioBlob, "dictation.webm"); formData.append("target_patient", targetPatient);
    formData.append("visit_date", visitDate); formData.append("provider_name", providerName);
    try {
      const res = await fetch(`${BACKEND_URL}/api/visit/voice`, { method: "POST", body: formData });
      const data = await res.json();
      if (data.status === "success") {
          setNoteValue(data.doctor_note);
          setPatientNoteValue(data.patient_note);
      }
      else alert("AI Failed: " + data.message);
    } catch (err) { alert("Upload failed."); } finally { setIsProcessing(false); }
  };

  if (isPatient) {
    return (
      <div className="flex flex-col h-full gap-4">
        {patientNoteValue && (
            <div className="bg-pink-50 p-4 rounded-xl border border-pink-100 shadow-sm">
                <p className="text-xs font-bold text-pink-700 uppercase mb-2 flex items-center gap-1"><HeartPulse size={14}/> Doctor's Note (For You)</p>
                <div className="text-sm text-pink-900 whitespace-pre-wrap">{patientNoteValue}</div>
            </div>
        )}
        <div className="flex-grow">
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Original Clinical Note</p>
            <textarea value={noteValue || 'No clinical notes recorded for this visit.'} readOnly className="w-full h-32 p-3 border rounded-lg bg-slate-50 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none"></textarea>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[200px] gap-2">
      <div className="flex justify-between items-center mb-1">
        <p className="text-xs font-bold text-slate-500 uppercase">Physician Encounter Note</p>
        <button onClick={isRecording ? stopRecording : startRecording} disabled={isProcessing} className={`px-3 py-1.5 rounded-full text-xs font-bold text-white flex items-center gap-1 shadow-sm ${isRecording ? "bg-red-500 animate-pulse" : isProcessing ? "bg-slate-400" : "bg-blue-600 hover:bg-blue-700"}`}>
          {isRecording ? <><Square size={12}/> Stop & Process</> : isProcessing ? "🤖 Processing..." : <><Mic size={12}/> Dictate Note</>}
        </button>
      </div>
      <textarea value={noteValue} onChange={(e) => setNoteValue(e.target.value)} placeholder="Type clinical notes manually, or dictate to let AI generate both Clinical & Patient versions..." className="w-full flex-grow p-3 border rounded-lg bg-white text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none min-h-[100px] mb-3"></textarea>
      
      {patientNoteValue && (
          <div className="bg-pink-50 p-3 rounded-lg border border-pink-100">
              <p className="text-[10px] font-bold text-pink-700 uppercase mb-1 flex items-center gap-1"><HeartPulse size={12}/> AI Generated Patient Note</p>
              <textarea value={patientNoteValue} onChange={(e) => setPatientNoteValue(e.target.value)} className="w-full p-2 border rounded bg-white text-xs outline-none min-h-[60px] resize-none focus:ring-2 focus:ring-pink-500"></textarea>
          </div>
      )}

      <button onClick={onSave} className="w-full bg-purple-600 text-white font-bold py-2 rounded-lg hover:bg-purple-700 transition shadow-sm flex items-center justify-center gap-2"><Save size={16}/> Save Visit Note</button>
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
          if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
          return <span key={i}>{part}</span>;
        })}
      </div>
    );
  });
};

export default function App() {
  const [splashState, setSplashState] = useState('visible');
  const [user, setUser] = useState(() => { const savedUser = localStorage.getItem('cliniport_user'); return savedUser ? JSON.parse(savedUser) : null; });
  const [view, setView] = useState(user ? 'loading_session' : 'login'); 
  const [textSize, setTextSize] = useState('normal'); 
  const [authError, setAuthError] = useState(''); 
  const [isLoading, setIsLoading] = useState(false); 
  
  const [username, setUsername] = useState(''); const [password, setPassword] = useState('');
  const [regName, setRegName] = useState(''); const [regRole, setRegRole] = useState('Patient');
  const [regAge, setRegAge] = useState(''); const [regGender, setRegGender] = useState('Male');
  const [regEmail, setRegEmail] = useState(''); const [regPhone, setRegPhone] = useState('');
  
  const [activePatient, setActivePatient] = useState(''); 
  const [patientData, setPatientData] = useState({ ai_summary: '', categories: {}, vaccines: [], diseases: [], uploaded_files: [], vitals: [], personal_info: {}, profile: {}, visits: {}, prescriptions: [], ordered_tests: [] });
  const [activeCategory, setActiveCategory] = useState(''); const [selectedTestName, setSelectedTestName] = useState(''); 
  const [searchQuery, setSearchQuery] = useState(''); const [dashTab, setDashTab] = useState('profile'); 

  const [connectIdInput, setConnectIdInput] = useState('');
  const [providerRoster, setProviderRoster] = useState([]); 
  const [familyMembers, setFamilyMembers] = useState([]);
  const [newFamilyMember, setNewFamilyMember] = useState({ name: '', age: '', gender: 'Male', username: '', password: '' });

  const [pendingRequests, setPendingRequests] = useState([]); const [notifications, setNotifications] = useState([]);
  const prevNotifCount = useRef(0); const prevReqCount = useRef(0);

  const [isIdUnlocked, setIsIdUnlocked] = useState(false); const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState(''); const [isUnlocking, setIsUnlocking] = useState(false);

  const [scanModal, setScanModal] = useState(null); const [selectedScanPatient, setSelectedScanPatient] = useState('');
  const [isScanning, setIsScanning] = useState(false); const [isSaving, setIsSaving] = useState(false);

  const [vitalsInput, setVitalsInput] = useState({ height: '', weight: '' });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ genetic_conditions: '', chronic_diseases: '', allergies: '', notes: '' });
  const [visitNotes, setVisitNotes] = useState({});
  const [visitPatientNotes, setVisitPatientNotes] = useState({});
  const [prescriptionInput, setPrescriptionInput] = useState({ medication_name: '', dosage: '', instructions: '' });
  const [orderInput, setOrderInput] = useState({ test_name: '', reason: '' });

  const hardResetApp = async () => {
    if ('serviceWorker' in navigator) { const regs = await navigator.serviceWorker.getRegistrations(); for (let r of regs) await r.unregister(); }
    if ('caches' in window) { const cacheNames = await caches.keys(); for (let c of cacheNames) await caches.delete(c); }
    localStorage.clear(); window.location.reload(true); 
  };

  useEffect(() => {
    const fadeTimer = setTimeout(() => { setSplashState('fading'); }, 2000);
    const hideTimer = setTimeout(() => { setSplashState('hidden'); }, 2500);
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") Notification.requestPermission();
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer); };
  }, []);

  const generateUID = (name, role) => {
    const parts = name.trim().split(' '); const initials = parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : (name.substring(0, 2)).toUpperCase();
    return role === 'Patient' ? `${initials}${Math.floor(100000 + Math.random() * 900000)}` : `D${initials}${Math.floor(1000 + Math.random() * 9000)}`;
  };

  useEffect(() => {
    if (user && view === 'loading_session') {
      if (user.role === 'Patient') {
        setActivePatient(user.real_name); fetchPatientData(user.real_name); fetchPendingRequests(user.uid); fetchNotifications(user.uid); fetchFamilyMembers(user.uid); setView('dashboard');
      } else { fetchRoster(user.uid); setView('provider_roster'); }
    }
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== 'Patient') return;
    const interval = setInterval(() => { fetchPendingRequests(user.uid); fetchNotifications(user.uid); }, 5000); 
    return () => clearInterval(interval);
  }, [user]);

  const fetchPendingRequests = async (uid) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/connect/pending/${uid}`);
      if (res.ok) { 
          const data = await res.json(); setPendingRequests(data); 
          if (data.length > prevReqCount.current && prevReqCount.current !== 0 && Notification.permission === 'granted') new Notification("New Connection Request", { body: `Dr. ${data[data.length-1].doctorName} is requesting chart access.`, icon: '/logo192.png' });
          prevReqCount.current = data.length;
      }
    } catch (err) { }
  };

  const fetchNotifications = async (uid) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/notifications/${uid}`);
      if (res.ok) { 
          const data = await res.json(); setNotifications(data); 
          if (data.length > prevNotifCount.current && prevNotifCount.current !== 0 && Notification.permission === 'granted') new Notification(data[0].title, { body: data[0].message, icon: '/logo192.png' });
          prevNotifCount.current = data.length;
      }
    } catch (err) { }
  };

  const handleClearNotifications = async () => { try { await fetch(`${BACKEND_URL}/api/notifications/clear/${user.uid}`, { method: 'POST' }); setNotifications([]); prevNotifCount.current = 0; } catch (e) {} };

  useEffect(() => {
    if (patientData.profile) setProfileForm(patientData.profile);
    if (patientData.visits) {
      const initialDNotes = {}; const initialPNotes = {};
      Object.values(patientData.visits).forEach(v => { initialDNotes[v.date] = v.doctor_note || ''; initialPNotes[v.date] = v.patient_note || ''; });
      setVisitNotes(initialDNotes); setVisitPatientNotes(initialPNotes);
    }
  }, [patientData]);

  const fetchFamilyMembers = async (uid) => { try { const res = await fetch(`${BACKEND_URL}/api/family/${uid}`); if (res.ok) setFamilyMembers(await res.json()); } catch (err) { } };
  const fetchRoster = async (uid) => { try { const res = await fetch(`${BACKEND_URL}/api/roster/${uid}`); if (res.ok) setProviderRoster(await res.json()); } catch (err) { } };

  const handleLogin = async (e) => {
    e.preventDefault(); setAuthError(''); setIsLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
      if (!res.ok) throw new Error("Invalid username or password.");
      const data = await res.json();
      if (!data.uid) data.uid = generateUID(data.real_name, data.role);
      setTimeout(() => {
        setIsLoading(false); setUser(data); localStorage.setItem('cliniport_user', JSON.stringify(data)); setIsIdUnlocked(false);
        if (data.role === 'Patient') { setActivePatient(data.real_name); fetchPatientData(data.real_name); fetchPendingRequests(data.uid); fetchNotifications(data.uid); fetchFamilyMembers(data.uid); setView('dashboard');
        } else { fetchRoster(data.uid); setView('provider_roster'); }
      }, 800);
    } catch (err) { setIsLoading(false); setAuthError("Failed to connect or invalid credentials."); }
  };

  const handleRegister = async (e) => {
    e.preventDefault(); setAuthError(''); setIsLoading(true);
    const generatedUID = generateUID(regName, regRole);
    try {
      const res = await fetch(`${BACKEND_URL}/api/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password, real_name: regName, role: regRole, uid: generatedUID, age: regRole === 'Patient' ? parseInt(regAge) : null, gender: regRole === 'Patient' ? regGender : null, email: regRole === 'Patient' ? regEmail : null, phone: regRole === 'Patient' ? regPhone : null }) });
      if (!res.ok) throw new Error("Username already exists.");
      setTimeout(() => { setIsLoading(false); alert(`Account created!\nYour ID is: ${generatedUID}`); setView('login'); setPassword(''); }, 800);
    } catch (err) { setIsLoading(false); setAuthError(err.message); }
  };

  const handleAddFamilyMember = async (e) => {
    e.preventDefault();
    if (!newFamilyMember.username || !newFamilyMember.password) return;
    const childUid = generateUID(newFamilyMember.name, 'Patient');
    try {
      const res = await fetch(`${BACKEND_URL}/api/family/add`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parent_uid: user.uid, name: newFamilyMember.name, age: parseInt(newFamilyMember.age), gender: newFamilyMember.gender, child_uid: childUid, username: newFamilyMember.username, password: newFamilyMember.password }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.detail);
      alert(data.message); fetchFamilyMembers(user.uid); setNewFamilyMember({ name: '', age: '', gender: 'Male', username: '', password: '' }); setView('dashboard');
    } catch (err) { alert(err.message); }
  };

  const handleUnlockId = async (e) => {
    e.preventDefault(); setUnlockError(''); setIsUnlocking(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: user.username, password: unlockPassword }) });
      if (!res.ok) throw new Error("Incorrect passcode.");
      setIsIdUnlocked(true); setUnlockPassword(''); setTimeout(() => setIsIdUnlocked(false), 30000); 
    } catch (err) { setUnlockError(err.message); } finally { setIsUnlocking(false); }
  };

  const handleRequestConnection = async (e) => {
    e.preventDefault(); if (!connectIdInput) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/connect/request`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider_uid: user.uid, patient_uid: connectIdInput, provider_name: user.real_name }) });
      const data = await res.json(); alert(data.message); setConnectIdInput('');
    } catch (err) { alert("Failed to send request."); }
  };

  const handleAcceptRequest = async (req) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/connect/accept`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider_uid: req.doctorId, patient_uid: req.target_uid || user.uid }) });
      const data = await res.json(); alert(data.message); fetchPendingRequests(user.uid);
    } catch (err) { alert("Failed to authorize."); }
  };

  const fetchPatientData = async (name) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/patient/${encodeURIComponent(name)}`);
      const data = await res.json(); setPatientData(data); setActivePatient(name);
      if (data.categories && Object.keys(data.categories).length > 0) {
          const firstCat = Object.keys(data.categories)[0]; setActiveCategory(firstCat);
          if (data.categories[firstCat].length > 0) setSelectedTestName(data.categories[firstCat][0].test_name);
      }
      setDashTab('profile'); setView('dashboard');
    } catch (err) {}
  };

  const processDocumentUpload = async (file, target, force = 'false') => {
    const formData = new FormData(); formData.append('file', file); formData.append('target_patient', target); formData.append('uploader_name', user?.real_name || "System"); formData.append('force_override', force); 
    try {
      const res = await fetch(`${BACKEND_URL}/api/upload`, { method: 'POST', body: formData }); const data = await res.json();
      if (data.status === 'warning') { const proceed = window.confirm(`An encounter record already exists for today. Append document for ${target}?`); if (proceed) await processDocumentUpload(file, target, 'true'); return; }
      fetchPatientData(target); 
    } catch(err) { alert("Upload failed."); }
  };

  const handleSmartScan = async (file) => {
    const formData = new FormData(); formData.append('file', file);
    if (user.role === 'Provider') formData.append('provider_uid', user.uid); else formData.append('patient_uid', user.uid);
    try {
        const res = await fetch(`${BACKEND_URL}/api/predict-patient`, { method: 'POST', body: formData }); const data = await res.json(); setIsScanning(false);
        if (data.matched_patients && data.matched_patients.length > 0) { setScanModal({ type: 'file', patients: data.matched_patients, payload: file }); setSelectedScanPatient(data.matched_patients[0]); } else { setScanModal({ type: 'manual_file', payload: file }); setSelectedScanPatient(''); }
    } catch (err) { setIsScanning(false); setScanModal({ type: 'manual_file', payload: file }); setSelectedScanPatient(''); }
  };

  const handleTextSmartScan = async (textString) => {
    const formData = new FormData(); formData.append('text_payload', textString);
    if (user.role === 'Provider') formData.append('provider_uid', user.uid); else formData.append('patient_uid', user.uid); 
    try {
        const res = await fetch(`${BACKEND_URL}/api/predict-patient`, { method: 'POST', body: formData }); const data = await res.json(); setIsScanning(false);
        if (data.matched_patients && data.matched_patients.length > 0) { setScanModal({ type: 'text', patients: data.matched_patients, payload: textString }); setSelectedScanPatient(data.matched_patients[0]); } else { setScanModal({ type: 'manual_text', payload: textString }); setSelectedScanPatient(''); }
    } catch (e) { setIsScanning(false); setScanModal({ type: 'manual_text', payload: textString }); setSelectedScanPatient(''); }
  };

  const confirmScanModal = async () => {
      if (!scanModal) return; const target = selectedScanPatient;
      if (!target) return alert("Please select a patient to save this to.");
      setIsSaving(true); 
      if (scanModal.type === 'text' || scanModal.type === 'manual_text') {
          try { await fetch(`${BACKEND_URL}/api/visit/note`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target_patient: target, visit_date: new Date().toISOString().split('T')[0], note: `[Shared Text Message]:\n${scanModal.payload}`, provider_name: user?.real_name || "Unknown Provider" }) }); fetchPatientData(target); } catch(e) { }
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

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const target = activePatient; if (!target) return alert("Please select a patient first.");
    const proceed = window.confirm(`Upload this document for ${target}?`); if (!proceed) { e.target.value = null; return; }
    setIsSaving(true); await processDocumentUpload(file, target); setIsSaving(false); e.target.value = null; 
  };

  const handleSaveProfile = async () => {
    try { const res = await fetch(`${BACKEND_URL}/api/profile`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target_patient: activePatient, ...profileForm }) }); const data = await res.json(); alert(data.message); setIsEditingProfile(false); fetchPatientData(activePatient); } catch (err) { alert("Failed to update profile."); }
  };

  const handleSaveVisitNote = async (date) => {
    try { 
        const res = await fetch(`${BACKEND_URL}/api/visit/note`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target_patient: activePatient, visit_date: date, note: visitNotes[date], patient_note: visitPatientNotes[date], provider_name: user?.real_name || "Unknown Provider" }) }); 
        const data = await res.json(); alert(data.message); fetchPatientData(activePatient); 
    } catch (err) { alert("Failed to save note."); }
  };

  const handleLogVitals = async (e) => {
    e.preventDefault();
    try { await fetch(`${BACKEND_URL}/api/vitals`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target_patient: activePatient, height_cm: parseFloat(vitalsInput.height), weight_kg: parseFloat(vitalsInput.weight) }) }); setVitalsInput({ height: '', weight: '' }); fetchPatientData(activePatient); } catch (err) {}
  };

  const handleAddPrescription = async (e) => {
    e.preventDefault();
    try { await fetch(`${BACKEND_URL}/api/prescriptions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target_patient: activePatient, ...prescriptionInput }) }); setPrescriptionInput({ medication_name: '', dosage: '', instructions: '' }); fetchPatientData(activePatient); } catch (err) {}
  };

  const handleAddOrder = async (e) => {
    e.preventDefault();
    try { await fetch(`${BACKEND_URL}/api/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target_patient: activePatient, ...orderInput }) }); setOrderInput({ test_name: '', reason: '' }); fetchPatientData(activePatient); } catch (err) {}
  };

  const totalUnreadCount = pendingRequests.length + notifications.length;

  return (
    <div className={`min-h-screen bg-slate-50 text-slate-800 font-sans ${textSize === 'large' ? 'text-lg' : 'text-base'}`}>
      <style>{`
        @keyframes dropIn { 0% { transform: translateY(-100vh) scaleY(1.5); opacity: 0; } 60% { opacity: 1; } 100% { transform: translateY(0) scale(1); opacity: 1; } } 
        @keyframes splashOut { 0% { transform: scale(0); opacity: 0.8; } 100% { transform: scale(25); opacity: 0; display: none; } } 
        .liquid-drop { animation: dropIn 0.6s cubic-bezier(0.25, 1, 0.5, 1) forwards; } 
        .liquid-ripple-1 { animation: splashOut 1.2s cubic-bezier(0.1, 0.8, 0.3, 1) forwards; animation-delay: 0.5s; } 
        .liquid-ripple-2 { animation: splashOut 1.2s cubic-bezier(0.1, 0.8, 0.3, 1) forwards; animation-delay: 0.65s; }
        @keyframes ecgWipe { 0% { clip-path: inset(0 100% 0 0); } 50% { clip-path: inset(0 0 0 0); } 100% { clip-path: inset(0 0 0 100%); } }
        .animate-ecg { animation: ecgWipe 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
      `}</style>
      
      {splashState !== 'hidden' && (
        <div className={`fixed inset-0 z-[99999] flex items-center justify-center bg-blue-50 transition-opacity duration-700 ${splashState === 'fading' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <div className="absolute w-8 h-12 bg-blue-500 rounded-[50%_50%_50%_50%/60%_60%_40%_40%] liquid-drop shadow-xl"></div><div className="absolute w-24 h-24 border-8 border-blue-400 rounded-full opacity-0 liquid-ripple-1"></div><div className="absolute w-24 h-24 bg-blue-300 rounded-full opacity-0 liquid-ripple-2"></div>
        </div>
      )}

      {view === 'loading_session' ? (
        <div className="flex flex-col justify-center items-center min-h-screen bg-slate-50">
          <EcgLoader size={48} className="mb-4" />
          <p className="text-sm font-semibold text-slate-500 tracking-wide">Restoring Session...</p>
        </div>
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
                  <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg flex items-center justify-center h-12 shadow-md">{isLoading ? "Authenticating..." : "Secure Login"}</button>
                </form>
                <p className="text-center text-sm text-slate-500 mt-6">Don't have an account? <button type="button" onClick={() => {setView('register'); setAuthError('');}} className="text-blue-600 font-bold hover:underline">Sign up</button></p>
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
                  {regRole === 'Patient' && (
                    <div className="flex gap-2"><input type="number" placeholder="Age" required className="w-full sm:w-1/3 p-3 border rounded-lg bg-slate-50" value={regAge} onChange={e => setRegAge(e.target.value)} /><select className="w-full sm:w-2/3 p-3 border rounded-lg bg-slate-50" value={regGender} onChange={e => setRegGender(e.target.value)}><option value="Male">Male</option><option value="Female">Female</option></select></div>
                  )}
                  <input type="text" placeholder="Choose Username" required className="w-full p-3 border rounded-lg bg-slate-50 mt-4 focus:ring-2" value={username} onChange={e => setUsername(e.target.value)} />
                  <input type="password" placeholder="Choose Password" required className="w-full p-3 border rounded-lg bg-slate-50 focus:ring-2" value={password} onChange={e => setPassword(e.target.value)} />
                  <button type="submit" disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg flex items-center justify-center shadow-md mt-2">{isLoading ? "Registering..." : "Register Now"}</button>
                </form>
                <p className="text-center text-sm text-slate-500 mt-6">Already have an account? <button type="button" onClick={() => {setView('login'); setAuthError('');}} className="text-emerald-600 font-bold hover:underline">Back to Login</button></p>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in duration-700">
          <nav className="bg-white shadow-sm border-b px-4 md:px-8 py-4 flex flex-wrap gap-4 justify-between items-center fixed w-full z-20 top-0">
            <h1 className="text-xl font-bold text-blue-600 flex items-center gap-2"><Activity /> ClinicalPortal</h1>
            <div className="flex gap-3 md:gap-4 items-center">
              <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full hidden sm:block">ID: {isIdUnlocked ? user.uid : '••••••••'}</span>
              <button onClick={() => setTextSize(textSize === 'normal' ? 'large' : 'normal')} className="text-slate-400 hover:text-blue-600"><Settings size={18} /></button>
              <span className="text-xs md:text-sm font-medium bg-slate-100 px-3 py-1 rounded-full">{user.real_name}</span>
              <button onClick={() => { localStorage.removeItem('cliniport_user'); setUser(null); setView('login'); }} className="text-sm text-slate-500 hover:text-red-500 font-medium">Log Out</button>
            </div>
          </nav>

          <div className="pt-[110px] lg:pt-28 px-4 md:px-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8 pb-12">
            
            <div className="col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit lg:sticky lg:top-28">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-12 w-12 bg-blue-100 text-blue-600 flex items-center justify-center rounded-full font-bold text-xl"><User /></div>
                <div><p className="font-bold text-slate-800 leading-tight">{user.real_name}</p><p className="text-xs text-slate-500 font-mono">{user.role}</p></div>
              </div>
              
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 text-center">
                  <p className="text-xs text-slate-500 uppercase font-bold mb-1">Your CliniPort ID</p>
                  <p className="text-lg font-mono font-black text-blue-700 tracking-wider mb-2">{isIdUnlocked ? user.uid : '••••••••'}</p>
                  {!isIdUnlocked ? (
                      <form onSubmit={handleUnlockId} className="flex flex-col gap-2 mt-2">
                          <input type="password" placeholder="Passcode to reveal" value={unlockPassword} onChange={(e) => setUnlockPassword(e.target.value)} className="w-full text-xs p-2 border rounded focus:ring-2 text-center" required />
                          <button type="submit" disabled={isUnlocking} className="w-full bg-slate-800 text-white text-xs font-bold py-2 rounded">{isUnlocking ? 'Unlocking...' : 'Unlock ID'}</button>
                      </form>
                  ) : (<button onClick={() => setIsIdUnlocked(false)} className="text-xs font-bold text-blue-600 hover:underline">Lock Now</button>)}
              </div>
              <hr className="mb-4 border-slate-100" />

              {user.role === 'Patient' && (
                <div className="mb-4">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2 px-1">My Family</p>
                  <ul className="space-y-1 mb-3">
                    {familyMembers.map((member, idx) => (
                      <li key={idx}><button onClick={() => { fetchPatientData(member.name); setView('dashboard'); }} className={`w-full text-left p-2 rounded-lg text-sm ${activePatient === member.name ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50 text-slate-600'}`}>{member.name}</button></li>
                    ))}
                  </ul>
                  <button onClick={() => setView('add_family_member')} className="w-full text-left p-2 rounded-lg text-sm text-emerald-600 hover:bg-slate-50 flex items-center gap-2"><UserPlus size={16}/> Add Member</button>
                  <hr className="my-4 border-slate-100" />
                </div>
              )}

              <ul className="space-y-2">
                {user.role === 'Provider' && (
                   <>
                     <li><button onClick={() => {fetchRoster(user.uid); setView('provider_roster');}} className={`w-full text-left p-3 rounded-xl flex items-center gap-2 ${view === 'provider_roster' ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50'}`}><Users size={18}/> My Roster</button></li>
                     <li><button onClick={() => setView('provider_search')} className={`w-full text-left p-3 rounded-xl flex items-center gap-2 ${view === 'provider_search' ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50'}`}><Search size={18}/> Search</button></li>
                   </>
                )}
                {user.role === 'Patient' && (
                     <li><button onClick={() => setView('patient_inbox')} className={`w-full text-left p-3 rounded-xl flex justify-between ${view === 'patient_inbox' ? 'bg-emerald-50 text-emerald-700 font-bold' : 'hover:bg-slate-50'}`}><span className="flex items-center gap-2"><Bell size={18}/> Inbox</span>{totalUnreadCount > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{totalUnreadCount}</span>}</button></li>
                )}
                {activePatient && (
                  <li><button onClick={() => setView('upload')} className={`w-full text-left p-3 rounded-xl flex items-center gap-2 ${view === 'upload' ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50'}`}><Upload size={18}/> Upload Document</button></li>
                )}
              </ul>
            </div>

            <div className="col-span-1 lg:col-span-3 space-y-6">

              {view === 'add_family_member' && (
                 <div className="bg-white p-6 md:p-10 rounded-2xl shadow-sm border">
                   <h3 className="text-xl font-bold mb-2 flex items-center gap-2"><UserPlus className="text-emerald-600"/> Add Family Member</h3>
                   <form onSubmit={handleAddFamilyMember} className="space-y-4">
                      <div><input type="text" placeholder="Full Legal Name" required value={newFamilyMember.name} onChange={e => setNewFamilyMember({...newFamilyMember, name: e.target.value})} className="w-full p-3 border rounded-lg focus:ring-2" /></div>
                      <div className="flex gap-4">
                        <input type="number" placeholder="Age" required value={newFamilyMember.age} onChange={e => setNewFamilyMember({...newFamilyMember, age: e.target.value})} className="w-full border rounded-lg p-3" />
                        <select value={newFamilyMember.gender} onChange={e => setNewFamilyMember({...newFamilyMember, gender: e.target.value})} className="w-full border rounded-lg p-3"><option>Male</option><option>Female</option></select>
                      </div>
                      <hr className="my-2" />
                      <div><input type="text" placeholder="Assign a Username" required value={newFamilyMember.username} onChange={e => setNewFamilyMember({...newFamilyMember, username: e.target.value})} className="w-full p-3 border rounded-lg" /></div>
                      <div><input type="password" placeholder="Assign a Password" required value={newFamilyMember.password} onChange={e => setNewFamilyMember({...newFamilyMember, password: e.target.value})} className="w-full p-3 border rounded-lg" /></div>
                      <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl">Create Account</button>
                   </form>
                 </div>
              )}

              {view === 'provider_roster' && (
                 <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border flex flex-col sm:flex-row gap-6 justify-between">
                        <div><h3 className="text-xl font-bold mb-1 flex items-center gap-2"><LinkIcon className="text-blue-600"/> Connect Patient</h3><p className="text-sm text-slate-500">Use 8-digit ID.</p></div>
                        <form onSubmit={handleRequestConnection} className="flex gap-2">
                            <input type="text" placeholder="e.g. JD123456" required className="p-3 border rounded-xl" value={connectIdInput} onChange={e => setConnectIdInput(e.target.value.toUpperCase())} />
                            <button type="submit" className="bg-blue-600 text-white px-6 py-3 font-bold rounded-xl">Request</button>
                        </form>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold mb-4">My Assigned Patients</h3>
                        {providerRoster.length === 0 ? (
                            <div className="bg-white p-12 text-center rounded-2xl border border-dashed"><p className="text-slate-500">Roster empty.</p></div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {providerRoster.map((pt, i) => (
                                    <div key={i} onClick={() => fetchPatientData(pt.name)} className="bg-white p-5 rounded-2xl border cursor-pointer hover:shadow-md">
                                        <div className="flex justify-between items-start mb-2"><h4 className="font-bold text-lg">{pt.name}</h4><span className="text-xs bg-slate-100 px-2 py-1 rounded border">{pt.uid}</span></div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                 </div>
              )}

              {view === 'patient_inbox' && (
                 <div className="space-y-6">
                     <div className="bg-white p-6 rounded-2xl border">
                       <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><UserPlus className="text-blue-600"/> Action Required</h3>
                       {pendingRequests.map((req, i) => (
                           <div key={i} className="flex justify-between items-center bg-blue-50 p-4 rounded-xl border mb-4">
                               <div><p className="font-bold">Dr. {req.doctorName}</p><p className="text-sm">Requesting access.</p></div>
                               <div className="flex gap-2"><button onClick={() => handleAcceptRequest(req)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">Authorize</button></div>
                           </div>
                       ))}
                     </div>
                 </div>
              )}

              {view === 'dashboard' && activePatient && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-white p-2 rounded-xl border flex gap-2 overflow-x-auto snap-x mb-6">
                     <button onClick={() => setDashTab('profile')} className={`flex-1 min-w-[120px] py-3 rounded-lg font-bold flex items-center justify-center gap-2 ${dashTab === 'profile' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-50'}`}><ClipboardList size={18}/> Profile</button>
                     <button onClick={() => setDashTab('visits')} className={`flex-1 min-w-[120px] py-3 rounded-lg font-bold flex items-center justify-center gap-2 ${dashTab === 'visits' ? 'bg-purple-50 text-purple-700' : 'text-slate-500 hover:bg-slate-50'}`}><Stethoscope size={18}/> Encounters</button>
                     <button onClick={() => setDashTab('prescriptions')} className={`flex-1 min-w-[120px] py-3 rounded-lg font-bold flex items-center justify-center gap-2 ${dashTab === 'prescriptions' ? 'bg-cyan-50 text-cyan-700' : 'text-slate-500 hover:bg-slate-50'}`}><Pill size={18}/> Rx & Meds</button>
                     <button onClick={() => setDashTab('orders')} className={`flex-1 min-w-[120px] py-3 rounded-lg font-bold flex items-center justify-center gap-2 ${dashTab === 'orders' ? 'bg-pink-50 text-pink-700' : 'text-slate-500 hover:bg-slate-50'}`}><FileSignature size={18}/> Orders</button>
                     <button onClick={() => setDashTab('labs')} className={`flex-1 min-w-[120px] py-3 rounded-lg font-bold flex items-center justify-center gap-2 ${dashTab === 'labs' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}><FlaskConical size={18}/> Labs</button>
                     <button onClick={() => setDashTab('growth')} className={`flex-1 min-w-[120px] py-3 rounded-lg font-bold flex items-center justify-center gap-2 ${dashTab === 'growth' ? 'bg-orange-50 text-orange-700' : 'text-slate-500 hover:bg-slate-50'}`}><Ruler size={18}/> Vitals</button>
                     <button onClick={() => setDashTab('vaccines')} className={`flex-1 min-w-[120px] py-3 rounded-lg font-bold flex items-center justify-center gap-2 ${dashTab === 'vaccines' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}><Syringe size={18}/> Vaccines</button>
                     <button onClick={() => setDashTab('diseases')} className={`flex-1 min-w-[120px] py-3 rounded-lg font-bold flex items-center justify-center gap-2 ${dashTab === 'diseases' ? 'bg-rose-50 text-rose-700' : 'text-slate-500 hover:bg-slate-50'}`}><Bug size={18}/> Screenings</button>
                  </div>

                  {dashTab === 'profile' && (
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border h-fit">
                            <h3 className="font-bold text-lg mb-4 border-b pb-2">Personal Info</h3>
                            <p className="text-slate-500 text-sm">Age: {patientData.personal_info?.age}</p>
                            <p className="text-slate-500 text-sm">Sex: {patientData.personal_info?.gender}</p>
                        </div>
                        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border">
                            <div className="flex justify-between items-center border-b pb-2 mb-4">
                                <h3 className="font-bold text-lg">Clinical Overview</h3>
                                {user.role === 'Provider' && !isEditingProfile && (<button onClick={() => setIsEditingProfile(true)} className="text-sm text-blue-600 font-bold"><Edit3 size={16}/></button>)}
                                {isEditingProfile && (<button onClick={handleSaveProfile} className="text-sm bg-emerald-600 text-white px-4 py-1.5 rounded-lg font-bold">Save</button>)}
                            </div>
                            {isEditingProfile ? (
                                <div className="space-y-4">
                                    <input type="text" value={profileForm.allergies} onChange={e => setProfileForm({...profileForm, allergies: e.target.value})} className="w-full p-2 border rounded-lg bg-slate-50" placeholder="Allergies" />
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div><h4 className="text-sm font-bold text-red-500 mb-2">Allergies</h4><p className="text-sm">{patientData.profile?.allergies || "None"}</p></div>
                                </div>
                            )}
                        </div>
                     </div>
                  )}

                  {dashTab === 'visits' && (
                      <div className="space-y-6">
                          <div className="bg-white p-6 rounded-2xl border"><h3 className="text-xl font-bold mb-2 flex items-center gap-2"><Stethoscope className="text-purple-600"/> Clinical Encounters</h3></div>
                          {patientData.visits && Object.keys(patientData.visits).length > 0 ? (
                              Object.values(patientData.visits).sort((a,b) => new Date(b.date) - new Date(a.date)).map((visit, idx) => (
                                  <div key={idx} className="bg-white p-6 rounded-2xl border hover:shadow-md transition-shadow">
                                      <div className="flex justify-between border-b pb-4 mb-4"><h4 className="font-bold text-lg">Encounter: {visit.date}</h4><p className="text-sm text-slate-500">{visit.provider}</p></div>
                                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                          <div className="space-y-4">
                                              
                                              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 shadow-sm">
                                                <p className="text-xs font-bold text-emerald-700 uppercase mb-1">AI Visit Summary</p>
                                                <div className="text-sm text-emerald-900 whitespace-pre-wrap">{renderFormattedText(visit.ai_summary)}</div>
                                              </div>

                                              {visit.ai_terminology && Object.keys(visit.ai_terminology).length > 0 && (
                                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm">
                                                  <p className="text-xs font-bold text-blue-700 uppercase mb-2 flex items-center gap-1"><BookOpen size={14}/> Terminology Guide</p>
                                                  <ul className="space-y-2">
                                                    {Object.entries(visit.ai_terminology).map(([term, definition], i) => (
                                                      <li key={i} className="text-sm text-blue-900 bg-white p-2 rounded border border-blue-50"><strong>{term}:</strong> {definition}</li>
                                                    ))}
                                                  </ul>
                                                </div>
                                              )}
                                              
                                              <div><p className="text-xs font-bold text-slate-500 uppercase mb-2">Attached Documents</p><ul className="space-y-2">{visit.documents.map((doc, i) => (<li key={i} className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 p-2 rounded border break-all"><FileText size={14} className="text-slate-400 shrink-0"/> {doc}</li>))}</ul></div>
                                          </div>
                                          
                                          {/* 🎙️ Voice Note Component */}
                                          <EncounterVoiceNote 
                                            targetPatient={activePatient} visitDate={visit.date} providerName={user.real_name}
                                            noteValue={visitNotes[visit.date] || ''}
                                            setNoteValue={(val) => setVisitNotes({...visitNotes, [visit.date]: val})}
                                            patientNoteValue={visitPatientNotes[visit.date] || ''}
                                            setPatientNoteValue={(val) => setVisitPatientNotes({...visitPatientNotes, [visit.date]: val})}
                                            onSave={() => handleSaveVisitNote(visit.date)}
                                            isPatient={user.role === 'Patient'}
                                          />
                                      </div>
                                  </div>
                              ))
                          ) : (<div className="bg-white p-12 text-center rounded-2xl border border-slate-100 border-dashed"><p className="text-slate-500">No recorded encounters.</p></div>)}
                      </div>
                  )}

                  {dashTab === 'prescriptions' && (
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
                        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 h-fit">
                            <div className="bg-slate-50 px-6 py-4 border-b flex justify-between items-center"><h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><Pill className="text-cyan-600"/> Active Medications</h3></div>
                            <div className="p-6">
                                {patientData.prescriptions && patientData.prescriptions.length > 0 ? (
                                    <ul className="space-y-4">
                                        {patientData.prescriptions.map((rx, idx) => (
                                            <li key={idx} className="p-4 border rounded-xl bg-cyan-50 border-cyan-100 hover:shadow-md transition-shadow">
                                                <div className="flex justify-between sm:items-start mb-2"><h4 className="font-bold text-cyan-900 text-lg">{rx.medication}</h4><span className="text-xs font-bold text-cyan-600 bg-white px-2 py-1 rounded border">Ordered: {rx.date}</span></div>
                                                <p className="text-sm font-semibold text-cyan-800 mb-1">Dosage: {rx.dosage}</p><p className="text-sm text-cyan-700 italic">"{rx.instructions}"</p>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (<p className="text-slate-500 text-center py-10">No active prescriptions.</p>)}
                            </div>
                        </div>
                        {user.role === 'Provider' && (
                            <div className="lg:col-span-1">
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Edit3 className="text-cyan-600" size={20}/> New Prescription</h3>
                                    <form onSubmit={handleAddPrescription} className="space-y-4">
                                        <div><label className="text-xs font-bold text-slate-500 uppercase">Medication Name</label><input type="text" required value={prescriptionInput.medication_name} onChange={e => setPrescriptionInput({...prescriptionInput, medication_name: e.target.value})} className="w-full p-2 border rounded bg-slate-50 focus:ring-2" /></div>
                                        <div><label className="text-xs font-bold text-slate-500 uppercase">Dosage</label><input type="text" required value={prescriptionInput.dosage} onChange={e => setPrescriptionInput({...prescriptionInput, dosage: e.target.value})} className="w-full p-2 border rounded bg-slate-50 focus:ring-2" /></div>
                                        <div><label className="text-xs font-bold text-slate-500 uppercase">Instructions (Sig)</label><textarea required value={prescriptionInput.instructions} onChange={e => setPrescriptionInput({...prescriptionInput, instructions: e.target.value})} className="w-full p-2 border rounded bg-slate-50 h-24 focus:ring-2"></textarea></div>
                                        <button type="submit" className="w-full bg-cyan-600 text-white font-bold py-2 rounded">Prescribe</button>
                                    </form>
                                </div>
                            </div>
                        )}
                     </div>
                  )}

                  {dashTab === 'orders' && (
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
                        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 h-fit">
                            <div className="bg-slate-50 px-6 py-4 border-b flex justify-between items-center"><h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><FileSignature className="text-pink-600"/> Lab & Imaging Orders</h3></div>
                            <div className="p-6">
                                {patientData.ordered_tests && patientData.ordered_tests.length > 0 ? (
                                    <ul className="space-y-4">
                                        {patientData.ordered_tests.map((order, idx) => (
                                            <li key={idx} className={`p-4 border rounded-xl hover:shadow-md ${order.status === 'Pending' ? 'bg-pink-50 border-pink-100' : 'bg-slate-50 border-slate-200'}`}>
                                                <div className="flex justify-between sm:items-start mb-2"><h4 className={`font-bold text-lg ${order.status === 'Pending' ? 'text-pink-900' : 'text-slate-700 line-through'}`}>{order.test_name}</h4><span className={`text-xs font-bold px-2 py-1 rounded border ${order.status === 'Pending' ? 'text-pink-600 bg-white border-pink-200' : 'text-emerald-600 bg-emerald-50 border-emerald-200'}`}>{order.status}</span></div>
                                                <p className={`text-sm italic ${order.status === 'Pending' ? 'text-pink-700' : 'text-slate-500'}`}>Reason: {order.reason}</p><p className="text-xs text-slate-400 mt-2">Ordered: {order.date}</p>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (<p className="text-slate-500 text-center py-10">No pending orders.</p>)}
                            </div>
                        </div>
                        {user.role === 'Provider' && (
                            <div className="lg:col-span-1">
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Edit3 className="text-pink-600" size={20}/> New Order</h3>
                                    <form onSubmit={handleAddOrder} className="space-y-4">
                                        <div><label className="text-xs font-bold text-slate-500 uppercase">Test Name</label><input type="text" required value={orderInput.test_name} onChange={e => setOrderInput({...orderInput, test_name: e.target.value})} className="w-full p-2 border rounded bg-slate-50 focus:ring-2" /></div>
                                        <div><label className="text-xs font-bold text-slate-500 uppercase">Clinical Reason (Dx)</label><textarea required value={orderInput.reason} onChange={e => setOrderInput({...orderInput, reason: e.target.value})} className="w-full p-2 border rounded bg-slate-50 h-24 focus:ring-2"></textarea></div>
                                        <button type="submit" className="w-full bg-pink-600 text-white font-bold py-2 rounded">Sign Order</button>
                                    </form>
                                </div>
                            </div>
                        )}
                     </div>
                  )}

                  {dashTab === 'labs' && (
                     <div className="animate-in fade-in duration-300">
                       {Object.keys(patientData.categories || {}).length > 0 ? (
                         <>
                           <div className="flex gap-2 border-b border-slate-200 pb-2 relative z-10 overflow-x-auto">
                               {Object.keys(patientData.categories || {}).map(category => (
                                   <button key={category} type="button" onClick={(e) => { e.preventDefault(); handleCategoryClick(category); }} className={`px-4 py-2 rounded-t-lg font-bold ${activeCategory === category ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}>{category}</button>
                               ))}
                           </div>
                           {patientData.categories[activeCategory]?.length > 0 && (
                               <div className="bg-white p-4 rounded-xl border flex gap-4 mt-4">
                                   <select value={selectedTestName} onChange={(e) => setSelectedTestName(e.target.value)} className="p-3 border rounded-lg w-full">
                                       {patientData.categories[activeCategory].map(test => (<option key={test.test_name} value={test.test_name}>{test.test_name}</option>))}
                                   </select>
                               </div>
                           )}
                           {(() => {
                               const activeTest = patientData.categories[activeCategory]?.find(t => t.test_name === selectedTestName);
                               if (!activeTest) return null;
                               const sortedHistory = [...activeTest.history].sort((a, b) => new Date(a.Date) - new Date(b.Date));
                               return (
                                   <div className="bg-white rounded-2xl border mt-6 flex flex-col">
                                       <div className="bg-slate-50 px-6 py-4 border-b flex justify-between"><h3 className="font-bold text-lg">{activeTest.test_name}</h3><span className="text-sm bg-white border px-4 py-1.5 rounded-full">Range: {activeTest.normal_min} - {activeTest.normal_max} {activeTest.unit}</span></div>
                                       <div className="grid grid-cols-1 lg:grid-cols-2">
                                           <div className="p-6 border-b lg:border-r h-80">
                                               <ResponsiveContainer width="100%" height="100%">
                                                 <LineChart data={sortedHistory}>
                                                   <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                   <XAxis dataKey="Date" tick={{fontSize: 12}} />
                                                   <YAxis domain={[0, 'auto']} tick={{fontSize: 12}} />
                                                   <Tooltip />
                                                   {activeTest.normal_min !== 0 && <ReferenceLine y={activeTest.normal_min} stroke="#10B981" strokeDasharray="3 3" />}
                                                   {activeTest.normal_max !== 0 && <ReferenceLine y={activeTest.normal_max} stroke="#10B981" strokeDasharray="3 3" />}
                                                   <Line type="monotone" dataKey="Value" stroke="#2563EB" strokeWidth={4} />
                                                 </LineChart>
                                               </ResponsiveContainer>
                                           </div>
                                           <div className="p-6 overflow-auto h-80">
                                               <table className="w-full text-left">
                                                   <thead><tr><th className="pb-3 text-xs uppercase text-slate-400 border-b">Date</th><th className="pb-3 text-xs uppercase text-slate-400 border-b">Value</th><th className="pb-3 text-xs uppercase text-slate-400 border-b">Status</th></tr></thead>
                                                   <tbody>
                                                       {sortedHistory.map((record, i) => (
                                                           <tr key={i}><td className="py-3 text-sm font-medium border-b">{record.Date}</td><td className="py-3 text-sm font-bold border-b">{record.Value} {activeTest.unit}</td><td className="py-3 border-b"><span className={`text-xs px-2 py-1 rounded-full font-bold ${record.Status === 'Normal' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{record.Status}</span></td></tr>
                                                       ))}
                                                   </tbody>
                                               </table>
                                           </div>
                                       </div>
                                   </div>
                               );
                           })()}
                         </>
                       ) : (<div className="bg-white p-12 text-center rounded-2xl border"><p className="text-slate-500">No lab data.</p></div>)}
                     </div>
                  )}

                  {dashTab === 'growth' && (
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
                        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[400px] lg:h-[550px]">
                            <div className="bg-slate-50 px-4 md:px-6 py-4 border-b border-slate-100 flex justify-between items-center"><h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><ActivitySquare className="text-orange-600"/> Trajectory</h3></div>
                            <div className="p-2 sm:p-6 flex-grow">
                                {patientData.vitals && patientData.vitals.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                      <LineChart data={patientData.vitals} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="Date" tick={{fontSize: 12}} />
                                        <YAxis yAxisId="left" orientation="left" label={{ value: 'Height', angle: -90, position: 'insideLeft', style: {textAnchor: 'middle'} }} />
                                        <YAxis yAxisId="right" orientation="right" label={{ value: 'Weight', angle: 90, position: 'insideRight', style: {textAnchor: 'middle'} }} />
                                        <Tooltip contentStyle={{borderRadius: '8px'}} />
                                        <Legend verticalAlign="top" height={36}/>
                                        <Line yAxisId="left" type="monotone" dataKey="Height" stroke="#EA580C" strokeWidth={4} name="Height (cm)" />
                                        <Line yAxisId="right" type="monotone" dataKey="Weight" stroke="#0284C7" strokeWidth={4} name="Weight (kg)" />
                                      </LineChart>
                                    </ResponsiveContainer>
                                ) : (<div className="h-full flex items-center justify-center"><p className="text-slate-400">No vitals logged yet.</p></div>)}
                            </div>
                        </div>
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Scale className="text-orange-500" size={20}/> Log New Vitals</h3>
                                <form onSubmit={handleLogVitals} className="space-y-4">
                                    <div><label className="text-xs font-bold text-slate-500 uppercase">Height (cm)</label><input type="number" step="0.1" value={vitalsInput.height} onChange={(e) => setVitalsInput({...vitalsInput, height: e.target.value})} className="w-full p-2 border rounded bg-slate-50 focus:ring-2" /></div>
                                    <div><label className="text-xs font-bold text-slate-500 uppercase">Weight (kg)</label><input type="number" step="0.1" value={vitalsInput.weight} onChange={(e) => setVitalsInput({...vitalsInput, weight: e.target.value})} className="w-full p-2 border rounded bg-slate-50 focus:ring-2" /></div>
                                    <button type="submit" className="w-full bg-orange-500 text-white font-bold py-2 rounded">Save to Chart</button>
                                </form>
                                {patientData.vitals && patientData.vitals.length > 0 && (
                                    <div className="mt-4 p-3 bg-orange-50 rounded-lg text-center border border-orange-100"><p className="text-sm text-orange-800 font-bold mb-1">Current BMI</p><p className="text-2xl text-orange-600 font-black">{patientData.vitals[patientData.vitals.length-1].BMI}</p></div>
                                )}
                            </div>
                        </div>
                     </div>
                  )}

                  {dashTab === 'vaccines' && (
                     <div className="bg-white p-4 md:p-8 rounded-2xl border animate-in fade-in duration-300 shadow-sm">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Syringe className="text-indigo-600"/> Immunization Record</h3>
                        {patientData.vaccines && patientData.vaccines.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {patientData.vaccines.map((vac, idx) => (
                                    <div key={idx} className="p-4 md:p-5 border rounded-xl bg-slate-50 flex flex-col justify-between">
                                        <div className="flex justify-between items-start mb-4 gap-2"><h4 className="font-bold text-lg">{vac.name}</h4><span className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-sm ${vac.status === 'Valid' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{vac.status}</span></div>
                                        <div className="flex flex-col sm:flex-row sm:justify-between text-sm text-slate-600 gap-1"><span><strong>Given:</strong> {vac.date_administered}</span><span><strong>Expires:</strong> {vac.expiration_date}</span></div>
                                    </div>
                                ))}
                            </div>
                        ) : (<p className="text-slate-500 py-10 text-center">No records found.</p>)}
                     </div>
                  )}

                  {dashTab === 'diseases' && (
                     <div className="bg-white p-4 md:p-8 rounded-2xl border overflow-x-auto animate-in fade-in duration-300 shadow-sm">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Bug className="text-rose-600"/> Disease Screenings</h3>
                        {patientData.diseases && patientData.diseases.length > 0 ? (
                            <table className="w-full text-left min-w-[400px]">
                                <thead className="bg-slate-50 border-b"><tr><th className="p-4">Condition</th><th className="p-4">Date Tested</th><th className="p-4">Result</th></tr></thead>
                                <tbody>
                                    {patientData.diseases.map((dis, idx) => (
                                        <tr key={idx} className="border-b hover:bg-slate-50"><td className="p-4 font-semibold">{dis.name}</td><td className="p-4 text-slate-600">{dis.date_tested}</td>
                                            <td className="p-4"><span className={`font-bold px-3 py-1 rounded-full text-sm shadow-sm ${dis.result === 'Negative' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>{dis.result}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (<p className="text-slate-500 py-10 text-center">No records found.</p>)}
                     </div>
                  )}
                </div>
              )}

              {view === 'upload' && activePatient && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-slate-100 text-center">
                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6"><Upload size={32} className="text-blue-600" /></div>
                    <h3 className="text-xl font-bold mb-2">Upload to Chart</h3>
                    <p className="text-slate-500 mb-4">{activePatient}</p>
                    <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl inline-block mt-2 shadow-md">
                      <span>Browse File</span><input type="file" onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- 🛎️ FALLBACK & MULTI-MATCH MODAL --- */}
      {scanModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99999] flex flex-col justify-center items-center px-4 animate-in fade-in duration-300">
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-2xl max-w-md w-full border border-slate-100 animate-in zoom-in-95 duration-300">
            
            {/* MANUAL FALLBACK UI */}
            {scanModal.type === 'manual_file' || scanModal.type === 'manual_text' ? (
                <>
                    <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4"><Search size={32} /></div>
                    <h3 className="text-xl font-bold text-slate-900 text-center mb-2">Manual Selection</h3>
                    <p className="text-slate-600 text-center text-sm mb-4">The AI couldn't clearly read a patient name from this scan. Who does this belong to?</p>
                    
                    <div className="space-y-2 mb-6 max-h-48 overflow-y-auto pr-2">
                        {(user.role === 'Provider' ? providerRoster : familyMembers).map(p => (
                            <button 
                                key={p.name} 
                                onClick={() => setSelectedScanPatient(p.name)}
                                className={`w-full p-3 rounded-xl border-2 font-bold transition-all ${selectedScanPatient === p.name ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'}`}
                            >
                                {p.name}
                            </button>
                        ))}
                    </div>
                    
                    <div className="flex gap-3">
                        <button onClick={() => { setScanModal(null); setView(user.role === 'Provider' ? 'provider_roster' : 'dashboard'); }} className="flex-1 bg-white border border-slate-300 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-50 transition">Cancel</button>
                        <button 
                            disabled={!selectedScanPatient}
                            onClick={confirmScanModal} 
                            className={`flex-1 font-bold py-3 rounded-xl transition shadow-sm flex items-center justify-center gap-2 ${!selectedScanPatient ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-orange-600 text-white hover:bg-orange-700'}`}
                        >
                            <Save size={18}/> Save to Chart
                        </button>
                    </div>
                </>
            ) : scanModal.type === 'error' ? (
                <>
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={32} /></div>
                    <h3 className="text-xl font-bold text-slate-900 text-center mb-2">Scan Failed</h3>
                    <p className="text-slate-600 text-sm text-center mb-6 whitespace-pre-wrap">{scanModal.message}</p>
                    <button onClick={() => setScanModal(null)} className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-900 transition shadow-sm">Acknowledge</button>
                </>
            ) : (
                <>
                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4"><ShieldCheck size={32} /></div>
                    <h3 className="text-xl font-bold text-slate-900 text-center mb-2">Smart Scan Match!</h3>
                    
                    {/* 🚨 MULTIPLE MATCH SELECTOR */}
                    {scanModal.patients && scanModal.patients.length > 1 ? (
                        <div className="mb-6">
                            <p className="text-slate-600 text-center text-sm mb-4">We found multiple potential matches in this record. Please select the correct patient chart:</p>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                {scanModal.patients.map(p => (
                                    <button 
                                        key={p} 
                                        onClick={() => setSelectedScanPatient(p)}
                                        className={`w-full p-3 rounded-xl border-2 font-bold transition-all ${selectedScanPatient === p ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'}`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <p className="text-slate-600 text-center mb-6">
                            We detected <strong className="text-blue-700">{scanModal.patients?.[0]}</strong> in the shared {scanModal.type === 'text' ? 'message' : 'document'}.
                        </p>
                    )}

                    {scanModal.type === 'text' && (
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-6 max-h-32 overflow-y-auto"><p className="text-xs text-slate-500 italic whitespace-pre-wrap">"{scanModal.payload}"</p></div>
                    )}
                    
                    <div className="flex gap-3 mt-4">
                        <button onClick={() => { setScanModal(null); setView(user.role === 'Provider' ? 'provider_roster' : 'dashboard'); }} className="flex-1 bg-white border border-slate-300 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-50 transition">Cancel</button>
                        <button onClick={confirmScanModal} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition shadow-sm flex items-center justify-center gap-2"><Save size={18}/> Save to Chart</button>
                    </div>
                </>
            )}
          </div>
        </div>
      )}

      {/* --- 🚨 GLOBAL LOADING / SAVING OVERLAY --- */}
      {isSaving && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99999] flex flex-col justify-center items-center text-white px-4 animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm w-full text-center border border-slate-100">
            <EcgLoader size={48} className="mb-4" />
            <h3 className="text-slate-900 font-bold text-lg mb-1">Processing Document</h3>
            <p className="text-slate-500 text-sm">AI is actively extracting and mapping lab values...</p>
          </div>
        </div>
      )}

      {isScanning && !isSaving && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[99999] flex flex-col justify-center items-center text-white px-4 animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm w-full text-center border border-slate-100">
            <EcgLoader size={48} className="mb-4" />
            <h3 className="text-slate-900 font-bold text-lg mb-1">AI Smart Scanning Active</h3>
            <p className="text-slate-500 text-sm">Cross-referencing shared data...</p>
          </div>
        </div>
      )}
    </div>
  );
}
