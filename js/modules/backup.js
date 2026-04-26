/* backup.js — Data Backup & Restore Module */
const BackupModule = {
  async render() {
    const el = document.getElementById('page-content');
    const stores = ['brands','models','assets','parts','workorders','transactions','users','service_requests','customers','settings'];
    const counts = {};
    for (const s of stores) {
      try { const all = await DB.getAll(s); counts[s] = all.length; } catch { counts[s] = 0; }
    }
    const total = Object.values(counts).reduce((a,b)=>a+b,0);
    const lastBackup = await DB.getSetting('last_backup');

    el.innerHTML = `
      <div class="page-header">
        <div class="page-header-left"><h2>資料備份 Backup & Restore</h2><p>匯出/匯入全部 IndexedDB 資料，防止裝置更換或清除瀏覽器導致資料遺失</p></div>
      </div>

      <div class="alert-banner" style="background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);border-radius:var(--r-md);padding:14px 16px;margin-bottom:20px;display:flex;gap:10px">
        <span>⚠️</span>
        <div>
          <strong>重要提醒</strong>：此系統資料儲存於瀏覽器 IndexedDB，<strong>換裝置或清除瀏覽器快取將永久遺失資料</strong>。建議每週匯出備份一次。
        </div>
      </div>

      <div class="grid-2">
        <!-- 匯出 -->
        <div class="card">
          <div class="card-header"><span class="card-title">📤 匯出備份</span></div>
          <div class="stats-grid" style="margin-bottom:16px;grid-template-columns:repeat(2,1fr)">
            ${Object.entries(counts).map(([s,c]) => `
              <div style="padding:10px;background:var(--c-surface);border-radius:var(--r-md);display:flex;justify-content:space-between;align-items:center">
                <span class="text-sm text-muted">${({brands:'品牌',models:'型號',assets:'設備',parts:'零件',workorders:'工單',transactions:'交易',users:'使用者',service_requests:'客戶申請',customers:'客戶',settings:'設定'})[s]||s}</span>
                <strong>${c}</strong>
              </div>`).join('')}
          </div>
          <div style="text-align:center;padding:8px 0 16px">
            <div style="font-size:2rem;font-weight:800;color:var(--c-blue)">${total}</div>
            <div class="text-sm text-muted">筆資料合計</div>
          </div>
          ${lastBackup ? `<p class="text-sm text-muted" style="margin-bottom:12px">上次備份：${App.fmt.datetime(lastBackup)}</p>` : ''}
          <button class="btn btn-primary w-full" onclick="BackupModule.exportData()">⬇ 下載備份檔案 (JSON)</button>
        </div>

        <!-- 匯入 -->
        <div class="card">
          <div class="card-header"><span class="card-title">📥 匯入還原</span></div>
          <div style="margin-bottom:20px">
            <div class="alert-banner danger" style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);border-radius:var(--r-md);padding:12px 14px;margin-bottom:16px;font-size:.85rem">
              ⚠️ 匯入將<strong>覆蓋現有資料</strong>，操作前請先匯出備份
            </div>
            <label class="form-label">選擇備份檔案 (.json)</label>
            <input type="file" id="restore-file" accept=".json" class="form-control" style="margin-bottom:14px">
            <div id="restore-preview" class="hidden" style="background:var(--c-surface);border-radius:var(--r-md);padding:12px;margin-bottom:14px;font-size:.85rem">
              <strong>備份檔案資訊：</strong><br>
              <div id="restore-info"></div>
            </div>
            <button class="btn btn-danger w-full" onclick="BackupModule.importData()">📥 還原資料（覆蓋）</button>
          </div>

          <div class="divider"></div>
          <div class="form-label" style="margin-top:14px;margin-bottom:8px">⚠️ 重置資料庫</div>
          <p class="text-sm text-muted" style="margin-bottom:12px">清除所有資料並重新載入示範資料（不可恢復）</p>
          <button class="btn btn-secondary w-full" onclick="BackupModule.resetDB()">🔄 重置為示範資料</button>
        </div>
      </div>`;

    document.getElementById('restore-file').addEventListener('change', e => {
      const f = e.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const data = JSON.parse(ev.target.result);
          const summary = Object.entries(data.data||{}).map(([k,v])=>`${k}: ${v.length} 筆`).join(' | ');
          document.getElementById('restore-info').innerHTML = `建立時間：${App.fmt.datetime(data.exportedAt)}<br>${summary}`;
          document.getElementById('restore-preview').classList.remove('hidden');
        } catch { document.getElementById('restore-info').textContent = '無法解析備份檔案'; document.getElementById('restore-preview').classList.remove('hidden'); }
      };
      reader.readAsText(f);
    });
  },

  async exportData() {
    const stores = ['brands','models','assets','parts','workorders','transactions','users','service_requests','customers','settings'];
    const data   = {};
    for (const s of stores) { try { data[s] = await DB.getAll(s); } catch { data[s] = []; } }
    const blob = new Blob([JSON.stringify({ version:'2.0', exportedAt:new Date().toISOString(), data }, null, 2)], { type:'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `aerialerp_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    await DB.setSetting('last_backup', new Date().toISOString());
    App.toast('✅ 備份已下載','success');
    await this.render();
  },

  async importData() {
    const file = document.getElementById('restore-file').files[0];
    if (!file) { App.toast('請先選擇備份檔案','warning'); return; }
    if (!confirm('確定要還原？現有資料將被覆蓋，此操作無法撤銷！')) return;

    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      if (!backup.data) throw new Error('格式錯誤');
      const stores = Object.keys(backup.data);
      for (const s of stores) {
        try {
          await DB.clear(s);
          for (const row of backup.data[s]) { await DB.add(s, row); }
        } catch(e) { console.warn('Restore store failed:', s, e); }
      }
      App.toast('✅ 資料已還原，即將重新載入…','success');
      setTimeout(() => location.reload(), 1500);
    } catch(e) {
      App.toast('❌ 還原失敗：' + e.message, 'error');
    }
  },

  async resetDB() {
    if (!confirm('確定要重置資料庫？所有現有資料將被刪除！')) return;
    const stores = ['brands','models','assets','parts','workorders','transactions','service_requests','customers'];
    for (const s of stores) { try { await DB.clear(s); } catch {} }
    await DB.setSetting('seeded', false);
    App.toast('資料庫已重置，即將重新載入…','warning');
    setTimeout(() => location.reload(), 1500);
  }
};
