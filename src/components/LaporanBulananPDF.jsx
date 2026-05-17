import React from 'react';
import { FileText } from 'lucide-react';

function fmtCurrency(val) {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(val);
}

export function LaporanBulananButton({ transactions, coaList, rkamList, institution, userRole, userName }) {
  
  const generatePDF = () => {
    // 1. Ambil Periode Bulan Berjalan Saat Ini (WIB)
    const kini = new Date();
    const bulanIniStr = kini.getFullYear() + '-' + String(kini.getMonth() + 1).padStart(2, '0'); // Hasil: "2026-05"
    const namaBulanIndo = kini.toLocaleString('id-ID', { month: 'long', year: 'numeric' });

    // 2. Variabel Penampung Kalkulasi Otomatis untuk Insight
    let totalKasSaatIni = 0;
    let incBulanIniTanpaPembatasan = 0;
    let incBulanIniDenganPembatasan = 0;
    let expBulanIniTanpaPembatasan = 0;
    let expBulanIniDenganPembatasan = 0;
    
    let akumulasiBebanMasaLalu = 0;
    let setBulanBeban = new Set();

    // 3. Pemetaan Buku Besar per Akun COA untuk Lampiran ISAK 35
    const bukuBesar = {};
    coaList.forEach(c => {
      bukuBesar[c.code] = { name: c.name, category: c.category, tanpaPembatasan: 0, denganPembatasan: 0 };
    });

    // Loop data transaksi
    transactions.forEach(t => {
      const nominal = Number(t.amount || 0);
      const isRestricted = t.restriction && t.restriction !== 'unrestricted';
      const tBulan = t.date ? String(t.date).substring(0, 7) : '';

      // Kalkulasi Saldo Kas Aktual Saat ini (Semua Masa)
      if (t.type === 'IN') totalKasSaatIni += nominal;
      else totalKasSaatIni -= nominal;

      // Track histori beban untuk hitung rata-rata pengeluaran bulanan (Runway Kas)
      if (t.type === 'OUT') {
        akumulasiBebanMasaLalu += nominal;
        if (tBulan) setBulanBeban.add(tBulan);
      }

      // Filter Khusus Bulan Berjalan untuk Halaman Utama Laporan
      if (tBulan === bulanIniStr) {
        if (t.type === 'IN') {
          if (isRestricted) incBulanIniDenganPembatasan += nominal;
          else incBulanIniTanpaPembatasan += nominal;
        } else {
          if (isRestricted) expBulanIniDenganPembatasan += nominal;
          else expBulanIniTanpaPembatasan += nominal;
        }

        // Masukkan ke rekap akun COA Buku Besar
        if (bukuBesar[t.coa]) {
          if (isRestricted) {
            bukuBesar[t.coa].denganPembatasan += nominal;
          } else {
            bukuBesar[t.coa].tanpaPembatasan += nominal;
          }
        }
      }
    });

    // 4. Kalkulasi Metrik Insight Non-Keuangan
    const totalPemasukanBulanIni = incBulanIniTanpaPembatasan + incBulanIniDenganPembatasan;
    const totalPengeluaranBulanIni = expBulanIniTanpaPembatasan + expBulanIniDenganPembatasan;
    const surplusDefisitBulanIni = totalPemasukanBulanIni - totalPengeluaranBulanIni;
    const surplusTanpaPembatasan = incBulanIniTanpaPembatasan - expBulanIniTanpaPembatasan;

    // Hitung sisa napas kas (Runway)
    const jumlahBulanOperasional = setBulanBeban.size || 1;
    const rataRataBebanBulanan = akumulasiBebanMasaLalu / jumlahBulanOperasional;
    const runwayKas = rataRataBebanBulanan > 0 ? (totalKasSaatIni / rataRataBebanBulanan).toFixed(1) : '∞';

    // 5. Eksekusi Print Window HTML
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Laporan Keuangan - ${namaBulanIndo}</title>
          <style>
            @media print {
              .page-break { page-break-before: always; }
            }
            body { font-family: Arial, sans-serif; padding: 30px; color: #334155; line-height: 1.6; }
            .kop-surat { text-align: center; border-bottom: 3px double #1e293b; padding-bottom: 10px; margin-bottom: 25px; }
            .kop-title { font-size: 22px; font-weight: bold; margin: 0; color: #0f172a; }
            .kop-subtitle { font-size: 14px; margin: 5px 0 0 0; color: #475569; }
            
            .section-title { font-size: 16px; font-weight: bold; color: #0f172a; border-left: 4px solid #10b981; padding-left: 10px; margin-top: 25px; margin-bottom: 15px; }
            .card-insight { background-color: #f8fafc; border: 1px solid #e2e8f0; rounded: 12px; padding: 15px; margin-bottom: 15px; border-radius: 8px; }
            .card-title { font-weight: bold; font-size: 14px; color: #0f172a; margin-bottom: 5px; display: flex; justify-content: space-between; }
            .card-text { font-size: 13px; color: #475569; margin: 0; text-align: justify; }
            .highlight-green { color: #16a34a; font-weight: bold; }
            .highlight-blue { color: #2563eb; font-weight: bold; }
            .highlight-amber { color: #d97706; font-weight: bold; }
            .highlight-rose { color: #dc2626; font-weight: bold; }

            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; margin-bottom: 25px; }
            th { background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 8px; font-bold: true; text-align: left; color: #1e293b; }
            td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .bg-total { background-color: #f8fafc; font-weight: bold; }
            
            .footer-sign { display: flex; justify-content: space-between; margin-top: 50px; font-size: 13px; }
            .sign-box { text-align: center; width: 220px; }
            .sign-space { height: 70px; }
          </style>
        </head>
        <body>
          
          <div class="kop-surat">
            <p class="kop-title">YAYASAN ISHLAHUL AMANAH</p>
            <p class="kop-subtitle">MTs Ishlahul Amanah Pangalengan, Kab. Bandung</p>
            <p class="kop-subtitle" style="font-weight: bold; font-size: 15px; margin-top: 10px; color: #0f172a;">RINGKASAN EKSEKUTIF & ANALISIS KEUANGAN STRATEGIS</p>
            <p class="kop-subtitle" style="font-style: italic;">Periode Laporan: ${namaBulanIndo}</p>
          </div>

          <p style="font-size: 13px; margin-bottom: 20px;">
            Yth. Ketua Yayasan, Kepala Madrasah, dan Dewan Pengawas Institusi.<br>
            Berikut adalah intisari laporan keuangan bulan ini yang dirangkum menggunakan bahasa operasional non-teknis akuntansi untuk mempermudah pengambilan keputusan strategis:
          </p>

          <div class="section-title">Analisis Kesehatan Kas & Likuiditas</div>
          <div class="card-insight" style="border-left: 4px solid #10b981;">
            <div class="card-title"><span>1. Kekuatan Dana Segar (Cash Runway)</span><span class="highlight-green">Rp ${fmtCurrency(totalKasSaatIni)}</span></div>
            <p class="card-text">
              Saat ini madrasah memegang dana segar di brankas dan rekening bank sebesar <span class="highlight-green">Rp ${fmtCurrency(totalKasSaatIni)}</span>. Based on histori pengeluaran operasional, dana ini berada dalam kondisi aman karena sanggup membiayai seluruh kebutuhan rutin bulanan madrasah (seperti honorarium guru dan operasional kantor) selama <span class="highlight-green">${runwayKas} bulan ke depan</span>, meskipun seandainya sekolah tidak menerima pemasukan baru sama sekali.
            </p>
          </div>

          <div class="section-title">Kinerja Operasional Bulan Berjalan</div>
          <div class="card-insight" style="border-left: 4px solid #3b82f6;">
            <div class="card-title"><span>2. Hasil Aktivitas Bulanan (Surplus / Defisit)</span><span class="${surplusDefisitBulanIni >= 0 ? 'highlight-blue' : 'highlight-rose'}">Rp ${fmtCurrency(surplusDefisitBulanIni)}</span></div>
            <p class="card-text">
              Sepanjang bulan ${namaBulanIndo}, madrasah mencatatkan total pemasukan sebesar Rp ${fmtCurrency(totalPemasukanBulanIni)} dan total pengeluaran sebesar Rp ${fmtCurrency(totalPengeluaranBulanIni)}. 
              ${surplusDefisitBulanIni >= 0 
                ? `Operasional kita berjalan dengan sangat efisien, menghasilkan <span class="highlight-blue">SURPLUS bersih sebesar Rp ${fmtCurrency(surplusDefisitBulanIni)}</span>. Dana surplus ini siap dialokasikan untuk memperkuat pos cadangan kas atau kas pengembangan fisik.` 
                : `Bulan ini kita mengalami <span class="highlight-rose">DEFISIT sementara sebesar Rp ${fmtCurrency(Math.abs(surplusDefisitBulanIni))}</span>. Hal ini wajar terjadi karena adanya pengeluaran musiman/kegiatan dalam jumlah besar. Pengeluaran rutin bulan depan disarankan diperketat untuk menyeimbangkan kembali neraca kas.`
              }
            </p>
          </div>

          <div class="section-title">Disiplin Sekat Dana & Regulasi Pajak</div>
          <div class="card-insight" style="border-left: 4px solid #f59e0b;">
            <div class="card-title"><span>3. Pembatasan Dana Kegiatan Orang Tua</span><span class="highlight-amber">Rp ${fmtCurrency(incBulanIniDenganPembatasan - expBulanIniDenganPembatasan)}</span></div>
            <p class="card-text">
              Dari seluruh arus uang masuk bulan ini, sebesar <span class="highlight-amber">Rp ${fmtCurrency(incBulanIniDenganPembatasan)}</span> adalah <strong>Dana Terikat Sementara</strong> (Uang titipan orang tua untuk kegiatan spesifik seperti PAT, PAS, atau Akhir Tahun). Sesuai aturan akuntansi, sisa dana terikat bulan ini sebesar <span class="highlight-amber">Rp ${fmtCurrency(incBulanIniDenganPembatasan - expBulanIniDenganPembatasan)}</span> <span class="highlight-rose">TIDAK BOLEH dialihkan</span> untuk membayar gaji maupun operasional harian kantor, melainkan harus disimpan utuh hingga kegiatan yang bersangkutan dilaksanakan.
            </p>
          </div>

          <div class="card-insight" style="border-left: 4px solid #ef4444;">
            <div class="card-title"><span>4. Kepatuhan Hukum & Pajak Yayasan (PMK 68/2020)</span><span>Siap Reinvestasi</span></div>
            <p class="card-text">
              Akumulasi sisa dana operasional bebas (Tanpa Pembatasan) bulan ini tercatat sebesar <span class="highlight-green">Rp ${fmtCurrency(surplusTanpaPembatasan)}</span>. Mengikuti regulasi Kementerian Keuangan (PMK 68), agar dana surplus ini bebas dari pengenaan Pajak Penghasilan (PPh) Badan Yayasan, pihak manajemen memiliki kewajiban untuk melakukan alokasi investasi ulang (reinvestasi) menjadi sarana prasarana fisik pendidikan (seperti renovasi kelas, pengadaan komputer, atau buku perpustakaan) dalam jangka waktu maksimal 4 tahun ke depan.
            </p>
          </div>

          <div class="footer-sign">
            <div class="sign-box"><p>Dilaporkan Oleh,</p><div class="sign-space"></div><p className="font-bold"><u>${userName}</u></p><p style="font-size:11px; color:#666;">Bendahara Yayasan (${userRole})</p></div>
            <div class="sign-box"><p>Mengetahui,</p><div class="sign-space"></div><p className="font-bold"><u>____________________</u></p><p style="font-size:11px; color:#666;">Kepala Madrasah / Ketua Yayasan</p></div>
          </div>

          <div class="page-break"></div>
          <div class="kop-surat">
            <p class="kop-title">MTs ISHLAHUL AMANAH</p>
            <p class="kop-subtitle">LAPORAN AKTIVITAS (ISAK 35)</p>
            <p class="kop-subtitle">Untuk Periode yang Berakhir pada: ${namaBulanIndo}</p>
          </div>

          <div class="section-title">1. PENDAPATAN & PENERIMAAN</div>
          <table>
            <thead>
              <tr>
                <th>Kode Akun</th>
                <th>Nama Pos Pendapatan</th>
                <th class="text-right">Tanpa Pembatasan</th>
                <th class="text-right">Dengan Pembatasan</th>
                <th class="text-right">Total Nominal</th>
              </tr>
            </thead>
            <tbody>
              ${Object.keys(bukuBesar)
                .filter(code => bukuBesar[code].category === 'PENDAPATAN')
                .map(code => {
                  const item = bukuBesar[code];
                  const totalRow = item.tanpaPembatasan + item.denganPembatasan;
                  if (totalRow === 0) return ''; // Sembunyikan akun yang kosong di bulan ini
                  return `
                    <tr>
                      <td class="font-mono">${code}</td>
                      <td>${item.name}</td>
                      <td class="text-right">Rp ${fmtCurrency(item.tanpaPembatasan)}</td>
                      <td class="text-right">Rp ${fmtCurrency(item.denganPembatasan)}</td>
                      <td class="text-right font-bold">Rp ${fmtCurrency(totalRow)}</td>
                    </tr>
                  `;
                }).join('')}
              <tr class="bg-total">
                <td colspan="2">TOTAL PENDAPATAN BULAN INI</td>
                <td class="text-right">Rp ${fmtCurrency(incBulanIniTanpaPembatasan)}</td>
                <td class="text-right">Rp ${fmtCurrency(incBulanIniDenganPembatasan)}</td>
                <td class="text-right text-blue-600">Rp ${fmtCurrency(totalPemasukanBulanIni)}</td>
              </tr>
            </tbody>
          </table>

          <div class="section-title">2. BEBAN & PENGELUARAN OPERASIONAL</div>
          <table>
            <thead>
              <tr>
                <th>Kode Akun</th>
                <th>Nama Pos Beban</th>
                <th class="text-right">Tanpa Pembatasan</th>
                <th class="text-right">Dengan Pembatasan</th>
                <th class="text-right">Total Nominal</th>
              </tr>
            </thead>
            <tbody>
              ${Object.keys(bukuBesar)
                .filter(code => bukuBesar[code].category === 'BEBAN')
                .map(code => {
                  const item = bukuBesar[code];
                  const totalRow = item.tanpaPembatasan + item.denganPembatasan;
                  if (totalRow === 0) return '';
                  return `
                    <tr>
                      <td class="font-mono">${code}</td>
                      <td>${item.name}</td>
                      <td class="text-right">Rp ${fmtCurrency(item.tanpaPembatasan)}</td>
                      <td class="text-right">Rp ${fmtCurrency(item.denganPembatasan)}</td>
                      <td class="text-right font-bold">Rp ${fmtCurrency(totalRow)}</td>
                    </tr>
                  `;
                }).join('')}
              <tr class="bg-total">
                <td colspan="2">TOTAL BEBAN OPERASIONAL BULAN INI</td>
                <td class="text-right">Rp ${fmtCurrency(expBulanIniTanpaPembatasan)}</td>
                <td class="text-right">Rp ${fmtCurrency(expBulanIniDenganPembatasan)}</td>
                <td class="text-right text-rose-600">Rp ${fmtCurrency(totalPengeluaranBulanIni)}</td>
              </tr>
            </tbody>
          </table>

          <div class="section-title">3. EVALUASI HASIL AKTIVITAS NETO (SURPLUS / DEFISIT)</div>
          <table style="font-size: 13px;">
            <tr class="bg-total" style="background-color: #f1f5f9;">
              <td>KENAIKAN / (PENURUNAN) ASET NETO BULANAN</td>
              <td class="text-right ${surplusTanpaPembatasan >= 0 ? 'highlight-blue' : 'highlight-rose'}">Rp ${fmtCurrency(surplusTanpaPembatasan)}</td>
              <td class="text-right ${incBulanIniDenganPembatasan - expBulanIniDenganPembatasan >= 0 ? 'highlight-amber' : 'highlight-rose'}">Rp ${fmtCurrency(incBulanIniDenganPembatasan - expBulanIniDenganPembatasan)}</td>
              <td class="text-right font-black" style="font-size: 14px; color: #0f172a;">Rp ${fmtCurrency(surplusDefisitBulanIni)}</td>
            </tr>
          </table>

          <div class="footer-notes">
            <p><strong>Keterangan Lampiran Teknikal:</strong></p>
            <p style="margin:0; font-size:11px;">1. Laporan ini dicetak berdasarkan data mutasi riil Jurnal Umum yang divalidasi oleh sistem awan (Cloud).</p>
            <p style="margin:0; font-size:11px;">2. Pengelompokan akun mematuhi Bagan Akun Standar Entitas Non-Laba Keagamaan dan Pendidikan Yayasan MTs Ishlahul Amanah.</p>
          </div>

        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  return (
    <button 
      onClick={generatePDF} 
      className="bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-700 transition font-bold text-sm shadow shadow-slate-300"
    >
      <FileText className="w-4 h-4" /> Laporan Bulanan
    </button>
  );
}