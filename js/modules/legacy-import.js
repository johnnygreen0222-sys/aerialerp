/* legacy-import.js — Import legacy workorder and asset data */
const LegacyImport = {
  showImportWizard() {
    const html = `
      <div style="padding:20px;max-height:70vh;overflow-y:auto">
        <h3 style="margin-bottom:16px">📥 導入舊版維修資料</h3>
        
        <div style="background:var(--c-surface2);padding:12px;border-radius:8px;margin-bottom:16px;border-left:4px solid var(--c-primary)">
          <div style="font-size:0.9rem;font-weight:500;margin-bottom:8px">📋 支持格式</div>
          <ul style="font-size:0.85rem;color:var(--c-text2);margin:0;padding-left:20px">
            <li>Excel (.xlsx) - 工單表、客戶表、設備表</li>
            <li>CSV - 逗號分隔，UTF-8 編碼</li>
            <li>JSON - 結構化備份檔案</li>
          </ul>
        </div>

        <div style="margin-bottom:16px">
          <label class="form-label">選擇導入類型</label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div style="padding:12px;background:var(--c-surface2);border-radius:6px;cursor:pointer;text-align:center" 
              onclick="document.getElementById('legacy-type').value='workorders'; LegacyImport.renderTypeUI('workorders')">
              <div style="font-size:1.5rem;margin-bottom:4px">📋</div>
              <div style="font-size:0.9rem;font-weight:500">工單資料</div>
            </div>
            <div style="padding:12px;background:var(--c-surface2);border-radius:6px;cursor:pointer;text-align:center"
              onclick="document.getElementById('legacy-type').value='assets'; LegacyImport.renderTypeUI('assets')">
              <div style="font-size:1.5rem;margin-bottom:4px">🏗</div>
              <div style="font-size:0.9rem;font-weight:500">設備資料</div>
            </div>
            <div style="padding:12px;background:var(--c-surface2);border-radius:6px;cursor:pointer;text-align:center"
              onclick="document.getElementById('legacy-type').value='customers'; LegacyImport.renderTypeUI('customers')">
              <div style="font-size:1.5rem;margin-bottom:4px">👥</div>
              <div style="font-size:0.9rem;font-weight:500">客戶資料</div>
            </div>
            <div style="padding:12px;background:var(--c-surface2);border-radius:6px;cursor:pointer;text-align:center"
              onclick="document.getElementById('legacy-type').value='backup'; LegacyImport.renderTypeUI('backup')">
              <div style="font-size:1.5rem;margin-bottom:4px">💾</div>
              <div style="font-size:0.9rem;font-weight:500">完整備份</div>
            </div>
          </div>
          <input type="hidden" id="legacy-type" value="workorders">
        </div>

        <div id="legacy-import-ui" style="margin-bottom:16px">
          <label class="form-label">上傳檔案 (CSV/JSON)</label>
          <input type="file" id="legacy-file" accept=".csv,.json,.xlsx" style="display:none">
          <button class="btn btn-secondary" onclick="document.getElementById('legacy-file').click()" style="width:100%;margin-bottom:8px">
            📁 選擇檔案
          </button>
          <div id="file-info" style="font-size:0.85rem;color:var(--c-text3);padding:8px;background:var(--c-surface2);border-radius:4px;text-align:center;display:none">
            已選擇: <span id="file-name"></span>
          </div>
        </div>

        <div id="preview-container" style="margin-bottom:16px;display:none">
          <div style="font-size:0.9rem;font-weight:500;margin-bottom:8px">✓ 預覽 (前3行)</div>
          <div id="preview-data" style="font-size:0.85rem;background:var(--c-surface2);padding:12px;border-radius:6px;overflow-x:auto;font-family:monospace;max-height:200px;overflow-y:auto"></div>
        </div>

        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button class="btn btn-secondary" onclick="App.closeModal()">取消</button>
          <button class="btn btn-primary" id="import-btn" onclick="LegacyImport.importFile()" disabled>
            ✓ 開始導入
          </button>
        </div>
      </div>
    `;
    
    App.openModal('導入舊版資料', html, '600px');
    
    document.getElementById('legacy-file').addEventListener('change', async e => {
      const file = e.target.files[0];
      if (!file) return;
      
      document.getElementById('file-name').textContent = file.name;
      document.getElementById('file-info').style.display = 'block';
      document.getElementById('import-btn').disabled = false;
      
      // Show preview
      const preview = await this.readFilePreview(file);
      document.getElementById('preview-data').textContent = preview;
      document.getElementById('preview-container').style.display = 'block';
    });
  },

  async readFilePreview(file) {
    return new Promise((res) => {
      const reader = new FileReader();
      reader.onload = e => {
        const content = e.target.result;
        const lines = content.split('\n').slice(0, 3);
        res(lines.join('\n'));
      };
      reader.readAsText(file);
    });
  },

  renderTypeUI(type) {
    const typeLabels = {
      workorders: '工單資料',
      assets: '設備資料',
      customers: '客戶資料',
      backup: '完整備份'
    };
    
    const hints = {
      workorders: 'CSV 格式: 日期, 工單號, 客戶名, 描述, 金額, 狀態',
      assets: 'CSV 格式: 資產編號, 品牌, 型號, 狀態, 購置日, 保固期',
      customers: 'CSV 格式: 客戶名, 聯絡人, 電話, 地址',
      backup: '上傳之前備份的 JSON 檔案'
    };
    
    const hint = hints[type] || '';
    let ui = `<div style="font-size:0.85rem;color:var(--c-text2);margin-top:8px;padding:8px;background:var(--c-surface2);border-radius:4px">${hint}</div>`;
    
    if (type === 'backup') {
      ui = `<div style="font-size:0.85rem;color:var(--c-text2);margin-top:8px;padding:8px;background:var(--c-surface2);border-radius:4px">💡 上傳使用 auto-backup 導出的 JSON 檔案以復原所有數據</div>`;
    }
    
    document.getElementById('legacy-import-ui').innerHTML = `
      <label class="form-label">上傳檔案 (CSV/JSON)</label>
      <input type="file" id="legacy-file" accept="${type === 'backup' ? '.json' : '.csv,.json,.xlsx'}" style="display:none">
      <button class="btn btn-secondary" onclick="document.getElementById('legacy-file').click()" style="width:100%;margin-bottom:8px">
        📁 選擇 ${type === 'backup' ? 'JSON' : 'CSV/JSON'} 檔案
      </button>
      ${ui}
      <div id="file-info" style="font-size:0.85rem;color:var(--c-text3);padding:8px;background:var(--c-surface2);border-radius:4px;text-align:center;margin-top:8px;display:none">
        已選擇: <span id="file-name"></span>
      </div>
    `;
    
    document.getElementById('legacy-file').addEventListener('change', async e => {
      const file = e.target.files[0];
      if (!file) return;
      
      document.getElementById('file-name').textContent = file.name;
      document.getElementById('file-info').style.display = 'block';
      document.getElementById('import-btn').disabled = false;
      
      const preview = await this.readFilePreview(file);
      document.getElementById('preview-data').textContent = preview;
      document.getElementById('preview-container').style.display = 'block';
    });
  },

  async importFile() {
    const type = document.getElementById('legacy-type').value;
    const fileInput = document.getElementById('legacy-file');
    const file = fileInput.files[0];
    
    if (!file) {
      App.toast('❌ 請選擇檔案', 'error');
      return;
    }

    try {
      App.toast('⏳ 導入中...', 'info');
      const text = await file.text();
      
      if (type === 'backup') {
        await this.importBackupJSON(text);
      } else if (file.name.endsWith('.csv')) {
        await this.importCSV(text, type);
      } else {
        await this.importJSON(text, type);
      }

      App.toast(`✅ 已導入 ${this.getTypeLabel(type)}`, 'success');
      setTimeout(() => { App.closeModal(); location.reload(); }, 1000);
    } catch(e) {
      console.error('Import error:', e);
      App.toast(`❌ 導入失敗: ${e.message}`, 'error');
    }
  },

  async importBackupJSON(text) {
    const data = JSON.parse(text);
    if (!data.data) throw new Error('無效的備份檔案');
    
    const d = data.data;
    const count = 
      (d.workorders?.length || 0) +
      (d.assets?.length || 0) +
      (d.customers?.length || 0);

    if (count === 0) throw new Error('備份中無任何數據');

    // Import each type
    if (d.workorders?.length > 0) {
      for (const w of d.workorders) {
        const existing = await DB.WorkOrders.get(w.id);
        if (!existing) {
          const mapped = this.mapLegacyWorkorder(w);
          await DB.WorkOrders.add(mapped);
        }
      }
    }

    if (d.assets?.length > 0) {
      for (const a of d.assets) {
        const existing = await DB.Assets.get(a.id);
        if (!existing) {
          const mapped = this.mapLegacyAsset(a);
          await DB.Assets.add(mapped);
        }
      }
    }

    if (d.customers?.length > 0) {
      for (const c of d.customers) {
        await DB.add('customers', c);
      }
    }
  },

  async importCSV(text, type) {
    const lines = text.trim().split('\n');
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    let imported = 0;

    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(',').map(v => v.trim());
      const row = {};
      header.forEach((h, idx) => { row[h] = vals[idx]; });

      if (type === 'workorders') {
        const wo = this.mapCSVWorkorder(row);
        const existing = await DB.WorkOrders.get(wo.id);
        if (!existing) {
          await DB.WorkOrders.add(wo);
          imported++;
        }
      } else if (type === 'assets') {
        const asset = this.mapCSVAsset(row);
        const existing = await DB.Assets.get(asset.id);
        if (!existing) {
          await DB.Assets.add(asset);
          imported++;
        }
      } else if (type === 'customers') {
        const cust = this.mapCSVCustomer(row);
        await DB.add('customers', cust);
        imported++;
      }
    }

    if (imported === 0) throw new Error('未導入任何新數據（可能已存在）');
  },

  async importJSON(text, type) {
    const items = JSON.parse(text);
    const arr = Array.isArray(items) ? items : [items];
    let imported = 0;

    for (const item of arr) {
      if (type === 'workorders') {
        const wo = this.mapLegacyWorkorder(item);
        const existing = await DB.WorkOrders.get(wo.id);
        if (!existing) {
          await DB.WorkOrders.add(wo);
          imported++;
        }
      } else if (type === 'assets') {
        const asset = this.mapLegacyAsset(item);
        const existing = await DB.Assets.get(asset.id);
        if (!existing) {
          await DB.Assets.add(asset);
          imported++;
        }
      }
    }

    if (imported === 0) throw new Error('未導入任何新數據');
  },

  mapCSVWorkorder(row) {
    const genId = () => Math.max(0, ...Array.from(document.querySelectorAll('[data-wo-id]')).map(e => parseInt(e.dataset.woId)||0)) + 1;
    return {
      id: genId(),
      woNumber: row['工單號'] || row['wono'] || `WO-${Date.now()}`,
      reportDate: row['日期'] || row['date'] || new Date().toISOString().split('T')[0],
      customerName: row['客戶名'] || row['customer'] || '',
      description: row['描述'] || row['description'] || '',
      totalCost: parseFloat(row['金額'] || row['cost'] || 0),
      status: row['狀態'] || row['status'] || 'completed',
      type: 'general',
      priority: 'normal',
      createdAt: new Date().toISOString()
    };
  },

  mapCSVAsset(row) {
    const genId = () => Math.max(0, ...Array.from(document.querySelectorAll('[data-asset-id]')).map(e => parseInt(e.dataset.assetId)||0)) + 1;
    return {
      id: genId(),
      assetId: row['資產編號'] || row['assetid'] || `A-${Date.now()}`,
      brand: row['品牌'] || row['brand'] || '',
      model: row['型號'] || row['model'] || '',
      status: row['狀態'] || row['status'] || 'on_hand',
      purchaseDate: row['購置日'] || row['purchased'] || new Date().toISOString().split('T')[0],
      warrantyExpiry: row['保固期'] || row['warranty'] || '',
      createdAt: new Date().toISOString()
    };
  },

  mapCSVCustomer(row) {
    return {
      id: Math.random(),
      name: row['客戶名'] || row['name'] || '',
      contact: row['聯絡人'] || row['contact'] || '',
      phone: row['電話'] || row['phone'] || '',
      address: row['地址'] || row['address'] || '',
      createdAt: new Date().toISOString()
    };
  },

  mapLegacyWorkorder(item) {
    return {
      id: item.id || Math.random(),
      woNumber: item.woNumber || item.workOrderNumber || `WO-${Date.now()}`,
      reportDate: item.reportDate || item.date || new Date().toISOString().split('T')[0],
      customerName: item.customerName || item.customer || '',
      description: item.description || item.remarks || '',
      totalCost: item.totalCost || item.cost || 0,
      status: item.status || 'completed',
      type: item.type || 'general',
      priority: item.priority || 'normal',
      createdAt: item.createdAt || new Date().toISOString()
    };
  },

  mapLegacyAsset(item) {
    return {
      id: item.id || Math.random(),
      assetId: item.assetId || item.serialNumber || `A-${Date.now()}`,
      brand: item.brand || item.manufacturer || '',
      model: item.model || item.modelName || '',
      status: item.status || 'on_hand',
      purchaseDate: item.purchaseDate || item.acquired || new Date().toISOString().split('T')[0],
      warrantyExpiry: item.warrantyExpiry || item.warranty || '',
      createdAt: item.createdAt || new Date().toISOString()
    };
  },

  getTypeLabel(type) {
    return { workorders: '工單', assets: '設備', customers: '客戶', backup: '備份' }[type] || type;
  }
};
