/* workorders.js — Work Orders Module */
const WorkOrdersModule = {
  _wos:[], _assets:[], _models:[], _brands:[], _parts:[],
  _statusFilter: 'all',

  async render() {
    [this._wos, this._assets, this._models, this._brands, this._parts] = await Promise.all([
      DB.WorkOrders.all(), DB.Assets.all(), DB.Models.all(), DB.Brands.all(), DB.Parts.all()
    ]);
    this.renderList();
  },

  renderList() {
    const el = document.getElementById('page-content');
    const fmt = App.fmt;
    const WS  = App.WO_STATUS, WT = App.WO_TYPE, WP = App.WO_PRIORITY;
    const assetMap = Object.fromEntries(this._assets.map(a=>[a.id,a]));
    const modelMap = Object.fromEntries(this._models.map(m=>[m.id,m]));

    const filtered = this._statusFilter === 'all'
      ? this._wos
      : this._wos.filter(w => w.status === this._statusFilter);
    filtered.sort((a,b) => (b.reportDate||'').localeCompare(a.reportDate||''));

    const counts = {};
    ['open','in_progress','completed','pending_invoice','cancelled'].forEach(s => {
      counts[s] = this._wos.filter(w => w.status===s).length;
    });

    el.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h2>維修工單 Work Orders</h2>
          <p>追蹤維修進度、領用零件、產生報價</p>
        </div>
        <div class="page-header-right">
          <button class="btn btn-primary" onclick="WorkOrdersModule.showForm()">＋ 開立工單</button>
        </div>
      </div>

      <div class="wo-pipeline">
        ${[['all','全部',this._wos.length],['open','待派工',counts.open],
           ['in_progress','進行中',counts.in_progress],['completed','已完成',counts.completed],
           ['pending_invoice','待開發票',counts.pending_invoice]].map(([s,l,c])=>`
          <div class="wo-status-step ${this._statusFilter===s?'active':''}"
               onclick="WorkOrdersModule._statusFilter='${s}'; WorkOrdersModule.renderList()">
            ${l} <span class="count">${c}</span>
          </div>`).join('')}
      </div>

      <div class="table-wrap table-responsive">
        <table class="data-table">
          <thead><tr>
            <th>#</th><th>設備 SN</th><th>類型</th><th>描述</th>
            <th>狀態</th><th>優先度</th><th>負責技師</th><th>到期日</th><th>費用</th><th>操作</th>
          </tr></thead>
          <tbody>
          ${filtered.length===0 ? `<tr><td colspan="10"><div class="empty-state"><div class="empty-icon">📋</div><p>無符合條件的工單</p></div></td></tr>` :
            filtered.map((w,i) => {
              const asset = assetMap[w.assetId]||{};
              const model = modelMap[asset.modelId]||{};
              const ws = WS[w.status]||{ label:w.status, badge:'badge-gray' };
              const wt = WT[w.type]||{ label:w.type, icon:'🔧' };
              const wp = WP[w.priority]||{ label:'', badge:'badge-gray' };
              return `<tr>
                <td class="mono text-sm text-muted">#${w.id||i+1}</td>
                <td>
                  <div style="font-weight:600;font-size:.85rem">${asset.serialNumber||'—'}</div>
                  <div class="text-xs text-muted">${model.modelName||'—'}</div>
                </td>
                <td>${wt.icon} <span class="text-sm">${wt.label}</span></td>
                <td>
                  <div class="truncate" style="max-width:200px;font-size:.85rem">${w.description?.slice(0,50)||'—'}</div>
                </td>
                <td><span class="badge ${ws.badge}">${ws.label}</span></td>
                <td><span class="badge ${wp.badge}">${wp.label}</span></td>
                <td class="text-sm">${w.technicianName||'<span class="text-muted">未指派</span>'}</td>
                <td class="text-sm">${fmt.date(w.dueDate)}</td>
                <td class="text-number text-sm">${fmt.twd(w.totalCost)}</td>
                <td>
                  <div class="action-row">
                    <button class="btn btn-sm btn-secondary" onclick="WorkOrdersModule.viewDetail(${w.id})">詳情</button>
                    <button class="btn btn-sm btn-danger" onclick="WorkOrdersModule.remove(${w.id})">🗑</button>
                  </div>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  },

  async viewDetail(id) {
    const w = await DB.WorkOrders.get(id);
    if (!w) return;
    const fmt = App.fmt;
    const WS = App.WO_STATUS, WT = App.WO_TYPE, WP = App.WO_PRIORITY;
    const asset = this._assets.find(a=>a.id===w.assetId)||{};
    const model = this._models.find(m=>m.id===asset.modelId)||{};
    const ws = WS[w.status]||{label:w.status,badge:'badge-gray'};
    const wt = WT[w.type]||{label:w.type,icon:'🔧'};
    const wp = WP[w.priority]||{};

    const partsDetail = (w.partsUsed||[]).map(pu => {
      const p = this._parts.find(x=>x.id===pu.partId)||{};
      return `<tr>
        <td class="mono text-sm">${p.partNumber||'—'}</td>
        <td>${p.name||'未知零件'}</td>
        <td>${pu.qty} ${p.unit||'個'}</td>
        <td>${fmt.twd(pu.cost)}</td>
      </tr>`;
    }).join('');

    const laborCost = (w.laborHours||0)*(w.laborRate||1200);

    App.openModal(`工單詳情 #${w.id}`, `
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
        <span class="badge ${ws.badge}">${ws.label}</span>
        <span class="badge ${wp.badge}">${wp.label}</span>
        <span class="chip">${wt.icon} ${wt.label}</span>
      </div>

      <div class="info-grid" style="margin-bottom:16px">
        ${w.sourceCaseNo ? `<div class="info-row"><span class="label">來源申請</span><span class="value"><span class="badge badge-cyan" style="cursor:pointer" onclick="App.closeModal();location.hash='#/service_requests'">📝 ${w.sourceCaseNo}</span></span></div>` : ''}
        ${w.customerName ? `<div class="info-row"><span class="label">客戶</span><span class="value">${w.customerName}</span></div>` : ''}
        ${w.customerPhone ? `<div class="info-row"><span class="label">客戶電話</span><span class="value mono">${w.customerPhone}</span></div>` : ''}
        <div class="info-row"><span class="label">設備 SN</span><span class="value mono">${asset.serialNumber||'—'}</span></div>
        <div class="info-row"><span class="label">型號</span><span class="value">${model.modelName||'—'}</span></div>
        <div class="info-row"><span class="label">開單日期</span><span class="value">${fmt.date(w.reportDate)}</span></div>
        <div class="info-row"><span class="label">到期日</span><span class="value">${fmt.date(w.dueDate)}</span></div>
        ${w.completedDate?`<div class="info-row"><span class="label">完工日</span><span class="value text-emerald">${fmt.date(w.completedDate)}</span></div>`:''}
        <div class="info-row"><span class="label">負責技師</span><span class="value">${w.technicianName||'未指派'}</span></div>
        ${w.vendorName  ? `<div class="info-row"><span class="label">委外廠商</span><span class="value">${w.vendorName}</span></div>` : ''}
        ${w.vendorPhone ? `<div class="info-row"><span class="label">廠商電話</span><span class="value mono">${w.vendorPhone}</span></div>` : ''}
        ${w.rmaNo       ? `<div class="info-row"><span class="label">RMA 單號</span><span class="value mono">${w.rmaNo}</span></div>` : ''}
        ${w.returnDate  ? `<div class="info-row"><span class="label">預計回件</span><span class="value">${fmt.date(w.returnDate)}</span></div>` : ''}
        ${w.vendorCost  ? `<div class="info-row"><span class="label">廠商報價</span><span class="value text-number">${fmt.twd(w.vendorCost)}</span></div>` : ''}
      </div>

      <div style="margin-bottom:16px">
        <div class="form-label">問題描述</div>
        <div style="background:var(--c-surface);padding:10px 12px;border-radius:var(--r-md);font-size:.88rem;color:var(--c-text2)">${w.description||'—'}</div>
      </div>

      ${w.notes?`<div style="margin-bottom:16px"><div class="form-label">作業備註</div><div style="background:var(--c-surface);padding:10px 12px;border-radius:var(--r-md);font-size:.85rem;color:var(--c-text2)">${w.notes}</div></div>`:''}

      <div class="divider"></div>
      <div class="form-label" style="margin-bottom:8px">🔩 使用零件</div>
      ${partsDetail ? `<div class="table-wrap" style="margin-bottom:16px"><table class="data-table">
        <thead><tr><th>料號</th><th>名稱</th><th>數量</th><th>費用</th></tr></thead>
        <tbody>${partsDetail}</tbody>
      </table></div>` : '<p class="text-sm text-muted" style="margin-bottom:16px">無使用零件記錄</p>'}

      <div style="background:var(--c-surface);border-radius:var(--r-md);padding:14px;display:flex;flex-direction:column;gap:8px">
        <div style="display:flex;justify-content:space-between;font-size:.85rem"><span class="text-muted">工時費用 (${w.laborHours||0}hrs × ${fmt.twd(w.laborRate||1200)})</span><span>${fmt.twd(laborCost)}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:.85rem"><span class="text-muted">零件費用</span><span>${fmt.twd((w.partsUsed||[]).reduce((s,p)=>s+(p.cost||0),0))}</span></div>
        <div class="divider"></div>
        <div style="display:flex;justify-content:space-between;font-weight:700"><span>總計 Total</span><span class="text-number">${fmt.twd(w.totalCost)}</span></div>
      </div>

      <div class="form-actions">
        ${w.status!=='completed'&&w.status!=='cancelled'?`
          <button class="btn btn-success" onclick="WorkOrdersModule.completeWO(${w.id})">✓ 標記完成</button>
        `:''}
        <button class="btn btn-secondary" onclick="WorkOrdersModule.showForm(${w.id}, true)">✏ 編輯</button>
        <button class="btn btn-primary" onclick="WorkOrdersModule.printQuote(${w.id})">🖨 列印報價</button>
      </div>`, 'modal-lg');
  },

  async completeWO(id) {
    const w = await DB.WorkOrders.get(id);
    w.status = 'completed';
    w.completedDate = new Date().toISOString().slice(0,10);
    await DB.WorkOrders.save(w);
    App.closeModal();
    App.toast('工單已標記完成 ✓','success');
    await this.render();
    App.refreshBadges();
  },

  async printQuote(id) {
    const w = await DB.WorkOrders.get(id);
    App.toast('報價單列印功能開發中 — 請截圖詳情頁面','info');
  },

  async showForm(assetId, editMode) {
    const [assets, parts, models] = await Promise.all([DB.Assets.all(), DB.Parts.all(), DB.Models.all()]);
    const WO_TYPES = [['preventive','定期保養'],['corrective','故障維修'],['inspection','安全檢查']];
    const WO_PRIS  = [['high','緊急'],['medium','一般'],['low','低']];
    const today    = new Date().toISOString().slice(0,10);

    App.openModal('開立維修工單', `
      <form id="wo-form" onsubmit="WorkOrdersModule.saveForm(event)">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">設備 <span>*</span></label>
            <select class="form-control" id="wof-asset" required>
              <option value="">選擇設備…</option>
              ${assets.map(a => {
                const m = models.find(x=>x.id===a.modelId)||{};
                return `<option value="${a.id}" ${a.id===assetId?'selected':''}>${a.serialNumber} — ${m.modelName||''}</option>`;
              }).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">工單類型</label>
            <select class="form-control" id="wof-type" onchange="WorkOrdersModule.onTypeChange()">
              <option value="preventive">🔧 定期保養</option>
              <option value="corrective">🚨 故障維修</option>
              <option value="inspection">🔍 安全檢查</option>
              <option value="outsourced">👨‍🔧 委外維修師傅</option>
              <option value="factory_return">🏭 送回原廠處理</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">優先度</label>
            <select class="form-control" id="wof-priority">
              <option value="high">🔴 緊急</option>
              <option value="medium" selected>🟡 一般</option>
              <option value="low">⚪ 低</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">負責技師</label>
            <input class="form-control" id="wof-tech" placeholder="技師姓名">
          </div>
        </div>

        <!-- 委外/原廠 額外欄位 -->
        <div id="wof-outsource-fields" style="display:none">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">委外廠商 / 原廠聯絡人</label>
              <input class="form-control" id="wof-vendor" placeholder="例：Sound House 維修部 / Dynaudio Taiwan">
            </div>
            <div class="form-group">
              <label class="form-label">廠商聯絡電話</label>
              <input class="form-control" id="wof-vendor-phone" placeholder="02-XXXX-XXXX">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">預估費用 NT$</label>
              <input class="form-control" type="number" id="wof-vendor-cost" placeholder="0" min="0">
            </div>
            <div class="form-group">
              <label class="form-label">預計回件日期</label>
              <input class="form-control" type="date" id="wof-return-date">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">RMA / 送修單號（選填）</label>
            <input class="form-control" id="wof-rma" placeholder="原廠或委外廠商給的送修單號">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">到期日</label>
            <input class="form-control" type="date" id="wof-due" value="${today}">
          </div>
          <div class="form-group" id="wof-hours-wrap">
            <label class="form-label">工時 (hrs)</label>
            <input class="form-control" type="number" id="wof-hours" value="1" min="0" step="0.5">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">問題描述 <span>*</span></label>
          <textarea class="form-control" id="wof-desc" rows="3" required placeholder="詳述設備問題或保養項目…"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">作業備註</label>
          <textarea class="form-control" id="wof-notes" rows="2"></textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="App.closeModal()">取消</button>
          <button type="submit" class="btn btn-primary">📋 開立工單</button>
        </div>
      </form>`);
  },

  onTypeChange() {
    const type = document.getElementById('wof-type').value;
    const showExtra = ['outsourced','factory_return'].includes(type);
    document.getElementById('wof-outsource-fields').style.display = showExtra ? '' : 'none';
    // 委外/原廠時工時設為0（費用由廠商報價）
    if (showExtra) {
      document.getElementById('wof-hours').value = '0';
    }
  },

  async saveForm(e) {
    e.preventDefault();
    const type       = document.getElementById('wof-type').value;
    const laborHours = parseFloat(document.getElementById('wof-hours').value)||0;
    const isOutsource= ['outsourced','factory_return'].includes(type);
    const obj = {
      assetId:        parseInt(document.getElementById('wof-asset').value),
      type,
      priority:       document.getElementById('wof-priority').value,
      technicianName: document.getElementById('wof-tech').value.trim(),
      dueDate:        document.getElementById('wof-due').value,
      laborHours,
      laborRate:      1200,
      description:    document.getElementById('wof-desc').value.trim(),
      notes:          document.getElementById('wof-notes').value.trim(),
      status:         'open',
      reportDate:     new Date().toISOString().slice(0,10),
      partsUsed:      [],
      totalCost:      laborHours * 1200,
      photos:         [],
      // 委外/原廠欄位
      ...(isOutsource ? {
        vendorName:   document.getElementById('wof-vendor')?.value.trim(),
        vendorPhone:  document.getElementById('wof-vendor-phone')?.value.trim(),
        vendorCost:   parseInt(document.getElementById('wof-vendor-cost')?.value)||0,
        returnDate:   document.getElementById('wof-return-date')?.value,
        rmaNo:        document.getElementById('wof-rma')?.value.trim(),
      } : {}),
    };
    if (isOutsource) obj.totalCost = obj.vendorCost || 0;
    await DB.WorkOrders.save(obj);
    App.closeModal();
    App.toast('工單已開立 ✓','success');
    await this.render();
    App.refreshBadges();
  },

  async remove(id) {
    if (!confirm('確定刪除此工單？')) return;
    await DB.WorkOrders.remove(id);
    App.toast('工單已刪除','warning');
    await this.render();
    App.refreshBadges();
  }
};
