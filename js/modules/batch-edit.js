/* batch-edit.js — Batch editing and bulk updates */
const BatchEdit = {
  _selected: new Map(), // Map<type, Set<id>>

  init() {
    this._selected = new Map([
      ['parts', new Set()],
      ['assets', new Set()],
      ['workorders', new Set()]
    ]);
  },

  toggleSelect(type, id) {
    if (!this._selected.has(type)) {
      this._selected.set(type, new Set());
    }
    const set = this._selected.get(type);
    if (set.has(id)) {
      set.delete(id);
    } else {
      set.add(id);
    }
  },

  isSelected(type, id) {
    return this._selected.get(type)?.has(id) || false;
  },

  getSelectedCount(type) {
    return this._selected.get(type)?.size || 0;
  },

  clearSelection(type) {
    this._selected.get(type)?.clear();
  },

  async showBatchEditDialog(type) {
    const selected = Array.from(this._selected.get(type) || []);
    if (selected.length === 0) {
      App.toast('❌ 請先選擇至少一項', 'error');
      return;
    }

    const fields = this.getEditableFields(type);
    
    const html = `
      <div style="padding:20px;max-height:70vh;overflow-y:auto">
        <h3 style="margin-bottom:4px">📝 批量編輯</h3>
        <p style="color:var(--c-text3);font-size:0.9rem;margin-bottom:20px">
          已選擇 ${selected.length} 項 ${this.getTypeLabel(type)}
        </p>

        <div style="background:var(--c-surface2);padding:16px;border-radius:8px;margin-bottom:20px">
          ${fields.map(f => `
            <div class="form-group" style="margin-bottom:16px">
              <label class="form-label">${f.label}</label>
              <div style="display:flex;gap:8px;align-items:center">
                <input type="checkbox" id="batch-edit-${f.key}" onchange="document.getElementById('batch-edit-${f.key}-value').disabled = !this.checked">
                ${this.renderFieldInput(f, 'batch-edit-')}
              </div>
              <div style="font-size:0.8rem;color:var(--c-text3);margin-top:4px">留空則不修改此欄位</div>
            </div>
          `).join('')}
        </div>

        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button class="btn btn-secondary" onclick="App.closeModal()">取消</button>
          <button class="btn btn-primary" onclick="BatchEdit.applyBatchEdit('${type}')">
            ✓ 套用修改
          </button>
        </div>
      </div>
    `;

    App.openModal('批量編輯', html, '500px');
  },

  getEditableFields(type) {
    const fields = {
      parts: [
        { key: 'category', label: '分類 Category', type: 'select', options: ['一般零件', '易消耗品', '配件', '特殊件'] },
        { key: 'safetyStock', label: '安全庫存 Safety Stock', type: 'number' },
        { key: 'status', label: '狀態 Status', type: 'select', options: ['活躍', '停用', '待審核'] }
      ],
      assets: [
        { key: 'status', label: '狀態 Status', type: 'select', options: ['on_hand', 'in_use', 'in_maintenance', 'retired'] },
        { key: 'location', label: '位置 Location', type: 'text' },
        { key: 'technicianId', label: '負責人 Owner', type: 'text' }
      ],
      workorders: [
        { key: 'status', label: '狀態 Status', type: 'select', options: ['open', 'in_progress', 'completed', 'cancelled'] },
        { key: 'priority', label: '優先級 Priority', type: 'select', options: ['low', 'normal', 'high', 'urgent'] },
        { key: 'technicianName', label: '負責技師 Technician', type: 'text' }
      ]
    };
    return fields[type] || [];
  },

  getTypeLabel(type) {
    return { parts: '零件', assets: '設備', workorders: '工單' }[type] || type;
  },

  renderFieldInput(field, prefix) {
    const id = `${prefix}${field.key}-value`;
    if (field.type === 'select') {
      return `
        <select id="${id}" disabled style="flex:1;padding:8px;border:1px solid var(--c-border);border-radius:4px;background:var(--c-surface);color:var(--c-text)">
          <option value="">- 保持現狀 -</option>
          ${field.options.map(o => `<option value="${o}">${o}</option>`).join('')}
        </select>
      `;
    } else if (field.type === 'number') {
      return `
        <input type="number" id="${id}" disabled placeholder="輸入數值" 
          style="flex:1;padding:8px;border:1px solid var(--c-border);border-radius:4px;background:var(--c-surface);color:var(--c-text)">
      `;
    } else {
      return `
        <input type="text" id="${id}" disabled placeholder="輸入文字" 
          style="flex:1;padding:8px;border:1px solid var(--c-border);border-radius:4px;background:var(--c-surface);color:var(--c-text)">
      `;
    }
  },

  async applyBatchEdit(type) {
    const selected = Array.from(this._selected.get(type) || []);
    const fields = this.getEditableFields(type);
    const updates = {};

    // 收集要修改的欄位
    for (const f of fields) {
      const checkbox = document.getElementById(`batch-edit-${f.key}`);
      const input = document.getElementById(`batch-edit-${f.key}-value`);
      
      if (checkbox.checked && input.value) {
        const value = f.type === 'number' ? parseFloat(input.value) : input.value;
        updates[f.key] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      App.toast('❌ 請至少修改一個欄位', 'error');
      return;
    }

    try {
      App.toast('⏳ 正在更新...', 'info');
      let count = 0;

      if (type === 'parts') {
        for (const id of selected) {
          const part = await DB.Parts.get(id);
          if (part) {
            const updated = { ...part, ...updates, updatedAt: new Date().toISOString() };
            await DB.Parts.put(updated);
            await AuditLogs.log('parts', id, 'UPDATE', part, updated);
            count++;
          }
        }
      } else if (type === 'assets') {
        for (const id of selected) {
          const asset = await DB.Assets.get(id);
          if (asset) {
            const updated = { ...asset, ...updates, updatedAt: new Date().toISOString() };
            await DB.Assets.put(updated);
            await AuditLogs.log('assets', id, 'UPDATE', asset, updated);
            count++;
          }
        }
      } else if (type === 'workorders') {
        for (const id of selected) {
          const wo = await DB.WorkOrders.get(id);
          if (wo) {
            const updated = { ...wo, ...updates, updatedAt: new Date().toISOString() };
            await DB.WorkOrders.put(updated);
            await AuditLogs.log('workorders', id, 'UPDATE', wo, updated);
            count++;
          }
        }
      }

      App.toast(`✅ 已更新 ${count} 項`, 'success');
      this.clearSelection(type);
      App.closeModal();
      
      // 重新載入相關頁面
      if (type === 'parts' && window.InventoryModule) InventoryModule.render();
      if (type === 'assets' && window.AssetsModule) AssetsModule.render();
      if (type === 'workorders' && window.WorkOrdersModule) WorkOrdersModule.render();
    } catch(e) {
      console.error('Batch edit error:', e);
      App.toast(`❌ 更新失敗: ${e.message}`, 'error');
    }
  },

  // 創建批量編輯 UI 按鈕
  renderBatchEditButton(type) {
    const count = this.getSelectedCount(type);
    if (count === 0) return '';
    
    return `
      <button class="btn btn-info" onclick="BatchEdit.showBatchEditDialog('${type}')" title="批量編輯選中項目">
        ✏️ 編輯 ${count} 項
      </button>
    `;
  },

  // 為表格行添加 checkbox
  renderCheckbox(type, id, isSelected = false) {
    return `
      <input type="checkbox" ${isSelected ? 'checked' : ''} 
        onchange="BatchEdit.toggleSelect('${type}', ${id})" 
        style="cursor:pointer;width:18px;height:18px">
    `;
  }
};
