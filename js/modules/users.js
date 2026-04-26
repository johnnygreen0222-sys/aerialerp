/* users.js — User Management + Per-User Permissions */
const UsersModule = {
  async render() {
    if (!App.can('users','view')) {
      document.getElementById('page-content').innerHTML = `<div class="empty-state" style="padding:80px"><div class="empty-icon">🔒</div><h3>無訪問權限</h3></div>`;
      return;
    }
    const users = await DB.getAll('users');
    const ROLE  = { admin:'badge-purple', sales:'badge-blue', technician:'badge-amber' };
    const LABEL = { admin:'管理者', sales:'業務', technician:'技師' };
    const el    = document.getElementById('page-content');
    el.innerHTML = `
      <div class="page-header">
        <div class="page-header-left"><h2>使用者管理 User Management</h2><p>帳號、密碼、角色與細項權限設定</p></div>
        <div class="page-header-right">
          ${App.can('users','create') ? `<button class="btn btn-primary" onclick="UsersModule.showForm()">＋ 新增帳號</button>` : ''}
        </div>
      </div>

      <div class="table-wrap table-responsive">
        <table class="data-table">
          <thead><tr><th>帳號</th><th>姓名</th><th>角色</th><th>狀態</th><th>操作</th></tr></thead>
          <tbody>
          ${users.map(u => `<tr>
            <td><strong class="mono">${u.username}</strong></td>
            <td>${u.name||'—'}</td>
            <td><span class="badge ${ROLE[u.role]||'badge-gray'}">${LABEL[u.role]||u.role}</span></td>
            <td>${u.active!==false ? '<span class="badge badge-emerald">✓ 啟用</span>' : '<span class="badge badge-red">✗ 停用</span>'}</td>
            <td><div class="action-row">
              <button class="btn btn-sm btn-secondary" onclick="UsersModule.showForm(${u.id})">✏ 編輯</button>
              <button class="btn btn-sm btn-amber" onclick="UsersModule.showPermissions(${u.id})">🔐 權限</button>
              <button class="btn btn-sm btn-amber" onclick="UsersModule.resetPwd(${u.id},'${u.username}')">🔑 密碼</button>
              ${u.username!=='admin' ? `<button class="btn btn-sm btn-danger" onclick="UsersModule.toggleActive(${u.id},${u.active!==false})">${u.active!==false?'停用':'啟用'}</button>` : ''}
            </div></td>
          </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  },

  async showPermissions(id) {
    const user = await DB.getOne('users', id);
    if (!user) return;
    const DEFAULTS = App.PERMISSIONS;
    const rolePerms = DEFAULTS[user.role] || {};
    const custom    = user.permissions || {};
    const modules   = [
      ['assets','設備管理',['view','create','edit','delete']],
      ['inventory','零件庫存',['view','create','edit','delete']],
      ['workorders','維修工單',['view','create','edit','delete']],
      ['brands','品牌型號',['view','create','edit','delete']],
      ['reports','報表',['view','export']],
      ['service_requests','客戶申請',['view','edit','delete']],
      ['customers','客戶CRM',['view','create','edit','delete']],
      ['scanner','掃描中心',['view']],
      ['calendar','保養行事曆',['view','create']],
    ];
    const ROLE_LABELS = { admin:'管理者', sales:'業務', technician:'技師' };
    const ACTION_LABELS = { view:'檢視', create:'新增', edit:'編輯', delete:'刪除', export:'匯出' };

    App.openModal(`🔐 權限設定 — ${user.name||user.username}（${ROLE_LABELS[user.role]}）`, `
      <p class="text-sm text-muted" style="margin-bottom:16px">灰色為角色預設值，可個別覆寫。</p>
      <div style="overflow-x:auto">
        <table class="data-table" style="font-size:.82rem">
          <thead><tr><th>模組</th><th>檢視</th><th>新增</th><th>編輯</th><th>刪除</th><th>其他</th></tr></thead>
          <tbody>
          ${modules.map(([mod,label,actions]) => {
            const roleDef = rolePerms[mod] || {};
            const cust    = custom[mod]    || {};
            const allActions = ['view','create','edit','delete','export'];
            return `<tr>
              <td><strong>${label}</strong></td>
              ${allActions.map(a => {
                if (!actions.includes(a)) return '<td></td>';
                const def = roleDef[a]||0;
                const val = cust[a]!==undefined ? cust[a] : def;
                return `<td style="text-align:center">
                  <input type="checkbox" ${val?'checked':''} title="${def?'預設允許':'預設禁止'}"
                    onchange="UsersModule._setPerm(${id},'${mod}','${a}',this.checked)"
                    style="width:16px;height:16px;cursor:pointer;accent-color:var(--c-blue)">
                </td>`;
              }).join('')}
            </tr>`;
          }).join('')}
          </tbody>
        </table>
      </div>
      <div class="form-actions">
        <button class="btn btn-secondary" onclick="UsersModule._resetPerms(${id})">↩ 還原角色預設</button>
        <button class="btn btn-primary" onclick="App.closeModal();App.toast('權限已即時儲存','success')">完成</button>
      </div>`, 'modal-lg');
  },

  async _setPerm(userId, module_, action, allowed) {
    const user = await DB.getOne('users', userId);
    if (!user) return;
    if (!user.permissions) user.permissions = {};
    if (!user.permissions[module_]) user.permissions[module_] = {};
    user.permissions[module_][action] = allowed ? 1 : 0;
    await DB.put('users', user);
    // Update in-memory if same user is logged in
    if (App.state.user?.id === userId) App.state.user.permissions = user.permissions;
  },

  async _resetPerms(userId) {
    if (!confirm('確定還原此帳號為角色預設權限？')) return;
    const user = await DB.getOne('users', userId);
    user.permissions = {};
    await DB.put('users', user);
    if (App.state.user?.id === userId) App.state.user.permissions = {};
    App.closeModal(); App.toast('已還原預設權限','success');
  },

  showForm(id) {
    const isNew = !id;
    App.openModal(isNew?'新增帳號':'編輯帳號', `
      <form onsubmit="UsersModule.saveForm(event)">
        <input type="hidden" id="uf-id" value="${id||''}">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">帳號 <span>*</span></label>
            <input class="form-control" id="uf-username" required placeholder="英數字" ${!isNew?'readonly style="background:var(--c-surface2)"':''}>
          </div>
          <div class="form-group">
            <label class="form-label">姓名 <span>*</span></label>
            <input class="form-control" id="uf-name" required placeholder="顯示名稱">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">角色</label>
          <select class="form-control" id="uf-role">
            <option value="admin">🛡 管理者</option>
            <option value="sales">💼 業務</option>
            <option value="technician">🔧 技師</option>
          </select>
        </div>
        ${isNew ? `<div class="form-group"><label class="form-label">初始密碼 <span>*</span></label><input class="form-control" type="password" id="uf-pwd" required minlength="6" placeholder="至少6位"></div>
        <div class="form-group"><label class="form-label">確認密碼 <span>*</span></label><input class="form-control" type="password" id="uf-pwd2" required placeholder="再輸入一次"></div>` : ''}
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="App.closeModal()">取消</button>
          <button type="submit" class="btn btn-primary">💾 儲存</button>
        </div>
      </form>`, 'modal-sm');
    if (!isNew) DB.getOne('users', id).then(u => {
      if (!u) return;
      document.getElementById('uf-username').value = u.username||'';
      document.getElementById('uf-name').value     = u.name||'';
      document.getElementById('uf-role').value     = u.role||'sales';
    });
  },

  async saveForm(e) {
    e.preventDefault();
    const id  = document.getElementById('uf-id').value;
    const isNew = !id;
    const username = document.getElementById('uf-username').value.trim();
    const name     = document.getElementById('uf-name').value.trim();
    const role     = document.getElementById('uf-role').value;
    if (isNew) {
      const pwd  = document.getElementById('uf-pwd').value;
      const pwd2 = document.getElementById('uf-pwd2').value;
      if (pwd !== pwd2) { App.toast('兩次密碼不一致','error'); return; }
      const existing = await DB.getAll('users');
      if (existing.find(u => u.username === username)) { App.toast('帳號已存在','error'); return; }
      await DB.add('users', { username, name, role, passwordHash: await App.hashPwd(pwd), active:true });
      App.toast(`✅ 帳號「${username}」已建立`,'success');
    } else {
      const user = await DB.getOne('users', parseInt(id));
      user.name = name; user.role = role;
      await DB.put('users', user);
      App.toast('帳號資料已更新','success');
    }
    App.closeModal(); await this.render();
  },

  async resetPwd(id, username) {
    App.openModal(`🔑 修改密碼 — ${username}`, `
      <form onsubmit="UsersModule.savePwd(event,${id})">
        <div class="form-group"><label class="form-label">新密碼 <span>*</span></label><input class="form-control" type="password" id="pf-new" minlength="6" required></div>
        <div class="form-group"><label class="form-label">確認密碼</label><input class="form-control" type="password" id="pf-conf" required></div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="App.closeModal()">取消</button>
          <button type="submit" class="btn btn-primary">🔑 確認修改</button>
        </div>
      </form>`, 'modal-sm');
  },

  async savePwd(e, id) {
    e.preventDefault();
    const pwd  = document.getElementById('pf-new').value;
    const conf = document.getElementById('pf-conf').value;
    if (pwd !== conf) { App.toast('兩次密碼不一致','error'); return; }
    const user = await DB.getOne('users', id);
    user.passwordHash = await App.hashPwd(pwd);
    await DB.put('users', user);
    App.closeModal(); App.toast('密碼已更新','success');
  },

  async toggleActive(id, currently) {
    if (!confirm(`確定要${currently?'停用':'啟用'}此帳號？`)) return;
    const user = await DB.getOne('users', id);
    user.active = !currently;
    await DB.put('users', user);
    App.toast(`帳號已${currently?'停用':'啟用'}`, currently?'warning':'success');
    await this.render();
  }
};
