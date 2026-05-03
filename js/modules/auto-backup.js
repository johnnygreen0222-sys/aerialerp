/* auto-backup.js — Auto backup & export module */
const AutoBackup = {
  async init() {
    // Check for scheduled backup
    const lastBackup = await DB.getSetting('lastBackupDate');
    const today = new Date().toISOString().split('T')[0];
    
    if (lastBackup !== today) {
      // Run backup silently in background
      this.performBackup().catch(e => console.error('Auto-backup failed:', e));
    }
  },

  async performBackup() {
    try {
      const data = await this.collectAllData();
      const filename = `AerialERP-backup-${new Date().toISOString().split('T')[0]}.json`;
      
      // Save to IndexedDB backup store
      await DB.setSetting('lastBackupDate', new Date().toISOString().split('T')[0]);
      await DB.setSetting(`backup-${filename}`, JSON.stringify(data));
      
      console.log('✅ Auto-backup completed:', filename);
      return { success: true, filename };
    } catch(e) {
      console.error('Backup error:', e);
      throw e;
    }
  },

  async collectAllData() {
    const [brands, models, assets, parts, workorders, users, customers, serviceReqs] = await Promise.all([
      DB.Brands.all(),
      DB.Models.all(),
      DB.Assets.all(),
      DB.Parts.all(),
      DB.WorkOrders.all(),
      DB.Users.all(),
      DB.getAll('customers'),
      DB.getAll('service_requests')
    ]);

    return {
      exportDate: new Date().toISOString(),
      version: '1.0',
      data: {
        brands, models, assets, parts, workorders, users, customers, serviceReqs
      }
    };
  },

  exportAsJSON() {
    return this.performBackup().then(result => {
      App.toast(`✅ 已備份至 ${result.filename}`, 'success');
      return result;
    });
  },

  async exportAsCSV() {
    const data = await this.collectAllData();
    const csv = this.generateCSV(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `AerialERP-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    App.toast('✅ 已匯出 CSV 檔案', 'success');
  },

  generateCSV(data) {
    const d = data.data;
    let csv = '資源類型,數量,詳細資料\n';
    
    csv += `品牌,${d.brands.length},"${d.brands.map(b => b.name).join('; ')}"\n`;
    csv += `型號,${d.models.length},"${d.models.map(m => m.modelName).join('; ')}"\n`;
    csv += `設備,${d.assets.length},"共 ${d.assets.length} 台"\n`;
    csv += `零件,${d.parts.length},"共 ${d.parts.length} 種"\n`;
    csv += `工單,${d.workorders.length},"共 ${d.workorders.length} 張"\n`;
    csv += `服務申請,${d.serviceReqs.length},"共 ${d.serviceReqs.length} 件"\n`;
    
    // Detail tables
    csv += '\n--- 設備清冊 ---\n';
    csv += '設備 ID,品牌,型號,狀態,購置日,保固期\n';
    d.assets.forEach(a => {
      csv += `"${a.assetId}","${a.brand}","${a.model}","${a.status}","${a.purchaseDate}","${a.warrantyExpiry}"\n`;
    });

    csv += '\n--- 零件庫存 ---\n';
    csv += '零件編號,名稱,品牌,在手,安全庫存,在途,單價\n';
    d.parts.forEach(p => {
      csv += `"${p.partNumber}","${p.name}","${p.brandId}","${p.onHand}","${p.safetyStock}","${p.inTransit}","${p.unitCostUSD}"\n`;
    });

    csv += '\n--- 工單摘要 ---\n';
    csv += '工單號,狀態,類型,描述,金額,完工日\n';
    d.workorders.forEach(w => {
      csv += `"${w.woNumber}","${w.status}","${w.type}","${w.description?.slice(0,30)}","${w.totalCost}","${w.completedDate}"\n`;
    });

    return csv;
  },

  showBackupDialog() {
    const html = `
      <div style="padding:20px">
        <h3 style="margin-bottom:16px">📦 備份與復原</h3>
        
        <div style="background:var(--c-surface2);padding:12px;border-radius:8px;margin-bottom:16px">
          <div style="font-size:0.9rem;color:var(--c-text2);margin-bottom:8px">⏰ 自動備份設置</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
              <input type="checkbox" id="autoBackupDaily" checked>
              <span style="font-size:0.9rem">每日自動備份</span>
            </label>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
              <input type="checkbox" id="autoBackupWeekly" checked>
              <span style="font-size:0.9rem">每週備份</span>
            </label>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
          <button class="btn btn-secondary" onclick="AutoBackup.exportAsJSON(); App.closeModal()" style="width:100%">
            💾 備份 (JSON)
          </button>
          <button class="btn btn-secondary" onclick="AutoBackup.exportAsCSV(); App.closeModal()" style="width:100%">
            📊 匯出 (CSV)
          </button>
        </div>

        <div style="border-top:1px solid var(--c-border);padding-top:12px">
          <div style="font-size:0.9rem;color:var(--c-text2);margin-bottom:8px">🗂️ 備份清單</div>
          <div id="backup-list" style="max-height:300px;overflow-y:auto;font-size:0.85rem">
            載入中...
          </div>
        </div>

        <div style="margin-top:12px;text-align:right;gap:8px;display:flex;justify-content:flex-end">
          <button class="btn btn-secondary" onclick="App.closeModal()">關閉</button>
        </div>
      </div>
    `;
    
    App.openModal('備份管理', html, '500px');
    this.loadBackupList();
  },

  async loadBackupList() {
    const list = document.getElementById('backup-list');
    const backups = [];
    
    // List all backups from settings (note: real implementation would need proper indexing)
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const key = `backup-AerialERP-backup-${dateStr}.json`;
      const exists = await DB.getSetting(key);
      if (exists) {
        backups.push({ date: dateStr, key });
      }
    }

    if (backups.length === 0) {
      list.innerHTML = '<div style="color:var(--c-text3);padding:12px">尚無備份記錄</div>';
      return;
    }

    list.innerHTML = backups.map((b, i) => `
      <div style="padding:8px;border-bottom:1px solid var(--c-border);display:flex;justify-content:space-between;align-items:center">
        <span>${i === 0 ? '📌 最新' : '📦'} ${b.date}</span>
        <button class="btn btn-sm btn-info" onclick="AutoBackup.restoreBackup('${b.key}')" title="還原此備份">
          ⤴️ 還原
        </button>
      </div>
    `).join('');
  },

  async restoreBackup(key) {
    if (!confirm('確定要還原此備份？目前數據將被覆蓋。')) return;
    
    try {
      const backupStr = await DB.getSetting(key);
      if (!backupStr) {
        App.toast('❌ 備份檔案無效', 'error');
        return;
      }

      const backup = JSON.parse(backupStr);
      
      // Clear all stores and restore
      await Promise.all([
        DB.clear('brands'),
        DB.clear('models'),
        DB.clear('assets'),
        DB.clear('parts'),
        DB.clear('workorders'),
        DB.clear('users'),
        DB.clear('customers'),
        DB.clear('service_requests')
      ]);

      // Restore data
      const d = backup.data;
      await Promise.all([
        ...d.brands.map(o => DB.Brands.add(o)),
        ...d.models.map(o => DB.Models.add(o)),
        ...d.assets.map(o => DB.Assets.add(o)),
        ...d.parts.map(o => DB.Parts.add(o)),
        ...d.workorders.map(o => DB.WorkOrders.add(o))
      ]);

      App.toast('✅ 已還原備份', 'success');
      location.reload();
    } catch(e) {
      console.error('Restore error:', e);
      App.toast('❌ 還原失敗: ' + e.message, 'error');
    }
  }
};
