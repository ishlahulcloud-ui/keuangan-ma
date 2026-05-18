import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import {
  Wallet, TrendingUp, FileText, CheckCircle, Plus, LayoutDashboard, List, Activity, 
  AlertCircle, Lock, DollarSign, Users, FileBarChart, Save, LogOut, RefreshCw, ShoppingCart, CreditCard
} from 'lucide-react';

import logoMA from './assets/logo-baru.png';
import { PrintReceiptButton } from './components/PrintReceipt';
import { LaporanBulananButton } from './components/LaporanBulananPDF';

var API_URL = 'https://script.google.com/macros/s/AKfycbwkw66t9DZOWIPW35FpE8V-gvMVY-RadDAKVsTLIE4yySYmQXY68FNu0TQ3xnTQarc/exec';
var GOOGLE_CLIENT_ID = '1007043166010-rtbc31cshotnq5vlqtjdgf022vfkvt5b.apps.googleusercontent.com';
var COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#6366f1', '#8b5cf6', '#ec4899'];

var AUTHORIZED_USERS = {
  'ishlahulcloud@gmail.com': 'yayasan',
  'gochi.sama@gmail.com': 'kepala',
  'mfahriany@gmail.com': 'bendahara',
  'istisofiaazzahra@gmail.com': 'bendahara',
  'azeezahrania@gmail.com': 'bendahara'
};

var currentUserEmail = '';

async function apiGet(action, params) {
  var url = new URL(API_URL);
  url.searchParams.append('action', action);
  url.searchParams.append('userEmail', currentUserEmail);
  if (params) Object.keys(params).forEach(k => url.searchParams.append(k, params[k]));
  var response = await fetch(url.toString());
  var data = await response.json();
  if (!data.success) throw new Error(data.message || 'API error');
  return data.data;
}

async function apiPost(action, payload, email = '') {
  var url = new URL(API_URL);
  url.searchParams.append('action', action);
  url.searchParams.append('userEmail', email || currentUserEmail);
  url.searchParams.append('payload', JSON.stringify(payload || {}));
  var response = await fetch(url.toString());
  var data = await response.json();
  if (!data.success) throw new Error(data.message || 'API error');
  return data.data;
}

function getQuarter(date) {
  var m = new Date(date).getMonth() + 1;
  return 'Q' + Math.ceil(m / 3);
}

function fmtCurrency(val) {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(val);
}

function LoginPage(props) {
  var [error, setError] = useState('');
  useEffect(() => {
    var script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (r) => {
          var payload = JSON.parse(atob(r.credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
          if (!AUTHORIZED_USERS[payload.email]) return setError('Email tidak terdaftar.');
          props.onLogin({ email: payload.email, name: payload.name, picture: payload.picture, role: AUTHORIZED_USERS[payload.email] });
        }
      });
      window.google.accounts.id.renderButton(document.getElementById('google-signin-btn'), { theme: 'outline', size: 'large', width: 320 });
    };
    document.body.appendChild(script);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        <img src={logoMA} alt="Logo" className="w-24 h-24 mx-auto mb-6 object-contain" />
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Sistem Keuangan ISAK 35</h1>
        <p className="text-slate-500 mb-8">MA Ishlahul Amanah</p>
        <div id="google-signin-btn" className="flex justify-center"></div>
        {error && <p className="text-rose-500 mt-4 text-sm">{error}</p>}
      </div>
    </div>
  );
}

export default function App() {
  var [user, setUser] = useState(null);
  var [tab, setTab] = useState('dashboard');
  var [transactions, setTransactions] = useState([]);
  var [coa, setCoa] = useState([]);
  var [rkam, setRkam] = useState([]);
  var [students, setStudents] = useState([]);
  var [billings, setBillings] = useState([]);
  var [loading, setLoading] = useState(false);
  var [sync, setSync] = useState('synced');
  var [showForm, setShowForm] = useState(false);

  var [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0], ref: '', coa: '4100', desc: '', amount: '', studentId: '', restriction: 'unrestricted', rkam: '', paymentMethod: 'Tunai'
  });
  var [selectedBills, setSelectedBills] = useState([]); 

  useEffect(() => {
    var saved = localStorage.getItem('madrasah_user');
    if (saved) {
      var u = JSON.parse(saved);
      currentUserEmail = u.email;
      setUser(u);
    }
  }, []);

  useEffect(() => { if (user) loadData(); }, [user]);

  async function loadData() {
    setLoading(true); setSync('syncing');
    try {
      var r = await Promise.all([
        apiGet('getTransactions'), apiGet('getCOA'), apiGet('getRKAM'), apiGet('getStudents'), apiGet('getBillings')
      ]);
      setTransactions(r[0]); setCoa(r[1]); setRkam(r[2]); setStudents(r[3]); setBillings(r[4]);
      setSync('synced');
    } catch (e) { setSync('error'); alert(e.message); } finally { setLoading(false); }
  }

  function handleInput(e) {
    var { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    if (name === 'studentId') { setSelectedBills([]); setForm(p => ({ ...p, studentId: value, desc: '', amount: '' })); }
  }

  function toggleBill(bill) {
    var exists = selectedBills.find(b => b.billingId === bill.billingId);
    if (exists) {
      setSelectedBills(selectedBills.filter(b => b.billingId !== bill.billingId));
    } else {
      // Inisialisasi Keterangan kosong untuk setiap tagihan yang dicentang
      setSelectedBills([...selectedBills, { ...bill, payAmount: bill.amountDue - bill.amountPaid, keterangan: '' }]);
    }
  }

  function updatePayAmount(billingId, val) {
    setSelectedBills(selectedBills.map(b => b.billingId === billingId ? { ...b, payAmount: Number(val) } : b));
  }

  function updateBillKeterangan(billingId, val) {
    setSelectedBills(selectedBills.map(b => b.billingId === billingId ? { ...b, keterangan: val } : b));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (user.role === 'viewer') return alert('Akses Ditolak');
    setSync('syncing');

    try {
      var finalRef = form.ref || "KW-" + new Date().getTime();

      if (form.studentId && selectedBills.length > 0) {
        var studentObj = students.find(s => String(s.studentId) === String(form.studentId));
        var studentName = studentObj ? studentObj.name : 'Siswa';

        for (let b of selectedBills) {
          let targetCoa = '4100'; 
          let catLower = String(b.category).toLowerCase();
          
          if (catLower.includes('ppdb') || catLower.includes('pangkal') || catLower.includes('daftar ulang')) targetCoa = '4101';
          if (catLower.includes('pts') || catLower.includes('pas') || catLower.includes('pat') || catLower.includes('ujian')) targetCoa = '4102';
          if (catLower.includes('trip') || catLower.includes('kegiatan') || catLower.includes('akhir tahun')) targetCoa = '4302';

          let cleanCat = String(b.category || 'Tagihan').replace(/pembayaran/gi, '').trim();
          
          // AUTO-DESKRIPSI dengan Keterangan spesifik per-tagihan
          let finalDesc = `Pembayaran ${cleanCat}`;
          if (b.keterangan && b.keterangan.trim() !== '') {
            finalDesc = `${finalDesc} (Ket: ${b.keterangan})`;
          }

          await apiPost('addTransaction', {
            data: {
              date: form.date, ref: finalRef, 
              desc: `${finalDesc} - ${studentName}`,
              coa: targetCoa, type: 'IN', amount: b.payAmount,
              restriction: form.restriction, studentId: form.studentId, billingId: b.billingId, rkam: form.rkam,
              docRef: form.paymentMethod
            }
          }, user.email);
        }
      } else {
        var ci = coa.find(c => c.code === form.coa);
        await apiPost('addTransaction', {
          data: {
            ...form, ref: finalRef, amount: Number(form.amount), 
            type: ci?.category === 'PENDAPATAN' ? 'IN' : 'OUT', quarter: getQuarter(form.date),
            docRef: form.paymentMethod
          }
        }, user.email);
      }

      alert('Transaksi Berhasil Dicatat!');
      setShowForm(false); setSelectedBills([]);
      setForm({ date: new Date().toISOString().split('T')[0], ref: '', coa: '4100', desc: '', amount: '', studentId: '', restriction: 'unrestricted', rkam: '', paymentMethod: 'Tunai' });
      await loadData();
    } catch (e) { alert(e.message); setSync('error'); }
  }

  async function handleGenerateBilling(params) {
    if (!window.confirm("Proses tagihan massal?")) return;
    setSync('syncing');
    try {
      await apiPost('generateMassBilling', { data: params }, user.email);
      alert("Tagihan Berhasil Dibuat!");
      await loadData();
    } catch (e) { alert(e.message); setSync('error'); }
  }

  var analytics = useMemo(() => {
    var income = 0, expense = 0, incR = 0, expR = 0, spp = 0, usaha = 0, donasi = 0, donasiR = 0;
    var rd = rkam.map(r => ({ code: r.code, name: r.name, budget: Number(r.budget), realization: 0, q1: 0, q2: 0, q3: 0, q4: 0 }));
    var qd = { Q1: { i: 0, o: 0 }, Q2: { i: 0, o: 0 }, Q3: { i: 0, o: 0 }, Q4: { i: 0, o: 0 } };
    
    // Objek sementara untuk mengelompokkan data harian
    var dailyMap = {};

    transactions.forEach(t => {
      var a = Number(t.amount || 0);
      var q = t.quarter || getQuarter(t.date);
      var rest = t.restriction && t.restriction !== 'unrestricted';
      
      // Format tanggal bersih (YYYY-MM-DD)
      var tDate = t.date ? String(t.date).split('T')[0] : 'Tanpa Tanggal';

      // Inisialisasi map harian jika belum ada
      if (!dailyMap[tDate]) {
        dailyMap[tDate] = { tanggal: tDate, masuk: 0, keluar: 0 };
      }

      if (t.type === 'IN') {
        income += a;
        if (rest) incR += a;
        if (qd[q]) qd[q].i += a;
        if (String(t.coa) === '4100' || String(t.coa) === '4101') spp += a;
        if (String(t.coa) === '4200') usaha += a;
        if (String(t.coa) === '4300') donasi += a;
        if (String(t.coa) === '4301' || String(t.coa) === '4302') donasiR += a;
        
        dailyMap[tDate].masuk += a; // Tambah ke kas masuk harian
      } else {
        expense += a;
        if (rest) expR += a;
        if (qd[q]) qd[q].o += a;
        
        dailyMap[tDate].keluar += a; // Tambah ke kas keluar harian
      }
      
      if (t.rkam) { 
        var idx = rd.findIndex(r => r.code === t.rkam); 
        if (idx >= 0) { rd[idx].realization += a; rd[idx][q.toLowerCase()] += a; } 
      }
    });

    // Ubah objek map harian menjadi array dan urutkan berdasarkan tanggal terlama ke terbaru
    var dailyChartData = Object.values(dailyMap).sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));
    
    // Batasi grafik harian hanya menampilkan 15 hari transaksi terakhir agar tidak terlalu padat
    if (dailyChartData.length > 15) {
      dailyChartData = dailyChartData.slice(-15);
    }

    return {
      balance: income - expense, income: income, expense: expense,
      surplus: income - expense, surplusUnrestricted: (income - incR) - (expense - expR),
      totalInRestricted: incR, totalOutRestricted: expR,
      rkamData: rd,
      dailyFlow: dailyChartData, // Data baru untuk grafik harian
      incData: [
        { name: 'SPP/Pangkal', value: spp }, { name: 'Unit Usaha', value: usaha },
        { name: 'Donasi', value: donasi }, { name: 'Donasi Terikat', value: donasiR }
      ].filter(d => d.value > 0),
      cashFlow: ['Q1', 'Q2', 'Q3', 'Q4'].map(q => ({ quarter: q, masuk: qd[q].i, keluar: qd[q].o, saldo: qd[q].i - qd[q].o }))
    };
  }, [transactions, rkam]);


  if (!user) return <LoginPage onLogin={u => { setUser(u); localStorage.setItem('madrasah_user', JSON.stringify(u)); }} />;
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><RefreshCw className="animate-spin w-10 h-10 text-emerald-600" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800">
      <aside className="w-64 bg-slate-900 text-white hidden md:flex flex-col">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <img src={logoMA} className="w-8 h-8 object-contain" alt="Logo" />
          <div><h1 className="font-bold text-lg leading-tight">MA Ishlahul Amanah</h1><p className="text-xs text-slate-400">Sistem Keuangan Web</p></div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <NB icon={<LayoutDashboard />} label="Dashboard" a={tab === 'dashboard'} oc={() => setTab('dashboard')} />
          <NB icon={<List />} label="Jurnal Umum" a={tab === 'jurnal'} oc={() => setTab('jurnal')} />
          <NB icon={<Users />} label="Data Siswa" a={tab === 'students'} oc={() => setTab('students')} />
          <NB icon={<Activity />} label="Monitoring RKAM" a={tab === 'rkam'} oc={() => setTab('rkam')} />
          <NB icon={<TrendingUp />} label="Proyeksi Kas" a={tab === 'cashflow'} oc={() => setTab('cashflow')} />
          <NB icon={<DollarSign />} label="Dana Terikat" a={tab === 'restricted'} oc={() => setTab('restricted')} />
          <NB icon={<FileText />} label="ISAK 35" a={tab === 'isak'} oc={() => setTab('isak')} />
        </nav>
        <div className="p-4 border-t border-slate-800">
           <div className="flex items-center gap-3 mb-4">
             <img src={user.picture} className="w-8 h-8 rounded-full" alt="" />
             <div className="text-xs truncate"><b>{user.name}</b><br/>{user.role.toUpperCase()}</div>
           </div>
           <button onClick={() => { localStorage.removeItem('madrasah_user'); window.location.reload(); }} className="w-full text-xs bg-rose-600 hover:bg-rose-700 p-2 rounded flex items-center justify-center gap-2 transition"><LogOut className="w-3 h-3"/> Logout</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white border-b p-4 flex justify-between items-center shadow-sm">
          <h2 className="font-bold text-lg text-slate-700 uppercase">{tab}</h2>
          <div className="flex items-center gap-3">
            <span className={`p-1 rounded-full ${sync === 'synced' ? 'bg-emerald-100' : 'bg-amber-100'}`}>
              {sync === 'synced' ? <CheckCircle className="w-4 h-4 text-emerald-600"/> : <RefreshCw className="w-4 h-4 text-amber-600 animate-spin"/>}
            </span>
            <button onClick={loadData} className="p-2 hover:bg-slate-100 rounded-full"><RefreshCw className="w-5 h-5 text-slate-500"/></button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8">
          
          {tab === 'dashboard' && (
            <div className="space-y-6 max-w-6xl mx-auto">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <CD t="Saldo Kas" v={"Rp " + fmtCurrency(analytics.balance)} ic={<Wallet className="text-emerald-600 w-6 h-6"/>} />
                 <CD t="Total Pendapatan" v={"Rp " + fmtCurrency(analytics.income)} s={"Terikat: Rp " + fmtCurrency(analytics.totalInRestricted)} ic={<TrendingUp className="text-blue-600 w-6 h-6"/>} />
                 <CD t="Surplus / Defisit" v={"Rp " + fmtCurrency(analytics.surplus)} ic={<CheckCircle className="text-amber-500 w-6 h-6"/>} />
               </div>
               
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-xl shadow-sm border">
                     <h3 className="font-bold mb-4">Komposisi Pendapatan</h3>
                     <div className="h-64">
                       <ResponsiveContainer>
                         <PieChart>
                           <Pie data={analytics.incData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" label>
                             {analytics.incData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                           </Pie>
                           <RechartsTooltip formatter={v => 'Rp ' + fmtCurrency(v)} />
                           <Legend />
                         </PieChart>
                       </ResponsiveContainer>
                     </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl shadow-sm border">
                    <div className="flex items-center gap-2 mb-2"><AlertCircle className="text-rose-500 w-5 h-5" /><h3 className="font-bold text-rose-600">Mitigasi Pajak (PMK 68/2020)</h3></div>
                    <p className="text-sm text-slate-600 mb-4">Surplus wajib direinvestasikan ke Sarpras dalam 4 tahun.</p>
                    <div className="flex justify-between text-sm mb-1 font-medium"><span>Surplus Tanpa Pembatasan</span><span className="text-emerald-600">Rp {fmtCurrency(analytics.surplusUnrestricted)}</span></div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5"><div className="bg-rose-400 h-2.5 rounded-full" style={{ width: '15%' }}></div></div>
                  </div>
               </div>

               <div className="bg-white p-6 rounded-xl shadow-sm border">
                  <h3 className="font-bold mb-4">Tren Kas Kuartalan</h3>
                  <div className="h-64">
                    <ResponsiveContainer>
                      <AreaChart data={analytics.cashFlow}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="quarter" />
                        <YAxis tickFormatter={v => (v / 1000000) + 'M'} />
                        <RechartsTooltip formatter={v => 'Rp ' + fmtCurrency(v)} />
                        <Legend />
                        <Area type="monotone" dataKey="masuk" stackId="1" stroke="#10b981" fill="#10b981" name="Masuk" />
                        <Area type="monotone" dataKey="keluar" stackId="2" stroke="#ef4444" fill="#ef4444" name="Keluar" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
               </div>
           
               {/* GRAFIK BARU: TREN ARUS KAS HARIAN REAL-TIME */}
               <div className="bg-white p-6 rounded-xl shadow-sm border">
                  <div className="flex justify-between items-center mb-4">
                     <div>
                        <h3 className="font-bold text-slate-800">Aktivitas Arus Kas Harian (Real-Time)</h3>
                        <p className="text-xs text-slate-400">Memantau pergerakan uang masuk dan keluar per tanggal transaksi (15 hari aktif terakhir)</p>
                     </div>
                     <span className="text-[10px] bg-emerald-50 text-emerald-600 font-bold px-2 py-1 rounded border border-emerald-200 animate-pulse">● LIVE UPDATE</span>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer>
                      <AreaChart data={analytics.dailyFlow}>
                        <defs>
                          <linearGradient id="colorMasuk" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorKeluar" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="tanggal" tickFormatter={v => {
                           try {
                             const d = new Date(v);
                             return !isNaN(d.getTime()) ? d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : v;
                           } catch(e) { return v; }
                        }} style={{ fontSize: '11px', fontFamily: 'monospace' }} />
                        <YAxis tickFormatter={v => 'Rp ' + (v >= 1000000 ? (v / 1000000) + 'jt' : v >= 1000 ? (v / 1000) + 'rb' : v)} style={{ fontSize: '11px' }} />
                        <RechartsTooltip formatter={v => 'Rp ' + new Intl.NumberFormat('id-ID').format(v)} />
                        <Legend />
                        <Area type="monotone" dataKey="masuk" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorMasuk)" name="Uang Masuk (Penerimaan)" />
                        <Area type="monotone" dataKey="keluar" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorKeluar)" name="Uang Keluar (Beban)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
               </div>
            </div>
          )}

          {tab === 'jurnal' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Jurnal Umum</h3>
                <div className="flex gap-2">
                  <LaporanBulananButton transactions={transactions} coaList={coa} rkamList={rkam} institution="MA Ishlahul Amanah" userRole={user.role} userName={user.name} />
                  <button onClick={() => setShowForm(!showForm)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"><Plus className="w-4 h-4" /> Entri Baru</button>
                </div>
              </div>

              {showForm && (
                <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-lg border-2 border-emerald-100 space-y-6">
                  
                  {/* BARIS 1: DATA UTAMA */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div><label className="text-xs font-bold text-slate-500">TANGGAL</label><input type="date" name="date" value={form.date} onChange={handleInput} className="w-full p-2 border rounded" required /></div>
                    <div><label className="text-xs font-bold text-slate-500">NO. KUITANSI (REF)</label><input type="text" name="ref" value={form.ref} onChange={handleInput} placeholder="Auto-generated" className="w-full p-2 border rounded" /></div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-bold text-slate-500">PILIH SISWA (UNTUK PELUNASAN PIUTANG)</label>
                      <select name="studentId" value={form.studentId} onChange={handleInput} className="w-full p-2 border rounded bg-emerald-50">
                        <option value="">-- Non-Siswa (Penerimaan/Beban Umum) --</option>
                        {students.map(s => <option key={s.studentId} value={s.studentId}>{s.name} (Kls {s.class})</option>)}
                      </select>
                    </div>
                  </div>

                  {/* BARIS 2: METODE PEMBAYARAN & DESKRIPSI NON-SISWA */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border">
                    <div className={form.studentId ? "md:col-span-4" : "md:col-span-2"}>
                      <label className="text-xs font-bold text-slate-500 mb-2 block">METODE PEMBAYARAN</label>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setForm({...form, paymentMethod: 'Tunai'})} className={`flex-1 py-2 rounded-lg border-2 font-bold text-sm flex items-center justify-center gap-2 transition ${form.paymentMethod === 'Tunai' ? 'bg-emerald-600 border-emerald-600 text-white shadow' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                          <Wallet className="w-4 h-4"/> TUNAI
                        </button>
                        <button type="button" onClick={() => setForm({...form, paymentMethod: 'Transfer Bank'})} className={`flex-1 py-2 rounded-lg border-2 font-bold text-sm flex items-center justify-center gap-2 transition ${form.paymentMethod === 'Transfer Bank' ? 'bg-blue-600 border-blue-600 text-white shadow' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                          <CreditCard className="w-4 h-4"/> TRANSFER BANK
                        </button>
                      </div>
                    </div>
                    {!form.studentId && (
                      <div className="md:col-span-2">
                        <label className="text-xs font-bold text-slate-500 mb-2 block">DESKRIPSI TRANSAKSI UMUM</label>
                        <input type="text" name="desc" value={form.desc} onChange={handleInput} placeholder="Misal: Pembelian ATK Kantor" className="w-full p-2 border rounded bg-white" required />
                      </div>
                    )}
                  </div>

                  {/* KONDISI 1: JIKA TRANSAKSI SISWA (MULTI TAGIHAN) */}
                  {form.studentId && (
                    <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-inner">
                      <h4 className="font-bold text-emerald-700 mb-4 flex items-center gap-2"><ShoppingCart className="w-4 h-4"/> Pilih Tagihan yang Dibayar</h4>
                      <div className="grid grid-cols-1 gap-3">
                        {billings.filter(b => String(b.studentId) === String(form.studentId) && b.status !== 'LUNAS' && b.status !== 'PAID').length > 0 ? (
                          billings.filter(b => String(b.studentId) === String(form.studentId) && b.status !== 'LUNAS' && b.status !== 'PAID').map(b => {
                            var isSelected = selectedBills.find(x => x.billingId === b.billingId);
                            var sisaPiutang = b.amountDue - b.amountPaid;
                            return (
                              <div key={b.billingId} className={`flex flex-col p-3 rounded-lg border-2 transition ${isSelected ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                                <div className="flex items-center gap-3 w-full">
                                  <input type="checkbox" className="w-5 h-5 rounded cursor-pointer" checked={!!isSelected} onChange={() => toggleBill(b)} />
                                  <div className="flex-1">
                                    <p className="font-bold text-sm text-slate-800">{b.category || 'Tagihan (Tanpa Kategori)'}</p>
                                    <p className="text-xs text-rose-500 font-mono">Sisa: Rp {fmtCurrency(sisaPiutang)}</p>
                                  </div>
                                </div>
                                {/* INPUT KETERANGAN PER ITEM DITAMPILKAN DI SINI */}
                                {isSelected && (
                                  <div className="w-full mt-3 pt-3 border-t border-emerald-100 flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-slate-500 w-24">Catatan:</span>
                                      <input type="text" placeholder="Misal: Bulan Juni" value={isSelected.keterangan || ''} onChange={(e) => updateBillKeterangan(b.billingId, e.target.value)} className="flex-1 p-1 border rounded text-xs bg-white" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-slate-500 w-24">Bayar (Rp):</span>
                                      <input type="number" max={sisaPiutang} value={isSelected.payAmount} onChange={(e) => updatePayAmount(b.billingId, e.target.value)} className="flex-1 p-1 border border-emerald-300 rounded font-bold text-emerald-700 text-right bg-white" />
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : <p className="text-center text-slate-400 py-4 text-sm italic">Tidak ada tagihan aktif untuk siswa ini.</p>}
                      </div>
                      {selectedBills.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-emerald-100 flex justify-between items-center bg-emerald-50 p-4 rounded-lg">
                          <span className="font-bold text-slate-600">{selectedBills.length} Tagihan Dipilih</span>
                          <div className="text-right">
                            <p className="text-xs text-slate-500 uppercase font-bold">Total Pembayaran</p>
                            <p className="text-3xl font-black text-emerald-600">Rp {fmtCurrency(selectedBills.reduce((s, x) => s + x.payAmount, 0))}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* KONDISI 2: JIKA TRANSAKSI UMUM (NON-SISWA) */}
                  {!form.studentId && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border">
                      <div><label className="text-xs font-bold text-slate-500">AKUN (COA)</label>
                        <select name="coa" value={form.coa} onChange={handleInput} className="w-full p-2 border rounded">
                          {coa.map(c => <option key={c.code} value={c.code}>[{c.code}] {c.name}</option>)}
                        </select>
                      </div>
                      <div><label className="text-xs font-bold text-slate-500">NOMINAL (RP)</label><input type="number" name="amount" value={form.amount} onChange={handleInput} className="w-full p-2 border rounded" required={!form.studentId} /></div>
                      <div><label className="text-xs font-bold text-slate-500">RKAM</label>
                        <select name="rkam" value={form.rkam} onChange={handleInput} className="w-full p-2 border rounded">
                          <option value="">-- Non-RKAM --</option>
                          {rkam.map(r => <option key={r.code} value={r.code}>[{r.code}] {r.name}</option>)}
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 border-t pt-4">
                    <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 border rounded-lg hover:bg-slate-50 font-medium">Batal</button>
                    <button type="submit" className="px-8 py-2 bg-emerald-600 text-white rounded-lg font-bold shadow-lg hover:bg-emerald-700 transition">SIMPAN TRANSAKSI</button>
                  </div>
                </form>
              )}

              {/* TABEL JURNAL */}
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="overflow-x-auto">
                   <table className="w-full text-left text-sm whitespace-nowrap">
                     <thead className="bg-slate-50 border-b">
                       <tr>
                         <th className="p-4 font-bold text-slate-600">TANGGAL</th>
                         <th className="p-4 font-bold text-slate-600">REF</th>
                         <th className="p-4 font-bold text-slate-600">DESKRIPSI</th>
                         <th className="p-4 font-bold text-right text-slate-600">MASUK</th>
                         <th className="p-4 font-bold text-right text-slate-600">KELUAR</th>
                         <th className="p-4 font-bold text-center text-slate-600">AKSI</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y">
                       {transactions.slice().reverse().map((t, i) => {
                         let tableDate = t.date;
                         if (t.date && String(t.date).includes('T')) {
                           tableDate = String(t.date).split('T')[0];
                         }
                         return (
                           <tr key={i} className="hover:bg-slate-50 transition">
                             <td className="p-4 font-mono text-xs text-slate-500">{tableDate}</td>
                             <td className="p-4 text-xs font-bold text-slate-400">{t.ref}</td>
                             <td className="p-4">
                               <div className="font-medium text-slate-700">{t.desc}</div>
                               <div className="flex gap-2 items-center mt-1">
                                 <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1 rounded">{coa.find(c => String(c.code) === String(t.coa))?.name || t.coa}</span>
                                 {t.docRef && <span className="text-[10px] text-blue-500 font-medium bg-blue-50 px-1 rounded border border-blue-100">{t.docRef}</span>}
                               </div>
                             </td>
                             <td className="p-4 text-right text-emerald-600 font-bold">{t.type === 'IN' ? 'Rp ' + fmtCurrency(t.amount) : '-'}</td>
                             <td className="p-4 text-right text-rose-600 font-bold">{t.type === 'OUT' ? 'Rp ' + fmtCurrency(t.amount) : '-'}</td>
                             <td className="p-4 text-center">
                                {t.type === 'IN' && <PrintReceiptButton transaction={t} allTransactions={transactions} institution="MA Ishlahul Amanah" students={students} />}
                             </td>
                           </tr>
                         )
                       })}
                     </tbody>
                   </table>
                </div>
              </div>
            </div>
          )}

          {tab === 'students' && (
             <div className="space-y-6 max-w-7xl mx-auto">
                <div className="bg-emerald-600 p-6 rounded-2xl text-white flex justify-between items-center shadow-lg">
                  <div><h3 className="text-xl font-bold">Pusat Penagihan Akrual</h3><p className="text-emerald-100 text-sm">Generate piutang bulanan atau kegiatan sekaligus.</p></div>
                  <ShoppingCart className="w-12 h-12 opacity-20" />
                </div>

                <div className="bg-white border-2 border-emerald-100 p-6 rounded-xl shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                   <div>
                     <label className="text-[10px] font-bold text-slate-500 uppercase">Kategori Tagihan</label>
                     <select id="genCat" className="w-full p-2 border rounded mt-1 bg-slate-50">
                       <option value="SPP 1 Tahun Ajaran">SPP 1 Tahun Ajaran</option>
                       <option value="Infaq Bulanan">Infaq Bulanan (SPP)</option>
                       <option value="PPDB (Uang Pangkal)">PPDB (Uang Pangkal)</option>
                       <option value="Daftar Ulang">Daftar Ulang</option>
                       <option value="Pembayaran PTS">Pembayaran PTS</option>
                       <option value="Pembayaran PAS">Pembayaran PAS</option>
                       <option value="Pembayaran PAT">Pembayaran PAT</option>
                       <option value="Field Trip">Field Trip</option>
                       <option value="Kegiatan Akhir Tahun">Kegiatan Akhir Tahun</option>
                     </select>
                   </div>
                   <div>
                     <label className="text-[10px] font-bold text-slate-500 uppercase">Target Kelas</label>
                     <select id="genTarget" className="w-full p-2 border rounded mt-1 bg-slate-50">
                       <option value="ALL">Semua Kelas</option>
                       <option value="10">Kelas 10 (X)</option>
                       <option value="11">Kelas 11 (XI)</option>
                       <option value="12">Kelas 12 (XII)</option>
                     </select>
                   </div>
                   <div>
                     <label className="text-[10px] font-bold text-slate-500 uppercase">Nominal (Rp)</label>
                     <input id="genAmount" type="number" placeholder="Nominal Total" className="w-full p-2 border rounded mt-1 bg-slate-50" />
                   </div>
                   <button 
                     onClick={() => handleGenerateBilling({
                       category: document.getElementById('genCat').value,
                       targetClass: document.getElementById('genTarget').value,
                       amount: document.getElementById('genAmount').value,
                       month: new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' })
                     })}
                     className="bg-emerald-600 text-white p-2 rounded font-bold hover:bg-emerald-700 flex items-center justify-center gap-2"
                   >
                     <Plus className="w-4 h-4"/> Proses Tagihan Massal
                   </button>
                </div>

                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 border-b">
                      <tr><th className="p-4">NIS</th><th className="p-4">NAMA</th><th className="p-4">KELAS</th><th className="p-4 text-right">TOTAL PIUTANG</th></tr>
                    </thead>
                    <tbody className="divide-y">
                      {students.map(s => {
                         var unpaid = billings.filter(b => String(b.studentId) === String(s.studentId) && b.status !== 'LUNAS' && b.status !== 'PAID');
                         var debt = unpaid.reduce((sum, b) => sum + (Number(b.amountDue) - Number(b.amountPaid)), 0);
                         return (
                           <tr key={s.studentId} className="hover:bg-slate-50 transition">
                             <td className="p-4 font-mono text-xs text-slate-400">{s.studentId}</td>
                             <td className="p-4 font-bold text-slate-700">{s.name}</td>
                             <td className="p-4 text-slate-500">Kelas {s.class}</td>
                             <td className="p-4 text-right font-bold text-rose-600">Rp {fmtCurrency(debt)}</td>
                           </tr>
                         );
                      })}
                    </tbody>
                  </table>
                </div>
             </div>
          )}

          {tab === 'rkam' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <h2 className="text-2xl font-bold">Monitoring RKAM</h2>
              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <div className="h-80 mb-8">
                  <ResponsiveContainer>
                    <BarChart data={analytics.rkamData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="code" />
                      <YAxis tickFormatter={v => (v / 1000000) + 'M'} />
                      <RechartsTooltip formatter={v => 'Rp ' + fmtCurrency(v)} />
                      <Legend />
                      <Bar dataKey="budget" name="Pagu" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="realization" name="Realisasi" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {tab === 'cashflow' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <h2 className="text-2xl font-bold">Proyeksi Arus Kas</h2>
              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <div className="h-80">
                  <ResponsiveContainer>
                    <LineChart data={analytics.cashFlow}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="quarter" />
                      <YAxis tickFormatter={v => (v / 1000000) + 'M'} />
                      <RechartsTooltip formatter={v => 'Rp ' + fmtCurrency(v)} />
                      <Legend />
                      <Line type="monotone" dataKey="masuk" stroke="#10b981" strokeWidth={2} name="Masuk" />
                      <Line type="monotone" dataKey="keluar" stroke="#ef4444" strokeWidth={2} name="Keluar" />
                      <Line type="monotone" dataKey="saldo" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" name="Saldo" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {tab === 'restricted' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <h2 className="text-2xl font-bold">Dana Terikat</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-amber-200"><div className="flex items-center gap-2 mb-3"><Lock className="w-5 h-5 text-amber-600" /><h4 className="font-bold">Diterima</h4></div><div className="text-2xl font-bold text-amber-600">Rp {fmtCurrency(analytics.totalInRestricted)}</div></div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-emerald-200"><div className="flex items-center gap-2 mb-3"><CheckCircle className="w-5 h-5 text-emerald-600" /><h4 className="font-bold">Tersalurkan</h4></div><div className="text-2xl font-bold text-emerald-600">Rp {fmtCurrency(analytics.totalOutRestricted)}</div></div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-blue-200"><div className="flex items-center gap-2 mb-3"><Wallet className="w-5 h-5 text-blue-600" /><h4 className="font-bold">Saldo</h4></div><div className="text-2xl font-bold text-blue-600">Rp {fmtCurrency(analytics.totalInRestricted - analytics.totalOutRestricted)}</div></div>
              </div>
            </div>
          )}

          {tab === 'isak' && (
            <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg border">
              <div className="text-center border-b-4 border-double border-slate-800 pb-6 mb-8">
                <h3 className="text-2xl font-bold uppercase">Laporan Penghasilan Komprehensif</h3>
                <p className="text-slate-500">Berdasarkan Standar ISAK 35 (Entitas Non-Laba)</p>
              </div>
              <p className="text-center text-slate-400 italic">Gunakan tombol "Laporan Bulanan" di tab Jurnal Umum untuk export detail laporan PDF.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function NB({ icon, label, a, oc }) {
  return (
    <button onClick={oc} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition text-sm font-medium ${a ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
      {icon} {label}
    </button>
  );
}

function CD({ t, v, ic, s }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition">{ic}</div>
      <p className="text-xs font-bold text-slate-400 uppercase mb-1">{t}</p>
      <h4 className="text-2xl font-black text-slate-800 mb-2">{v}</h4>
      {s && <p className="text-[10px] text-slate-400">{s}</p>}
    </div>
  );
}