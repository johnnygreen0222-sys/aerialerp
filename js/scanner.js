/* scanner.js — QR Code & Barcode Scanner wrapper */
const Scanner = (() => {
  let html5QrCode = null;
  let _onResult = null;
  let _active = false;

  const start = (containerId, onResult) => {
    if (_active) return;
    _onResult = onResult;
    html5QrCode = new Html5Qrcode(containerId);
    html5QrCode.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 200, height: 200 }, aspectRatio: 1.4 },
      (decodedText) => {
        if (_onResult) _onResult(decodedText, null);
      },
      (errMsg) => { /* scan not found — ignore */ }
    ).then(() => { _active = true; })
     .catch(err => {
       console.warn('[Scanner] Camera error:', err);
       if (_onResult) _onResult(null, err);
     });
  };

  const stop = async () => {
    if (html5QrCode && _active) {
      try { await html5QrCode.stop(); } catch {}
      html5QrCode = null;
      _active = false;
    }
  };

  const isActive = () => _active;

  // ── QR Code Generation ─────────────────
  const generateQR = (containerId, text, size=180) => {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '';
    if (typeof QRCode !== 'undefined') {
      new QRCode(el, {
        text, width: size, height: size,
        colorDark: '#0A1628', colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
    } else {
      el.innerHTML = `<div style="background:#fff;padding:12px;border-radius:8px;font-family:monospace;font-size:10px;word-break:break-all;max-width:${size}px">${text}</div>`;
    }
  };

  // ── Manual input fallback ──────────────
  const manualInput = (onResult) => {
    const val = prompt('手動輸入條碼 / SN 序號：');
    if (val) onResult(val.trim(), null);
  };

  return { start, stop, isActive, generateQR, manualInput };
})();
