import React from 'react';
import { Printer } from 'lucide-react';

function terbilang(angka) {
  var bilangan = ['','Satu','Dua','Tiga','Empat','Lima','Enam','Tujuh','Delapan','Sembilan','Sepuluh','Sebelas'];
  var hasil = '';
  if (angka < 12) hasil = bilangan[angka];
  else if (angka < 20) hasil = terbilang(angka - 10) + ' Belas';
  else if (angka < 100) hasil = terbilang(Math.floor(angka / 10)) + ' Puluh ' + terbilang(angka % 10);
  else if (angka < 200) hasil = 'Seratus ' + terbilang(angka - 100);
  else if (angka < 1000) hasil = terbilang(Math.floor(angka / 100)) + ' Ratus ' + terbilang(angka % 100);
  else if (angka < 2000) hasil = 'Seribu ' + terbilang(angka - 1000);
  else if (angka < 1000000) hasil = terbilang(Math.floor(angka / 1000)) + ' Ribu ' + terbilang(angka % 1000);
  else if (angka < 1000000000) hasil = terbilang(Math.floor(angka / 1000000)) + ' Juta ' + terbilang(angka % 1000000);
  return hasil.trim();
}

export function PrintReceiptButton({ transaction, allTransactions, institution, students }) {
  const handlePrint = () => {
    // 1. Kumpulkan semua transaksi yang Nomor Kuitansinya (REF) sama
    const relatedTx = allTransactions.filter(t => t.ref === transaction.ref && t.type === 'IN');
    const total = relatedTx.reduce((sum, t) => sum + Number(t.amount), 0);
    
    // 2. Data Siswa
    const student = students.find(s => String(s.studentId) === String(transaction.studentId));
    const studentName = student ? student.name : 'Siswa / Umum';
    const studentClass = student ? student.class : '-';
    
    // 3. Format Tanggal (Menghilangkan T dan Z yang membingungkan)
    let displayDate = transaction.date;
    try {
      const d = new Date(transaction.date);
      if(!isNaN(d.getTime())) {
        displayDate = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      } else if (transaction.date.includes('T')) {
        displayDate = transaction.date.split('T')[0];
      }
    } catch(e) {}

    // 4. Metode Pembayaran
    const paymentMethod = transaction.docRef || 'Tunai';

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Kwitansi ${transaction.ref}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; padding: 20px; color: #000; max-width: 800px; margin: 0 auto; }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .header { border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 15px; }
            .title { font-size: 20px; margin: 0 0 5px 0; letter-spacing: 1px; }
            .subtitle { font-size: 14px; margin: 0; }
            table { width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 15px; }
            td { padding: 4px 0; vertical-align: top; }
            .col-label { width: 120px; }
            .col-separator { width: 20px; text-align: center; }
            .items-container { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 15px 0; margin-bottom: 15px; }
            .item-row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 8px; }
            .total-row { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
            .terbilang { font-style: italic; font-size: 13px; margin-bottom: 20px; }
            .signatures { display: flex; justify-content: space-between; margin-top: 40px; font-size: 14px; }
            .sign-box { text-align: center; width: 200px; }
            .sign-line { border-top: 1px solid #000; margin-top: 60px; padding-top: 5px; }
            .footer-notes { font-size: 10px; color: #555; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="header text-center">
            <h1 class="title">KWITANSI PEMBAYARAN</h1>
            <p class="subtitle font-bold">Madrasah Tsanawiyah<br>${institution}</p>
            <p class="subtitle" style="font-size: 12px;">Pangalengan, Kab. Bandung</p>
          </div>

          <table>
            <tr><td class="col-label">No. Resi</td><td class="col-separator">:</td><td>${transaction.ref}</td></tr>
            <tr><td class="col-label">Tanggal</td><td class="col-separator">:</td><td>${displayDate}</td></tr>
            <tr><td class="col-label">Nama</td><td class="col-separator">:</td><td class="font-bold">${studentName}</td></tr>
            <tr><td class="col-label">Kelas</td><td class="col-separator">:</td><td>${studentClass}</td></tr>
            <tr><td class="col-label">Pembayaran</td><td class="col-separator">:</td><td class="font-bold">${paymentMethod}</td></tr>
          </table>

          <div class="items-container">
            <div class="font-bold" style="margin-bottom: 10px; font-size: 12px; color: #555;">RINCIAN PEMBAYARAN:</div>
            ${relatedTx.map((t, index) => `
              <div class="item-row">
                <span style="flex: 1;">${index + 1}. ${t.desc}</span>
                <span>Rp ${new Intl.NumberFormat('id-ID').format(t.amount)}</span>
              </div>
            `).join('')}
          </div>

          <div class="total-row">
            JUMLAH: Rp ${new Intl.NumberFormat('id-ID').format(total)}
          </div>
          <div class="terbilang">
            Terbilang: ${terbilang(total)} Rupiah
          </div>

          <div class="signatures">
            <div class="sign-box">
              <p>Penerima,</p>
              <div class="sign-line">( Bendahara )</div>
            </div>
            <div class="sign-box">
              <p>Pembayar,</p>
              <div class="sign-line">( ${studentName} )</div>
            </div>
          </div>

          <div class="footer-notes">
            <p><strong>Catatan:</strong></p>
            <ol style="margin-top: 5px; padding-left: 15px;">
              <li>Semua biaya bersifat non-refundable (tidak dapat dikembalikan).</li>
              <li>Simpanlah kuitansi ini sebagai bukti pembayaran yang sah.</li>
              <li>Dicetak otomatis oleh Sistem ISAK 35.</li>
            </ol>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  return (
    <button onClick={handlePrint} className="p-2 text-emerald-600 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition text-xs font-bold flex items-center gap-2" title="Cetak Kuitansi Gabungan">
      <Printer className="w-4 h-4" /> Cetak
    </button>
  );
}