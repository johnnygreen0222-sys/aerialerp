/* admin-approval.js — Admin account request and approval */
const AdminApproval = {
  async showAdminRequestForm() {
    const user = App.state.user;
    if (!user || user.googleId) {
      App.toast('❌ 需要透過 Google 帳號登入', 'error');
      return;
    }

    const html = `
      <div style="padding:20px;max-height:70vh;overflow-y:auto">
        <h3 style="margin-bottom:4px">📝 申請後台管理帳號</h3>
        <p style="color:var(--c-text3);font-size:0.9rem;margin-bottom:20px">
          填寫表單申請管理帳號，系統管理員會審核並聯繫您
        </p>

        <form id="admin-request-form" style="background:var(--c-surface2);padding:16px;border-radius:8px">
          <div class="form-group" style="margin-bottom:16px">
            <label class="form-label">姓名 Name</label>
            <input type="text" id="req-name" placeholder="您的姓名" required 
              style="width:100%;padding:10px;border:1px solid var(--c-border);border-radius:6px;background:var(--c-surface);color:var(--c-text)">
          </div>

          <div class="form-group" style="margin-bottom:16px">
            <label class="form-label">Email</label>
            <input type="email" id="req-email" placeholder="${user.email}" readonly value="${user.email}"
              style="width:100%;padding:10px;border:1px solid var(--c-border);border-radius:6px;background:var(--c-surface);color:var(--c-text)">
          </div>

          <div class="form-group" style="margin-bottom:16px">
            <label class="form-label">工作職位 Position</label>
            <select id="req-position" required
              style="width:100%;padding:10px;border:1px solid var(--c-border);border-radius:6px;background:var(--c-surface);color:var(--c-text)">
              <option value="">- 選擇職位 -</option>
              <option value="manager">🏢 經理 Manager</option>
              <option value="technician">🔧 技師 Technician</option>
              <option value="sales">💼 銷售 Sales</option>
              <option value="support">👥 客服 Support</option>
            </select>
          </div>

          <div class="form-group" style="margin-bottom:16px">
            <label class="form-label">申請理由 Reason</label>
            <textarea id="req-reason" placeholder="說明需要管理權限的原因…" required rows="4"
              style="width:100%;padding:10px;border:1px solid var(--c-border);border-radius:6px;background:var(--c-surface);color:var(--c-text);font-family:inherit;resize:none"></textarea>
          </div>

          <div style="background:var(--c-primary-light);color:var(--c-primary);padding:12px;border-radius:6px;font-size:0.9rem;margin-bottom:16px">
            ℹ️ 提交申請後，系統管理員會進行審核，並於 1-3 個工作天內回覆
          </div>

          <div style="display:flex;gap:8px;justify-content:flex-end">
            <button type="button" class="btn btn-secondary" onclick="App.closeModal()">取消</button>
            <button type="submit" class="btn btn-primary">✓ 提交申請</button>
          </div>
        </form>
      </div>
    `;

    App.openModal('申請管理帳號', html, '500px');

    document.getElementById('admin-request-form').addEventListener('submit', async e => {
      e.preventDefault();
      await this.submitAdminRequest();
    });
  },

  async submitAdminRequest() {
    const name = document.getElementById('req-name').value;
    const email = document.getElementById('req-email').value;
    const position = document.getElementById('req-position').value;
    const reason = document.getElementById('req-reason').value;

    try {
      const request = {
        requesterId: App.state.user.id,
        requesterName: name,
        requesterEmail: email,
        position,
        reason,
        status: 'pending',
        createdAt: new Date().toISOString(),
        ipAddress: 'auto-detected'
      };

      await DB.add('admin_requests', request);
      
      // Send email notification (simulated)
      await this.sendAdminNotification(request);
      
      App.toast('✅ 申請已提交，管理員會盡快審核', 'success');
      App.closeModal();
    } catch(e) {
      console.error('Submit error:', e);
      App.toast('❌ 提交失敗: ' + e.message, 'error');
    }
  },

  async sendAdminNotification(request) {
    // Simulate sending email to admin
    console.log('📧 Admin notification:', request);
    
    // In production, call backend API
    // await fetch('/api/email/admin-request', { method: 'POST', body: JSON.stringify(request) })
    
    return { status: 'sent' };
  },

  async showApprovalPanel() {
    if (App.state.user?.role !== 'admin') {
      App.toast('❌ 需要管理員權限', 'error');
      return;
    }

    try {
      const requests = await DB.getAll('admin_requests', r => r.status === 'pending');
      
      const html = `
        <div style="padding:20px;max-height:70vh;overflow-y:auto">
          <h3 style="margin-bottom:16px">
            📋 管理帳號申請審核 (${requests.length} 待審)
          </h3>

          ${requests.length === 0 ? `
            <div class="empty-state" style="padding:40px;text-align:center">
              <div class="empty-icon">✅</div>
              <p>無待審申請</p>
            </div>
          ` : `
            <div style="display:grid;gap:12px">
              ${requests.map(r => `
                <div style="background:var(--c-surface2);padding:16px;border-radius:8px;border-left:4px solid var(--c-primary)">
                  <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px">
                    <div>
                      <div style="font-weight:600;font-size:1rem">${r.requesterName}</div>
                      <div style="font-size:0.85rem;color:var(--c-text3)">
                        ${r.requesterEmail} · 申請於 ${new Date(r.createdAt).toLocaleDateString('zh-TW')}
                      </div>
                    </div>
                    <span class="chip">${r.position}</span>
                  </div>
                  <div style="background:var(--c-surface);padding:12px;border-radius:6px;margin-bottom:12px;font-size:0.9rem;color:var(--c-text2)">
                    ${r.reason}
                  </div>
                  <div style="display:flex;gap:8px;justify-content:flex-end">
                    <button class="btn btn-sm btn-danger" onclick="AdminApproval.rejectRequest(${r.id})">
                      ✕ 拒絕
                    </button>
                    <button class="btn btn-sm btn-success" onclick="AdminApproval.approveRequest(${r.id}, '${r.requesterEmail}')">
                      ✓ 批准
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          `}

          <div style="margin-top:20px;text-align:right">
            <button class="btn btn-secondary" onclick="App.closeModal()">關閉</button>
          </div>
        </div>
      `;

      App.openModal('管理帳號申請審核', html, '700px');
    } catch(e) {
      console.error('Load requests error:', e);
      App.toast('❌ 載入失敗: ' + e.message, 'error');
    }
  },

  async approveRequest(requestId, email) {
    if (!confirm('確定批准此申請？')) return;

    try {
      App.toast('⏳ 處理中…', 'info');

      // Update request
      const req = await DB.get('admin_requests', requestId);
      req.status = 'approved';
      req.approvedAt = new Date().toISOString();
      req.approvedBy = App.state.user.id;
      await DB.put('admin_requests', req);

      // Upgrade user to admin
      const users = await DB.Users.all();
      const user = users.find(u => u.email === email);
      if (user) {
        user.role = 'admin';
        user.updatedAt = new Date().toISOString();
        await DB.Users.put(user);
      }

      // Send approval email (simulated)
      await EmailService.send({
        to: email,
        subject: '✅ 台灣高空 ERP - 管理帳號已批准',
        body: `您的管理帳號申請已批准！您現在可以使用管理員功能。`
      });

      App.toast('✅ 已批准並升級用戶權限', 'success');
      this.showApprovalPanel();
    } catch(e) {
      console.error('Approve error:', e);
      App.toast('❌ 批准失敗: ' + e.message, 'error');
    }
  },

  async rejectRequest(requestId) {
    const reason = prompt('輸入拒絕理由（選填）:');
    if (reason === null) return;

    try {
      const req = await DB.get('admin_requests', requestId);
      req.status = 'rejected';
      req.rejectionReason = reason;
      req.rejectedAt = new Date().toISOString();
      req.rejectedBy = App.state.user.id;
      await DB.put('admin_requests', req);

      App.toast('✅ 已拒絕申請', 'success');
      this.showApprovalPanel();
    } catch(e) {
      console.error('Reject error:', e);
      App.toast('❌ 拒絕失敗: ' + e.message, 'error');
    }
  }
};
