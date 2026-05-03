/* service-requests.js — Customer Service Requests Module */
const ServiceRequestsModule = {
  _filter: 'all',
  async render() {
    const all = await DB.ServiceRequests.all();
    const fmt = App.fmt;
    const SR  = App.SR_STATUS;
    const ST  = { repair:'🔧 維修申請', warranty:'🛡 保固登錄', maintenance:'📅 定期保養' };
    const filtered = this._filter === 'all' ? all : all.filter(r => r.status === this._filter);
    filtered.sort((a,b) => (b.submittedAt||'').localeCompare(a.submittedAt||''));
    const counts = { pending_verification:0, pending:0, processing:0, completed:0, cancelled:0 };
    all.forEach(r => { if (counts[r.status]!==undefined) counts[r.status]++; });

    const el = document.getElementById('page-content');
    el.innerHTML = `
      <div class="page-header">
        <div class="page-header-left"><h2>客戶申請 Service Requests</h2><p>客戶線上送修、保固、保養申請管理</p></div>
        <div class="page-header-right">
          <a href="../public/apply.html" target="_blank" class="btn btn-secondary">🔗 申請表單連結</a>
        </div>
      </div>

      <div class="wo-pipeline">
        ${[['all','全部',all.length],['pending_verification','待驗證',counts.pending_verification],['pending','待處理',counts.pending],['processing','處理中',counts.processing],['completed','已完成',counts.completed]].map(([s,l,c])=>`
          <div class="wo-status-step ${this._filter===s?'active':''}" onclick="ServiceRequestsModule._filter='${s}';ServiceRequestsModule.render()">
            ${l} <span class="count">${c}</span>
          </div>`).join('')}
      </div>

      <div class="table-wrap table-responsive">
        <table class="data-table">
          <thead><tr><th>案號</th><th>申請類型</th><th>姓名</th><th>電話</th><th>品牌/型號</th><th>狀態</th><th>申請時間</th><th>操作</th></tr></thead>
          <tbody>
          ${filtered.length===0 ? `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">📋</div><p>無符合條件的申請</p></div></td></tr>` :
            filtered.map(r => {
              const s = SR[r.status]||{ label:r.status, badge:'badge-gray' };
              return `<tr>
                <td class="mono text-sm"><strong>${r.caseNo||'—'}</strong></td>
                <td>${ST[r.serviceType]||r.serviceType||'—'}</td>
                <td>${fmt.escape(r.name)}</td>
                <td class="mono text-sm">${fmt.escape(r.phone)}</td>
                <td><div class="text-sm"><strong>${fmt.escape(r.brand||'')}</strong> ${fmt.escape(r.model||'')}</div><div class="text-xs text-muted mono">${fmt.escape(r.serialNumber||'')}</div></td>
                <td><span class="badge ${s.badge}">${s.label}</span></td>
                <td class="text-sm text-muted">${fmt.datetime(r.submittedAt)}</td>
                <td><div class="action-row">
                  <button class="btn btn-sm btn-secondary" onclick="ServiceRequestsModule.viewDetail(${r.id})">詳情</button>
                  ${App.can('service_requests','delete') ? `<button class="btn btn-sm btn-danger" onclick="ServiceRequestsModule.remove(${r.id})">🗑</button>` : ''}
                </div></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  },

  async viewDetail(id) {
    const r   = await DB.ServiceRequests.get(id);
    if (!r) return;
    const fmt = App.fmt;
    const SR  = App.SR_STATUS;
    const ST  = { repair:'🔧 維修申請', warranty:'🛡 保固登錄', maintenance:'📅 定期保養' };
    const s   = SR[r.status]||{};
    App.openModal(`申請詳情 — ${r.caseNo}`, `
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
        <span class="badge ${s.badge}">${s.label}</span>
        <span class="chip">${ST[r.serviceType]||r.serviceType}</span>
      </div>
      <div class="info-grid" style="margin-bottom:16px">
        <div class="info-row"><span class="label">案號</span><span class="value mono">${fmt.escape(r.caseNo)}</span></div>
        <div class="info-row"><span class="label">申請時間</span><span class="value">${fmt.datetime(r.submittedAt)}</span></div>
        <div class="info-row"><span class="label">姓名</span><span class="value">${fmt.escape(r.name)}</span></div>
        <div class="info-row"><span class="label">電話</span><span class="value mono">${fmt.escape(r.phone)}</span></div>
        <div class="info-row"><span class="label">Email</span><span class="value">${fmt.escape(r.email||'—')}</span></div>
        <div class="info-row"><span class="label">品牌/型號</span><span class="value">${fmt.escape(r.brand)} ${fmt.escape(r.model)}</span></div>
        <div class="info-row"><span class="label">產品序號</span><span class="value mono">${fmt.escape(r.serialNumber)}</span></div>
        ${r.preferredDate ? `<div class="info-row"><span class="label">預約日期</span><span class="value">${fmt.date(r.preferredDate)}</span></div>` : ''}
      </div>
      <div class="form-group" style="margin-bottom:16px">
        <div class="form-label">申請說明</div>
        <div style="background:var(--c-surface);padding:10px 12px;border-radius:var(--r-md);font-size:.88rem;white-space:pre-wrap;">${fmt.escape(r.description||'—')}</div>
      </div>
      ${r.warrantyCard ? `<div class="form-group"><div class="form-label">保固卡</div><img src="${r.warrantyCard}" style="max-height:150px;border-radius:var(--r-md);object-fit:cover"></div>` : ''}
      ${r.invoice ? `<div class="form-group"><div class="form-label">發票</div><img src="${r.invoice}" style="max-height:150px;border-radius:var(--r-md);object-fit:cover"></div>` : ''}
      <div class="form-group">
        <label class="form-label">更新狀態</label>
        <select class="form-control" id="sr-status-sel">
          ${['pending_verification','pending','processing','completed','cancelled'].map(s=>`<option value="${s}" ${r.status===s?'selected':''}>${SR[s]?.label||s}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">處理備註</label>
        <textarea class="form-control" id="sr-notes" rows="2">${fmt.escape(r.notes||'')}</textarea>
      </div>
      <div class="form-actions">
        <button class="btn btn-secondary" onclick="App.closeModal()">關閉</button>
        <button class="btn btn-primary" onclick="ServiceRequestsModule.updateStatus(${r.id})">💾 儲存</button>
        <button class="btn btn-success" onclick="ServiceRequestsModule.convertToWO(${r.id})">→ 轉為工單</button>
      </div>`, 'modal-lg');
  },

  async updateStatus(id) {
    const r = await DB.ServiceRequests.get(id);
    r.status = document.getElementById('sr-status-sel').value;
    r.notes  = document.getElementById('sr-notes').value;
    await DB.ServiceRequests.save(r);
    App.closeModal(); App.toast('申請狀態已更新','success');
    await this.render(); App.refreshBadges();
  },

  async convertToWO(id) {
    const r = await DB.ServiceRequests.get(id);
    if (!r) return;

    // 1. 尋找對應設備（by SN）
    const assets = await DB.Assets.all();
    let asset = assets.find(a => a.serialNumber === r.serialNumber);

    // 2. 若無對應設備，自動建立一筆基本設備記錄
    if (!asset) {
      const models = await DB.Models.all();
      const brands = await DB.Brands.all();
      // 嘗試比對品牌
      const brand = brands.find(b => b.name === r.brand);
      asset = await DB.Assets.save({
        serialNumber: r.serialNumber,
        modelId:      null,
        brandHint:    r.brand,
        status:       'maintenance',
        location:     '待確認',
        notes:        `由客戶申請自動建立 (案號：${r.caseNo})`,
        purchaseDate: null,
        warrantyExpiry: null,
        hours:        0,
      });
    }

    // 3. 判斷工單類型
    const typeMap = { repair:'corrective', warranty:'corrective', maintenance:'preventive' };

    // 4. 建立工單
    const wo = await DB.WorkOrders.save({
      assetId:        asset.id,
      type:           typeMap[r.serviceType] || 'corrective',
      priority:       'medium',
      status:         'open',
      description:    `【客戶申請轉入】${r.description || ''}\n客戶：${r.name}  電話：${r.phone}  案號：${r.caseNo}`,
      technicianName: '',
      reportDate:     new Date().toISOString().slice(0,10),
      dueDate:        r.preferredDate || '',
      laborHours:     0,
      laborRate:      1200,
      partsUsed:      [],
      totalCost:      0,
      photos:         [],
      sourceType:     'service_request',
      sourceSrId:     r.id,
      sourceCaseNo:   r.caseNo,
      customerName:   r.name,
      customerPhone:  r.phone,
      customerEmail:  r.email,
    });

    // 5. 更新申請單狀態為「處理中」並記錄 WO ID
    r.status   = 'processing';
    r.linkedWoId = wo.id;
    await DB.ServiceRequests.save(r);

    App.closeModal();
    App.toast(`✅ 工單已建立！(案號：${r.caseNo} → 工單 #${wo.id})`, 'success');
    App.refreshBadges();

    // 6. 跳轉到工單模組並顯示新工單
    location.hash = '#/workorders';
    setTimeout(() => WorkOrdersModule.viewDetail(wo.id), 300);
  },

  async remove(id) {
    if (!confirm('確定刪除此申請紀錄？')) return;
    await DB.ServiceRequests.remove(id);
    App.toast('已刪除','warning');
    await this.render();
  }
};
