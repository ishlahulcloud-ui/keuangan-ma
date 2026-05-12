/**
 * PrintReceipt.jsx
 * ================
 * Komponen React untuk cetak resi/kwitansi pembayaran
 * Taruh file ini di: src/components/PrintReceipt.jsx
 * 
 * Cara pakai di JurnalUmum:
 *   import { PrintReceiptButton } from './components/PrintReceipt';
 *   
 *   // Di dalam tabel transaksi, kolom aksi:
 *   {tx.type === 'IN' && (
 *     <PrintReceiptButton 
 *       transaction={tx} 
 *       institution="MTs Ishlahul Amanah"  // atau "MA Ishlahul Amanah"
 *       userName={user.name}
 *     />
 *   )}
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================
// PRINT SERVICE - WebSocket connection ke Print Server lokal
// ============================================================
class PrintService {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.callbacks = new Map();
    this.reconnectTimer = null;
    this.url = 'ws://localhost:9100';
  }

  connect() {
    return new Promise((resolve) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          this.isConnected = true;
          resolve(true);
        };

        this.ws.onclose = () => {
          this.isConnected = false;
        };

        this.ws.onerror = () => {
          this.isConnected = false;
          resolve(false);
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.action === 'print_result') {
              const cb = this.callbacks.get('print');
              if (cb) {
                cb(data);
                this.callbacks.delete('print');
              }
            }
            if (data.action === 'pong') {
              const cb = this.callbacks.get('ping');
              if (cb) {
                cb(data);
                this.callbacks.delete('ping');
              }
            }
          } catch (e) {
            console.error('Print service message error:', e);
          }
        };

        // Timeout jika tidak bisa konek dalam 3 detik
        setTimeout(() => {
          if (!this.isConnected) resolve(false);
        }, 3000);
      } catch (e) {
        resolve(false);
      }
    });
  }

  async ping() {
    if (!this.isConnected) {
      const connected = await this.connect();
      if (!connected) return null;
    }
    return new Promise((resolve) => {
      this.callbacks.set('ping', resolve);
      this.ws.send(JSON.stringify({ action: 'ping' }));
      setTimeout(() => {
        this.callbacks.delete('ping');
        resolve(null);
      }, 2000);
    });
  }

  async printReceipt(payload) {
    if (!this.isConnected) {
      const connected = await this.connect();
      if (!connected) throw new Error('Print server tidak terhubung');
    }
    return new Promise((resolve, reject) => {
      this.callbacks.set('print', (result) => {
        if (result.success) resolve(result);
        else reject(new Error(result.error || 'Gagal mencetak'));
      });
      this.ws.send(JSON.stringify({ action: 'print_receipt', payload }));
      setTimeout(() => {
        this.callbacks.delete('print');
        reject(new Error('Timeout - printer tidak merespons'));
      }, 10000);
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }
}

// Singleton instance
const printService = new PrintService();

// ============================================================
// FORMAT HELPERS
// ============================================================
function formatRupiah(amount) {
  return 'Rp ' + Number(amount).toLocaleString('id-ID');
}

function terbilang(angka) {
  const satuan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
  angka = Math.abs(Math.floor(angka));
  if (angka < 12) return satuan[angka];
  if (angka < 20) return satuan[angka - 10] + ' Belas';
  if (angka < 100) return satuan[Math.floor(angka / 10)] + ' Puluh' + (angka % 10 ? ' ' + satuan[angka % 10] : '');
  if (angka < 200) return 'Seratus' + (angka % 100 ? ' ' + terbilang(angka % 100) : '');
  if (angka < 1000) return satuan[Math.floor(angka / 100)] + ' Ratus' + (angka % 100 ? ' ' + terbilang(angka % 100) : '');
  if (angka < 2000) return 'Seribu' + (angka % 1000 ? ' ' + terbilang(angka % 1000) : '');
  if (angka < 1000000) return terbilang(Math.floor(angka / 1000)) + ' Ribu' + (angka % 1000 ? ' ' + terbilang(angka % 1000) : '');
  if (angka < 1000000000) return terbilang(Math.floor(angka / 1000000)) + ' Juta' + (angka % 1000000 ? ' ' + terbilang(angka % 1000000) : '');
  return String(angka);
}

// ============================================================
// RECEIPT PREVIEW MODAL
// ============================================================
function ReceiptPreviewModal({ isOpen, onClose, data, onPrint, printStatus, institution }) {
  if (!isOpen || !data) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        backgroundColor: '#fff', borderRadius: '12px',
        width: '100%', maxWidth: '440px',
        maxHeight: '90vh', overflow: 'auto',
        boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
            Preview Kwitansi
          </h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: '20px',
            cursor: 'pointer', color: '#6b7280', padding: '4px',
          }}>✕</button>
        </div>

        {/* Receipt Preview */}
        <div style={{
          padding: '20px',
          fontFamily: '"Courier New", Courier, monospace',
          fontSize: '12px',
          lineHeight: '1.6',
          backgroundColor: '#fefef6',
          border: '1px dashed #d1d5db',
          margin: '16px',
          borderRadius: '4px',
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', letterSpacing: '2px' }}>
              KWITANSI PEMBAYARAN
            </div>
            <div style={{ fontWeight: 'bold', marginTop: '4px' }}>
              {institution}
            </div>
            <div style={{ fontSize: '11px', color: '#666' }}>
              Yayasan Ishlahul Amanah
            </div>
            <div style={{ fontSize: '11px', color: '#666' }}>
              Pangalengan, Kab. Bandung
            </div>
          </div>

          <div style={{ borderTop: '2px solid #333', margin: '8px 0' }} />

          {/* Detail */}
          <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
            <tbody>
              <Row label="No. Resi" value={data.ref} />
              <Row label="Tanggal" value={data.date} />
            </tbody>
          </table>

          <div style={{ borderTop: '1px dashed #999', margin: '6px 0' }} />

          <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
            <tbody>
              <Row label="Nama" value={data.studentName} />
              {data.class && <Row label="Kelas" value={data.class} />}
              <Row label="Keterangan" value={data.desc} />
              <Row label="Jenis" value={data.coa} />
              {data.quarter && <Row label="Periode" value={data.quarter} />}
              {data.paymentMethod && <Row label="Pembayaran" value={data.paymentMethod} />}
            </tbody>
          </table>

          <div style={{ borderTop: '1px dashed #999', margin: '6px 0' }} />

          {/* Jumlah */}
          <div style={{ fontWeight: 'bold', fontSize: '14px', margin: '8px 0' }}>
            JUMLAH: {formatRupiah(data.amount)}
          </div>
          <div style={{ fontSize: '11px', fontStyle: 'italic', color: '#555' }}>
            Terbilang: {terbilang(data.amount)} Rupiah
          </div>

          <div style={{ borderTop: '2px solid #333', margin: '8px 0' }} />

          {/* Tanda tangan */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', fontSize: '11px' }}>
            <div style={{ textAlign: 'center', width: '45%' }}>
              <div>Penerima,</div>
              <div style={{ height: '50px' }} />
              <div style={{ borderTop: '1px solid #333', paddingTop: '2px' }}>
                ({data.receivedBy || '...........'})
              </div>
            </div>
            <div style={{ textAlign: 'center', width: '45%' }}>
              <div>Pembayar,</div>
              <div style={{ height: '50px' }} />
              <div style={{ borderTop: '1px solid #333', paddingTop: '2px' }}>
                ({data.studentName || '...........'})
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', fontSize: '10px', color: '#888', marginTop: '12px' }}>
            Simpan kwitansi ini sebagai bukti pembayaran
          </div>
        </div>

        {/* Actions */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex', gap: '8px',
        }}>
          {/* Tombol cetak browser (fallback) */}
          <button
            onClick={() => {
              const printWindow = window.open('', '_blank', 'width=420,height=600');
              printWindow.document.write(generatePrintHTML(data, institution));
              printWindow.document.close();
              printWindow.focus();
              printWindow.print();
            }}
            style={{
              flex: 1, padding: '10px',
              backgroundColor: '#f3f4f6', border: '1px solid #d1d5db',
              borderRadius: '8px', cursor: 'pointer',
              fontSize: '13px', fontWeight: 500,
            }}
          >
            🌐 Cetak Browser
          </button>

          {/* Tombol cetak dot matrix */}
          <button
            onClick={onPrint}
            disabled={printStatus === 'printing'}
            style={{
              flex: 1, padding: '10px',
              backgroundColor: printStatus === 'success' ? '#059669' : 
                             printStatus === 'error' ? '#dc2626' : '#0d9488',
              color: '#fff', border: 'none',
              borderRadius: '8px', cursor: printStatus === 'printing' ? 'wait' : 'pointer',
              fontSize: '13px', fontWeight: 600,
              opacity: printStatus === 'printing' ? 0.7 : 1,
            }}
          >
            {printStatus === 'printing' ? '⏳ Mencetak...' :
             printStatus === 'success' ? '✓ Berhasil!' :
             printStatus === 'error' ? '✗ Gagal - Coba Lagi' :
             '🖨 Cetak Dot Matrix'}
          </button>
        </div>

        {/* Status message */}
        {printStatus === 'no_server' && (
          <div style={{
            margin: '0 20px 16px',
            padding: '10px 12px',
            backgroundColor: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#92400e',
          }}>
            ⚠ Print server tidak aktif. Pastikan <code>npm start</code> sudah dijalankan di terminal PC.
            <br />Gunakan "Cetak Browser" sebagai alternatif.
          </div>
        )}
      </div>
    </div>
  );
}

/** Helper: baris label-value di preview */
function Row({ label, value }) {
  return (
    <tr>
      <td style={{ padding: '2px 0', verticalAlign: 'top', whiteSpace: 'nowrap', width: '100px' }}>
        {label}
      </td>
      <td style={{ padding: '2px 4px', verticalAlign: 'top', width: '10px' }}>:</td>
      <td style={{ padding: '2px 0', verticalAlign: 'top', wordBreak: 'break-word' }}>
        {value || '-'}
      </td>
    </tr>
  );
}

/** Generate HTML untuk window.print() fallback */
function generatePrintHTML(data, institution) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Kwitansi ${data.ref}</title>
  <style>
    @page { size: 21cm 14cm; margin: 1cm; }
    body { font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.5; margin: 0; padding: 15px; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .title { font-size: 16px; font-weight: bold; letter-spacing: 3px; }
    .line-double { border-top: 3px double #000; margin: 6px 0; }
    .line-dashed { border-top: 1px dashed #000; margin: 6px 0; }
    .row { display: flex; margin: 2px 0; }
    .row .label { width: 120px; flex-shrink: 0; }
    .row .sep { width: 15px; text-align: center; }
    .row .val { flex: 1; }
    .amount { font-size: 15px; font-weight: bold; margin: 8px 0; }
    .terbilang { font-style: italic; font-size: 11px; color: #444; }
    .signatures { display: flex; justify-content: space-between; margin-top: 20px; }
    .sig-block { text-align: center; width: 40%; }
    .sig-space { height: 55px; }
    .sig-name { border-top: 1px solid #000; padding-top: 3px; }
    .footer { text-align: center; font-size: 10px; color: #666; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="center">
    <div class="title">KWITANSI PEMBAYARAN</div>
    <div class="bold">${institution}</div>
    <div style="font-size:11px;color:#555">Yayasan Ishlahul Amanah<br>Pangalengan, Kab. Bandung</div>
  </div>
  <div class="line-double"></div>
  <div class="row"><span class="label">No. Resi</span><span class="sep">:</span><span class="val">${data.ref || '-'}</span></div>
  <div class="row"><span class="label">Tanggal</span><span class="sep">:</span><span class="val">${data.date || '-'}</span></div>
  <div class="line-dashed"></div>
  <div class="row"><span class="label">Nama</span><span class="sep">:</span><span class="val">${data.studentName || '-'}</span></div>
  ${data.class ? `<div class="row"><span class="label">Kelas</span><span class="sep">:</span><span class="val">${data.class}</span></div>` : ''}
  <div class="row"><span class="label">Keterangan</span><span class="sep">:</span><span class="val">${data.desc || '-'}</span></div>
  <div class="row"><span class="label">Jenis</span><span class="sep">:</span><span class="val">${data.coa || '-'}</span></div>
  ${data.quarter ? `<div class="row"><span class="label">Periode</span><span class="sep">:</span><span class="val">${data.quarter}</span></div>` : ''}
  ${data.paymentMethod ? `<div class="row"><span class="label">Pembayaran</span><span class="sep">:</span><span class="val">${data.paymentMethod}</span></div>` : ''}
  <div class="line-dashed"></div>
  <div class="amount">JUMLAH: ${formatRupiah(data.amount)}</div>
  <div class="terbilang">Terbilang: ${terbilang(data.amount)} Rupiah</div>
  <div class="line-double"></div>
  <div class="signatures">
    <div class="sig-block">
      <div>Penerima,</div>
      <div class="sig-space"></div>
      <div class="sig-name">(${data.receivedBy || '...........'})</div>
    </div>
    <div class="sig-block">
      <div>Pembayar,</div>
      <div class="sig-space"></div>
      <div class="sig-name">(${data.studentName || '...........'})</div>
    </div>
  </div>
  <div class="footer">Simpan kwitansi ini sebagai bukti pembayaran<br>Terima kasih atas kepercayaan Anda</div>
</body>
</html>`;
}

// ============================================================
// MAIN EXPORT: PrintReceiptButton
// ============================================================
export function PrintReceiptButton({ transaction, institution, userName }) {
  const [showPreview, setShowPreview] = useState(false);
  const [printStatus, setPrintStatus] = useState('idle'); // idle | printing | success | error | no_server

  // Hanya tampil untuk transaksi masuk (SPP / Donasi)
  // if (transaction.type !== 'IN') return null;

  const receiptData = {
    institution: institution || 'MTs Ishlahul Amanah',
    ref: transaction.ref || `RCV-${Date.now()}`,
    date: transaction.date || new Date().toLocaleDateString('id-ID', { 
      day: 'numeric', month: 'long', year: 'numeric' 
    }),
    studentName: transaction.studentName || transaction.desc?.split(' - ')[0] || '',
    class: transaction.class || '',
    desc: transaction.desc || '',
    coa: transaction.coaName || transaction.coa || '',
    amount: transaction.amount || 0,
    paymentMethod: transaction.paymentMethod || 'Tunai',
    receivedBy: userName || 'Bendahara',
    quarter: transaction.quarter || '',
  };

  const handlePrintDotMatrix = async () => {
    setPrintStatus('printing');
    try {
      const result = await printService.printReceipt(receiptData);
      setPrintStatus('success');
      setTimeout(() => setPrintStatus('idle'), 3000);
    } catch (err) {
      if (err.message.includes('tidak terhubung')) {
        setPrintStatus('no_server');
      } else {
        setPrintStatus('error');
      }
      setTimeout(() => setPrintStatus('idle'), 5000);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowPreview(true)}
        title="Cetak Kwitansi"
        style={{
          background: 'none',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          padding: '4px 8px',
          cursor: 'pointer',
          fontSize: '14px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          color: '#374151',
          transition: 'all 0.15s',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = '#f0fdfa';
          e.currentTarget.style.borderColor = '#0d9488';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.borderColor = '#d1d5db';
        }}
      >
        🖨️ <span style={{ fontSize: '12px' }}>Resi</span>
      </button>

      <ReceiptPreviewModal
        isOpen={showPreview}
        onClose={() => { setShowPreview(false); setPrintStatus('idle'); }}
        data={receiptData}
        onPrint={handlePrintDotMatrix}
        printStatus={printStatus}
        institution={institution}
      />
    </>
  );
}

export default PrintReceiptButton;
