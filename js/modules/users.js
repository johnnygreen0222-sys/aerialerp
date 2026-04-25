/* users.js — User Management Module (Admin Only) */
const UsersModule = {
  async render() {
    if (!App.can('users')) {
      document.getElementById('page-content').innerHTML = `
        <div class="empty-state" style="padding:80px 24px">
          <div class="empty-icon">🔒</div>
          <h3>無訪問權限</h3>
          <p>此頁面僅限管理者使用</p>
        </div>`;
      return;
    }
    const users = await DB.getAll('users');
    const el    = document.getElementById('page-content');
    const ROLE_LABELS = { admin:'管理者 Administrator', sales:'業務 Sales', technician:'技師 Technician' };
    const ROLE_BADGE  = { admin:'badge-purple', sales:'badge-blue', technician:'badge-amber' };

    el.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h2>使用者管理 User Management</h2>
          <p>管理系統帳號、密碼與角色權限</p>
        </div>
        <div class="page-header-right">
          <button class="btn btn-primary" onclick="UsersModule.showForm()">＋ 新增帳號</button>
        </div>
      </div>

      <!-- Permission Matrix -->
      <div class="card" style="margin-bottom:24px">
        <div class="card-header"><span class="card-title">🔐 權限矩陣 Permission Matrix</span></div>
        <div class="table-responsive">
          <table class="data-table">
            <thead><tr>
              <th>功能模組</th>
              <th><span class="badge badge-purple">管理者</span></th>
              <th><span class="badge badge-blue">業務</span></th>
              <th><span class="badge badge-amber">技師</span></th>
            </tr></thead>
            <tbody>
              ${[
                ['儀表板 Dashboard',   '✅ 檢視', '✅ 檢視', '✅ 檢視'],
                ['設備管理 Assets',    '✅ 全權限', '👁 僅檢視', '👁 僅檢視'],
                ['零件庫存 Inventory', '✅ 全權限', '👁 僅檢視', '❌ 無法訪問'],
                ['維修工單 Work Orders','✅ 全權限', '✅ 可新增/編輯', '✅ 可新增/編輯'],
                ['掃描中心 Scanner',   '✅ 全功能', '✅ 全功能', '✅ 全功能'],
                ['品牌型號庫 Brands',  '✅ 全權限', '👁 僅檢視', '❌ 無法訪問'],
                ['報表 Reports',       '✅ 全功能', '✅ 全功能', '❌ 無法訪問'],
                ['使用者管理 Users',   '✅ 全權限', '❌ 無法訪問', '❌ 無法訪問'],
              ].map(([f,a,s,t]) => `<tr>
                <td><strong>${f}</strong></td>
                <td>${a}</td><td>${s}</td><td>${t}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- User List -->
      <div class="table-wrap table-responsive">
        <table class="data-table">
          <thead><tr>
            <th>帳號</th><th>姓名</th><th>角色</th><th>狀態</th><th>建立時間</th><th>操作</th>
          </tr></thead>
          <tbody>
          ${users.length === 0
            ? `<tr><td colspan="6"><div class="empty-state"><p>無使用者資料</p></div></td></tr>`
            : users.map(u => `<tr>
                <td><strong class="mono">${u.username}</strong></td>
                <td>${u.name || '—'}</td>
                <td><span class="badge ${ROLE_BADGE[u.role]||'badge-gray'}">${ROLE_LABELS[u.role]||u.role}</span></td>
                <td>
                  ${u.active !== false
                    ? '<span class="badge badge-emerald">✓ 啟用</span>'
                    : '<span class="badge badge-red">✗ 停用</span>'}
                </td>
                <td class="text-sm text-muted">${App.fmt.date(u.createdAt)}</td>
                <td>
                  <div class="action-row">
                    <button class="btn btn-sm btn-secondary" onclick="UsersModule.showForm(${u.id})">✏ 編輯</button>
                    <button class="btn btn-sm btn-amber" onclick="UsersModule.resetPwd(${u.id},'${u.username}')">🔑 改密碼</button>
                    ${u.username !== 'admin'
                      ? `<button class="btn btn-sm btn-danger" onclick="UsersModule.toggleActive(${u.id},${u.active!==false})">${u.active!==false?'停用':'啟用'}</button>`
                      : '<span class="text-xs text-muted">主帳號</span>'}
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  },

  showForm(id) {
    const isNew = !id;
    App.openModal(isNew ? '新增帳號' : '編輯帳號', `
      <form id="user-form" onsubmit="UsersModule.saveForm(event)">
        <input type="hidden" id="uf-id" value="${id||''}">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">帳號 Username <span>*</span></label>
            <input class="form-control" id="uf-username" placeholder="英數字，不可重複" required
              ${!isNew?'readonly style="background:var(--c-surface2);color:var(--c-text3)"':''}>
          </div>
          <div class="form-group">
            <label class="form-label">姓名 Display Name <span>*</span></label>
            <input class="form-control" id="uf-name" placeholder="例：陳大明" required>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">角色 Role <span>*</span></label>
          <select class="form-control" id="uf-role" required>
            <option value="admin">🛡 管理者 Administrator</option>
            <option value="sales">💼 業務 Sales</option>
            <option value="technician">🔧 技師 Technician</option>
          </select>
        </div>
        ${isNew ? `
        <div class="form-group">
          <label class="form-label">初始密碼 <span>*</span></label>
          <input class="form-control" type="password" id="uf-pwd" placeholder="至少6位" minlength="6" required>
          <p class="form-hint">使用者登入後可由管理者協助修改密碼</p>
        </div>
        <div class="form-group">
          <label class="form-label">確認密碼 <span>*</span></label>
          <input class="form-control" type="password" id="uf-pwd2" placeholder="再次輸入密碼" required>
        </div>` : ''}
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="App.closeModal()">取消</button>
          <button type="submit" class="btn btn-primary">💾 儲存</button>
        </div>
      </form>`, 'modal-sm');

    // Pre-fill if editing
    if (!isNew) {
      DB.getOne('users', id).then(u => {
        if (u) {
          document.getElementById('uf-username').value = u.username || '';
          document.getElementById('uf-name').value = u.name || '';
          document.getElementById('uf-role').value = u.role || 'sales';
        }
      });
    }
  },

  async saveForm(e) {
    e.preventDefault();
    const id       = document.getElementById('uf-id').value;
    const username = document.getElementById('uf-username').value.trim();
    const name     = document.getElementById('uf-name').value.trim();
    const role     = document.getElementById('uf-role').value;
    const isNew    = !id;

    if (isNew) {
      const pwd  = document.getElementById('uf-pwd').value;
      const pwd2 = document.getElementById('uf-pwd2').value;
      if (pwd !== pwd2) { App.toast('兩次輸入的密碼不一致', 'error'); return; }
      if (pwd.length < 6) { App.toast('密碼至少需要6位', 'error'); return; }

      // Check username not taken
      const existing = await DB.getAll('users');
      if (existing.find(u => u.username === username)) {
        App.toast('帳號已存在，請使用其他帳號名稱', 'error'); return;
      }

      const passwordHash = await App.hashPwd(pwd);
      await DB.add('users', { username, name, role, passwordHash, active: true });
      App.toast(`✅ 帳號「${username}」已建立`, 'success');
    } else {
      const user = await DB.getOne('users', parseInt(id));
      if (!user) return;
      user.name = name;
      user.role = role;
      await DB.put('users', user);
      App.toast(`✅ 帳號資料已更新`, 'success');
    }

    App.closeModal();
    await this.render();
  },

  async resetPwd(id, username) {
    App.openModal(`🔑 修改密碼 — ${username}`, `
      <form id="pwd-form" onsubmit="UsersModule.savePwd(event, ${id})">
        <div class="form-group">
          <label class="form-label">新密碼 <span>*</span></label>
          <input class="form-control" type="password" id="pf-new" placeholder="至少6位" minlength="6" required>
        </div>
        <div class="form-group">
          <label class="form-label">確認新密碼 <span>*</span></label>
          <input class="form-control" type="password" id="pf-confirm" placeholder="再次輸入" required>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="App.closeModal()">取消</button>
          <button type="submit" class="btn btn-primary">🔑 確認修改</button>
        </div>
      </form>`, 'modal-sm');
  },

  async savePwd(e, id) {
    e.preventDefault();
    const newPwd  = document.getElementById('pf-new').value;
    const confirm = document.getElementById('pf-confirm').value;
    if (newPwd !== confirm) { App.toast('兩次輸入不一致', 'error'); return; }
    if (newPwd.length < 6) { App.toast('密碼至少6位', 'error'); return; }

    const user = await DB.getOne('users', id);
    if (!user) return;
    user.passwordHash = await App.hashPwd(newPwd);
    await DB.put('users', user);
    App.closeModal();
    App.toast(`✅ 密碼已更新`, 'success');
  },

  async toggleActive(id, currentlyActive) {
    const action = currentlyActive ? '停用' : '啟用';
    if (!confirm(`確定要${action}此帳號？`)) return;
    const user = await DB.getOne('users', id);
    if (!user) return;
    user.active = !currentlyActive;
    await DB.put('users', user);
    App.toast(`帳號已${action}`, currentlyActive ? 'warning' : 'success');
    await this.render();
  }
};
