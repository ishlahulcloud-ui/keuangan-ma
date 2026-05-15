import React from 'react';
import { Printer } from 'lucide-react';

export function PrintReceiptButton({ transaction, allTransactions, institution, students }) {
  const handlePrint = () => {
    // KUNCI PENGGABUNGAN: Cari semua transaksi dengan Nomor REF yang sama persis
    const relatedTx = allTransactions.filter(t => t.ref === transaction.ref && t.type === 'IN');
    const total = relatedTx.reduce((sum, t) => sum + Number(t.amount), 0);
    
    // Cari nama siswa
    const student = students.find(s => String(s.studentId) === String(transaction.studentId));
    const studentName = student ? student.name : 'Siswa / Umum';

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Kuitansi ${transaction.ref}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; padding: 20px; color: #000; }
            .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 20px; }
            .title { font-size: 18px; font-weight: bold; margin: 0; }
            .subtitle { font-size: 12px; margin: 5px 0; }
            .row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 5px; }
            .items { margin: 20px 0; border-bottom: 2px dashed #000; padding-bottom: 10px; }
            .item-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 5px; }
            .total { font-weight: bold; font-size: 16px; margin-top: 10px; }
            .footer { text-align: center; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="header">
            <p class="title">${institution.toUpperCase()}</p>
            <p class="subtitle">BUKTI PENERIMAAN KAS</p>
          </div>
          <div class="row"><span>No. Ref:</span><span>${transaction.ref}</span></div>
          <div class="row"><span>Tanggal:</span><span>${transaction.date}</span></div>
          <div class="row"><span>Terima Dari:</span><span>${studentName}</span></div>
          
          <div class="items">
            <div class="item-row" style="font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 10px;">
              <span>Keterangan</span>
              <span>Nominal</span>
            </div>
            ${relatedTx.map(t => `
              <div class="item-row">
                <span style="flex: 1; padding-right: 10px;">${t.desc}</span>
                <span>Rp ${new Intl.NumberFormat('id-ID').format(t.amount)}</span>
              </div>
            `).join('')}
          </div>
          
          <div class="row total">
            <span>TOTAL:</span>
            <span>Rp ${new Intl.NumberFormat('id-ID').format(total)}</span>
          </div>
          
          <div class="footer">
            <p>Pangalengan, ${transaction.date}</p>
            <br><br><br>
            <p>( Bendahara )</p>
            <p style="font-size: 10px; color: #666; margin-top: 15px;">Dicetak otomatis oleh Sistem ISAK 35</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  return (
    <button onClick={handlePrint} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition" title="Cetak Kuitansi">
      <Printer className="w-5 h-5" />
    </button>
  );
}