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
    const relatedTx = allTransactions.filter(t => t.ref === transaction.ref && t.type === 'IN');
    const total = relatedTx.reduce((sum, t) => sum + Number(t.amount), 0);
    
    const student = students.find(s => String(s.studentId) === String(transaction.studentId));
    const studentName = student ? student.name : 'Siswa / Umum';
    const studentClass = student ? student.class : '-';
    
    let displayDate = transaction.date;
    try {
      const d = new Date(transaction.date);
      if(!isNaN(d.getTime())) {
        displayDate = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
      } else if (transaction.date.includes('T')) {
        displayDate = transaction.date.split('T')[0];
      }
    } catch(e) {}

    const paymentMethod = transaction.docRef || 'Tunai';

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Resi_${transaction.ref}</title>
          <style>
            /* SETTING KHUSUS PRINTER DOT MATRIX & CONTINUOUS FORM */
            @page { 
              margin: 0; /* Menghilangkan margin bawaan browser */
              size: auto; 
            }
            body { 
              font-family: 'Courier New', Courier, monospace; /* Wajib monospace agar ketukan rapi */
              font-size: 12px; 
              color: #000; 
              width: 100%;
              max-width: 21cm; /* Lebar standar kertas continuous */
              margin: 0;
              padding: 10px 15px; /* Sedikit padding agar tidak mepet tepi robekan */
              background: #fff;
            }
            /* Hilangkan semua elemen dekoratif yang membuat dot matrix lambat */
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .header { border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 10px; }
            .title { font-size: 16px; margin: 0 0 5px 0; letter-spacing: 1px; }
            .subtitle { font-size: 12px; margin: 0; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 10px; }
            td { padding: 2px 0; vertical-align: top; }
            .col-label { width: 90px; }
            .col-separator { width: 15px; text-align: center; }
            
            .items-container { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0; margin-bottom: 10px; }
            .item-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 5px; }
            
            .total-row { font-size: 14px; font-weight: bold; margin-bottom: 5px; }
            .terbilang { font-style: italic; font-size: 11px; margin-bottom: 15px; }
            
            .signatures { display: flex; justify-content: space-between; margin-top: 20px; font-size: 12px; }
            .sign-box { text-align: center; width: 150px; }
            .sign-line { border-top: 1px dashed #000; margin-top: 50px; padding-top: 5px; }
            
            .footer-notes { font-size: 10px; margin-top: 20px; }
            
            /* Sembunyikan elemen ini saat benar-benar dicetak di kertas */
            @media print {
              html, body { height: auto; }
            }
          </style>
        </head>
        <body>
          <div class="header text-center">
            <h1 class="title">KWITANSI PEMBAYARAN</h1>
            <p class="subtitle font-bold">${institution.toUpperCase()}</p>
          </div>

          <table>
            <tr><td class="col-label">No. Resi</td><td class="col-separator">:</td><td>${transaction.ref}</td></tr>
            <tr><td class="col-label">Tanggal</td><td class="col-separator">:</td><td>${displayDate}</td></tr>
            <tr><td class="col-label">Nama</td><td class="col-separator">:</td><td class="font-bold">${studentName}</td></tr>
            <tr><td class="col-label">Kelas</td><td class="col-separator">:</td><td>${studentClass}</td></tr>
            <tr><td class="col-label">Cara Bayar</td><td class="col-separator">:</td><td class="font-bold">${paymentMethod}</td></tr>
          </table>

          <div class="items-container">
            ${relatedTx.map((t, index) => {
              const cleanDesc = t.desc.split(' - ')[0];
              return `
              <div class="item-row">
                <span style="flex: 1; padding-right: 10px;">${index + 1}. ${cleanDesc}</span>
                <span>Rp ${new Intl.NumberFormat('id-ID').format(t.amount)}</span>
              </div>
            `}).join('')}
          </div>

          <div class="total-row">
            JUMLAH: Rp ${new Intl.NumberFormat('id-ID').format(total)}
          </div>
          <div class="terbilang">
            # ${terbilang(total)} Rupiah #
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
            <p>1. Biaya bersifat non-refundable.<br>2. Dicetak otomatis oleh Sistem.</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    
    // Memberikan jeda sedikit lebih lama agar spooler printer Dot Matrix siap menerima data
    setTimeout(() => { 
      printWindow.print(); 
      printWindow.close(); 
    }, 800);
  };

  return (
    <button onClick={handlePrint} className="p-2 text-emerald-600 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition text-xs font-bold flex items-center gap-2" title="Cetak Kuitansi Epson LX">
      <Printer className="w-4 h-4" /> Cetak
    </button>
  );
}