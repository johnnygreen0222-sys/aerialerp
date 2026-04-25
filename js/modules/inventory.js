/* inventory.js — Parts Inventory Module */
const InventoryModule = {
  _parts:[], _brands:[], _filter:{ brand:'', category:'', q:'' },

  async render() {
    [this._parts, this._brands] = await Promise.all([DB.Parts.all(), DB.Brands.all()]);
    this.renderView();
  },

  renderView() {
    const el = document.getElementById('page-content');
    const fmt = App.fmt;
    const brandMap = Object.fromEntries(this._brands.map(b=>[b.id,b]));
    const cats = [...new Set(this._parts.map(p=>p.category).filter(Boolean))].sort();
    const rate = App.state.exchangeRates.USD || 32.5;

    const filtered = this._parts.filter(p => {
      if (this._filter.brand    && p.brandId !== parseInt(this._filter.brand)) return false;
      if (this._filter.category && p.category !== this._filter.category)       return false;
      if (this._filter.q) {
        const q = this._filter.q.toLowerCase();
        if (!p.name?.toLowerCase().includes(q) && !p.partNumber?.toLowerCase().includes(q)) return false;
      }
      return true;
    });

    const lowStock   = this._parts.filter(p=>(p.onHand||0) <= (p.safetyStock||0) && p.onHand > 0);
    const outOfStock = this._parts.filter(p=>(p.onHand||0) === 0);
    const totalValue = this._parts.reduce((s,p)=>s+(p.onHand||0)*(p.unitCostUSD||0)*rate, 0);

    el.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h2>零件庫存 Parts Inventory</h2>
          <p>多狀態庫存管理 · 安全庫存預警 · 即時成本換算</p>
        </div>
        <div class="page-header-right">
          <button class="btn btn-secondary" onclick="InventoryModule.showReceiveForm()">📥 採購入庫</button>
          <button class="btn btn-primary" onclick="InventoryModule.showPartForm()">＋ 新增零件</button>
        </div>
      </div>

      ${outOfStock.length > 0 ? `<div class="alert-banner danger">⚠️ 有 ${outOfStock.length} 項零件已<strong>缺貨</strong>，請儘速採購！</div>` : ''}
      ${lowStock.length   > 0 ? `<div class="alert-banner warning">⚠️ 有 ${lowStock.length} 項零件<strong>低於安全庫存</strong>，建議採購補貨。</div>` : ''}

      <div class="stats-grid" style="margin-bottom:20px">
        <div class="stat-card emerald">
          <div class="stat-info"><div class="stat-label">在庫種類</div><div class="stat-value">${this._parts.length}</div></div>
          <div class="stat-icon emerald">📦</div>
        </div>
        <div class="stat-card amber">
          <div class="stat-info"><div class="stat-label">低庫存警報</div><div class="stat-value">${lowStock.length + outOfStock.length}</div></div>
          <div class="stat-icon amber">⚠️</div>
        </div>
        <div class="stat-card purple">
          <div class="stat-info"><div class="stat-label">庫存總值</div><div class="stat-value text-number" style="font-size:1.4rem">${fmt.twd(Math.round(totalValue))}</div></div>
          <div class="stat-icon purple">💰</div>
        </div>
        <div class="stat-card cyan">
          <div class="stat-info"><div class="stat-label">在途零件</div><div class="stat-value">${this._parts.reduce((s,p)=>s+(p.inTransit||0),0)}</div></div>
          <div class="stat-icon cyan">🚢</div>
        </div>
      </div>

      <div class="table-toolbar">
        <div class="table-toolbar-left">
          <div class="search-box">
            <span>🔍</span>
            <input type="text" placeholder="搜尋零件名稱 / 料號…" value="${this._filter.q}"
              oninput="InventoryModule._filter.q=this.value; InventoryModule.renderView()">
          </div>
          <select class="filter-select" onchange="InventoryModule._filter.brand=this.value; InventoryModule.renderView()">
            <option value="">所有品牌</option>
            ${this._brands.map(b=>`<option value="${b.id}" ${this._filter.brand==b.id?'selected':''}>${b.name}</option>`).join('')}
          </select>
          <select class="filter-select" onchange="InventoryModule._filter.category=this.value; InventoryModule.renderView()">
            <option value="">所有類別</option>
            ${cats.map(c=>`<option value="${c}" ${this._filter.category===c?'selected':''}>${c}</option>`).join('')}
          </select>
        </div>
        <span class="text-muted text-sm">${filtered.length} / ${this._parts.length} 項</span>
      </div>

      <div class="table-wrap table-responsive">
        <table class="data-table">
          <thead><tr>
            <th>料號 Part No.</th><th>名稱 Name</th><th>品牌</th><th>類別</th>
            <th>在庫</th><th>在途</th><th>已訂</th><th>安全庫存</th>
            <th>單價 USD</th><th>TWD成本</th><th>操作</th>
          </tr></thead>
          <tbody>
          ${filtered.length===0 ? `<tr><td colspan="11"><div class="empty-state"><div class="empty-icon">📦</div><p>無符合條件的零件</p></div></td></tr>` :
            filtered.map(p => {
              const brand = brandMap[p.brandId]||{};
              const isLow = (p.onHand||0) <= (p.safetyStock||0);
              const isOut = (p.onHand||0) === 0;
              const pct   = Math.min(100, p.safetyStock ? Math.round((p.onHand||0)/p.safetyStock*100) : 100);
              const rowCls = isOut ? 'part-row-critical' : isLow ? 'part-row-alert' : '';
              return `<tr class="${rowCls}">
                <td><span class="mono text-sm">${p.partNumber}</span></td>
                <td><strong>${p.name}</strong></td>
                <td>${brand.logo||''} ${brand.name||'—'}</td>
                <td><span class="chip">${p.category||'—'}</span></td>
                <td>
                  <div class="stock-bar ${isOut?'stock-critical':isLow?'stock-low':'stock-ok'}">
                    <div style="font-weight:600;color:${isOut?'var(--c-red)':isLow?'var(--c-amber)':'var(--c-text)'}">${p.onHand||0} ${p.unit}</div>
                    <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
                  </div>
                </td>
                <td><span class="${(p.inTransit||0)>0?'text-cyan':''}">${p.inTransit||0}</span></td>
                <td>${p.reserved||0}</td>
                <td><span class="${isLow?'text-amber':''}">${p.safetyStock||0}</span></td>
                <td>${fmt.usd(p.unitCostUSD)}</td>
                <td>${fmt.twd(Math.round((p.unitCostUSD||0)*rate))}</td>
                <td>
                  <div class="action-row">
                    <button class="btn btn-sm btn-success" onclick="InventoryModule.adjustStock(${p.id},1,'onHand')" title="入庫">＋</button>
                    <button class="btn btn-sm btn-amber"   onclick="InventoryModule.adjustStock(${p.id},-1,'onHand')" title="出庫">－</button>
                    <button class="btn btn-sm btn-secondary" onclick="InventoryModule.showPartForm(${p.id})">✏</button>
                    <button class="btn btn-sm btn-danger" onclick="InventoryModule.remove(${p.id})">🗑</button>
                  </div>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  },

  async adjustStock(id, delta, field) {
    await DB.Parts.adjustStock(id, delta, field);
    App.toast(`庫存已${delta>0?'增加':'減少'} 1 ${field==='onHand'?'(在庫)':''}`, delta>0?'success':'warning');
    await DB.Transactions.log({ type: delta>0?'receive':'issue', partId:id, quantity:Math.abs(delta), date:new Date().toISOString().slice(0,10), notes:'手動調整' });
    await this.render();
    App.refreshBadges();
  },

  showReceiveForm() {
    App.openModal('📥 採購入庫 Scan-to-Receive', `
      <div style="margin-bottom:16px">
        <div class="alert-banner info">掃描原廠條碼 / 手動輸入料號以快速入庫</div>
        <button class="btn btn-secondary" style="margin-bottom:16px" onclick="Scanner.manualInput(v=>document.getElementById('rf-partno').value=v)">📷 掃描條碼</button>
      </div>
      <form id="receive-form" onsubmit="InventoryModule.saveReceive(event)">
        <div class="form-group">
          <label class="form-label">料號 Part No. <span>*</span></label>
          <input class="form-control" id="rf-partno" placeholder="掃描或手動輸入料號…" required>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">數量 <span>*</span></label>
            <input class="form-control" type="number" id="rf-qty" min="1" value="1" required>
          </div>
          <div class="form-group">
            <label class="form-label">單價 USD</label>
            <input class="form-control" type="number" id="rf-cost" step="0.01" min="0" placeholder="0.00">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">USD/TWD 匯率</label>
            <input class="form-control" type="number" id="rf-rate" step="0.01" value="${(App.state.exchangeRates.USD||32.5).toFixed(2)}">
          </div>
          <div class="form-group">
            <label class="form-label">入庫成本 TWD (自動)</label>
            <input class="form-control" id="rf-twd" readonly placeholder="自動換算…">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">供應商</label>
          <input class="form-control" id="rf-supplier" placeholder="例：JLG Industries">
        </div>
        <div class="form-group">
          <label class="form-label">備註</label>
          <input class="form-control" id="rf-notes" placeholder="例：原廠採購 PO#123">
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="App.closeModal()">取消</button>
          <button type="submit" class="btn btn-primary">📥 確認入庫</button>
        </div>
      </form>
      <script>
        const rfCost = document.getElementById('rf-cost');
        const rfRate = document.getElementById('rf-rate');
        const rfTwd  = document.getElementById('rf-twd');
        const calcTwd = () => {
          const c = parseFloat(rfCost.value)||0, r = parseFloat(rfRate.value)||32.5;
          const qty = parseInt(document.getElementById('rf-qty').value)||1;
          rfTwd.value = c && r ? 'NT$ ' + Math.round(c*r*qty).toLocaleString() : '';
        };
        rfCost.addEventListener('input', calcTwd);
        rfRate.addEventListener('input', calcTwd);
        document.getElementById('rf-qty').addEventListener('input', calcTwd);
      <\/script>`);
  },

  async saveReceive(e) {
    e.preventDefault();
    const partNo = document.getElementById('rf-partno').value.trim();
    const qty    = parseInt(document.getElementById('rf-qty').value)||1;
    const cost   = parseFloat(document.getElementById('rf-cost').value)||0;
    const rate   = parseFloat(document.getElementById('rf-rate').value)||(App.state.exchangeRates.USD||32.5);
    const supp   = document.getElementById('rf-supplier').value.trim();
    const notes  = document.getElementById('rf-notes').value.trim();

    // Find part by partNumber
    const matches = await DB.Parts.byPartNumber(partNo);
    if (matches.length === 0) {
      App.toast('找不到此料號，請先新增零件主檔', 'error'); return;
    }
    const part = matches[0];
    await DB.Parts.adjustStock(part.id, qty, 'onHand');
    await DB.Transactions.log({ type:'purchase', partId:part.id, quantity:qty, costTWD:Math.round(cost*rate*qty), date:new Date().toISOString().slice(0,10), notes, supplier:supp });
    App.closeModal();
    App.toast(`✅ ${part.name} 入庫 ${qty} ${part.unit} 完成`, 'success');
    await this.render();
    App.refreshBadges();
  },

  async showPartForm(id) {
    const [brands] = await Promise.all([DB.Brands.all()]);
    const part = id ? await DB.Parts.get(id) : null;
    const cats = ['Filter','Tire','Battery','Electrical','Structural','Hydraulic','Safety','Mechanical','Other'];
    App.openModal(id?'編輯零件':'新增零件主檔', `
      <form id="part-form" onsubmit="InventoryModule.savePart(event)">
        <input type="hidden" id="pf-id" value="${part?.id||''}">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">品牌 <span>*</span></label>
            <select class="form-control" id="pf-brand" required>
              <option value="">選擇品牌…</option>
              ${brands.map(b=>`<option value="${b.id}" ${part?.brandId===b.id?'selected':''}>${b.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">類別</label>
            <select class="form-control" id="pf-cat">
              ${cats.map(c=>`<option value="${c}" ${part?.category===c?'selected':''}>${c}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">料號 Part No. <span>*</span></label>
          <input class="form-control" id="pf-pn" value="${part?.partNumber||''}" required>
        </div>
        <div class="form-group">
          <label class="form-label">名稱 <span>*</span></label>
          <input class="form-control" id="pf-name" value="${part?.name||''}" required>
        </div>
        <div class="form-row cols-3">
          <div class="form-group">
            <label class="form-label">單位</label>
            <input class="form-control" id="pf-unit" value="${part?.unit||'個'}" placeholder="個/組/條">
          </div>
          <div class="form-group">
            <label class="form-label">單價 USD</label>
            <input class="form-control" type="number" id="pf-cost" step="0.01" value="${part?.unitCostUSD||''}">
          </div>
          <div class="form-group">
            <label class="form-label">安全庫存量</label>
            <input class="form-control" type="number" id="pf-safety" value="${part?.safetyStock||0}" min="0">
          </div>
        </div>
        <div class="form-row cols-3">
          <div class="form-group">
            <label class="form-label">在庫 On-hand</label>
            <input class="form-control" type="number" id="pf-onhand" value="${part?.onHand||0}" min="0">
          </div>
          <div class="form-group">
            <label class="form-label">在途 In-transit</label>
            <input class="form-control" type="number" id="pf-transit" value="${part?.inTransit||0}" min="0">
          </div>
          <div class="form-group">
            <label class="form-label">已訂 Reserved</label>
            <input class="form-control" type="number" id="pf-reserved" value="${part?.reserved||0}" min="0">
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="App.closeModal()">取消</button>
          <button type="submit" class="btn btn-primary">💾 儲存</button>
        </div>
      </form>`);
  },

  async savePart(e) {
    e.preventDefault();
    const id = document.getElementById('pf-id').value;
    const obj = {
      brandId:    parseInt(document.getElementById('pf-brand').value),
      category:   document.getElementById('pf-cat').value,
      partNumber: document.getElementById('pf-pn').value.trim(),
      name:       document.getElementById('pf-name').value.trim(),
      unit:       document.getElementById('pf-unit').value.trim()||'個',
      unitCostUSD:parseFloat(document.getElementById('pf-cost').value)||0,
      safetyStock:parseInt(document.getElementById('pf-safety').value)||0,
      onHand:     parseInt(document.getElementById('pf-onhand').value)||0,
      inTransit:  parseInt(document.getElementById('pf-transit').value)||0,
      reserved:   parseInt(document.getElementById('pf-reserved').value)||0,
      lastUpdated:new Date().toISOString()
    };
    if (id) obj.id = parseInt(id);
    await DB.Parts.save(obj);
    App.closeModal();
    App.toast(id?'零件已更新 ✓':'零件已新增 ✓','success');
    await this.render();
    App.refreshBadges();
  },

  async remove(id) {
    if (!confirm('確定刪除此零件主檔？')) return;
    await DB.Parts.remove(id);
    App.toast('零件已刪除','warning');
    await this.render();
  }
};
