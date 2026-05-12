import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import {
  Wallet, TrendingUp, Building, FileText, CheckCircle,
  Plus, LayoutDashboard, List, Activity, AlertCircle, Download,
  Lock, DollarSign, Users, FileBarChart, Save, LogOut,
  RefreshCw, Wifi, WifiOff
} from 'lucide-react';

import logoMts from './assets/logo-mts.png';
import { PrintReceiptButton } from './components/PrintReceipt';
import { LaporanBulananButton } from './components/LaporanBulananPDF';

// ============================================================================
// KONFIGURASI
// ============================================================================

var API_URL = 'https://script.google.com/macros/s/AKfycbzNvajqiPi169u-IQ4R2wdffVQvk3vxU_y-YfiPM6r92CkUfEd0MmTvBk4oMcfMbQA/exec';
var GOOGLE_CLIENT_ID = '1007043166010-rtbc31cshotnq5vlqtjdgf022vfkvt5b.apps.googleusercontent.com';
var COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#6366f1', '#8b5cf6', '#ec4899'];

var AUTHORIZED_USERS = {
  'ishlahulcloud@gmail.com': 'yayasan',
  'gochi.sama@gmail.com': 'kepala',
  'mfahriany@gmail.com': 'bendahara',
  'istisofiaazzahra@gmail.com': 'bendahara',
  'azeezahrania@gmail.com': 'bendahara'
};

// ============================================================================
// API
// ============================================================================

var currentUserEmail = '';

async function apiGet(action, params) {
  var url = new URL(API_URL);
  url.searchParams.append('action', action);
  url.searchParams.append('userEmail', currentUserEmail);
  if (params) {
    Object.keys(params).forEach(function (key) {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });
  }
  var response = await fetch(url.toString());
  var data = await response.json();
  if (!data.success) throw new Error(data.message || 'API error');
  return data.data;
}

async function apiPost(action, payload) {
  var url = new URL(API_URL);
  url.searchParams.append('action', action);
  url.searchParams.append('userEmail', currentUserEmail);
  url.searchParams.append('payload', JSON.stringify(payload || {}));
  var response = await fetch(url.toString());
  var data = await response.json();
  if (!data.success) throw new Error(data.message || 'API error');
  return data.data;
}

function getQuarter(date) {
  var m = new Date(date).getMonth() + 1;
  if (m <= 3) return 'Q1';
  if (m <= 6) return 'Q2';
  if (m <= 9) return 'Q3';
  return 'Q4';
}

function fmtCurrency(val) {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(val);
}

// ============================================================================
// LOGIN PAGE
// ============================================================================

function LoginPage(props) {
  var [error, setError] = useState('');
  var [gsiLoaded, setGsiLoaded] = useState(false);

  useEffect(function () {
    var script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = function () {
      setGsiLoaded(true);
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false
      });
      window.google.accounts.id.renderButton(
        document.getElementById('google-signin-btn'),
        { theme: 'outline', size: 'large', width: 320, text: 'signin_with', shape: 'rectangular' }
      );
    };
    document.body.appendChild(script);
    return function () { if (document.body.contains(script)) document.body.removeChild(script); };
  }, []);

  function handleCredentialResponse(response) {
    try {
      var parts = response.credential.split('.');
      var payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      var email = payload.email;
      if (!AUTHORIZED_USERS[email]) {
        setError('Email ' + email + ' tidak terdaftar. Hubungi administrator.');
        return;
      }
      props.onLogin({ email: email, name: payload.name, picture: payload.picture, role: AUTHORIZED_USERS[email] });
    } catch (err) { setError('Login gagal: ' + err.message); }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img src={logoMts} alt="Logo MTs Ishlahul Amanah" className="w-24 h-24 object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-1">Sistem Keuangan</h1>
          <h2 className="text-lg font-semibold text-emerald-600 mb-1">MTs Ishlahul Amanah</h2>
          <p className="text-sm text-slate-500">Pangalengan, Kabupaten Bandung</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-6 mb-6">
          <p className="text-sm text-slate-600 text-center mb-4">Silakan login dengan akun Google terdaftar</p>
          <div className="flex justify-center"><div id="google-signin-btn"></div></div>
          {!gsiLoaded && <div className="flex justify-center mt-4"><RefreshCw className="w-5 h-5 text-slate-400 animate-spin" /><span className="text-sm text-slate-400 ml-2">Memuat...</span></div>}
        </div>
        {error && <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 mb-4"><div className="flex items-start gap-2"><AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" /><p className="text-sm text-rose-700">{error}</p></div></div>}
        <div className="text-center text-xs text-slate-400 mt-6"><p>Hanya email terdaftar yang dapat mengakses</p><p className="mt-1">ISAK 35 | Cloud-Based</p></div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN APP
// ============================================================================

export default function App() {
  var [user, setUser] = useState(null);
  var [tab, setTab] = useState('dashboard');
  var [transactions, setTransactions] = useState([]);
  var [coa, setCoa] = useState([]);
  var [rkam, setRkam] = useState([]);
  var [role, setRole] = useState('viewer');
  var [showForm, setShowForm] = useState(false);
  var [loading, setLoading] = useState(false);
  var [online, setOnline] = useState(true);
  var [sync, setSync] = useState('synced');
  var [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], ref: '', desc: '', coa: '4100', rkam: '', amount: '', restriction: 'unrestricted', docRef: '', approvedBy: '' });
// Tambahkan di baris state (sekitar baris 150)
  var [students, setStudents] = useState([]);
  var [billings, setBillings] = useState([]);
  var [selectedStudent, setSelectedStudent] = useState(null); // Untuk modal penyesuaian tarif

  useEffect(function () {
    var saved = localStorage.getItem('madrasah_user');
    if (saved) { try { var u = JSON.parse(saved); if (AUTHORIZED_USERS[u.email]) { setUser(u); currentUserEmail = u.email; setRole(u.role); } } catch (e) { localStorage.removeItem('madrasah_user'); } }
  }, []);

  useEffect(function () {
    if (user) {
      loadData();
      function on() { setOnline(true); } function off() { setOnline(false); }
      window.addEventListener('online', on); window.addEventListener('offline', off);
      return function () { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
    }
  }, [user]);

  function handleLogin(u) { currentUserEmail = u.email; setUser(u); setRole(u.role); localStorage.setItem('madrasah_user', JSON.stringify(u)); }
  function handleLogout() { setUser(null); setRole('viewer'); setTransactions([]); setCoa([]); setRkam([]); currentUserEmail = ''; localStorage.removeItem('madrasah_user'); if (window.google && window.google.accounts) window.google.accounts.id.disableAutoSelect(); }

  async function loadData() {
  setLoading(true); setSync('syncing');
  try {
    var r = await Promise.all([
      apiGet('getTransactions', { quarter: 'all', restriction: 'all' }),
      apiGet('getCOA'),
      apiGet('getRKAM'),
      apiGet('getUserRole', { email: currentUserEmail }),
      apiGet('getStudents'), // Ambil data siswa
      apiGet('getBillings')  // Ambil data billing
    ]);
    setTransactions(r[0] || []);
    setCoa(r[1] || []);
    setRkam(r[2] || []);
    setRole((r[3] && r[3].role) || AUTHORIZED_USERS[currentUserEmail] || 'viewer');
    setStudents(r[4] || []);
    setBillings(r[5] || []);
    setSync('synced');
  } catch (err) { 
    setSync('error');
    console.error(err);
  } finally { setLoading(false); }
}


  async function refreshTx() { setSync('syncing'); try { var d = await apiGet('getTransactions', { quarter: 'all', restriction: 'all' }); setTransactions(d || []); setSync('synced'); } catch (e) { setSync('error'); } }

  if (!user) return <LoginPage onLogin={handleLogin} />;
  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="text-center"><RefreshCw className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-4" /><h2 className="text-xl font-bold mb-2">Memuat Data...</h2><p className="text-slate-500">Login: {user.name}</p></div></div>;

  // Analytics
  var analytics = (function () {
    var income = 0, expense = 0, incR = 0, expR = 0, spp = 0, usaha = 0, donasi = 0, donasiR = 0;
    var rd = rkam.map(function (r) { return { code: r.code, name: r.name, budget: Number(r.budget), realization: 0, q1: 0, q2: 0, q3: 0, q4: 0 }; });
    var qd = { Q1: { i: 0, o: 0 }, Q2: { i: 0, o: 0 }, Q3: { i: 0, o: 0 }, Q4: { i: 0, o: 0 } };
    transactions.forEach(function (t) {
      var a = Number(t.amount), q = t.quarter || getQuarter(t.date), rest = t.restriction && t.restriction !== 'unrestricted';
      if (t.type === 'IN') { income += a; if (rest) incR += a; if (qd[q]) qd[q].i += a; if (String(t.coa) === '4100' || String(t.coa) === '4101') spp += a; if (String(t.coa) === '4200') usaha += a; if (String(t.coa) === '4300') donasi += a; if (String(t.coa) === '4301' || String(t.coa) === '4302') donasiR += a; }
      else { expense += a; if (rest) expR += a; if (qd[q]) qd[q].o += a; }
      if (t.rkam) { var idx = rd.findIndex(function (r) { return r.code === t.rkam; }); if (idx >= 0) { rd[idx].realization += a; rd[idx][q.toLowerCase()] += a; } }
    });
    return { totalIn: income, totalOut: expense, totalInRestricted: incR, totalOutRestricted: expR, balance: income - expense, surplus: income - expense, surplusUnrestricted: (income - incR) - (expense - expR), rkamData: rd,
      cashFlow: ['Q1', 'Q2', 'Q3', 'Q4'].map(function (q) { return { quarter: q, masuk: qd[q].i, keluar: qd[q].o, saldo: qd[q].i - qd[q].o }; }),
      incData: [{ name: 'SPP/Pangkal', value: spp }, { name: 'Unit Usaha', value: usaha }, { name: 'Donasi', value: donasi }, { name: 'Donasi Terikat', value: donasiR }].filter(function (d) { return d.value > 0; }) };
  })();

  function handleInput(e) { var n = e.target.name, v = e.target.value; setForm(function (p) { var x = {}; Object.keys(p).forEach(function (k) { x[k] = p[k]; }); x[n] = v; return x; }); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) { alert('Nominal harus diisi'); return; }
    if (role === 'viewer') { alert('Viewer tidak dapat menambah transaksi'); return; }
    setSync('syncing');
    try {
      var ci = coa.find(function (c) { return String(c.code) === String(form.coa); });
      await apiPost('addTransaction', { data: { date: form.date, ref: form.ref, desc: form.desc, coa: form.coa, rkam: form.rkam, type: ci && ci.category === 'PENDAPATAN' ? 'IN' : 'OUT', amount: Number(form.amount), restriction: form.restriction, docRef: form.docRef, approvedBy: form.approvedBy || user.name, quarter: getQuarter(form.date) } });
      await refreshTx(); setShowForm(false);
      setForm({ date: new Date().toISOString().split('T')[0], ref: '', desc: '', coa: '4100', rkam: '', amount: '', restriction: 'unrestricted', docRef: '', approvedBy: '' });
      setSync('synced'); alert('Transaksi berhasil!');
    } catch (err) { setSync('error'); alert('Gagal: ' + err.message); }
  }

  async function handleUpdateRate(studentId, newRate, reason) {
  setSync('syncing');
  try {
    await apiPost('updateStudentRate', { 
      data: { studentId, customSpp: Number(newRate), discountReason: reason } 
    });
    alert("Tarif khusus berhasil diterapkan!");
    await loadData(); // Refresh data
  } catch (err) {
    alert("Gagal update tarif: " + err.message);
  }
}

  function exportCSV() {
    var h = ['Tanggal', 'Ref', 'Deskripsi', 'Akun', 'Debet', 'Kredit', 'Status'];
    var rows = transactions.map(function (t) { var c = coa.find(function (x) { return String(x.code) === String(t.coa); }); return [t.date, t.ref, '"' + t.desc + '"', c ? c.name : t.coa, t.type === 'IN' ? t.amount : '', t.type === 'OUT' ? t.amount : '', t.restriction === 'unrestricted' ? 'Bebas' : 'Terikat']; });
    var csv = [h.join(',')].concat(rows.map(function (r) { return r.join(','); })).join('\n');
    var b = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); var l = document.createElement('a'); l.href = URL.createObjectURL(b); l.download = 'jurnal-' + new Date().toISOString().split('T')[0] + '.csv'; l.click();
  }

  function exportISAK() {
    var r = '=== YAYASAN PENDIDIKAN MTs Ishlahul Amanah ===\nLAPORAN PENGHASILAN KOMPREHENSIF (ISAK 35)\n\n';
    r += 'I. PENDAPATAN TANPA PEMBATASAN\n';
    coa.filter(function (c) { return c.category === 'PENDAPATAN' && !String(c.code).startsWith('430'); }).forEach(function (c) { var a = transactions.filter(function (t) { return String(t.coa) === String(c.code) && t.restriction === 'unrestricted'; }).reduce(function (s, t) { return s + Number(t.amount); }, 0); if (a > 0) r += '  ' + c.name + ': Rp ' + fmtCurrency(a) + '\n'; });
    r += '  TOTAL: Rp ' + fmtCurrency(analytics.totalIn - analytics.totalInRestricted) + '\n\n';
    r += 'II. PENDAPATAN DENGAN PEMBATASAN\n';
    coa.filter(function (c) { return String(c.code).startsWith('430'); }).forEach(function (c) { var a = transactions.filter(function (t) { return String(t.coa) === String(c.code); }).reduce(function (s, t) { return s + Number(t.amount); }, 0); if (a > 0) r += '  ' + c.name + ': Rp ' + fmtCurrency(a) + '\n'; });
    r += '  TOTAL: Rp ' + fmtCurrency(analytics.totalInRestricted) + '\n\n';
    r += 'III. BEBAN\n';
    coa.filter(function (c) { return c.category === 'BEBAN'; }).forEach(function (c) { var a = transactions.filter(function (t) { return String(t.coa) === String(c.code); }).reduce(function (s, t) { return s + Number(t.amount); }, 0); if (a > 0) r += '  ' + c.name + ': (Rp ' + fmtCurrency(a) + ')\n'; });
    r += '  TOTAL: (Rp ' + fmtCurrency(analytics.totalOut) + ')\n\n';
    r += 'SURPLUS: Rp ' + fmtCurrency(analytics.surplus) + '\n';
    var b = new Blob([r], { type: 'text/plain;charset=utf-8;' }); var l = document.createElement('a'); l.href = URL.createObjectURL(b); l.download = 'isak35-' + new Date().toISOString().split('T')[0] + '.txt'; l.click();
  }

  async function doBackup() {
    if (role !== 'yayasan' && role !== 'kepala') { alert('Hanya Kepala/Yayasan'); return; }
    setSync('syncing'); try { await apiPost('createBackup'); setSync('synced'); alert('Backup berhasil!'); } catch (e) { setSync('error'); alert('Gagal: ' + e.message); }
  }

  var rl = role === 'bendahara' ? 'Bendahara' : role === 'kepala' ? 'Kepala' : role === 'yayasan' ? 'Yayasan' : 'Viewer';

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex">
      <aside className="w-64 bg-slate-900 text-white flex-col hidden md:flex">
        <div className="p-6 border-b border-slate-800"><div className="flex items-center gap-3"><img src={logoMts} alt="Logo MTs" className="w-8 h-8 mr-3 object-contain" />
        <div><h1 className="font-bold text-lg leading-tight">MTs Ishlahul Amanah</h1><p className="text-xs text-slate-400">Sistem Keuangan Web</p></div></div></div>
        <nav className="flex-1 p-4 space-y-2">
          <NB icon={<LayoutDashboard />} label="Dashboard" a={tab === 'dashboard'} oc={function () { setTab('dashboard'); }} />
          <NB icon={<List />} label="Jurnal Umum" a={tab === 'jurnal'} oc={function () { setTab('jurnal'); }} />
          <NB icon={<Users />} label="Data Siswa" a={tab === 'students'} oc={function () { setTab('students'); }} />
          <NB icon={<Activity />} label="Monitoring RKAM" a={tab === 'rkam'} oc={function () { setTab('rkam'); }} />
          <NB icon={<TrendingUp />} label="Proyeksi Kas" a={tab === 'cashflow'} oc={function () { setTab('cashflow'); }} />
          <NB icon={<DollarSign />} label="Dana Terikat" a={tab === 'restricted'} oc={function () { setTab('restricted'); }} />
          <NB icon={<FileText />} label="ISAK 35" a={tab === 'isak'} oc={function () { setTab('isak'); }} />
        </nav>
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs mb-3">
            {online ? <><Wifi className="w-4 h-4 text-emerald-500" /><span className="text-emerald-500">Online</span></> : <><WifiOff className="w-4 h-4 text-rose-500" /><span className="text-rose-500">Offline</span></>}
            <span className="ml-auto">{sync === 'synced' && <CheckCircle className="w-4 h-4 text-emerald-500" />}{sync === 'syncing' && <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />}{sync === 'error' && <AlertCircle className="w-4 h-4 text-rose-500" />}</span>
          </div>
          <div className="flex items-center gap-3 mb-3">
            {user.picture && <img src={user.picture} alt="" className="w-8 h-8 rounded-full" />}
            <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{user.name}</div><div className="text-xs text-slate-400 truncate">{user.email}</div></div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs bg-emerald-600 px-2 py-1 rounded">{rl}</span>
            <button onClick={handleLogout} className="text-xs bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded flex items-center gap-1 text-rose-400"><LogOut className="w-3 h-3" />Logout</button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white border-b p-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold hidden md:block">{tab === 'dashboard' ? 'Dashboard' : tab === 'jurnal' ? 'Jurnal Umum' : tab === 'rkam' ? 'RKAM' : tab === 'cashflow' ? 'Proyeksi Kas' : tab === 'restricted' ? 'Dana Terikat' : 'ISAK 35'}</h2>
            <select className="md:hidden bg-slate-100 text-sm rounded p-2" value={tab} onChange={function (e) { setTab(e.target.value); }}><option value="dashboard">Dashboard</option><option value="jurnal">Jurnal</option><option value="rkam">RKAM</option><option value="cashflow">Kas</option><option value="restricted">Dana Terikat</option><option value="isak">ISAK 35</option></select>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refreshTx} className="p-2 hover:bg-slate-100 rounded-lg"><RefreshCw className={'w-5 h-5 text-slate-600 ' + (sync === 'syncing' ? 'animate-spin' : '')} /></button>
            {(role === 'yayasan' || role === 'kepala') && <button onClick={doBackup} className="hidden md:flex items-center gap-2 px-3 py-2 bg-slate-700 text-white rounded-lg text-sm"><Save className="w-4 h-4" />Backup</button>}
            <button onClick={handleLogout} className="md:hidden p-2 hover:bg-slate-100 rounded-lg text-rose-500"><LogOut className="w-5 h-5" /></button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8">

          {tab === 'dashboard' && <div className="space-y-6 max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <CD t="Saldo Kas" v={'Rp ' + fmtCurrency(analytics.balance)} ic={<Wallet className="text-emerald-600" />} />
              <CD t="Pendapatan" v={'Rp ' + fmtCurrency(analytics.totalIn)} ic={<TrendingUp className="text-blue-600" />} s={'Terikat: Rp ' + fmtCurrency(analytics.totalInRestricted)} />
              <CD t="Surplus" v={'Rp ' + fmtCurrency(analytics.surplus)} ic={<CheckCircle className="text-amber-500" />} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border"><h3 className="font-bold mb-4">Komposisi Pendapatan</h3><div className="h-64"><ResponsiveContainer><PieChart><Pie data={analytics.incData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" label>{analytics.incData.map(function (e, i) { return <Cell key={i} fill={COLORS[i % COLORS.length]} />; })}</Pie><RechartsTooltip formatter={function (v) { return 'Rp ' + fmtCurrency(v); }} /><Legend /></PieChart></ResponsiveContainer></div></div>
              <div className="bg-white p-6 rounded-xl shadow-sm border"><div className="flex items-center gap-2 mb-2"><AlertCircle className="text-rose-500 w-5 h-5" /><h3 className="font-bold text-rose-600">Mitigasi Pajak (PMK 68/2020)</h3></div><p className="text-sm text-slate-600 mb-4">Surplus wajib direinvestasikan ke Sarpras dalam 4 tahun.</p><div className="flex justify-between text-sm mb-1 font-medium"><span>Surplus Tanpa Pembatasan</span><span className="text-emerald-600">Rp {fmtCurrency(analytics.surplusUnrestricted)}</span></div><div className="w-full bg-slate-100 rounded-full h-2.5"><div className="bg-rose-400 h-2.5 rounded-full" style={{ width: '15%' }}></div></div></div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border"><h3 className="font-bold mb-4">Tren Kas Kuartalan</h3><div className="h-64"><ResponsiveContainer><AreaChart data={analytics.cashFlow}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="quarter" /><YAxis tickFormatter={function (v) { return (v / 1000000) + 'M'; }} /><RechartsTooltip formatter={function (v) { return 'Rp ' + fmtCurrency(v); }} /><Legend /><Area type="monotone" dataKey="masuk" stackId="1" stroke="#10b981" fill="#10b981" name="Masuk" /><Area type="monotone" dataKey="keluar" stackId="2" stroke="#ef4444" fill="#ef4444" name="Keluar" /></AreaChart></ResponsiveContainer></div></div>
          </div>}

          {tab === 'jurnal' && <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <h2 className="text-2xl font-bold">Jurnal Umum</h2>
              <div className="flex gap-2">
                <button onClick={exportCSV} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 text-sm">
                  <Download className="w-4 h-4" />CSV
                </button>
                <LaporanBulananButton transactions={transactions} coaList={coa} rkamList={rkam} institution="MTs Ishlahul Amanah" userRole={role} userName={user.name} />
                {role !== 'viewer' && <button onClick={function () { setShowForm(!showForm); }} className="px-4 py-2 bg-emerald-600 text-white rounded-lg flex items-center gap-2"><Plus className="w-4 h-4" />Entri</button>}
              </div>
            </div>

          {tab === 'students' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Manajemen Siswa & Piutang</h2>
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm flex items-center gap-2">
                    <Plus className="w-4 h-4" />Tambah Siswa
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="p-4 font-semibold">NIS</th>
                        <th className="p-4 font-semibold">Nama Siswa</th>
                        <th className="p-4 font-semibold">Kelas</th>
                        <th className="p-4 font-semibold">Kategori</th>
                        <th className="p-4 font-semibold text-right">Tarif SPP</th>
                        <th className="p-4 font-semibold text-right text-rose-600">Total Piutang</th>
                        <th className="p-4 font-semibold text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {students.map((s, i) => {
                        // Hitung piutang dari data billing secara otomatis
                        const studentBills = billings.filter(b => b.studentId === s.studentId && b.status !== 'LUNAS');
                        const totalDebt = studentBills.reduce((acc, curr) => acc + (Number(curr.amountDue) - Number(curr.amountPaid)), 0);
                        
                        return (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-4 font-mono text-xs">{s.studentId}</td>
                            <td className="p-4 font-medium">{s.name}</td>
                            <td className="p-4">{s.class}</td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${s.customSpp ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                {s.category || 'Reguler'}
                              </span>
                            </td>
                            <td className="p-4 text-right">Rp {fmtCurrency(s.customSpp || s.baseSpp)}</td>
                            <td className="p-4 text-right font-bold text-rose-600">Rp {fmtCurrency(totalDebt)}</td>
                            <td className="p-4 text-center">
                              <button 
                                onClick={() => setSelectedStudent(s)}
                                className="p-2 hover:bg-slate-100 rounded-lg text-emerald-600"
                                title="Penyesuaian Tarif"
                              >
                                <Activity className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
            
            
            {showForm && role !== 'viewer' && <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className="block text-sm font-medium mb-1">Tanggal</label><input type="date" name="date" value={form.date} onChange={handleInput} required className="w-full p-2 border rounded-md" /></div>
              <div><label className="block text-sm font-medium mb-1">No Ref</label><input type="text" name="ref" value={form.ref} onChange={handleInput} placeholder="INV-001" required className="w-full p-2 border rounded-md" /></div>
              <div><label className="block text-sm font-medium mb-1">Akun</label><select name="coa" value={form.coa} onChange={handleInput} className="w-full p-2 border rounded-md">{coa.map(function (c) { return <option key={c.code} value={c.code}>[{c.code}] {c.name}</option>; })}</select></div>
              <div className="md:col-span-2"><label className="block text-sm font-medium mb-1">Deskripsi</label><input type="text" name="desc" value={form.desc} onChange={handleInput} required className="w-full p-2 border rounded-md" /></div>
              <div><label className="block text-sm font-medium mb-1">Nominal (Rp)</label><input type="number" name="amount" value={form.amount} onChange={handleInput} required min="1" className="w-full p-2 border rounded-md" /></div>
              <div><label className="block text-sm font-medium mb-1">RKAM</label><select name="rkam" value={form.rkam} onChange={handleInput} className="w-full p-2 border rounded-md"><option value="">--</option>{rkam.map(function (r) { return <option key={r.code} value={r.code}>[{r.code}] {r.name}</option>; })}</select></div>
              <div><label className="block text-sm font-medium mb-1">Pembatasan</label><select name="restriction" value={form.restriction} onChange={handleInput} className="w-full p-2 border rounded-md"><option value="unrestricted">Tidak Terikat</option><option value="restricted-scholarship">Beasiswa</option><option value="restricted-infrastructure">Infrastruktur</option></select></div>
              <div><label className="block text-sm font-medium mb-1">Dok Ref</label><input type="text" name="docRef" value={form.docRef} onChange={handleInput} className="w-full p-2 border rounded-md" /></div>
              <div className="md:col-span-3 flex justify-end gap-2 mt-2"><button type="button" onClick={function () { setShowForm(false); }} className="px-6 py-2 border rounded-md">Batal</button><button type="submit" className="px-6 py-2 bg-slate-800 text-white rounded-md font-medium">Simpan</button></div>
            </form>}
            
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="p-4 font-semibold">Tanggal</th>
                      <th className="p-4 font-semibold">Ref</th>
                      <th className="p-4 font-semibold">Deskripsi</th>
                      <th className="p-4 font-semibold">Akun</th>
                      <th className="p-4 font-semibold text-right">Debet</th>
                      <th className="p-4 font-semibold text-right">Kredit</th>
                      <th className="p-4 font-semibold text-center">Status</th>
                      <th className="p-4 font-semibold text-center">Resi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {transactions.slice().reverse().map(function (t, i) { 
                      var ci = coa.find(function (c) { return String(c.code) === String(t.coa); }); 
                      var isR = t.restriction && t.restriction !== 'unrestricted'; 
                      return (
                        <tr key={i} className={'hover:bg-slate-50 ' + (isR ? 'bg-amber-50' : '')}>
                          <td className="p-4">{t.date}</td>
                          <td className="p-4 text-slate-500 font-mono text-xs">{t.ref}</td>
                          <td className="p-4 font-medium">{t.desc}{t.rkam && <span className="text-xs bg-slate-100 px-2 py-1 rounded ml-2">{t.rkam}</span>}</td>
                          <td className="p-4 text-xs">{ci ? ci.name : t.coa}</td>
                          <td className="p-4 text-right text-emerald-600 font-medium">{t.type === 'IN' ? 'Rp ' + fmtCurrency(t.amount) : '-'}</td>
                          <td className="p-4 text-right text-rose-600 font-medium">{t.type === 'OUT' ? 'Rp ' + fmtCurrency(t.amount) : '-'}</td>
                          <td className="p-4 text-center">{isR ? <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">Terikat</span> : <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">Bebas</span>}</td>
                          <td className="p-4 text-center">
                            {t.type === 'IN' && <PrintReceiptButton transaction={t} institution="MTs Ishlahul Amanah" />}
                          </td>
                        </tr>
                      ); 
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>}

          {tab === 'rkam' && <div className="space-y-6 max-w-6xl mx-auto"><h2 className="text-2xl font-bold">Monitoring RKAM</h2><div className="bg-white p-6 rounded-xl shadow-sm border"><div className="h-80 mb-8"><ResponsiveContainer><BarChart data={analytics.rkamData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="code" /><YAxis tickFormatter={function (v) { return (v / 1000000) + 'M'; }} /><RechartsTooltip formatter={function (v) { return 'Rp ' + fmtCurrency(v); }} /><Legend /><Bar dataKey="budget" name="Pagu" fill="#cbd5e1" radius={[4, 4, 0, 0]} /><Bar dataKey="realization" name="Realisasi" fill="#10b981" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 border-b"><tr><th className="p-3 font-semibold">Kode</th><th className="p-3 font-semibold">Program</th><th className="p-3 font-semibold text-right">Anggaran</th><th className="p-3 font-semibold text-right">Q1</th><th className="p-3 font-semibold text-right">Q2</th><th className="p-3 font-semibold text-right">Q3</th><th className="p-3 font-semibold text-right">Q4</th><th className="p-3 font-semibold text-right">Realisasi</th><th className="p-3 font-semibold text-right">Sisa</th><th className="p-3 font-semibold text-center">%</th></tr></thead>
          <tbody className="divide-y">{analytics.rkamData.map(function (r) { var s = r.budget - r.realization; var p = r.budget > 0 ? ((r.realization / r.budget) * 100).toFixed(1) : '0.0'; return (<tr key={r.code}><td className="p-3 font-mono text-slate-500">{r.code}</td><td className="p-3 font-medium">{r.name}</td><td className="p-3 text-right">Rp {fmtCurrency(r.budget)}</td><td className="p-3 text-right text-xs">{fmtCurrency(r.q1)}</td><td className="p-3 text-right text-xs">{fmtCurrency(r.q2)}</td><td className="p-3 text-right text-xs">{fmtCurrency(r.q3)}</td><td className="p-3 text-right text-xs">{fmtCurrency(r.q4)}</td><td className="p-3 text-right text-emerald-600 font-medium">Rp {fmtCurrency(r.realization)}</td><td className="p-3 text-right">Rp {fmtCurrency(s)}</td><td className="p-3 text-center"><span className={'px-2 py-1 rounded text-xs font-bold ' + (p > 90 ? 'bg-rose-100 text-rose-700' : p > 70 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')}>{p}%</span></td></tr>); })}</tbody></table></div></div></div>}

          {tab === 'cashflow' && <div className="space-y-6 max-w-6xl mx-auto"><h2 className="text-2xl font-bold">Proyeksi Arus Kas</h2><div className="bg-white p-6 rounded-xl shadow-sm border"><div className="h-80"><ResponsiveContainer><LineChart data={analytics.cashFlow}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="quarter" /><YAxis tickFormatter={function (v) { return (v / 1000000) + 'M'; }} /><RechartsTooltip formatter={function (v) { return 'Rp ' + fmtCurrency(v); }} /><Legend /><Line type="monotone" dataKey="masuk" stroke="#10b981" strokeWidth={2} name="Masuk" /><Line type="monotone" dataKey="keluar" stroke="#ef4444" strokeWidth={2} name="Keluar" /><Line type="monotone" dataKey="saldo" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" name="Saldo" /></LineChart></ResponsiveContainer></div></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">{analytics.cashFlow.map(function (q) { return (<div key={q.quarter} className="bg-white p-5 rounded-xl shadow-sm border"><div className="text-sm font-medium text-slate-500 mb-2">{q.quarter}</div><div className="space-y-2"><div className="flex justify-between"><span className="text-xs text-emerald-600">Masuk</span><span className="font-medium text-emerald-600">Rp {fmtCurrency(q.masuk)}</span></div><div className="flex justify-between"><span className="text-xs text-rose-600">Keluar</span><span className="font-medium text-rose-600">Rp {fmtCurrency(q.keluar)}</span></div><div className="pt-2 border-t flex justify-between"><span className="text-xs font-semibold">Saldo</span><span className={'font-bold ' + (q.saldo >= 0 ? 'text-blue-600' : 'text-rose-600')}>Rp {fmtCurrency(q.saldo)}</span></div></div></div>); })}</div></div>}

          {tab === 'restricted' && <div className="space-y-6 max-w-6xl mx-auto"><h2 className="text-2xl font-bold">Dana Terikat</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-amber-200"><div className="flex items-center gap-2 mb-3"><Lock className="w-5 h-5 text-amber-600" /><h4 className="font-bold">Diterima</h4></div><div className="text-2xl font-bold text-amber-600">Rp {fmtCurrency(analytics.totalInRestricted)}</div></div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-emerald-200"><div className="flex items-center gap-2 mb-3"><CheckCircle className="w-5 h-5 text-emerald-600" /><h4 className="font-bold">Tersalurkan</h4></div><div className="text-2xl font-bold text-emerald-600">Rp {fmtCurrency(analytics.totalOutRestricted)}</div></div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-blue-200"><div className="flex items-center gap-2 mb-3"><Wallet className="w-5 h-5 text-blue-600" /><h4 className="font-bold">Saldo</h4></div><div className="text-2xl font-bold text-blue-600">Rp {fmtCurrency(analytics.totalInRestricted - analytics.totalOutRestricted)}</div></div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden"><div className="p-6 border-b bg-slate-50"><h3 className="font-bold">Transaksi Dana Terikat</h3></div><table className="w-full text-left text-sm"><thead className="bg-slate-50 border-b"><tr><th className="p-4 font-semibold">Tanggal</th><th className="p-4 font-semibold">Deskripsi</th><th className="p-4 font-semibold">Jenis</th><th className="p-4 font-semibold text-right">Masuk</th><th className="p-4 font-semibold text-right">Keluar</th></tr></thead>
          <tbody className="divide-y">{transactions.filter(function (t) { return t.restriction && t.restriction !== 'unrestricted'; }).map(function (t, i) { return (<tr key={i} className="hover:bg-amber-50"><td className="p-4">{t.date}</td><td className="p-4 font-medium">{t.desc}</td><td className="p-4"><span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">{t.restriction === 'restricted-scholarship' ? 'Beasiswa' : 'Infrastruktur'}</span></td><td className="p-4 text-right text-emerald-600 font-medium">{t.type === 'IN' ? 'Rp ' + fmtCurrency(t.amount) : '-'}</td><td className="p-4 text-right text-rose-600 font-medium">{t.type === 'OUT' ? 'Rp ' + fmtCurrency(t.amount) : '-'}</td></tr>); })}</tbody></table></div></div>}

          {tab === 'isak' && <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-center"><h2 className="text-2xl font-bold">ISAK 35</h2><button onClick={exportISAK} className="px-4 py-2 bg-slate-700 text-white rounded-lg flex items-center gap-2"><FileBarChart className="w-4 h-4" />Export</button></div>
            <div className="bg-white p-8 rounded-xl shadow-sm border">
              <div className="text-center border-b-2 border-slate-800 pb-4 mb-6"><h3 className="text-xl font-bold uppercase">Yayasan Pendidikan MTs Ishlahul Amanah</h3><h4 className="text-lg font-semibold">Laporan Penghasilan Komprehensif</h4><p className="text-sm text-slate-500">Periode 2026 (ISAK 35)</p></div>
              <div className="space-y-6">
                <div><h5 className="font-bold mb-3 pb-2 border-b-2">I. PENDAPATAN TANPA PEMBATASAN</h5><div className="space-y-2 pl-4 text-sm">{coa.filter(function (c) { return c.category === 'PENDAPATAN' && !String(c.code).startsWith('430'); }).map(function (c) { var a = transactions.filter(function (t) { return String(t.coa) === String(c.code) && t.restriction === 'unrestricted'; }).reduce(function (s, t) { return s + Number(t.amount); }, 0); if (a === 0) return null; return <div key={c.code} className="flex justify-between py-1"><span>{c.name}</span><span className="font-mono">Rp {fmtCurrency(a)}</span></div>; })}<div className="flex justify-between font-bold pt-3 border-t-2 mt-3"><span>Total</span><span className="font-mono">Rp {fmtCurrency(analytics.totalIn - analytics.totalInRestricted)}</span></div></div></div>
                <div><h5 className="font-bold mb-3 pb-2 border-b-2">II. PENDAPATAN DENGAN PEMBATASAN</h5><div className="space-y-2 pl-4 text-sm">{coa.filter(function (c) { return String(c.code).startsWith('430'); }).map(function (c) { var a = transactions.filter(function (t) { return String(t.coa) === String(c.code); }).reduce(function (s, t) { return s + Number(t.amount); }, 0); if (a === 0) return null; return <div key={c.code} className="flex justify-between py-1"><span>{c.name}</span><span className="font-mono">Rp {fmtCurrency(a)}</span></div>; })}<div className="flex justify-between font-bold pt-3 border-t-2 mt-3"><span>Total</span><span className="font-mono">Rp {fmtCurrency(analytics.totalInRestricted)}</span></div></div></div>
                <div><h5 className="font-bold mb-3 pb-2 border-b-2">III. BEBAN</h5><div className="space-y-2 pl-4 text-sm">{coa.filter(function (c) { return c.category === 'BEBAN'; }).map(function (c) { var a = transactions.filter(function (t) { return String(t.coa) === String(c.code); }).reduce(function (s, t) { return s + Number(t.amount); }, 0); if (a === 0) return null; return <div key={c.code} className="flex justify-between py-1"><span>{c.name}</span><span className="font-mono text-rose-600">(Rp {fmtCurrency(a)})</span></div>; })}<div className="flex justify-between font-bold pt-3 border-t-2 mt-3"><span>Total Beban</span><span className="font-mono text-rose-600">(Rp {fmtCurrency(analytics.totalOut)})</span></div></div></div>
                <div className={'p-5 rounded-lg mt-6 ' + (analytics.surplus >= 0 ? 'bg-emerald-50 border-2 border-emerald-200' : 'bg-rose-50 border-2 border-rose-200')}><div className="flex justify-between items-center text-lg font-bold mb-3"><span>SURPLUS</span><span className={'font-mono ' + (analytics.surplus >= 0 ? 'text-emerald-700' : 'text-rose-700')}>Rp {fmtCurrency(analytics.surplus)}</span></div><div className="grid grid-cols-2 gap-4 text-sm pt-3 border-t"><div className="flex justify-between"><span>Tanpa Pembatasan:</span><span className="font-mono font-semibold">Rp {fmtCurrency(analytics.surplusUnrestricted)}</span></div><div className="flex justify-between"><span>Dengan Pembatasan:</span><span className="font-mono font-semibold">Rp {fmtCurrency(analytics.totalInRestricted - analytics.totalOutRestricted)}</span></div></div></div>
              </div>
            </div>
          </div>}

        </div>
      </main>
    </div>
  );
}

function NB(p) { return <button onClick={p.oc} className={'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition text-sm font-medium ' + (p.a ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white')}>{p.icon}{p.label}</button>; }
function CD(p) { return <div className="bg-white p-6 rounded-xl shadow-sm border"><div className="flex justify-between items-start mb-4"><div className="p-3 bg-slate-50 rounded-lg border">{p.ic}</div></div><p className="text-sm text-slate-500 font-medium mb-1">{p.t}</p><h4 className="text-2xl font-bold text-slate-800">{p.v}</h4>{p.s && <p className="text-xs text-slate-400 mt-2">{p.s}</p>}</div>; }
