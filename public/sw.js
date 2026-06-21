import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import { Activity, Upload, User, ShieldCheck, UserPlus, Search, Users, CheckCircle, ActivitySquare, Syringe, Bug, FlaskConical, AlertTriangle, ShieldAlert, Ruler, Scale, Calculator, ClipboardList, Edit3, Save, Stethoscope, FileText, Pill, FileSignature, Settings, Link as LinkIcon, Inbox } from 'lucide-react';

const BACKEND_URL = "https://clinical-portal-backend-production.up.railway.app";

export default function App() {
  const [splashState, setSplashState] = useState('visible');
  
  // --- 💾 PERSISTED USER STATE ---
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('cliniport_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  const [view, setView] = useState(user ? 'loading_session' : 'login'); 
  const [textSize, setTextSize] = useState('normal'); 
  const [authError, setAuthError] = useState(''); 
  const [isLoading, setIsLoading] = useState(false); 
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regRole, setRegRole] = useState('Patient');
  const [regAge, setRegAge] = useState('');
  const [regGender, setRegGender] = useState('Male');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regStreet, setRegStreet] = useState('');
  const [regState, setRegState] = useState('');
  const [regCountry, setRegCountry] = useState('');
  
  const [activePatient, setActivePatient] = useState(''); 
  const [patientData, setPatientData] = useState({ ai_summary: '', categories: {}, vaccines: [], diseases: [], uploaded_files: [], vitals: [], personal_info: {}, profile: {}, visits: {}, prescriptions: [], ordered_tests: [] });
  const [activeCategory, setActiveCategory] = useState(''); 
  const [selectedTestName, setSelectedTestName] = useState(''); 
  const [searchQuery, setSearchQuery] = useState('');
  const [dashTab, setDashTab] = useState('profile'); 

  // --- CONNECTION & ROSTER STATE ---
  const [connectIdInput, setConnectIdInput] = useState('');
  const [providerRoster, setProviderRoster] = useState([]); 
  const [pendingRequests, setPendingRequests] = useState([]); 

  // --- 🔐 SECURE ID UNLOCK STATE ---
  const [isIdUnlocked, setIsIdUnlocked] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);

  const [vitalsInput, setVitalsInput] = useState({ height: '', weight: '' });
  const [parentsHeight, setParentsHeight] = useState({ mom: '', dad: '' });
  const [predictedHeight, setPredictedHeight] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ genetic_conditions: '', chronic_diseases: '', allergies: '', notes: '' });
  const [visitNotes, setVisitNotes] = useState({});
  const [prescriptionInput, setPrescriptionInput] = useState({ medication_name: '', dosage: '', instructions: '' });
  const [orderInput, setOrderInput] = useState({ test_name: '', reason: '' });
  const [isScanning, setIsScanning] = useState(false);

  // --- 💣 THE CACHE NUKE ---
  const hardResetApp = async () => {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (let registration of registrations) { await registration.unregister(); }
    }
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (let cacheName of cacheNames) { await caches.delete(cacheName); }
    }
    localStorage.clear();
    window.location.reload(true); 
  };

  useEffect(() => {
    const fadeTimer = setTimeout(() => { setSplashState('fading'); }, 2000);
    const hideTimer = setTimeout(() => { setSplashState('hidden'); }, 2500);
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer); };
  }, []);

  const getInitials = (name) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (name.substring(0, 2)).toUpperCase() || 'XX';
  };

  const generateUID = (name, role) => {
    const initials = getInitials(name);
    if (role === 'Patient') { return `${initials}${Math.floor(100000 + Math.random() * 900000)}`; } 
    else { return `D${initials}${Math.floor(1000 + Math.random() * 9000)}`; }
  };

  useEffect(() => {
    const userLang = navigator.language || navigator.userLanguage;
    const baseLang = userLang.split('-')[0];
    if (baseLang !== 'en') {
      document.cookie = `googtrans=/en/${baseLang}; path=/;`;
      document.cookie = `googtrans=/en/${baseLang}; domain=.${window.location.hostname}; path=/;`;
    }
    if (!document.getElementById('google-translate-script')) {
      const script = document.createElement('script');
      script.id = 'google-translate-script';
      script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      document.body.appendChild(script);
      window.googleTranslateElementInit = () => {
        new window.google.translate.TranslateElement({
          pageLanguage: 'en', includedLanguages: 'en,es,fr,de,zh-CN,ar,ru,pt,ja,ko,hi,bn,mr,te,ta,gu,ur,kn,or,ml,pa,as,mai,sat,ks,ne,sd,doi,sa,bho,awa,brx,kha,lus,rwr,bgc,hne,tcq,trp',
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE, autoDisplay: true 
        }, 'google_translate_element');
      };
    }
  }, []);

  useEffect(() => {
    if (user && view === 'loading_session') {
      if (user.role === 'Patient') {
        setActivePatient(user.real_name); fetchPatientData(user.real_name); fetchPendingRequests(user.uid);
      } else { fetchRoster(user.uid); setView('provider_roster'); }
    }
  }, [user]);

  useEffect(() => {
    if (patientData.profile) { setProfileForm(patientData.profile); }
    if (patientData.visits) {
      const initialNotes = {};
      Object.values(patientData.visits).forEach(v => { initialNotes[v.date] = v.doctor_note || ''; });
      setVisitNotes(initialNotes);
    }
  }, [patientData]);

  // --- 📸 CENTRALIZED FILE SMART SCANNER ---
  const handleSmartScan = async (file) => {
    setIsScanning(true);
    const formData = new FormData(); 
    formData.append('file', file);
    if (user && user.role === 'Provider') { formData.append('provider_uid', user.uid); }
    
    try {
        const res = await fetch(`${BACKEND_URL}/api/predict-patient`, { method: 'POST', body: formData });
        const data = await res.json(); 
        setIsScanning(false);
        if (data.matched_patient) {
            const confirmAutoFile = window.confirm(`Smart Scan Results:\n\nWe detected this document belongs to "${data.matched_patient}" from your roster.\n\nWould you like to upload it to their chart?`);
            if (confirmAutoFile) { processDocumentUpload(file, data.matched_patient); } 
            else { alert("Please select the patient manually from your roster."); setView('provider_roster'); }
        } else { 
            alert("Smart Scan couldn't find a matching patient from your roster in this document. Please select the patient manually.");
            setView('provider_roster');
        }
    } catch (err) { 
        setIsScanning(false); alert("Smart Scan failed. Please select a patient manually."); setView('provider_roster');
    }
  };

  // --- 📝 TEXT SMART SCANNER ---
  const handleTextSmartScan = async (textString) => {
    setIsScanning(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/roster/${user.uid}`);
      const roster = await res.json();
      
      let matchedPatient = null;
      for (let pt of roster) {
          if (textString.toLowerCase().includes(pt.name.toLowerCase())) { matchedPatient = pt.name; break; }
      }
      setIsScanning(false);
      
      if (matchedPatient) {
          const confirmAutoFile = window.confirm(`Smart Scan Results:\n\nWe detected "${matchedPatient}" from your roster in the shared text.\n\nSave this directly to their encounter notes?`);
          if (confirmAutoFile) {
              const dateStr = new Date().toISOString().split('T')[0];
              await fetch(`${BACKEND_URL}/api/visit/note`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target_patient: matchedPatient, visit_date: dateStr, note: `[Shared Text Message]:\n${textString}` }) });
              alert(`Saved to ${matchedPatient}'s chart!`);
              fetchPatientData(matchedPatient);
          } else { setView('provider_roster'); }
      } else {
          alert(`Shared Text:\n"${textString}"\n\nNo matching patient found on your roster. Please select a patient manually.`);
          setView('provider_roster');
      }
    } catch (e) { setIsScanning(false); alert("Text scan failed."); setView('provider_roster'); }
  };

  // --- 🔄 PWA SHARE INTERCEPTOR ---
  useEffect(() => {
    if (!user) return; 
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('incoming_share') === 'true') {
      (async () => {
        const cache = await caches.open('shared-files-cache'); 
        const target = user.role === 'Patient' ? user.real_name : activePatient;
        
        const cachedFile = await cache.match('/latest-shared-file');
        if (cachedFile) {
          const blob = await cachedFile.blob();
          const filename = cachedFile.headers.get('X-File-Name') || 'shared_document.pdf';
          const file = new File([blob], filename, { type: blob.type });
          if (target && target !== '') { processDocumentUpload(file, target); } 
          else { handleSmartScan(file); } 
          await cache.delete('/latest-shared-file');
        }
        
        const cachedText = await cache.match('/latest-shared-text');
        if (cachedText) {
          const sharedTextString = await cachedText.text();
          if (target && target !== '') {
            try {
              const dateStr = new Date().toISOString().split('T')[0];
              await fetch(`${BACKEND_URL}/api/visit/note`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target_patient: target, visit_date: dateStr, note: `[Shared Text Message via Forward Menu]:\n${sharedTextString}` }) });
              alert(`Text snippet successfully appended to ${target}'s encounter notes!`); fetchPatientData(target);
            } catch (err) { alert("Failed to append shared text string to the backend server notes."); }
          } else { handleTextSmartScan(sharedTextString); }
          await cache.delete('/latest-shared-text'); 
        }
        window.history.replaceState({}, document.title, "/");
      })();
    }
  }, [user, activePatient]); 

  useEffect(() => {
    if ('launchQueue' in window) {
      window.launchQueue.setConsumer(async (launchParams) => {
        if (!launchParams.files || launchParams.files.length === 0) return;
        try {
          const fileHandle = launchParams.files[0]; const file = await fileHandle.getFile();
          const target = user?.role === 'Patient' ? user.real_name : activePatient;
          if (target && target !== "") {
            processDocumentUpload(file, target); alert(`Successfully queued ${file.name} for ${target}!`);
          } else { handleSmartScan(file); }
        } catch (err) { alert("Failed to process external file access."); setView('provider_roster'); }
      });
    }
  }, [user, activePatient]);

  const fetchRoster = async (uid) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/roster/${uid}`);
      if (res.ok) { const data = await res.json(); setProviderRoster(data); }
    } catch (err) { console.error("Failed to fetch roster", err); }
  };

  const fetchPendingRequests = async (uid) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/connect/pending/${uid}`);
      if (res.ok) { const data = await res.json(); setPendingRequests(data); }
    } catch (err) { console.error("Failed to fetch requests", err); }
  };

  const handleLogin = async (e) => {
    e.preventDefault(); setAuthError(''); setIsLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
      if (!res.ok) throw new Error("Invalid username or password.");
      const data = await res.json();
      if (!data.uid) data.uid = generateUID(data.real_name, data.role);
      setTimeout(() => {
        setIsLoading(false); 
        setUser(data); 
        localStorage.setItem('cliniport_user', JSON.stringify(data)); 
        setIsIdUnlocked(false);
        if (data.role === 'Patient') {
          setActivePatient(data.real_name); fetchPatientData(data.real_name); fetchPendingRequests(data.uid); setView('dashboard');
        } else { fetchRoster(data.uid); setView('provider_roster'); }
      }, 800);
    } catch (err) { setIsLoading(false); if (err.message === "Failed to fetch") setAuthError("Cannot connect to cloud server."); else setAuthError(err.message); }
  };

  const handleRegister = async (e) => {
    e.preventDefault(); setAuthError(''); setIsLoading(true);
    const generatedUID = generateUID(regName, regRole);
    try {
      const res = await fetch(`${BACKEND_URL}/api/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            username, password, real_name: regName, role: regRole, uid: generatedUID, age: regRole === 'Patient' ? parseInt(regAge) : null, gender: regRole === 'Patient' ? regGender : null,
            email: regRole === 'Patient' ? regEmail : null, phone: regRole === 'Patient' ? regPhone : null, street_address: regRole === 'Patient' ? regStreet : null, state: regRole === 'Patient' ? regState : null, country: regRole === 'Patient' ? regCountry : null,
        })
      });
      if (!res.ok) throw new Error("Username already exists.");
      setTimeout(() => { setIsLoading(false); alert(`Account created successfully!\n\nIMPORTANT: Your CliniPort ID is: ${generatedUID}\n\nPlease save this ID.`); setView('login'); setPassword(''); }, 800);
    } catch (err) { setIsLoading(false); if (err.message === "Failed to fetch") setAuthError("Cannot connect to cloud server."); else setAuthError(err.message); }
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
      const res = await fetch(`${BACKEND_URL}/api/connect/accept`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider_uid: req.doctorId, patient_uid: user.uid }) });
      const data = await res.json(); alert(data.message); fetchPendingRequests(user.uid);
    } catch (err) { alert("Failed to authorize connection."); }
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
    } catch (err) { console.error(err); }
  };

  const processDocumentUpload = async (file, target, force = 'false') => {
    const formData = new FormData(); formData.append('file', file); formData.append('target_patient', target); formData.append('uploader_name', user?.real_name || "System Share External"); formData.append('force_override', force); 
    try {
      const res = await fetch(`${BACKEND_URL}/api/upload`, { method: 'POST', body: formData }); const data = await res.json();
      if (data.status === 'warning') { const proceed = window.confirm(`An encounter record already exists for today. Append document for ${target}?`); if (proceed) { processDocumentUpload(file, target, 'true'); } return; }
      alert(data.message); fetchPatientData(target); 
    } catch(err) { alert("Upload failed. Ensure backend cloud server is running."); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const target = user.role === 'Patient' ? user.real_name : activePatient; if (!target) return alert("Please select a patient first.");
    const proceed = window.confirm(`Upload this document for ${target}?`); if (!proceed) { e.target.value = null; return; }
    processDocumentUpload(file, target); e.target.value = null; 
  };

  const handleSaveProfile = async () => {
    const target = user.role === 'Patient' ? user.real_name : activePatient;
    try { const res = await fetch(`${BACKEND_URL}/api/profile`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target_patient: target, ...profileForm }) }); const data = await res.json(); alert(data.message); setIsEditingProfile(false); fetchPatientData(target); } catch (err) { alert("Failed to update profile."); }
  };

  const handleSaveVisitNote = async (date) => {
    const target = user.role === 'Patient' ? user.real_name : activePatient;
    try { const res = await fetch(`${BACKEND_URL}/api/visit/note`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target_patient: target, visit_date: date, note: visitNotes[date] }) }); const data = await res.json(); alert(data.message); fetchPatientData(target); } catch (err) { alert("Failed to save note."); }
  };

  const handleLogVitals = async (e) => {
    e.preventDefault(); const target = user.role === 'Patient' ? user.real_name : activePatient;
    if (!vitalsInput.height || !vitalsInput.weight) return alert("Enter height and weight.");
    try { const res = await fetch(`${BACKEND_URL}/api/vitals`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target_patient: target, height_cm: parseFloat(vitalsInput.height), weight_kg: parseFloat(vitalsInput.weight) }) }); const data = await res.json(); alert(data.message); setVitalsInput({ height: '', weight: '' }); fetchPatientData(target); } catch (err) { alert("Failed to log vitals."); }
  };

  const handleAddPrescription = async (e) => {
    e.preventDefault(); const target = user.role === 'Patient' ? user.real_name : activePatient;
    if (!prescriptionInput.medication_name) return alert("Enter medication name.");
    try { const res = await fetch(`${BACKEND_URL}/api/prescriptions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target_patient: target, ...prescriptionInput }) }); const data = await res.json(); alert(data.message); setPrescriptionInput({ medication_name: '', dosage: '', instructions: '' }); fetchPatientData(target); } catch (err) { alert("Failed to add prescription."); }
  };

  const handleAddOrder = async (e) => {
    e.preventDefault(); const target = user.role === 'Patient' ? user.real_name : activePatient;
    if (!orderInput.test_name) return alert("Enter a test name.");
    try { const res = await fetch(`${BACKEND_URL}/api/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target_patient: target, ...orderInput }) }); const data = await res.json(); alert(data.message); setOrderInput({ test_name: '', reason: '' }); fetchPatientData(target); } catch (err) { alert("Failed to place order."); }
  };

  const calculateProjectedHeight = () => {
      const mom = parseFloat(parentsHeight.mom); const dad = parseFloat(parentsHeight.dad);
      if (!mom || !dad) return alert("Enter both parents' heights in cm.");
      const midParental = (mom + dad) / 2; setPredictedHeight({ boy: (midParental + 6.5).toFixed(1), girl: (midParental - 6.5).toFixed(1) });
  };

  const handleCategoryClick = (category) => {
    setActiveCategory(category); if (patientData.categories[category] && patientData.categories[category].length > 0) { setSelectedTestName(patientData.categories[category][0].test_name); } else { setSelectedTestName(''); }
  };

  const textClass = textSize === 'large' ? 'text-lg' : 'text-base';

  return (
    <div className={`min-h-screen bg-slate-50 text-slate-800 font-sans ${textClass}`}>
      <style>{`@keyframes dropIn { 0% { transform: translateY(-100vh) scaleY(1.5); opacity: 0; } 60% { opacity: 1; } 100% { transform: translateY(0) scale(1); opacity: 1; } } @keyframes splashOut { 0% { transform: scale(0); opacity: 0.8; } 100% { transform: scale(25); opacity: 0; display: none; } } .liquid-drop { animation: dropIn 0.6s cubic-bezier(0.25, 1, 0.5, 1) forwards; } .liquid-ripple-1 { animation: splashOut 1.2s cubic-bezier(0.1, 0.8, 0.3, 1) forwards; animation-delay: 0.5s; } .liquid-ripple-2 { animation: splashOut 1.2s cubic-bezier(0.1, 0.8, 0.3, 1) forwards; animation-delay: 0.65s; }`}</style>
      
      {splashState !== 'hidden' && (
        <div className={`fixed inset-0 z-[99999] flex items-center justify-center bg-blue-50 transition-opacity duration-700 ${splashState === 'fading' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <div className="absolute w-8 h-12 bg-blue-500 rounded-[50%_50%_50%_50%/60%_60%_40%_40%] liquid-drop shadow-xl"></div><div className="absolute w-24 h-24 border-8 border-blue-400 rounded-full opacity-0 liquid-ripple-1"></div><div className="absolute w-24 h-24 bg-blue-300 rounded-full opacity-0 liquid-ripple-2"></div>
        </div>
      )}

      <div id="google_translate_element" className="fixed bottom-6 right-6 z-[9999] shadow-2xl rounded-lg overflow-hidden border border-slate-200 bg-white p-1"></div>

      {view === 'loading_session' ? (
        <div className="flex flex-col justify-center items-center min-h-screen bg-slate-50">
          <Activity className="text-blue-600 animate-spin mb-4" size={32} />
          <p className="text-sm font-semibold text-slate-500 tracking-wide">Restoring Session...</p>
        </div>
      ) : !user ? (
        <div className="flex flex-col justify-center items-center py-12 px-4 min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100">
          <div className="bg-white p-8 md:p-10 rounded-2xl shadow-xl w-full max-w-lg border border-slate-100 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {view === 'login' ? (
              <>
                <div className="flex justify-center mb-6"><div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full shadow-lg"><ShieldCheck size={32} className="text-white" /></div></div>
                <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">Clinical Portal</h2><p className="text-center text-slate-500 mb-8">Secure Provider Access</p>
                {authError && (<div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-bold mb-6 border border-red-100 text-center">{authError}</div>)}
                <form onSubmit={handleLogin} className="space-y-5">
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Username</label><input type="text" name="username" placeholder="Enter username" className="w-full p-3 border border-slate-200 rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" value={username} onChange={e => setUsername(e.target.value)} /></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Passcode</label><input type="password" name="password" placeholder="Enter passcode" className="w-full p-3 border border-slate-200 rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" value={password} onChange={e => setPassword(e.target.value)} /></div>
                  <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center h-12 shadow-md">{isLoading ? "Authenticating..." : "Secure Login"}</button>
                </form>
                <p className="text-center text-sm text-slate-500 mt-6">Don't have an account? <button type="button" onClick={() => {setView('register'); setAuthError('');}} className="text-blue-600 font-bold hover:underline">Sign up</button></p>
              </>
            ) : (
              <>
                <div className="flex justify-center mb-6"><div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-full shadow-lg"><UserPlus size={32} className="text-white" /></div></div>
                <h2 className="text-2xl font-bold text-center text-slate-800 mb-8">Create Account</h2>
                {authError && (<div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-bold mb-6 border border-red-100 text-center">{authError}</div>)}
                <form onSubmit={handleRegister} className="space-y-4">
                  <input type="text" placeholder="Full Legal Name" required className="w-full p-3 border border-slate-200 rounded-lg bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none" value={regName} onChange={e => setRegName(e.target.value)} />
                  <select className="w-full p-3 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-semibold focus:ring-2 focus:ring-emerald-500 outline-none" value={regRole} onChange={e => setRegRole(e.target.value)}>
                    <option value="Patient">I am a Patient</option><option value="Provider">Medical Provider</option>
                  </select>
                  {regRole === 'Patient' && (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row gap-2">
                          <input type="number" placeholder="Age" required className="w-full sm:w-1/3 p-3 border border-slate-200 rounded-lg bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none" value={regAge} onChange={e => setRegAge(e.target.value)} />
                          <select className="w-full sm:w-2/3 p-3 border border-slate-200 rounded-lg bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none" value={regGender} onChange={e => setRegGender(e.target.value)}><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                          <input type="email" placeholder="Email" required className="w-full sm:w-1/2 p-3 border border-slate-200 rounded-lg bg-slate-50" value={regEmail} onChange={e => setRegEmail(e.target.value)} />
                          <input type="tel" placeholder="Phone" required className="w-full sm:w-1/2 p-3 border border-slate-200 rounded-lg bg-slate-50" value={regPhone} onChange={e => setRegPhone(e.target.value)} />
                      </div>
                    </div>
                  )}
                  <input type="text" placeholder="Choose Username" required className="w-full p-3 border border-slate-200 rounded-lg bg-slate-50 mt-4 focus:ring-2 focus:ring-emerald-500 outline-none" value={username} onChange={e => setUsername(e.target.value)} />
                  <input type="password" placeholder="Choose Password" required className="w-full p-3 border border-slate-200 rounded-lg bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none" value={password} onChange={e => setPassword(e.target.value)} />
                  <button type="submit" disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg flex items-center justify-center h-12 shadow-md mt-2">{isLoading ? "Registering..." : "Register Now"}</button>
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
              <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full border border-slate-200 shadow-inner mr-2 hidden sm:block">ID: {isIdUnlocked ? user.uid : '••••••••'}</span>
              <button onClick={() => setTextSize(textSize === 'normal' ? 'large' : 'normal')} className="text-slate-400 hover:text-blue-600 md:mr-4"><Settings size={18} /></button>
              <span className="text-xs md:text-sm font-medium bg-slate-100 px-3 py-1 rounded-full">{user.real_name}</span>
              <button onClick={hardResetApp} className="text-sm text-slate-400 hover:text-orange-500 font-bold ml-2 border-l border-slate-200 pl-3">Reset App</button>
              <button onClick={() => { localStorage.removeItem('cliniport_user'); setUser(null); setView('login'); }} className="text-sm text-slate-500 hover:text-red-500 font-medium">Log Out</button>
            </div>
          </nav>

          <div className="pt-[110px] lg:pt-28 px-4 md:px-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8 pb-12">
            
            <div className="col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit lg:sticky lg:top-28">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-12 w-12 bg-blue-100 text-blue-600 flex items-center justify-center rounded-full font-bold text-xl min-w-[3rem]"><User /></div>
                <div><p className="font-bold text-slate-800 leading-tight">{user.real_name}</p><p className="text-xs text-slate-500 font-mono">{user.role}</p></div>
              </div>
              
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 text-center">
                  <p className="text-xs text-slate-500 uppercase font-bold mb-1">Your CliniPort ID</p>
                  <p className="text-lg font-mono font-black text-blue-700 tracking-wider mb-2">{isIdUnlocked ? user.uid : '••••••••'}</p>
                  
                  {!isIdUnlocked ? (
                      <form onSubmit={handleUnlockId} className="flex flex-col gap-2 mt-2 animate-in fade-in duration-300">
                          {unlockError && <p className="text-[10px] text-red-600 font-bold leading-tight">{unlockError}</p>}
                          <input type="password" placeholder="Passcode to reveal" value={unlockPassword} onChange={(e) => setUnlockPassword(e.target.value)} className="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-center" required />
                          <button type="submit" disabled={isUnlocking} className="w-full bg-slate-800 text-white text-xs font-bold py-2 rounded hover:bg-slate-900 transition shadow-sm">
                              {isUnlocking ? 'Unlocking...' : 'Unlock ID'}
                          </button>
                      </form>
                  ) : (
                      <button onClick={() => setIsIdUnlocked(false)} className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline transition-all">
                          Lock Now
                      </button>
                  )}
              </div>
              
              <hr className="mb-4 border-slate-100" />
              <ul className="space-y-2">
                {user.role === 'Provider' && (
                   <>
                     <li><button onClick={() => {fetchRoster(user.uid); setView('provider_roster');}} className={`w-full text-left p-3 rounded-xl transition flex items-center gap-2 ${view === 'provider_roster' ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50 text-slate-600'}`}><Users size={18}/> My Roster</button></li>
                     <li><button onClick={() => setView('provider_search')} className={`w-full text-left p-3 rounded-xl transition flex items-center gap-2 ${view === 'provider_search' ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50 text-slate-600'}`}><Search size={18}/> Global Database</button></li>
                   </>
                )}
                {user.role === 'Patient' && pendingRequests.length > 0 && (
                     <li>
                        <button onClick={() => setView('patient_inbox')} className={`w-full text-left p-3 rounded-xl transition flex items-center justify-between ${view === 'patient_inbox' ? 'bg-emerald-50 text-emerald-700 font-bold' : 'hover:bg-slate-50 text-slate-600'}`}>
                            <span className="flex items-center gap-2"><Inbox size={18}/> Provider Requests</span><span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{pendingRequests.length}</span>
                        </button>
                     </li>
                )}
                {activePatient && (
                  <>
                    <li><button onClick={() => setView('dashboard')} className={`w-full text-left p-3 rounded-xl transition ${view === 'dashboard' ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50 text-slate-600'}`}>Chart: {activePatient}</button></li>
                    <li><button onClick={() => setView('upload')} className={`w-full text-left p-3 rounded-xl transition flex items-center gap-2 ${view === 'upload' ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50 text-slate-600'}`}><Upload size={18}/> Upload Document</button></li>
                  </>
                )}
              </ul>
            </div>

            <div className="col-span-1 lg:col-span-3 space-y-6">
              
              {view === 'provider_roster' && (
                 <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-6 items-center justify-between">
                        <div><h3 className="text-xl font-bold mb-1 flex items-center gap-2"><LinkIcon className="text-blue-600" size={24}/> Connect Patient</h3><p className="text-sm text-slate-500">Request access to a patient's chart using their 8-digit ID.</p></div>
                        <form onSubmit={handleRequestConnection} className="flex w-full sm:w-auto gap-2">
                            <input type="text" placeholder="e.g. JD123456" required className="w-full sm:w-48 p-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none font-mono uppercase" value={connectIdInput} onChange={e => setConnectIdInput(e.target.value.toUpperCase())} />
                            <button type="submit" className="bg-blue-600 text-white px-6 py-3 font-bold rounded-xl hover:bg-blue-700 transition shadow-sm whitespace-nowrap">Send Request</button>
                        </form>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-4">My Assigned Patients</h3>
                        {providerRoster.length === 0 ? (
                            <div className="bg-white p-12 text-center rounded-2xl border border-slate-100 border-dashed"><Users size={48} className="text-slate-300 mx-auto mb-4"/><p className="text-slate-500 font-medium">Your roster is currently empty.</p><p className="text-sm text-slate-400 mt-1">Connect with a patient using their ID above to begin.</p></div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {providerRoster.map((pt, i) => (
                                    <div key={i} onClick={() => fetchPatientData(pt.name)} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-blue-300 hover:shadow-md cursor-pointer transition-all">
                                        <div className="flex justify-between items-start mb-2"><h4 className="font-bold text-lg text-slate-800">{pt.name}</h4><span className="text-xs bg-slate-100 text-slate-600 font-mono px-2 py-1 rounded border">{pt.uid}</span></div>
                                        <p className="text-sm text-slate-500 flex items-center gap-1"><ActivitySquare size={14}/> Last Activity: {pt.last_visit}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                 </div>
              )}

              {view === 'patient_inbox' && (
                 <div className="bg-white p-6 md:p-10 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
                   <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Inbox className="text-emerald-600"/> Provider Connection Requests</h3>
                   {pendingRequests.length === 0 ? ( <p className="text-slate-500 text-center py-8">No pending requests.</p> ) : (
                       <div className="space-y-4">
                           {pendingRequests.map((req, i) => (
                               <div key={i} className="flex flex-col sm:flex-row justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200 gap-4">
                                   <div><p className="font-bold text-slate-800 text-lg">Dr. {req.doctorName}</p><p className="text-sm text-slate-500 font-mono">Provider ID: {req.doctorId}</p></div>
                                   <div className="flex gap-2 w-full sm:w-auto"><button onClick={() => setPendingRequests(prev => prev.filter(r => r.doctorId !== req.doctorId))} className="flex-1 sm:flex-none bg-white border border-slate-300 text-slate-600 px-4 py-2 font-bold rounded-lg hover:bg-slate-100">Decline</button><button onClick={() => handleAcceptRequest(req)} className="flex-1 sm:flex-none bg-emerald-600 text-white px-6 py-2 font-bold rounded-lg hover:bg-emerald-700 shadow-sm">Authorize Access</button></div>
                               </div>
                           ))}
                       </div>
                   )}
                 </div>
              )}

              {view === 'provider_search' && (
                 <div className="bg-white p-6 md:p-10 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
                   <h3 className="text-xl font-bold mb-2 flex items-center gap-2"><Search className="text-blue-600"/> Global Database Search</h3><p className="text-slate-500 text-sm mb-6">Emergency access global lookup. Please prefer connecting via ID on your Roster.</p>
                   <div className="flex flex-col sm:flex-row gap-4"><input type="text" placeholder="Enter full patient name" className="flex-1 p-4 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /><button onClick={() => fetchPatientData(searchQuery)} className="bg-blue-600 text-white px-8 py-4 sm:py-0 font-bold rounded-xl hover:bg-blue-700 transition shadow-sm hover:shadow-md">Emergency Access</button></div>
                 </div>
              )}

              {view === 'dashboard' && activePatient && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100 flex gap-2 overflow-x-auto snap-x mb-6">
                     <button onClick={() => setDashTab('profile')} className={`flex-1 min-w-[120px] snap-start py-3 rounded-lg font-bold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition text-sm sm:text-base ${dashTab === 'profile' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-50'}`}><ClipboardList size={18}/> Profile</button>
                     <button onClick={() => setDashTab('visits')} className={`flex-1 min-w-[120px] snap-start py-3 rounded-lg font-bold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition text-sm sm:text-base ${dashTab === 'visits' ? 'bg-purple-50 text-purple-700' : 'text-slate-500 hover:bg-slate-50'}`}><Stethoscope size={18}/> Encounters</button>
                     <button onClick={() => setDashTab('prescriptions')} className={`flex-1 min-w-[120px] snap-start py-3 rounded-lg font-bold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition text-sm sm:text-base ${dashTab === 'prescriptions' ? 'bg-cyan-50 text-cyan-700' : 'text-slate-500 hover:bg-slate-50'}`}><Pill size={18}/> Rx & Meds</button>
                     <button onClick={() => setDashTab('orders')} className={`flex-1 min-w-[120px] snap-start py-3 rounded-lg font-bold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition text-sm sm:text-base ${dashTab === 'orders' ? 'bg-pink-50 text-pink-700' : 'text-slate-500 hover:bg-slate-50'}`}><FileSignature size={18}/> Orders</button>
                     <button onClick={() => setDashTab('labs')} className={`flex-1 min-w-[120px] snap-start py-3 rounded-lg font-bold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition text-sm sm:text-base ${dashTab === 'labs' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}><FlaskConical size={18}/> Labs</button>
                     <button onClick={() => setDashTab('growth')} className={`flex-1 min-w-[120px] snap-start py-3 rounded-lg font-bold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition text-sm sm:text-base ${dashTab === 'growth' ? 'bg-orange-50 text-orange-700' : 'text-slate-500 hover:bg-slate-50'}`}><Ruler size={18}/> Vitals</button>
                     <button onClick={() => setDashTab('vaccines')} className={`flex-1 min-w-[120px] snap-start py-3 rounded-lg font-bold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition text-sm sm:text-base ${dashTab === 'vaccines' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}><Syringe size={18}/> Vaccines</button>
                     <button onClick={() => setDashTab('diseases')} className={`flex-1 min-w-[120px] snap-start py-3 rounded-lg font-bold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition text-sm sm:text-base ${dashTab === 'diseases' ? 'bg-rose-50 text-rose-700' : 'text-slate-500 hover:bg-slate-50'}`}><Bug size={18}/> Screenings</button>
                  </div>

                  {dashTab === 'profile' && (
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
                        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit">
                            <h3 className="font-bold text-slate-800 text-lg mb-4 border-b pb-2">Personal Info</h3>
                            <div className="space-y-4 text-sm break-words">
                                <div><p className="text-slate-400 font-bold uppercase text-xs">Full Name</p><p className="font-semibold text-slate-800">{activePatient}</p></div>
                                <div><p className="text-slate-400 font-bold uppercase text-xs">Age</p><p className="font-semibold text-slate-800">{patientData.personal_info?.age || 'N/A'}</p></div>
                                <div><p className="text-slate-400 font-bold uppercase text-xs">Biological Sex</p><p className="font-semibold text-slate-800">{patientData.personal_info?.gender || 'N/A'}</p></div>
                                <div><p className="text-slate-400 font-bold uppercase text-xs">Email</p><p className="font-semibold text-slate-800">{patientData.personal_info?.email || 'N/A'}</p></div>
                                <div><p className="text-slate-400 font-bold uppercase text-xs">Phone</p><p className="font-semibold text-slate-800">{patientData.personal_info?.phone || 'N/A'}</p></div>
                                <div><p className="text-slate-400 font-bold uppercase text-xs">Address</p><p className="font-semibold text-slate-800">{patientData.personal_info?.address || 'N/A'}</p></div>
                            </div>
                        </div>
                        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <div className="flex flex-wrap gap-2 justify-between items-center mb-4 border-b pb-2">
                                <h3 className="font-bold text-slate-800 text-lg">Clinical Overview</h3>
                                {user.role === 'Provider' && !isEditingProfile && (<button onClick={() => setIsEditingProfile(true)} className="flex items-center gap-1 text-sm text-blue-600 font-bold hover:underline transition-colors"><Edit3 size={16}/> Edit Profile</button>)}
                                {isEditingProfile && (<button onClick={handleSaveProfile} className="flex items-center gap-1 text-sm bg-emerald-600 text-white px-4 py-1.5 rounded-lg font-bold hover:bg-emerald-700 transition shadow-sm"><Save size={16}/> Save Changes</button>)}
                            </div>
                            {isEditingProfile ? (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    <div><label className="text-sm font-bold text-slate-700">Dangerous Allergies</label><input type="text" value={profileForm.allergies} onChange={e => setProfileForm({...profileForm, allergies: e.target.value})} className="w-full p-2 border rounded-lg bg-slate-50 mt-1 focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                                    <div><label className="text-sm font-bold text-slate-700">Chronic Diseases</label><input type="text" value={profileForm.chronic_diseases} onChange={e => setProfileForm({...profileForm, chronic_diseases: e.target.value})} className="w-full p-2 border rounded-lg bg-slate-50 mt-1 focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                                    <div><label className="text-sm font-bold text-slate-700">Genetic Conditions</label><input type="text" value={profileForm.genetic_conditions} onChange={e => setProfileForm({...profileForm, genetic_conditions: e.target.value})} className="w-full p-2 border rounded-lg bg-slate-50 mt-1 focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                                    <div><label className="text-sm font-bold text-slate-700">Provider Notes</label><textarea value={profileForm.notes} onChange={e => setProfileForm({...profileForm, notes: e.target.value})} className="w-full p-2 border rounded-lg bg-slate-50 mt-1 h-24 focus:ring-2 focus:ring-blue-500 outline-none"></textarea></div>
                                </div>
                            ) : (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    <div><h4 className="text-sm font-bold text-red-500 uppercase flex items-center gap-1 mb-2"><AlertTriangle size={16}/> Allergies</h4><div className="flex flex-wrap gap-2">{patientData.profile?.allergies ? patientData.profile.allergies.split(',').map((item, i) => (<span key={i} className="bg-red-50 text-red-700 border border-red-100 px-3 py-1 rounded-md font-semibold text-sm shadow-sm">{item.trim()}</span>)) : <span className="text-slate-400 text-sm italic">No allergies recorded.</span>}</div></div>
                                    <div><h4 className="text-sm font-bold text-indigo-500 uppercase mb-2">Chronic Diseases</h4><div className="flex flex-wrap gap-2">{patientData.profile?.chronic_diseases ? patientData.profile.chronic_diseases.split(',').map((item, i) => (<span key={i} className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1 rounded-md font-semibold text-sm shadow-sm">{item.trim()}</span>)) : <span className="text-slate-400 text-sm italic">No chronic diseases recorded.</span>}</div></div>
                                    <div><h4 className="text-sm font-bold text-slate-500 uppercase mb-2">Provider Notes</h4><p className="text-sm text-slate-700 bg-slate-50 p-4 rounded-lg border whitespace-pre-wrap shadow-inner">{patientData.profile?.notes || "No notes recorded."}</p></div>
                                </div>
                            )}
                        </div>
                     </div>
                  )}

                  {dashTab === 'visits' && (
                      <div className="space-y-6 animate-in fade-in duration-300">
                          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"><h3 className="text-xl font-bold mb-2 text-slate-800 flex items-center gap-2"><Stethoscope className="text-purple-600"/> Clinical Encounters</h3></div>
                          {patientData.visits && Object.keys(patientData.visits).length > 0 ? (
                              Object.values(patientData.visits).sort((a,b) => new Date(b.date) - new Date(a.date)).map((visit, idx) => (
                                  <div key={idx} className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                                      <div className="flex justify-between items-center border-b pb-4 mb-4"><div><h4 className="font-bold text-lg text-slate-800">Encounter: {visit.date}</h4><p className="text-sm text-slate-500">Provider: {visit.provider}</p></div></div>
                                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                          <div className="space-y-4">
                                              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 shadow-sm"><p className="text-xs font-bold text-emerald-700 uppercase mb-1">AI Visit Summary</p><p className="text-sm text-emerald-900 whitespace-pre-wrap">{visit.ai_summary || "No specific metrics detected in documents."}</p></div>
                                              <div><p className="text-xs font-bold text-slate-500 uppercase mb-2">Attached Documents</p><ul className="space-y-2">{visit.documents.map((doc, i) => (<li key={i} className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 p-2 rounded border break-all"><FileText size={14} className="text-slate-400 shrink-0"/> {doc}</li>))}</ul></div>
                                          </div>
                                          <div className="flex flex-col h-full min-h-[200px]">
                                              <p className="text-xs font-bold text-slate-500 uppercase mb-2">Physician Encounter Note</p><textarea value={visitNotes[visit.date] || ''} onChange={(e) => setVisitNotes({...visitNotes, [visit.date]: e.target.value})} className="w-full flex-grow p-3 border rounded-lg bg-slate-50 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none mb-3" readOnly={user.role === 'Patient'}></textarea>
                                              {user.role === 'Provider' && (<button onClick={() => handleSaveVisitNote(visit.date)} className="w-full bg-purple-600 text-white font-bold py-2 rounded-lg hover:bg-purple-700 transition shadow-sm flex items-center justify-center gap-2"><Save size={16}/> Save Visit Note</button>)}
                                          </div>
                                      </div>
                                  </div>
                              ))
                          ) : (<div className="bg-white p-12 text-center rounded-2xl border"><p className="text-slate-500">No recorded encounters.</p></div>)}
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
                                   <button key={category} type="button" onClick={(e) => { e.preventDefault(); handleCategoryClick(category); }} className={`cursor-pointer px-4 md:px-6 py-2 rounded-t-lg font-bold whitespace-nowrap ${activeCategory === category ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{category}</button>
                               ))}
                           </div>
                           {patientData.categories[activeCategory]?.length > 0 && (
                               <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center gap-4 mt-4">
                                   <div className="flex items-center gap-2"><ActivitySquare className="text-blue-600" size={24} /><label className="font-bold text-slate-700">Select Lab Test:</label></div>
                                   <select value={selectedTestName} onChange={(e) => setSelectedTestName(e.target.value)} className="p-3 border rounded-lg bg-slate-50 font-semibold w-full sm:w-auto focus:ring-2">
                                       {patientData.categories[activeCategory].map(test => (<option key={test.test_name} value={test.test_name}>{test.test_name}</option>))}
                                   </select>
                               </div>
                           )}
                           {(() => {
                               const activeTest = patientData.categories[activeCategory]?.find(t => t.test_name === selectedTestName);
                               if (!activeTest) return null;
                               const sortedHistory = [...activeTest.history].sort((a, b) => new Date(a.Date) - new Date(b.Date));
                               return (
                                   <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mt-6 flex flex-col">
                                       <div className="bg-slate-50 px-4 md:px-6 py-4 border-b flex justify-between sm:items-center"><h3 className="font-bold text-slate-800 text-lg">{activeTest.test_name} Trend Analysis</h3><span className="text-sm bg-white border px-4 py-1.5 rounded-full font-medium">Range: {activeTest.normal_min} - {activeTest.normal_max} {activeTest.unit}</span></div>
                                       <div className="grid grid-cols-1 lg:grid-cols-2">
                                           <div className="p-2 sm:p-6 border-b lg:border-b-0 lg:border-r h-[300px] lg:h-80">
                                               <ResponsiveContainer width="100%" height="100%">
                                                 <LineChart data={sortedHistory} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                                   <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                   <XAxis dataKey="Date" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                                                   <YAxis domain={[0, 'auto']} tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                                                   <Tooltip contentStyle={{borderRadius: '8px'}} />
                                                   {activeTest.normal_min !== 0 && <ReferenceLine y={activeTest.normal_min} stroke="#10B981" strokeDasharray="3 3" />}
                                                   {activeTest.normal_max !== 0 && <ReferenceLine y={activeTest.normal_max} stroke="#10B981" strokeDasharray="3 3" />}
                                                   <Line type="monotone" dataKey="Value" stroke="#2563EB" strokeWidth={4} />
                                                 </LineChart>
                                               </ResponsiveContainer>
                                           </div>
                                           <div className="p-4 sm:p-6 overflow-x-auto lg:overflow-y-auto h-auto lg:h-80">
                                               <table className="w-full text-left min-w-[300px]">
                                                   <thead><tr><th className="pb-3 text-xs uppercase text-slate-400 border-b">Date</th><th className="pb-3 text-xs uppercase text-slate-400 border-b">Value</th><th className="pb-3 text-xs uppercase text-slate-400 border-b">Status</th></tr></thead>
                                                   <tbody>
                                                       {sortedHistory.map((record, i) => (
                                                            <tr key={i} className="hover:bg-slate-50"><td className="py-3 text-sm font-medium border-b">{record.Date}</td><td className="py-3 text-sm font-bold border-b">{record.Value} {activeTest.unit}</td><td className="py-3 border-b"><span className={`text-xs px-2 py-1 rounded-full font-bold shadow-sm ${record.Status === 'Normal' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{record.Status}</span></td></tr>
                                                       ))}
                                                   </tbody>
                                               </table>
                                           </div>
                                       </div>
                                   </div>
                               );
                           })()}
                         </>
                       ) : (<div className="bg-white p-12 text-center rounded-2xl border"><p className="text-slate-500">No lab data available.</p></div>)}
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

      {isScanning && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[99999] flex flex-col justify-center items-center text-white px-4 animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm w-full text-center border border-slate-100">
            <Activity className="text-blue-600 animate-pulse mb-4 animate-spin" size={48} />
            <h3 className="text-slate-900 font-bold text-lg mb-1">AI Smart Scanning Active</h3>
            <p className="text-slate-500 text-sm">Reading the document layout to auto-detect the patient's identity...</p>
          </div>
        </div>
      )}
    </div>
  );
}
