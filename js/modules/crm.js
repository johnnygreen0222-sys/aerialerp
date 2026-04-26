/* crm.js — Customer CRM Module */
const CRMModule = {
  _search: '',
  async render() {
    const customers = await DB.Customers.all();
    const fmt = App.fmt;
    const filtered = this._search
      ? customers.filter(c => [c.name,c.phone,c.company,c.email].join(' ').toLowerCase().includes(this._search.toLowerCase()))
      : customers;

    const el = document.getElementById('page-content');
    el.innerHTML = `
      <div class="page-header">
        <div class="page-header-left"><h2>客戶管理 CRM</h2><p>客戶資料庫、聯絡人、設備歸屬管理</p></div>
        <div class="page-header-right">
          ${App.can('customers','create') ? `<button class="btn btn-primary" onclick="CRMModule.showForm()">＋ 新增客戶</button>` : ''}
        </div>
      </div>

      <div class="table-toolbar" style="margin-bottom:16px">
        <div style="display:flex;gap:10px;flex:1;max-width:400px">
          <input class="form-control" id="crm-search" value="${this._search}" placeholder="搜尋客戶名稱、電話、公司…"
            oninput="CRMModule._search=this.value; CRMModule.render()">
        </div>
        <span class="text-sm text-muted">${filtered.length} 筆客戶</span>
      </div>

      ${filtered.length === 0 ? `<div class="empty-state"><div class="empty-icon">👥</div><p>${this._search?'找不到符合的客戶':'尚無客戶資料，點擊「新增客戶」開始建立'}</p></div>` :
      `<div class="grid-auto">
        ${filtered.map(c => `
          <div class="card" style="cursor:pointer" onclick="CRMModule.viewDetail(${c.id})">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
              <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,var(--c-blue),var(--c-cyan));display:flex;align-items:center;justify-content:center;font-size:1.2rem;font-weight:700;color:#fff;flex-shrink:0">
                ${(c.name||'?')[0].toUpperCase()}
              </div>
              <div>
                <div style="font-weight:700">${c.name||'未命名'}</div>
                <div class="text-xs text-muted">${c.company||''}</div>
              </div>
              ${App.can('customers','edit') ? `<div class="action-row" style="margin-left:auto" onclick="event.stopPropagation()">
                <button class="btn btn-sm btn-secondary" onclick="CRMModule.showForm(${c.id})">✏</button>
                <button class="btn btn-sm btn-danger" onclick="CRMModule.remove(${c.id})">🗑</button>
              </div>` : ''}
            </div>
            ${c.phone ? `<div class="info-row text-sm"><span class="text-muted">📞</span><span class="mono">${c.phone}</span></div>` : ''}
            ${c.email ? `<div class="info-row text-sm"><span class="text-muted">✉️</span><span>${c.email}</span></div>` : ''}
            ${c.address ? `<div class="info-row text-sm"><span class="text-muted">📍</span><span>${c.address}</span></div>` : ''}
            <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
              ${c.tags ? c.tags.split(',').map(t=>`<span class="chip" style="font-size:.7rem">${t.trim()}</span>`).join('') : ''}
            </div>
          </div>`).join('')}
      </div>`}`;
  },

  async viewDetail(id) {
    const c = await DB.Customers.get(id);
    if (!c) return;
    const fmt = App.fmt;
    // Get related work orders and service requests
    const wos = (await DB.WorkOrders.all()).filter(w => w.customerId === id);
    const srs = (await DB.ServiceRequests.all()).filter(r => r.email === c.email || r.phone === c.phone);

    App.openModal(`客戶詳情 — ${c.name}`, `
      <div class="info-grid" style="margin-bottom:16px">
        <div class="info-row"><span class="label">姓名</span><span class="value">${c.name||'—'}</span></div>
        <div class="info-row"><span class="label">公司</span><span class="value">${c.company||'—'}</span></div>
        <div class="info-row"><span class="label">電話</span><span class="value mono">${c.phone||'—'}</span></div>
        <div class="info-row"><span class="label">Email</span><span class="value">${c.email||'—'}</span></div>
        <div class="info-row"><span class="label">地址</span><span class="value">${c.address||'—'}</span></div>
        <div class="info-row"><span class="label">備註</span><span class="value">${c.notes||'—'}</span></div>
      </div>
      <div class="divider"></div>
      <div class="form-label" style="margin-bottom:8px">📋 相關申請記錄 (${srs.length})</div>
      ${srs.length ? srs.map(r=>`<div style="display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid var(--c-border);font-size:.85rem">
        <span class="mono">${r.caseNo}</span><span class="text-muted">${r.brand} ${r.model}</span><span class="badge ${App.SR_STATUS[r.status]?.badge||'badge-gray'}">${App.SR_STATUS[r.status]?.label||r.status}</span>
      </div>`).join('') : '<p class="text-sm text-muted">無申請記錄</p>'}
      <div class="form-actions">
        <button class="btn btn-secondary" onclick="App.closeModal()">關閉</button>
        ${App.can('customers','edit') ? `<button class="btn btn-primary" onclick="App.closeModal(); CRMModule.showForm(${c.id})">✏ 編輯</button>` : ''}
      </div>`, 'modal-lg');
  },

  showForm(id) {
    const isNew = !id;
    App.openModal(isNew?'新增客戶':'編輯客戶', `
      <form onsubmit="CRMModule.saveForm(event)">
        <input type="hidden" id="cf-id" value="${id||''}">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">姓名 <span>*</span></label>
            <input class="form-control" id="cf-name" required placeholder="客戶姓名">
          </div>
          <div class="form-group">
            <label class="form-label">公司名稱</label>
            <input class="form-control" id="cf-company" placeholder="公司/機構">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">電話 <span>*</span></label>
            <input class="form-control" id="cf-phone" required placeholder="09xx-xxx-xxx">
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input class="form-control" id="cf-email" type="email" placeholder="email@example.com">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">地址</label>
          <input class="form-control" id="cf-address" placeholder="客戶地址">
        </div>
        <div class="form-group">
          <label class="form-label">標籤（逗號分隔）</label>
          <input class="form-control" id="cf-tags" placeholder="例：VIP,工程公司,租賃">
        </div>
        <div class="form-group">
          <label class="form-label">備註</label>
          <textarea class="form-control" id="cf-notes" rows="2"></textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="App.closeModal()">取消</button>
          <button type="submit" class="btn btn-primary">💾 儲存</button>
        </div>
      </form>`, 'modal-sm');
    if (!isNew) {
      DB.Customers.get(id).then(c => {
        if (!c) return;
        ['name','company','phone','email','address','tags','notes'].forEach(f => {
          const el = document.getElementById('cf-'+f);
          if (el) el.value = c[f]||'';
        });
      });
    }
  },

  async saveForm(e) {
    e.preventDefault();
    const id  = document.getElementById('cf-id').value;
    const obj = {
      name:    document.getElementById('cf-name').value.trim(),
      company: document.getElementById('cf-company').value.trim(),
      phone:   document.getElementById('cf-phone').value.trim(),
      email:   document.getElementById('cf-email').value.trim(),
      address: document.getElementById('cf-address').value.trim(),
      tags:    document.getElementById('cf-tags').value.trim(),
      notes:   document.getElementById('cf-notes').value.trim(),
    };
    if (id) obj.id = parseInt(id);
    await DB.Customers.save(obj);
    App.closeModal(); App.toast('客戶資料已儲存','success');
    await this.render();
  },

  async remove(id) {
    if (!confirm('確定刪除此客戶？')) return;
    await DB.Customers.remove(id); App.toast('已刪除','warning');
    await this.render();
  }
};
