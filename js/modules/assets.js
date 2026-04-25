/* assets.js — Asset Management Module */
const AssetsModule = {
  _assets: [], _brands: [], _models: [],
  _filter: { status:'', brand:'', q:'' },
  _view: 'list', // 'list' | 'detail'
  _selectedId: null,

  async render() {
    const hash = location.hash;
    const match = hash.match(/#\/assets\/(\d+)/);
    if (match) { this._selectedId = parseInt(match[1]); await this.renderDetail(); return; }
    await this.renderList();
  },

  async renderList() {
    const el = document.getElementById('page-content');
    [this._assets, this._brands, this._models] = await Promise.all([
      DB.Assets.all(), DB.Brands.all(), DB.Models.all()
    ]);

    const brandMap  = Object.fromEntries(this._brands.map(b => [b.id, b]));
    const modelMap  = Object.fromEntries(this._models.map(m => [m.id, m]));
    const AS = App.ASSET_STATUS;
    const fmt = App.fmt;

    const filtered = this._assets.filter(a => {
      const m = modelMap[a.modelId] || {};
      const b = brandMap[m.brandId] || {};
      if (this._filter.status && a.status !== this._filter.status) return false;
      if (this._filter.brand  && m.brandId !== parseInt(this._filter.brand)) return false;
      if (this._filter.q) {
        const q = this._filter.q.toLowerCase();
        if (!a.serialNumber?.toLowerCase().includes(q) &&
            !m.modelName?.toLowerCase().includes(q) &&
            !b.name?.toLowerCase().includes(q)) return false;
      }
      return true;
    });

    el.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h2>設備管理 Assets</h2>
          <p>管理所有高空作業設備，追蹤狀態與保固</p>
        </div>
        <div class="page-header-right">
          ${App.can('assets') ? `<button class="btn btn-primary" onclick="AssetsModule.showForm()">＋ 新增設備</button>` : ''}
        </div>
      </div>

      <div class="table-toolbar">
        <div class="table-toolbar-left">
          <div class="search-box">
            <span>🔍</span>
            <input type="text" placeholder="搜尋 SN / 型號 / 品牌…" value="${this._filter.q}"
              oninput="AssetsModule._filter.q=this.value; AssetsModule.renderList()">
          </div>
          <select class="filter-select" onchange="AssetsModule._filter.status=this.value; AssetsModule.renderList()">
            <option value="">所有狀態</option>
            ${Object.entries(AS).map(([k,v])=>`<option value="${k}" ${this._filter.status===k?'selected':''}>${v.label}</option>`).join('')}
          </select>
          <select class="filter-select" onchange="AssetsModule._filter.brand=this.value; AssetsModule.renderList()">
            <option value="">所有品牌</option>
            ${this._brands.map(b=>`<option value="${b.id}" ${this._filter.brand==b.id?'selected':''}>${b.name}</option>`).join('')}
          </select>
        </div>
        <span class="text-muted text-sm">${filtered.length} 台</span>
      </div>

      <div class="table-wrap table-responsive">
        <table class="data-table">
          <thead><tr>
            <th>SN 序號</th><th>型號 Model</th><th>品牌</th>
            <th>狀態</th><th>累積工時</th><th>保固到期</th><th>位置</th><th>操作</th>
          </tr></thead>
          <tbody>
          ${filtered.length === 0 ? `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">🏗</div><p>無符合條件的設備</p></div></td></tr>` :
            filtered.map(a => {
              const m = modelMap[a.modelId] || {};
              const b = brandMap[m.brandId] || {};
              const s = AS[a.status] || { label:a.status, badge:'badge-gray' };
              return `<tr>
                <td><strong class="mono" style="font-size:.82rem">${a.serialNumber}</strong></td>
                <td><strong>${m.modelName||'—'}</strong><div class="text-xs text-muted">${m.category||''}</div></td>
                <td><span style="font-size:1.1rem">${b.logo||''}</span> ${b.name||'—'}</td>
                <td><span class="badge ${s.badge}">${s.label}</span></td>
                <td>${fmt.hours(a.hours)}</td>
                <td>${fmt.relDate(a.warrantyExpiry)}</td>
                <td class="text-sm text-muted truncate" style="max-width:140px">${a.location||'—'}</td>
                <td>
                  <div class="action-row">
                    <button class="btn btn-sm btn-secondary" onclick="AssetsModule.viewDetail(${a.id})">詳情</button>
                    ${App.can('assets') ? `<button class="btn btn-sm btn-secondary" onclick="AssetsModule.showForm(${a.id})">✏</button>` : ''}
                    ${App.can('assets') ? `<button class="btn btn-sm btn-danger" onclick="AssetsModule.remove(${a.id})">🗑</button>` : ''}
                  </div>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  },

  async renderDetail() {
    const el = document.getElementById('page-content');
    const [asset, allAssets, brands, models, wos] = await Promise.all([
      DB.Assets.get(this._selectedId), DB.Assets.all(),
      DB.Brands.all(), DB.Models.all(),
      DB.WorkOrders.byAsset(this._selectedId)
    ]);
    if (!asset) { await this.renderList(); return; }
    const model  = models.find(m => m.id === asset.modelId) || {};
    const brand  = brands.find(b => b.id === model.brandId) || {};
    const fmt    = App.fmt;
    const AS     = App.ASSET_STATUS;
    const s      = AS[asset.status] || { label:asset.status, badge:'badge-gray' };
    const qrData = `AERIALERP:ASSET:${asset.serialNumber}`;

    el.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h2><a href="#/assets" class="text-muted" style="font-weight:400;font-size:1rem" onclick="AssetsModule.renderList()">← 設備管理</a> / ${asset.serialNumber}</h2>
        </div>
        <div class="page-header-right">
          ${App.can('assets') ? `<button class="btn btn-secondary" onclick="AssetsModule.showQR('${qrData}','${asset.serialNumber}')">📱 QR Code</button>` : `<button class="btn btn-secondary" onclick="AssetsModule.showQR('${qrData}','${asset.serialNumber}')">📱 QR Code</button>`}
          ${App.can('assets') ? `<button class="btn btn-secondary" onclick="AssetsModule.showForm(${asset.id})">✏ 編輯</button>` : ''}
          <button class="btn btn-primary" onclick="WorkOrdersModule.showForm(${asset.id})">＋ 開工單</button>
        </div>
      </div>

      <div class="grid-2" style="margin-bottom:20px">
        <div class="card">
          <div class="card-header"><span class="card-title">🏗 設備資訊</span><span class="badge ${s.badge}">${s.label}</span></div>
          <div class="info-grid">
            <div class="info-row"><span class="label">SN 序號</span><span class="value mono">${asset.serialNumber}</span></div>
            <div class="info-row"><span class="label">品牌</span><span class="value">${brand.logo||''} ${brand.name||'—'}</span></div>
            <div class="info-row"><span class="label">型號 Model</span><span class="value">${model.modelName||'—'}</span></div>
            <div class="info-row"><span class="label">類型</span><span class="value">${model.category||'—'}</span></div>
            <div class="info-row"><span class="label">購入日期</span><span class="value">${fmt.date(asset.purchaseDate)}</span></div>
            <div class="info-row"><span class="label">保固到期</span><span class="value">${fmt.relDate(asset.warrantyExpiry)}</span></div>
            <div class="info-row"><span class="label">累積工時</span><span class="value">${fmt.hours(asset.hours)}</span></div>
            <div class="info-row"><span class="label">最大高度</span><span class="value">${model.maxHeight||'—'} m</span></div>
            <div class="info-row"><span class="label">最大承載</span><span class="value">${model.maxCapacity||'—'} kg</span></div>
            <div class="info-row"><span class="label">動力型式</span><span class="value">${model.engineType||'—'}</span></div>
          </div>
          ${asset.location?`<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--c-border)"><span class="label" style="font-size:.72rem;color:var(--c-text3)">📍 位置</span><div style="font-size:.88rem;color:var(--c-text);margin-top:2px">${asset.location}</div></div>`:''}
          ${asset.notes?`<div style="margin-top:8px"><span class="label" style="font-size:.72rem;color:var(--c-text3)">📝 備註</span><div style="font-size:.85rem;color:var(--c-text2);margin-top:2px">${asset.notes}</div></div>`:''}
        </div>

        <div class="card">
          <div class="card-header"><span class="card-title">📋 維修履歷 (${wos.length}筆)</span></div>
          ${wos.length === 0 ? '<div class="empty-state" style="padding:20px"><p>尚無維修紀錄</p></div>' :
          `<div class="timeline">
            ${wos.sort((a,b)=>b.reportDate?.localeCompare(a.reportDate||'')).slice(0,6).map(w => {
              const ws = App.WO_STATUS[w.status]||{};
              const wt = App.WO_TYPE[w.type]||{};
              return `<div class="timeline-item">
                <div class="timeline-date">${App.fmt.date(w.reportDate)} <span class="badge ${ws.badge}" style="font-size:.65rem">${ws.label}</span></div>
                <div class="timeline-title">${wt.icon||'🔧'} ${wt.label}</div>
                <div class="timeline-desc">${w.description?.slice(0,60)||'—'} ${w.totalCost?'· '+App.fmt.twd(w.totalCost):''}</div>
              </div>`;
            }).join('')}
          </div>`}
        </div>
      </div>`;
  },

  viewDetail(id) {
    this._selectedId = id;
    location.hash = `#/assets/${id}`;
  },

  showQR(data, label) {
    App.openModal(`QR Code — ${label}`, `
      <div style="text-align:center">
        <div class="qr-wrap" id="asset-qr-wrap"></div>
        <p style="margin-top:16px;font-size:.8rem;color:var(--c-text3)">掃描此 QR Code 可快速查詢設備資訊</p>
        <div style="margin-top:8px;font-family:monospace;font-size:.75rem;color:var(--c-text3);word-break:break-all">${data}</div>
        <div style="margin-top:16px"><button class="btn btn-primary" onclick="window.print()">🖨 列印</button></div>
      </div>`, 'modal-sm');
    setTimeout(() => Scanner.generateQR('asset-qr-wrap', data), 100);
  },

  async showForm(id) {
    const [brands, models] = await Promise.all([DB.Brands.all(), DB.Models.all()]);
    const asset = id ? await DB.Assets.get(id) : null;
    const AS = App.ASSET_STATUS;
    App.openModal(id ? '編輯設備' : '新增設備', `
      <form id="asset-form" onsubmit="AssetsModule.saveForm(event)">
        <input type="hidden" id="af-id" value="${asset?.id||''}">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">品牌 <span>*</span></label>
            <select class="form-control" id="af-brand" onchange="AssetsModule.filterModels(this.value)" required>
              <option value="">選擇品牌…</option>
              ${brands.map(b=>`<option value="${b.id}" ${asset && models.find(m=>m.id===asset.modelId)?.brandId===b.id?'selected':''}>${b.logo} ${b.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">型號 Model <span>*</span></label>
            <select class="form-control" id="af-model" required>
              <option value="">選擇型號…</option>
              ${models.map(m=>`<option value="${m.id}" ${asset?.modelId===m.id?'selected':''}>${m.modelName}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">SN 序號 <span>*</span></label>
          <input class="form-control" id="af-sn" value="${asset?.serialNumber||''}" placeholder="例：JLG1930-001" required>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">狀態</label>
            <select class="form-control" id="af-status">
              ${Object.entries(AS).map(([k,v])=>`<option value="${k}" ${asset?.status===k?'selected':''}>${v.label}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">累積工時 (hrs)</label>
            <input class="form-control" type="number" id="af-hours" value="${asset?.hours||0}" min="0">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">購入日期</label>
            <input class="form-control" type="date" id="af-purchase" value="${asset?.purchaseDate||''}">
          </div>
          <div class="form-group">
            <label class="form-label">保固到期</label>
            <input class="form-control" type="date" id="af-warranty" value="${asset?.warrantyExpiry||''}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">位置</label>
          <input class="form-control" id="af-location" value="${asset?.location||''}" placeholder="例：台北倉庫 A-03">
        </div>
        <div class="form-group">
          <label class="form-label">備註</label>
          <textarea class="form-control" id="af-notes">${asset?.notes||''}</textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="App.closeModal()">取消</button>
          <button type="submit" class="btn btn-primary">💾 儲存</button>
        </div>
      </form>`);
  },

  filterModels(brandId) {
    // Dynamic model filter not needed as all models are shown; could add if needed
  },

  async saveForm(e) {
    e.preventDefault();
    const id = document.getElementById('af-id').value;
    const obj = {
      modelId:       parseInt(document.getElementById('af-model').value),
      serialNumber:  document.getElementById('af-sn').value.trim(),
      status:        document.getElementById('af-status').value,
      hours:         parseFloat(document.getElementById('af-hours').value)||0,
      purchaseDate:  document.getElementById('af-purchase').value,
      warrantyExpiry:document.getElementById('af-warranty').value,
      location:      document.getElementById('af-location').value.trim(),
      notes:         document.getElementById('af-notes').value.trim(),
    };
    if (id) obj.id = parseInt(id);
    await DB.Assets.save(obj);
    App.closeModal();
    App.toast(id ? '設備已更新 ✓' : '設備已新增 ✓', 'success');
    await this.renderList();
  },

  async remove(id) {
    if (!confirm('確定刪除此設備？此操作無法復原。')) return;
    await DB.Assets.remove(id);
    App.toast('設備已刪除', 'warning');
    await this.renderList();
  }
};
