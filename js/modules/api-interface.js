/* api-interface.js — REST API for external system integration */
const APIInterface = {
  VERSION: '1.0.0',
  BASE_PATH: '/api/v1',
  _isRunning: false,

  async init() {
    // Initialize API if running in Node/server context
    if (typeof require !== 'undefined') {
      this.setupServerAPI();
    }
  },

  // Public API methods
  async getWorkOrders(filters = {}) {
    const wos = await DB.WorkOrders.all();
    return this.applyFilters(wos, filters);
  },

  async getAssets(filters = {}) {
    const assets = await DB.Assets.all();
    return this.applyFilters(assets, filters);
  },

  async getParts(filters = {}) {
    const parts = await DB.Parts.all();
    return this.applyFilters(parts, filters);
  },

  async getWorkOrder(id) {
    const wo = await DB.WorkOrders.get(id);
    if (!wo) throw new Error('Work order not found');
    return this.formatResponse(wo);
  },

  async createWorkOrder(data) {
    const required = ['woNumber', 'customerName', 'description'];
    for (const field of required) {
      if (!data[field]) throw new Error(`Missing required field: ${field}`);
    }

    const wo = {
      ...data,
      status: 'open',
      priority: data.priority || 'normal',
      type: data.type || 'general',
      createdAt: new Date().toISOString()
    };

    const result = await DB.WorkOrders.add(wo);
    await AuditLogs.log('workorders', result.id, 'CREATE', null, result);
    return this.formatResponse(result);
  },

  async updateWorkOrder(id, data) {
    const wo = await DB.WorkOrders.get(id);
    if (!wo) throw new Error('Work order not found');

    const updated = { ...wo, ...data, updatedAt: new Date().toISOString() };
    await DB.WorkOrders.put(updated);
    await AuditLogs.log('workorders', id, 'UPDATE', wo, updated);
    return this.formatResponse(updated);
  },

  async createAsset(data) {
    const required = ['assetId', 'brand', 'model'];
    for (const field of required) {
      if (!data[field]) throw new Error(`Missing required field: ${field}`);
    }

    const asset = {
      ...data,
      status: data.status || 'on_hand',
      createdAt: new Date().toISOString()
    };

    const result = await DB.Assets.add(asset);
    await AuditLogs.log('assets', result.id, 'CREATE', null, result);
    return this.formatResponse(result);
  },

  async syncInventory(parts) {
    if (!Array.isArray(parts)) throw new Error('Parts must be an array');

    const results = [];
    for (const partData of parts) {
      try {
        const existing = await DB.Parts.all().then(all => 
          all.find(p => p.partNumber === partData.partNumber)
        );

        if (existing) {
          const updated = { 
            ...existing, 
            ...partData, 
            updatedAt: new Date().toISOString() 
          };
          await DB.Parts.put(updated);
          await AuditLogs.log('parts', existing.id, 'UPDATE', existing, updated);
          results.push({ status: 'updated', id: existing.id });
        } else {
          const newPart = {
            ...partData,
            createdAt: new Date().toISOString()
          };
          const result = await DB.Parts.add(newPart);
          await AuditLogs.log('parts', result.id, 'CREATE', null, result);
          results.push({ status: 'created', id: result.id });
        }
      } catch(e) {
        results.push({ status: 'error', partNumber: partData.partNumber, error: e.message });
      }
    }

    return { synced: results.length, results };
  },

  async getStats() {
    const [assets, parts, wos, brands] = await Promise.all([
      DB.Assets.all(),
      DB.Parts.all(),
      DB.WorkOrders.all(),
      DB.Brands.all()
    ]);

    const completedWOs = wos.filter(w => w.status === 'completed');
    const totalRevenue = completedWOs.reduce((s, w) => s + (w.totalCost || 0), 0);
    const lowStock = parts.filter(p => (p.onHand || 0) <= (p.safetyStock || 0));

    return {
      assets: assets.length,
      parts: parts.length,
      workorders: {
        total: wos.length,
        completed: completedWOs.length,
        revenue: totalRevenue
      },
      inventory: {
        totalValue: parts.reduce((s, p) => s + ((p.onHand || 0) * (p.unitCostUSD || 0)), 0),
        lowStockCount: lowStock.length
      },
      brands: brands.length
    };
  },

  async getAuditLog(filters = {}) {
    let logs = await DB.AuditLogs.all();

    if (filters.entityType) {
      logs = logs.filter(l => l.entityType === filters.entityType);
    }
    if (filters.action) {
      logs = logs.filter(l => l.action === filters.action);
    }
    if (filters.startDate) {
      logs = logs.filter(l => new Date(l.timestamp) >= new Date(filters.startDate));
    }
    if (filters.limit) {
      logs = logs.slice(-filters.limit);
    }

    return logs;
  },

  // Helper methods
  applyFilters(items, filters) {
    let result = items;

    if (filters.status) {
      result = result.filter(i => i.status === filters.status);
    }
    if (filters.startDate) {
      result = result.filter(i => 
        !i.createdAt || new Date(i.createdAt) >= new Date(filters.startDate)
      );
    }
    if (filters.endDate) {
      result = result.filter(i => 
        !i.createdAt || new Date(i.createdAt) <= new Date(filters.endDate)
      );
    }
    if (filters.limit) {
      result = result.slice(0, filters.limit);
    }

    return result.map(i => this.formatResponse(i));
  },

  formatResponse(item) {
    return {
      ...item,
      timestamp: new Date().toISOString()
    };
  },

  // Client-side API documentation
  getDocumentation() {
    return {
      version: this.VERSION,
      basePath: this.BASE_PATH,
      endpoints: {
        'GET /workorders': {
          description: '查詢工單清單',
          filters: { status: 'string', startDate: 'ISO date', limit: 'number' },
          example: '/api/v1/workorders?status=completed&limit=10'
        },
        'GET /workorders/:id': {
          description: '取得單一工單詳情'
        },
        'POST /workorders': {
          description: '新建工單',
          required: ['woNumber', 'customerName', 'description'],
          body: 'JSON object'
        },
        'PUT /workorders/:id': {
          description: '修改工單',
          body: 'JSON object with fields to update'
        },
        'GET /assets': {
          description: '查詢設備清單'
        },
        'POST /assets': {
          description: '新增設備',
          required: ['assetId', 'brand', 'model']
        },
        'GET /parts': {
          description: '查詢零件清單'
        },
        'POST /inventory/sync': {
          description: '同步庫存（新增或更新零件）',
          body: 'Array of part objects'
        },
        'GET /stats': {
          description: '取得系統統計數據'
        },
        'GET /audit': {
          description: '查詢審計日誌',
          filters: { entityType: 'string', action: 'string', startDate: 'ISO date', limit: 'number' }
        }
      }
    };
  },

  // Display API documentation in UI
  showAPIDocumentation() {
    const doc = this.getDocumentation();
    const html = `
      <div style="padding:20px;max-height:80vh;overflow-y:auto;font-family:monospace;font-size:0.85rem">
        <h2 style="margin-bottom:16px;font-family:sans-serif">🔌 REST API 文檔</h2>
        
        <div style="background:var(--c-surface2);padding:12px;border-radius:6px;margin-bottom:16px;font-size:0.9rem">
          <div style="margin-bottom:8px"><strong>API 版本:</strong> ${doc.version}</div>
          <div><strong>基礎路徑:</strong> ${doc.basePath}</div>
        </div>

        <div style="background:var(--c-warn-light);color:var(--c-warn);padding:12px;border-radius:6px;margin-bottom:16px;font-size:0.9rem;font-family:sans-serif">
          💡 <strong>注意:</strong> 此為客戶端 API。實際 REST API 需部署到後端服務器
        </div>

        <h3 style="margin-top:20px;margin-bottom:12px;font-family:sans-serif">端點清單</h3>
        ${Object.entries(doc.endpoints).map(([endpoint, info]) => `
          <div style="background:var(--c-surface2);padding:12px;border-radius:6px;margin-bottom:12px;border-left:4px solid var(--c-primary)">
            <div style="font-weight:600;margin-bottom:8px;color:var(--c-primary)">${endpoint}</div>
            <div style="color:var(--c-text2);margin-bottom:6px">${info.description}</div>
            ${info.required ? `<div style="color:var(--c-warn);margin-bottom:6px">必要欄位: ${info.required.join(', ')}</div>` : ''}
            ${info.filters ? `<div style="color:var(--c-text3)">篩選: ${Object.keys(info.filters).join(', ')}</div>` : ''}
            ${info.example ? `<div style="color:var(--c-primary);margin-top:8px">範例: <code>${info.example}</code></div>` : ''}
          </div>
        `).join('')}

        <h3 style="margin-top:20px;margin-bottom:12px;font-family:sans-serif">使用範例</h3>
        <div style="background:var(--c-surface2);padding:12px;border-radius:6px;margin-bottom:12px;overflow-x:auto">
          <pre style="margin:0;color:var(--c-text)">// 查詢已完成的工單
const wos = await APIInterface.getWorkOrders({ status: 'completed' });

// 新建工單
const newWO = await APIInterface.createWorkOrder({
  woNumber: 'WO-2024-001',
  customerName: '台灣高空',
  description: '設備維修',
  priority: 'high'
});

// 同步庫存
const result = await APIInterface.syncInventory([
  { partNumber: 'P001', name: '螺栓', onHand: 100 }
]);

// 取得統計
const stats = await APIInterface.getStats();</pre>
        </div>

        <div style="text-align:right;margin-top:20px">
          <button class="btn btn-secondary" onclick="App.closeModal()">關閉</button>
          <button class="btn btn-secondary" onclick="APIInterface.exportAsJSON()" style="margin-left:8px">💾 匯出 API 客戶端</button>
        </div>
      </div>
    `;

    App.openModal('REST API 文檔', html, '1000px');
  },

  // Export API client code
  exportAsJSON() {
    const clientCode = this.generateClientCode();
    const blob = new Blob([clientCode], { type: 'text/javascript;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'aerial-erp-api-client.js';
    link.click();
    App.toast('✅ 已匯出 API 客戶端程式碼', 'success');
  },

  generateClientCode() {
    return `
/**
 * Taiwan Aerial ERP - API Client
 * Version: ${this.VERSION}
 * Base Path: ${this.BASE_PATH}
 */

class AerialERPClient {
  constructor(baseUrl = 'http://localhost:8080') {
    this.baseUrl = baseUrl;
  }

  async request(method, endpoint, data = null) {
    const url = this.baseUrl + '${this.BASE_PATH}' + endpoint;
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    };
    if (data) options.body = JSON.stringify(data);

    const res = await fetch(url, options);
    if (!res.ok) throw new Error(\`API Error: \${res.status} \${res.statusText}\`);
    return res.json();
  }

  // Workorders
  getWorkOrders(filters) { return this.request('GET', '/workorders?' + new URLSearchParams(filters)); }
  getWorkOrder(id) { return this.request('GET', \`/workorders/\${id}\`); }
  createWorkOrder(data) { return this.request('POST', '/workorders', data); }
  updateWorkOrder(id, data) { return this.request('PUT', \`/workorders/\${id}\`, data); }

  // Assets
  getAssets(filters) { return this.request('GET', '/assets?' + new URLSearchParams(filters)); }
  createAsset(data) { return this.request('POST', '/assets', data); }

  // Parts
  getParts(filters) { return this.request('GET', '/parts?' + new URLSearchParams(filters)); }
  syncInventory(parts) { return this.request('POST', '/inventory/sync', parts); }

  // Stats
  getStats() { return this.request('GET', '/stats'); }
  getAuditLog(filters) { return this.request('GET', '/audit?' + new URLSearchParams(filters)); }
}

// Usage example
// const client = new AerialERPClient('http://your-erp-server:8080');
// const workorders = await client.getWorkOrders({ status: 'completed', limit: 10 });
// console.log(workorders);
`;
  }
};
