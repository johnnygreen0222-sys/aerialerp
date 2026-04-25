/* scanner-hub.js — Scanner Hub Module */
const ScannerHub = {
  _mode: 'query',
  _scanning: false,
  _scannerEl: 'qr-scanner-region',

  render() {
    const el = document.getElementById('page-content');
    el.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h2>掃描中心 Scanner Hub</h2>
          <p>掃描 QR Code / 條碼 — 入庫、出貨、盤點、查詢一站整合</p>
        </div>
      </div>

      <div class="scanner-modes">
        <button class="scanner-mode-btn ${this._mode==='query'?'active':''}" onclick="ScannerHub.setMode('query')">
          <span class="mode-icon">🔍</span>
          <span class="mode-label">設備查詢</span>
          <span class="mode-sub">掃描查詢設備資訊</span>
        </button>
        <button class="scanner-mode-btn ${this._mode==='receive'?'active':''}" onclick="ScannerHub.setMode('receive')">
          <span class="mode-icon">📥</span>
          <span class="mode-label">採購入庫</span>
          <span class="mode-sub">Scan-to-Receive</span>
        </button>
        <button class="scanner-mode-btn ${this._mode==='ship'?'active':''}" onclick="ScannerHub.setMode('ship')">
          <span class="mode-icon">🚚</span>
          <span class="mode-label">出貨掃描</span>
          <span class="mode-sub">設備出場記錄</span>
        </button>
        <button class="scanner-mode-btn ${this._mode==='count'?'active':''}" onclick="ScannerHub.setMode('count')">
          <span class="mode-icon">📊</span>
          <span class="mode-label">盤點掃描</span>
          <span class="mode-sub">自動盈虧比對</span>
        </button>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header">
            <span class="card-title">📷 相機掃描</span>
            <button class="btn btn-sm ${this._scanning?'btn-danger':'btn-primary'}"
              id="scan-btn" onclick="ScannerHub.toggleScan()">
              ${this._scanning?'⏹ 停止':'▶ 啟動相機'}
            </button>
          </div>
          <div class="scanner-viewport" id="scanner-viewport">
            <div id="${this._scannerEl}"></div>
            ${!this._scanning ? `
              <div style="text-align:center;color:var(--c-text3);padding:40px">
                <div style="font-size:3rem;margin-bottom:12px">📷</div>
                <p>點擊「啟動相機」開始掃描</p>
                <p class="text-sm" style="margin-top:4px">或使用下方手動輸入</p>
              </div>` : ''}
          </div>
          <div style="margin-top:14px;display:flex;gap:8px">
            <input class="form-control" id="manual-scan-input" placeholder="手動輸入 QR Code / SN 序號…" style="flex:1"
              onkeydown="if(event.key==='Enter') ScannerHub.processManual()">
            <button class="btn btn-secondary" onclick="ScannerHub.processManual()">確認</button>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title" id="result-title">掃描結果</span>
            <button class="btn btn-sm btn-secondary" onclick="ScannerHub.clearResult()">清除</button>
          </div>
          <div id="scan-result-area">
            <div class="empty-state" style="padding:40px">
              <div class="empty-icon">📋</div>
              <p>等待掃描…</p>
            </div>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:20px" id="count-panel" ${this._mode!=='count'?'style="display:none"':''}>
        <div class="card-header">
          <span class="card-title">📊 盤點記錄</span>
          <button class="btn btn-sm btn-primary" onclick="ScannerHub.exportCount()">匯出盤點表</button>
        </div>
        <div id="count-list">
          <div class="empty-state" style="padding:24px"><p>尚無盤點記錄</p></div>
        </div>
      </div>`;

    // Recalculate visibility
    document.getElementById('count-panel').style.display = this._mode === 'count' ? '' : 'none';
    this._scanning = false;
  },

  setMode(mode) {
    this.stopScan();
    this._mode = mode;
    this.render();
  },

  async toggleScan() {
    if (this._scanning) { this.stopScan(); return; }
    this._scanning = true;
    document.getElementById('scanner-viewport').innerHTML = `<div id="${this._scannerEl}" style="width:100%"></div>`;
    document.getElementById('scan-btn').textContent = '⏹ 停止';
    Scanner.start(this._scannerEl, (result, err) => {
      if (result) {
        this._scanning = false;
        Scanner.stop();
        document.getElementById('scan-btn').textContent = '▶ 重新掃描';
        this.processCode(result);
      }
      if (err && typeof err === 'string' && err.includes('permission')) {
        this._scanning = false;
        document.getElementById('scanner-viewport').innerHTML = `
          <div style="text-align:center;padding:40px;color:var(--c-red)">
            <div style="font-size:2rem;margin-bottom:12px">🚫</div>
            <p>相機權限被拒絕</p><p class="text-sm">請改用手動輸入</p>
          </div>`;
      }
    });
  },

  stopScan() {
    this._scanning = false;
    Scanner.stop();
    const btn = document.getElementById('scan-btn');
    if (btn) btn.textContent = '▶ 啟動相機';
  },

  processManual() {
    const val = document.getElementById('manual-scan-input')?.value?.trim();
    if (val) { this.processCode(val); document.getElementById('manual-scan-input').value=''; }
  },

  async processCode(code) {
    document.getElementById('result-title').textContent = `掃描結果 — ${this._mode}`;
    const area = document.getElementById('scan-result-area');
    area.innerHTML = `<div class="page-loading"><div class="spinner"></div><p>處理中…</p></div>`;

    // Parse: AERIALERP:ASSET:SN or plain SN
    let sn = code;
    if (code.startsWith('AERIALERP:ASSET:')) sn = code.replace('AERIALERP:ASSET:', '');

    const assets  = await DB.Assets.all();
    const models  = await DB.Models.all();
    const brands  = await DB.Brands.all();
    const parts   = await DB.Parts.all();
    const modelMap = Object.fromEntries(models.map(m=>[m.id,m]));
    const brandMap = Object.fromEntries(brands.map(b=>[b.id,b]));

    // Try asset first
    const asset = assets.find(a => a.serialNumber === sn || a.serialNumber === code);
    if (asset) {
      const model = modelMap[asset.modelId]||{};
      const brand = brandMap[model.brandId]||{};
      const AS    = App.ASSET_STATUS;
      const s     = AS[asset.status]||{};
      const fmt   = App.fmt;

      if (this._mode === 'ship') {
        asset.status = 'in_use';
        await DB.Assets.save(asset);
        App.toast(`🚚 ${asset.serialNumber} 已標記為「施工中」`, 'success');
      }

      area.innerHTML = `<div class="scan-result-card">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
          <span style="font-size:2rem">🏗</span>
          <div>
            <div style="font-weight:700;font-size:1.1rem">${asset.serialNumber}</div>
            <div class="text-sm text-muted">${brand.name||''} ${model.modelName||''}</div>
          </div>
          <span class="badge ${s.badge}" style="margin-left:auto">${s.label||''}</span>
        </div>
        <div class="info-grid">
          <div class="info-row"><span class="label">保固到期</span><span class="value">${fmt.relDate(asset.warrantyExpiry)}</span></div>
          <div class="info-row"><span class="label">累積工時</span><span class="value">${fmt.hours(asset.hours)}</span></div>
          <div class="info-row"><span class="label">位置</span><span class="value">${asset.location||'—'}</span></div>
          <div class="info-row"><span class="label">上次更新</span><span class="value">${fmt.date(asset.updatedAt||asset.createdAt)}</span></div>
        </div>
        ${this._mode==='ship'?'<div class="alert-banner success" style="margin-top:12px">✅ 設備狀態已更新為「施工中」</div>':''}
        <div style="margin-top:14px;display:flex;gap:8px">
          <button class="btn btn-sm btn-primary" onclick="location.hash='#/assets/${asset.id}'">查看詳情</button>
          <button class="btn btn-sm btn-secondary" onclick="WorkOrdersModule.showForm(${asset.id})">開立工單</button>
        </div>
      </div>`;
      return;
    }

    // Try part
    const part = parts.find(p => p.partNumber === sn || p.partNumber === code);
    if (part) {
      const brand = brandMap[part.brandId]||{};
      const fmt   = App.fmt;
      const isLow = (part.onHand||0) <= (part.safetyStock||0);

      if (this._mode === 'receive') {
        await DB.Parts.adjustStock(part.id, 1, 'onHand');
        await DB.Transactions.log({ type:'purchase', partId:part.id, quantity:1, date:new Date().toISOString().slice(0,10), notes:'掃描入庫' });
        App.toast(`📥 ${part.name} 入庫 +1`, 'success');
        const updated = await DB.Parts.get(part.id);
        part.onHand = updated.onHand;
      }

      if (this._mode === 'count') {
        const listEl = document.getElementById('count-list');
        const row = document.createElement('div');
        row.style.cssText = 'padding:8px 0;border-bottom:1px solid var(--c-border);font-size:.85rem;display:flex;gap:12px';
        row.innerHTML = `<span class="mono">${part.partNumber}</span><span style="flex:1">${part.name}</span><span>在庫: <strong>${part.onHand}</strong></span>`;
        if (listEl.querySelector('.empty-state')) listEl.innerHTML = '';
        listEl.appendChild(row);
      }

      area.innerHTML = `<div class="scan-result-card">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
          <span style="font-size:2rem">📦</span>
          <div>
            <div style="font-weight:700">${part.name}</div>
            <div class="text-sm text-muted mono">${part.partNumber}</div>
          </div>
          <span class="badge ${isLow?'badge-amber':'badge-emerald'}" style="margin-left:auto">${isLow?'低庫存':'正常'}</span>
        </div>
        <div class="info-grid">
          <div class="info-row"><span class="label">在庫</span><span class="value">${part.onHand} ${part.unit}</span></div>
          <div class="info-row"><span class="label">安全庫存</span><span class="value">${part.safetyStock}</span></div>
          <div class="info-row"><span class="label">在途</span><span class="value">${part.inTransit||0}</span></div>
          <div class="info-row"><span class="label">單價</span><span class="value">${fmt.usd(part.unitCostUSD)}</span></div>
        </div>
        ${this._mode==='receive'?'<div class="alert-banner success" style="margin-top:12px">✅ 已入庫 +1</div>':''}
      </div>`;
      return;
    }

    // Not found
    area.innerHTML = `<div class="scan-result-card error">
      <div style="font-size:2rem;margin-bottom:8px">❓</div>
      <div style="font-weight:600;margin-bottom:4px">找不到匹配記錄</div>
      <div class="text-sm text-muted">掃描碼: <span class="mono">${code}</span></div>
      <div class="text-sm text-muted" style="margin-top:8px">請確認此設備/零件已建立主檔</div>
    </div>`;
  },

  clearResult() {
    document.getElementById('scan-result-area').innerHTML = `<div class="empty-state" style="padding:40px"><div class="empty-icon">📋</div><p>等待掃描…</p></div>`;
    document.getElementById('result-title').textContent = '掃描結果';
  },

  exportCount() {
    App.toast('盤點表匯出請前往「報表」模組','info');
    location.hash = '#/reports';
  }
};
