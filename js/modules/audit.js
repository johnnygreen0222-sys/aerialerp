/* audit.js — Audit Log Viewer Module */
const AuditModule = {
  async render() {
    const el = document.getElementById('page-content');
    const logs = await DB.AuditLogs.all();
    const sortedLogs = logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    el.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h2>修改追蹤 Audit Log</h2>
          <p>查看所有數據修改的歷史記錄 — 誰、何時、改了什麼</p>
        </div>
        <div class="page-header-right">
          ${App.can('users') ? `<button class="btn btn-secondary" onclick="AuditModule.exportLog()">⬇ 匯出 CSV</button>` : ''}
          ${App.can('users') ? `<button class="btn btn-danger" onclick="AuditModule.clearLogs()">🗑 清空日誌</button>` : ''}
        </div>
      </div>

      <div class="stats-grid" style="margin-bottom:20px">
        <div class="stat-card blue">
          <div class="stat-info"><div class="stat-label">總修改數</div><div class="stat-value">${logs.length}</div></div>
          <div class="stat-icon blue">📋</div>
        </div>
        <div class="stat-card emerald">
          <div class="stat-info"><div class="stat-label">新增</div><div class="stat-value">${logs.filter(l=>l.action==='CREATE').length}</div></div>
          <div class="stat-icon emerald">➕</div>
        </div>
        <div class="stat-card amber">
          <div class="stat-info"><div class="stat-label">修改</div><div class="stat-value">${logs.filter(l=>l.action==='UPDATE').length}</div></div>
          <div class="stat-icon amber">✏️</div>
        </div>
        <div class="stat-card red">
          <div class="stat-info"><div class="stat-label">刪除</div><div class="stat-value">${logs.filter(l=>l.action==='DELETE').length}</div></div>
          <div class="stat-icon red">🗑</div>
        </div>
      </div>

      <div class="table-wrap table-responsive">
        <table class="data-table">
          <thead><tr>
            <th>時間</th><th>操作</th><th>對象</th><th>用戶</th><th>詳情</th>
          </tr></thead>
          <tbody>
          ${sortedLogs.length === 0
            ? '<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">📋</div><p>無修改記錄</p></div></td></tr>'
            : sortedLogs.map(log => {
                const date = new Date(log.timestamp);
                const timeStr = date.toLocaleString('zh-TW');
                const actionIcon = log.action === 'CREATE' ? '➕' : log.action === 'UPDATE' ? '✏️' : '🗑';
                const actionLabel = log.action === 'CREATE' ? '新增' : log.action === 'UPDATE' ? '修改' : '刪除';
                const actionBg = log.action === 'CREATE' ? 'emerald' : log.action === 'UPDATE' ? 'amber' : 'red';
                return `<tr>
                  <td><span class="text-sm text-muted">${timeStr}</span></td>
                  <td><span class="badge badge-${actionBg}">${actionIcon} ${actionLabel}</span></td>
                  <td>
                    <strong>${log.entityType}</strong><br>
                    <span class="text-sm text-muted">#${log.entityId}</span>
                  </td>
                  <td><span class="text-sm">${log.userId}</span></td>
                  <td>
                    <button class="btn btn-sm btn-secondary" onclick="AuditModule.showDetails(${logs.indexOf(log)})">查看詳情</button>
                  </td>
                </tr>`;
              }).join('')}
          </tbody>
        </table>
      </div>`;
  },

  showDetails(idx) {
    const logs = Array.from(DB.AuditLogs.all().then(logs => logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))));
    // Need to handle async properly - refetch
    DB.AuditLogs.all().then(allLogs => {
      const sortedLogs = allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      const log = sortedLogs[idx];
      if (!log) return;

      const diffStr = log.action === 'DELETE'
        ? `<strong>刪除的資料:</strong><pre style="background:var(--c-surface);padding:10px;border-radius:6px;overflow-x:auto;font-size:0.85rem">${JSON.stringify(log.oldData, null, 2)}</pre>`
        : log.action === 'CREATE'
        ? `<strong>新增的資料:</strong><pre style="background:var(--c-surface);padding:10px;border-radius:6px;overflow-x:auto;font-size:0.85rem">${JSON.stringify(log.newData, null, 2)}</pre>`
        : this.diffObjects(log.oldData, log.newData);

      const date = new Date(log.timestamp);
      const timeStr = date.toLocaleString('zh-TW');

      App.openModal(`修改詳情 - ${log.entityType} #${log.entityId}`, `
        <div style="margin-bottom:16px">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
            <div>
              <span class="text-sm text-muted">時間</span><br>
              <strong>${timeStr}</strong>
            </div>
            <div>
              <span class="text-sm text-muted">用戶</span><br>
              <strong>${log.userId}</strong>
            </div>
          </div>
          ${diffStr}
        </div>`, 'modal-lg');
    });
  },

  diffObjects(oldData, newData) {
    const changes = [];
    const allKeys = new Set([...Object.keys(oldData||{}), ...Object.keys(newData||{})]);
    
    allKeys.forEach(key => {
      const old = oldData?.[key];
      const newVal = newData?.[key];
      if (JSON.stringify(old) !== JSON.stringify(newVal)) {
        changes.push(`
          <div style="padding:10px;margin:8px 0;background:var(--c-surface);border-left:3px solid var(--c-amber);border-radius:4px">
            <strong>${key}:</strong><br>
            <span style="color:var(--c-red)">舊: ${JSON.stringify(old)}</span><br>
            <span style="color:var(--c-emerald)">新: ${JSON.stringify(newVal)}</span>
          </div>`);
      }
    });
    
    return `<strong>變更項目:</strong>${changes.length === 0 ? '<p style="color:var(--c-text3)">無變更</p>' : changes.join('')}`;
  },

  exportLog() {
    DB.AuditLogs.all().then(logs => {
      const headers = ['時間', '操作', '對象型態', '對象ID', '用戶', '舊資料', '新資料'];
      const rows = logs.map(log => [
        new Date(log.timestamp).toLocaleString('zh-TW'),
        log.action,
        log.entityType,
        log.entityId,
        log.userId,
        JSON.stringify(log.oldData||{}),
        JSON.stringify(log.newData||{})
      ]);

      let csv = headers.map(h => `"${h}"`).join(',') + '\n';
      csv += rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `audit-log-${new Date().toISOString().slice(0,10)}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
      App.toast('✅ 已匯出審計日誌', 'success');
    });
  },

  clearLogs() {
    if (!confirm('確定要清空所有審計日誌嗎？此操作無法恢復。')) return;
    DB.AuditLogs.clear();
    App.toast('✅ 已清空審計日誌', 'success');
    this.render();
  }
};
