/**
 * LaporanBulananPDF.jsx
 * ======================
 * Komponen React untuk generate Laporan Keuangan Bulanan
 * dalam format PDF profesional.
 *
 * Dependensi: jspdf + jspdf-autotable
 * Install:  npm install jspdf jspdf-autotable
 *
 * Taruh file ini di: src/components/LaporanBulananPDF.jsx
 *
 * Cara pakai:
 *   import jsPDF from 'jspdf';
     import autoTable from 'jspdf-autotable';

 *
 *   <LaporanBulananButton
 *     transactions={allTransactions}
 *     coaList={coaList}
 *     rkamList={rkamList}
 *     institution="MTs Ishlahul Amanah"
 *     userRole={user.role}
 *     userName={user.name}
 *   />
 */

import React, { useState } from 'react';

// ============================================================
// HELPERS
// ============================================================

const BULAN_INDO = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

function fmtRp(n) {
  if (n == null || isNaN(n)) return 'Rp 0';
  const abs = Math.abs(Number(n));
  const formatted = abs.toLocaleString('id-ID');
  return (n < 0 ? '-Rp ' : 'Rp ') + formatted;
}

function fmtTanggal(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function parseMonth(dateStr) {
  try {
    const d = new Date(dateStr);
    return { month: d.getMonth(), year: d.getFullYear() };
  } catch {
    return null;
  }
}

function getQuarterLabel(month) {
  if (month <= 2) return 'Q1';
  if (month <= 5) return 'Q2';
  if (month <= 8) return 'Q3';
  return 'Q4';
}

// ============================================================
// PDF GENERATOR
// ============================================================

async function generateLaporanPDF({
  transactions,
  coaList,
  rkamList,
  institution,
  userName,
  selectedMonth,
  selectedYear,
}) {
    // Dynamic import jsPDF dan autoTable
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');


  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const monthName = BULAN_INDO[selectedMonth];
  const periodLabel = `${monthName} ${selectedYear}`;
  const quarterLabel = getQuarterLabel(selectedMonth);

  // Filter transaksi bulan ini
  const monthTx = transactions.filter((tx) => {
    const parsed = parseMonth(tx.date);
    return parsed && parsed.month === selectedMonth && parsed.year === selectedYear;
  });

  // Hitung ringkasan
  const totalIn = monthTx.filter(t => t.type === 'IN').reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalOut = monthTx.filter(t => t.type === 'OUT').reduce((s, t) => s + Number(t.amount || 0), 0);
  const surplus = totalIn - totalOut;

  // Breakdown pendapatan per COA
  const incomeByCoaMap = {};
  monthTx.filter(t => t.type === 'IN').forEach(t => {
    const coaName = coaList?.find(c => c.code === t.coa)?.name || t.coa || 'Lain-lain';
    incomeByCoaMap[coaName] = (incomeByCoaMap[coaName] || 0) + Number(t.amount || 0);
  });
  const incomeByCoa = Object.entries(incomeByCoaMap).sort((a, b) => b[1] - a[1]);

  // Breakdown beban per COA
  const expenseByCoaMap = {};
  monthTx.filter(t => t.type === 'OUT').forEach(t => {
    const coaName = coaList?.find(c => c.code === t.coa)?.name || t.coa || 'Lain-lain';
    expenseByCoaMap[coaName] = (expenseByCoaMap[coaName] || 0) + Number(t.amount || 0);
  });
  const expenseByCoa = Object.entries(expenseByCoaMap).sort((a, b) => b[1] - a[1]);

  // Dana terikat
  const restricted = monthTx.filter(t => t.restriction && t.restriction !== 'Unrestricted');
  const restrictedIn = restricted.filter(t => t.type === 'IN').reduce((s, t) => s + Number(t.amount || 0), 0);
  const restrictedOut = restricted.filter(t => t.type === 'OUT').reduce((s, t) => s + Number(t.amount || 0), 0);
  const unrestricted = totalIn - restrictedIn;

  // Saldo awal (semua transaksi sebelum bulan ini)
  const priorTx = transactions.filter(tx => {
    const parsed = parseMonth(tx.date);
    if (!parsed) return false;
    if (parsed.year < selectedYear) return true;
    if (parsed.year === selectedYear && parsed.month < selectedMonth) return true;
    return false;
  });
  const saldoAwal = priorTx.reduce((s, t) => {
    return s + (t.type === 'IN' ? Number(t.amount || 0) : -Number(t.amount || 0));
  }, 0);
  const saldoAkhir = saldoAwal + surplus;

  // ==========================================
  // HELPER DRAW FUNCTIONS
  // ==========================================

  const addHeader = () => {
    // Garis atas
    doc.setDrawColor(13, 148, 136); // teal-600
    doc.setLineWidth(0.8);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    // Judul institusi
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(13, 148, 136);
    doc.text(institution || 'Madrasah Ishlahul Amanah', pageWidth / 2, y, { align: 'center' });
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('Yayasan Ishlahul Amanah | Pangalengan, Kabupaten Bandung', pageWidth / 2, y, { align: 'center' });
    y += 8;

    // Judul laporan
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 30, 30);
    doc.text('LAPORAN KEUANGAN BULANAN', pageWidth / 2, y, { align: 'center' });
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`Periode: ${periodLabel} (${quarterLabel})`, pageWidth / 2, y, { align: 'center' });
    y += 4;

    // Garis bawah header
    doc.setDrawColor(13, 148, 136);
    doc.setLineWidth(0.4);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
  };

  const addSectionTitle = (title) => {
    checkPageBreak(15);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(13, 148, 136);
    doc.text(title, margin, y);
    y += 2;
    doc.setDrawColor(13, 148, 136);
    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + doc.getTextWidth(title) + 2, y);
    y += 6;
  };

  const checkPageBreak = (needed) => {
    if (y + needed > pageHeight - 25) {
      addFooter();
      doc.addPage();
      y = margin + 5;
    }
  };

  const addFooter = () => {
    const pageCount = doc.internal.getNumberOfPages();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Halaman ${pageCount}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
    doc.text(
      `Dicetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
      margin,
      pageHeight - 8
    );
    doc.text(
      institution,
      pageWidth - margin,
      pageHeight - 8,
      { align: 'right' }
    );
  };

  // ==========================================
  // PAGE 1: RINGKASAN
  // ==========================================

  addHeader();

  // -- Ringkasan Keuangan (3 cards) --
  addSectionTitle('I. Ringkasan Keuangan');

  const cardWidth = (contentWidth - 8) / 3;
  const cardHeight = 22;
  const cards = [
    { label: 'Total Pendapatan', value: fmtRp(totalIn), color: [5, 150, 105] },
    { label: 'Total Pengeluaran', value: fmtRp(totalOut), color: [220, 38, 38] },
    { label: 'Surplus / (Defisit)', value: fmtRp(surplus), color: surplus >= 0 ? [13, 148, 136] : [220, 38, 38] },
  ];

  cards.forEach((card, i) => {
    const x = margin + i * (cardWidth + 4);
    // Background
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'F');
    // Border left accent
    doc.setFillColor(...card.color);
    doc.rect(x, y, 1.5, cardHeight, 'F');
    // Label
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(card.label, x + 6, y + 8);
    // Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...card.color);
    doc.text(card.value, x + 6, y + 16);
  });

  y += cardHeight + 8;

  // -- Saldo --
  const saldoCardW = (contentWidth - 4) / 2;
  const saldoCards = [
    { label: 'Saldo Awal Bulan', value: fmtRp(saldoAwal) },
    { label: 'Saldo Akhir Bulan', value: fmtRp(saldoAkhir) },
  ];

  saldoCards.forEach((card, i) => {
    const x = margin + i * (saldoCardW + 4);
    doc.setFillColor(240, 253, 250);
    doc.roundedRect(x, y, saldoCardW, 16, 2, 2, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(card.label, x + 5, y + 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.text(card.value, x + 5, y + 13);
  });

  y += 24;

  // -- Pendapatan per Akun --
  addSectionTitle('II. Rincian Pendapatan');

  if (incomeByCoa.length > 0) {
    autoTable(doc,{
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Akun', 'Jumlah', '%']],
      body: [
        ...incomeByCoa.map(([name, amt]) => [
          name,
          fmtRp(amt),
          totalIn > 0 ? ((amt / totalIn) * 100).toFixed(1) + '%' : '0%',
        ]),
        ['TOTAL PENDAPATAN', fmtRp(totalIn), '100%'],
      ],
      styles: {
        font: 'helvetica',
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [13, 148, 136],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      bodyStyles: {
        textColor: [30, 30, 30],
      },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.5 },
        1: { cellWidth: contentWidth * 0.3, halign: 'right' },
        2: { cellWidth: contentWidth * 0.2, halign: 'center' },
      },
      didParseCell: (data) => {
        // Bold total row
        if (data.row.index === incomeByCoa.length) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 253, 250];
        }
      },
      theme: 'grid',
    });
    y = doc.lastAutoTable.finalY + 8;
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text('Tidak ada transaksi pendapatan pada periode ini.', margin, y);
    y += 8;
  }

  // -- Beban per Akun --
  checkPageBreak(40);
  addSectionTitle('III. Rincian Pengeluaran');

  if (expenseByCoa.length > 0) {
    autoTable(doc,{
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Akun', 'Jumlah', '%']],
      body: [
        ...expenseByCoa.map(([name, amt]) => [
          name,
          fmtRp(amt),
          totalOut > 0 ? ((amt / totalOut) * 100).toFixed(1) + '%' : '0%',
        ]),
        ['TOTAL PENGELUARAN', fmtRp(totalOut), '100%'],
      ],
      styles: {
        font: 'helvetica',
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [220, 38, 38],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      bodyStyles: {
        textColor: [30, 30, 30],
      },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.5 },
        1: { cellWidth: contentWidth * 0.3, halign: 'right' },
        2: { cellWidth: contentWidth * 0.2, halign: 'center' },
      },
      didParseCell: (data) => {
        if (data.row.index === expenseByCoa.length) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [254, 242, 242];
        }
      },
      theme: 'grid',
    });
    y = doc.lastAutoTable.finalY + 8;
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text('Tidak ada transaksi pengeluaran pada periode ini.', margin, y);
    y += 8;
  }

  // -- Dana Terikat (ISAK 35) --
  checkPageBreak(40);
  addSectionTitle('IV. Laporan Dana Terikat (ISAK 35)');

  autoTable(doc,{
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Kategori', 'Jumlah']],
    body: [
      ['Pendapatan Tanpa Pembatasan', fmtRp(unrestricted)],
      ['Pendapatan Dengan Pembatasan', fmtRp(restrictedIn)],
      ['Penggunaan Dana Terikat', fmtRp(restrictedOut)],
      ['Total Pendapatan', fmtRp(totalIn)],
      ['Total Beban', fmtRp(totalOut)],
      ['Surplus / (Defisit)', fmtRp(surplus)],
    ],
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.6 },
      1: { cellWidth: contentWidth * 0.4, halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.row.index >= 4) {
        data.cell.styles.fontStyle = 'bold';
        if (data.row.index === 5) {
          data.cell.styles.fillColor = surplus >= 0 ? [240, 253, 250] : [254, 242, 242];
        }
      }
    },
    theme: 'grid',
  });
  y = doc.lastAutoTable.finalY + 8;

  // ==========================================
  // PAGE 2+: DAFTAR TRANSAKSI
  // ==========================================

  checkPageBreak(40);
  addSectionTitle('V. Daftar Transaksi');

  if (monthTx.length > 0) {
    // Sort by date
    const sorted = [...monthTx].sort((a, b) => new Date(a.date) - new Date(b.date));

    autoTable(doc,{
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Tgl', 'Ref', 'Keterangan', 'Akun', 'Masuk', 'Keluar']],
      body: sorted.map((tx) => {
        const coaName = coaList?.find(c => c.code === tx.coa)?.name || tx.coa || '';
        return [
          fmtTanggal(tx.date),
          tx.ref || '-',
          (tx.desc || '').substring(0, 35),
          (coaName).substring(0, 15),
          tx.type === 'IN' ? fmtRp(tx.amount) : '',
          tx.type === 'OUT' ? fmtRp(tx.amount) : '',
        ];
      }),
      foot: [['', '', '', 'TOTAL', fmtRp(totalIn), fmtRp(totalOut)]],
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: 2.5,
        overflow: 'ellipsize',
      },
      headStyles: {
        fillColor: [51, 65, 85],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [30, 30, 30],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 22 },
        2: { cellWidth: contentWidth - 22 - 22 - 22 - 28 - 28 },
        3: { cellWidth: 22 },
        4: { cellWidth: 28, halign: 'right' },
        5: { cellWidth: 28, halign: 'right' },
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      theme: 'grid',
    });
    y = doc.lastAutoTable.finalY + 8;
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text('Tidak ada transaksi pada periode ini.', margin, y);
    y += 8;
  }

  // ==========================================
  // TANDA TANGAN
  // ==========================================

  checkPageBreak(55);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);

  const sigDate = `Pangalengan, ${new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })}`;
  doc.text(sigDate, pageWidth - margin, y, { align: 'right' });
  y += 10;

  // 3 kolom tanda tangan
  const sigWidth = (contentWidth - 10) / 3;
  const sigLabels = ['Bendahara', 'Kepala Madrasah', 'Ketua Yayasan'];
  const sigStartY = y;

  sigLabels.forEach((label, i) => {
    const x = margin + i * (sigWidth + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(label + ',', x + sigWidth / 2, sigStartY, { align: 'center' });
    // Space for signature
    doc.setDrawColor(180, 180, 180);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(x + 5, sigStartY + 25, x + sigWidth - 5, sigStartY + 25);
    doc.setLineDashPattern([], 0);
    // Name placeholder
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    doc.text('(..............................)', x + sigWidth / 2, sigStartY + 30, { align: 'center' });
  });

  y = sigStartY + 38;

  // -- Catatan kaki --
  checkPageBreak(15);
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text('Catatan:', margin, y);
  y += 3;
  doc.text('1. Laporan ini dihasilkan secara otomatis oleh Sistem Keuangan ' + (institution || 'Madrasah'), margin + 3, y);
  y += 3;
  doc.text('2. Laporan disusun berdasarkan standar ISAK 35 (Penyajian Laporan Keuangan Entitas Berorientasi Nonlaba)', margin + 3, y);
  y += 3;
  doc.text('3. Dokumen ini sah sebagai laporan internal tanpa memerlukan tanda tangan basah', margin + 3, y);

  // Add footer to all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Halaman ${i} dari ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
    doc.text(
      `Dicetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`,
      margin,
      pageHeight - 8
    );
    doc.text(institution || '', pageWidth - margin, pageHeight - 8, { align: 'right' });
  }

  // ==========================================
  // SAVE
  // ==========================================

  const filename = `Laporan_Keuangan_${institution?.replace(/\s+/g, '_') || 'Madrasah'}_${monthName}_${selectedYear}.pdf`;
  doc.save(filename);

  return filename;
}

// ============================================================
// MONTH PICKER MODAL
// ============================================================

function MonthPickerModal({ isOpen, onClose, onGenerate, institution }) {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() === 0 ? 11 : now.getMonth() - 1);
  const [selectedYear, setSelectedYear] = useState(
    now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
  );
  const [generating, setGenerating] = useState(false);

  if (!isOpen) return null;

  const years = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 3; y--) {
    years.push(y);
  }

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await onGenerate(selectedMonth, selectedYear);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        backgroundColor: '#fff', borderRadius: '12px',
        width: '100%', maxWidth: '380px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
            📊 Laporan Bulanan PDF
          </h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: '20px',
            cursor: 'pointer', color: '#6b7280', padding: '4px',
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>
          <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#6b7280' }}>
            Pilih periode laporan yang ingin dicetak:
          </p>

          {/* Year selector */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>
              Tahun
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {years.map((yr) => (
                <button
                  key={yr}
                  onClick={() => setSelectedYear(yr)}
                  style={{
                    flex: 1, padding: '8px',
                    border: selectedYear === yr ? '2px solid #0d9488' : '1px solid #d1d5db',
                    borderRadius: '6px',
                    backgroundColor: selectedYear === yr ? '#f0fdfa' : '#fff',
                    color: selectedYear === yr ? '#0d9488' : '#374151',
                    fontWeight: selectedYear === yr ? 600 : 400,
                    cursor: 'pointer', fontSize: '14px',
                  }}
                >
                  {yr}
                </button>
              ))}
            </div>
          </div>

          {/* Month grid */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>
              Bulan
            </label>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '6px',
            }}>
              {BULAN_INDO.map((bulan, i) => {
                const isFuture = selectedYear === now.getFullYear() && i > now.getMonth();
                return (
                  <button
                    key={i}
                    onClick={() => !isFuture && setSelectedMonth(i)}
                    disabled={isFuture}
                    style={{
                      padding: '8px 4px',
                      border: selectedMonth === i ? '2px solid #0d9488' : '1px solid #d1d5db',
                      borderRadius: '6px',
                      backgroundColor: isFuture ? '#f3f4f6' : selectedMonth === i ? '#f0fdfa' : '#fff',
                      color: isFuture ? '#d1d5db' : selectedMonth === i ? '#0d9488' : '#374151',
                      fontWeight: selectedMonth === i ? 600 : 400,
                      cursor: isFuture ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    {bulan.substring(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview info */}
          <div style={{
            backgroundColor: '#f0fdfa',
            border: '1px solid #99f6e4',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
            fontSize: '12px',
            color: '#0d9488',
          }}>
            Laporan akan berisi: Ringkasan keuangan, rincian pendapatan & pengeluaran per akun,
            laporan dana terikat (ISAK 35), daftar seluruh transaksi, dan kolom tanda tangan.
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex', gap: '8px',
        }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '10px',
              backgroundColor: '#f3f4f6', border: '1px solid #d1d5db',
              borderRadius: '8px', cursor: 'pointer',
              fontSize: '13px', fontWeight: 500,
            }}
          >
            Batal
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{
              flex: 1, padding: '10px',
              backgroundColor: '#0d9488', color: '#fff',
              border: 'none', borderRadius: '8px',
              cursor: generating ? 'wait' : 'pointer',
              fontSize: '13px', fontWeight: 600,
              opacity: generating ? 0.7 : 1,
            }}
          >
            {generating ? '⏳ Generating...' : '📥 Download PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN EXPORT: LaporanBulananButton
// ============================================================

export function LaporanBulananButton({
  transactions = [],
  coaList = [],
  rkamList = [],
  institution = 'MTs Ishlahul Amanah',
  userRole = 'bendahara',
  userName = '',
}) {
  const [showModal, setShowModal] = useState(false);

  const handleGenerate = async (month, year) => {
    try {
      const filename = await generateLaporanPDF({
        transactions,
        coaList,
        rkamList,
        institution,
        userName,
        selectedMonth: month,
        selectedYear: year,
      });
      alert(`✓ Laporan berhasil di-download:\n${filename}`);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('✗ Gagal generate PDF: ' + err.message);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          backgroundColor: '#0d9488',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 600,
          transition: 'background-color 0.15s',
        }}
        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0f766e'}
        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#0d9488'}
      >
        📊 Laporan Bulanan
      </button>

      <MonthPickerModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onGenerate={handleGenerate}
        institution={institution}
      />
    </>
  );
}

export default LaporanBulananButton;
