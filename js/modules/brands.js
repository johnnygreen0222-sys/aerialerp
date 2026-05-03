/* brands.js — Brands & Models Module */
const BrandsModule = {
  _brands:[], _models:[], _tab:'brands',

  async render() {
    [this._brands, this._models] = await Promise.all([DB.Brands.all(), DB.Models.all()]);
    this.renderView();
  },

  renderView() {
    const el = document.getElementById('page-content');
    el.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h2>品牌型號庫 Brands & Models</h2>
          <p>管理代理品牌、機型規格與原廠零件對應</p>
        </div>
        <div class="page-header-right">
          ${this._tab==='brands'
            ? (App.can('brands') ? `<button class="btn btn-secondary" onclick="BulkImport.showImportForm('brands')" style="margin-right:8px">📥 批量導入</button><button class="btn btn-primary" onclick="BrandsModule.showBrandForm()">＋ 新增品牌</button>` : '')
            : (App.can('brands') ? `<button class="btn btn-secondary" onclick="BulkImport.showImportForm('models')" style="margin-right:8px">📥 批量導入</button><button class="btn btn-primary" onclick="BrandsModule.showModelForm()">＋ 新增型號</button>` : '')}
        </div>
      </div>

      <div class="tabs">
        <div class="tab-btn ${this._tab==='brands'?'active':''}" onclick="BrandsModule._tab='brands'; BrandsModule.renderView()">品牌管理</div>
        <div class="tab-btn ${this._tab==='models'?'active':''}" onclick="BrandsModule._tab='models'; BrandsModule.renderView()">型號規格</div>
      </div>

      ${this._tab==='brands' ? this.renderBrands() : this.renderModels()}`;
    
    // Enable drag-sort for brands
    if (this._tab === 'brands') {
      setTimeout(() => {
        const grid = document.getElementById('brands-grid');
        if (grid) DragSort.enable(grid, 'brands', () => this.render());
      }, 0);
    }
  },

  renderBrands() {
    const modelCount = id => this._models.filter(m=>m.brandId===id).length;
    if (this._brands.length === 0) return `<div class="empty-state"><div class="empty-icon">🏷</div><p>尚無品牌資料</p></div>`;
    
    const allIds = this._brands.map(b => b.id);
    const sorted = DragSort.getSortedIds('brands', allIds);
    const brandMap = Object.fromEntries(this._brands.map(b => [b.id, b]));
    
    return `<div class="grid-auto" id="brands-grid" style="position:relative">
          ${sorted.map(id => {
            const b = brandMap[id];
            return `
            <div class="card" data-id="${b.id}" style="cursor:grab;transition:all 0.2s ease">
              <div class="card-header">
                <div style="display:flex;align-items:center;gap:10px">
                  <span style="font-size:2rem">${b.logo||'🏷'}</span>
                  <div>
                    <div style="font-weight:700;font-size:1.05rem">${b.name}</div>
                    <div class="text-xs text-muted">${b.country||''}</div>
                  </div>
                </div>
                <div class="action-row">
                  ${App.can('brands') ? `<button class="btn btn-sm btn-secondary" onclick="BrandsModule.showBrandForm(${b.id})">✏</button>` : ''}
                  ${App.can('brands') ? `<button class="btn btn-sm btn-info" onclick="BrandsModule.copyBrand(${b.id})" title="複製">📋</button>` : ''}
                  ${App.can('brands') ? `<button class="btn btn-sm btn-danger" onclick="BrandsModule.removeBrand(${b.id})">🗑</button>` : ''}
                </div>
              </div>
              <p class="text-sm" style="margin-bottom:12px">${b.description||''}</p>
              <div style="display:flex;align-items:center;justify-content:space-between">
                <span class="chip">🏗 ${modelCount(b.id)} 型號</span>
                <button class="btn btn-sm btn-secondary" onclick="BrandsModule._tab='models'; BrandsModule.renderView()">查看型號</button>
              </div>
            </div>`}).join('')}
        </div>`;
  },

  renderModels() {
    const brandMap = Object.fromEntries(this._brands.map(b=>[b.id,b]));
    return `
      <div class="table-wrap table-responsive">
        <table class="data-table">
          <thead><tr>
            <th>型號 Model</th><th>品牌</th><th>類型</th>
            <th>最大高度</th><th>最大承載</th><th>動力型式</th><th>整機重量</th><th>操作</th>
          </tr></thead>
          <tbody>
          ${this._models.length===0
            ? `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">🏗</div><p>尚無型號資料</p></div></td></tr>`
            : this._models.map(m => {
                const b = brandMap[m.brandId]||{};
                return `<tr>
                  <td><strong>${m.modelName}</strong></td>
                  <td>${b.logo||''} ${b.name||'—'}</td>
                  <td><span class="chip">${m.category||'—'}</span></td>
                  <td>${m.maxHeight ? m.maxHeight+' m' : '—'}</td>
                  <td>${m.maxCapacity ? m.maxCapacity+' kg' : '—'}</td>
                  <td>${m.engineType||'—'}</td>
                  <td>${m.weight ? (m.weight/1000).toFixed(1)+' t' : '—'}</td>
                  <td>
                    <div class="action-row">
                      ${App.can('brands') ? `<button class="btn btn-sm btn-secondary" onclick="BrandsModule.showModelForm(${m.id})">✏</button>` : ''}
                      ${App.can('brands') ? `<button class="btn btn-sm btn-info" onclick="BrandsModule.copyModel(${m.id})" title="複製">📋</button>` : ''}
                      ${App.can('brands') ? `<button class="btn btn-sm btn-danger" onclick="BrandsModule.removeModel(${m.id})">🗑</button>` : ''}
                    </div>
                  </td>
                </tr>`;
              }).join('')}
          </tbody>
        </table>
      </div>`;
  },

  showBrandForm(id) {
    const brand = id ? this._brands.find(b=>b.id===id) : null;
    App.openModal(id?'編輯品牌':'新增品牌', `
      <form id="brand-form" onsubmit="BrandsModule.saveBrand(event)">
        <input type="hidden" id="bf-id" value="${brand?.id||''}">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">品牌名稱 <span>*</span></label>
            <input class="form-control" id="bf-name" value="${brand?.name||''}" required placeholder="例：JLG">
          </div>
          <div class="form-group">
            <label class="form-label">Logo Emoji</label>
            <input class="form-control" id="bf-logo" value="${brand?.logo||'🏷'}" placeholder="🏷">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">原廠國家</label>
          <input class="form-control" id="bf-country" value="${brand?.country||''}" placeholder="例：USA">
        </div>
        <div class="form-group">
          <label class="form-label">品牌描述</label>
          <textarea class="form-control" id="bf-desc">${brand?.description||''}</textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="App.closeModal()">取消</button>
          <button type="submit" class="btn btn-primary">💾 儲存</button>
        </div>
      </form>`, 'modal-sm');
  },

  async saveBrand(e) {
    e.preventDefault();
    const id = document.getElementById('bf-id').value;
    const obj = {
      name: document.getElementById('bf-name').value.trim(),
      logo: document.getElementById('bf-logo').value.trim(),
      country: document.getElementById('bf-country').value.trim(),
      description: document.getElementById('bf-desc').value.trim()
    };

    if (!id) {
      const existing = this._brands.find(b => b.name.toLowerCase() === obj.name.toLowerCase());
      if (existing) {
        App.toast(`⚠️ 品牌「${obj.name}」已存在，請檢查是否重複`, 'warning');
        return;
      }
    }

    if (id) {
      obj.id = parseInt(id);
      const oldData = await DB.Brands.get(obj.id);
      await DB.AuditLogs.log('Brand', obj.id, 'UPDATE', oldData, obj, App.state.user?.id);
    } else {
      const result = await DB.Brands.save(obj);
      await DB.AuditLogs.log('Brand', result.id, 'CREATE', null, result, App.state.user?.id);
    }
    if (!id) await DB.Brands.save(obj);
    else await DB.Brands.save(obj);
    App.closeModal(); App.toast('品牌已儲存 ✓','success');
    await this.render();
  },

  async removeBrand(id) {
    if (!confirm('確定刪除此品牌？相關型號將失去品牌關聯。')) return;
    const oldData = await DB.Brands.get(id);
    await DB.AuditLogs.log('Brand', id, 'DELETE', oldData, null, App.state.user?.id);
    await DB.Brands.remove(id); App.toast('品牌已刪除','warning');
    await this.render();
  },

  showModelForm(id) {
    const model = id ? this._models.find(m=>m.id===id) : null;
    const cats = ['Scissor Lift','Articulating Boom','Telescopic Boom','Mast Lift','Vertical Lift','Other'];
    const engines = ['Electric','Diesel','Dual Fuel','Gas','Hybrid'];
    App.openModal(id?'編輯型號':'新增型號', `
      <form id="model-form" onsubmit="BrandsModule.saveModel(event)">
        <input type="hidden" id="mf-id" value="${model?.id||''}">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">品牌 <span>*</span></label>
            <select class="form-control" id="mf-brand" required>
              <option value="">選擇品牌…</option>
              ${this._brands.map(b=>`<option value="${b.id}" ${model?.brandId===b.id?'selected':''}>${b.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">型號名稱 <span>*</span></label>
            <input class="form-control" id="mf-name" value="${model?.modelName||''}" required placeholder="例：JLG 1930ES">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">設備類型</label>
            <select class="form-control" id="mf-cat">
              ${cats.map(c=>`<option value="${c}" ${model?.category===c?'selected':''}>${c}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">動力型式</label>
            <select class="form-control" id="mf-engine">
              ${engines.map(e=>`<option value="${e}" ${model?.engineType===e?'selected':''}>${e}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row cols-3">
          <div class="form-group">
            <label class="form-label">最大高度 (m)</label>
            <input class="form-control" type="number" id="mf-height" step="0.01" value="${model?.maxHeight||''}">
          </div>
          <div class="form-group">
            <label class="form-label">最大承載 (kg)</label>
            <input class="form-control" type="number" id="mf-cap" value="${model?.maxCapacity||''}">
          </div>
          <div class="form-group">
            <label class="form-label">整機重量 (kg)</label>
            <input class="form-control" type="number" id="mf-weight" value="${model?.weight||''}">
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="App.closeModal()">取消</button>
          <button type="submit" class="btn btn-primary">💾 儲存</button>
        </div>
      </form>`);
  },

  async saveModel(e) {
    e.preventDefault();
    const id = document.getElementById('mf-id').value;
    const obj = {
      brandId:     parseInt(document.getElementById('mf-brand').value),
      modelName:   document.getElementById('mf-name').value.trim(),
      category:    document.getElementById('mf-cat').value,
      engineType:  document.getElementById('mf-engine').value,
      maxHeight:   parseFloat(document.getElementById('mf-height').value)||null,
      maxCapacity: parseFloat(document.getElementById('mf-cap').value)||null,
      weight:      parseFloat(document.getElementById('mf-weight').value)||null,
    };

    if (!id) {
      const existing = this._models.find(m => 
        m.modelName.toLowerCase() === obj.modelName.toLowerCase() && m.brandId === obj.brandId
      );
      if (existing) {
        App.toast(`⚠️ 型號「${obj.modelName}」在此品牌中已存在`, 'warning');
        return;
      }
    }

    if (id) {
      obj.id = parseInt(id);
      const oldData = await DB.Models.get(obj.id);
      await DB.AuditLogs.log('Model', obj.id, 'UPDATE', oldData, obj, App.state.user?.id);
      await DB.Models.save(obj);
    } else {
      const result = await DB.Models.save(obj);
      await DB.AuditLogs.log('Model', result.id, 'CREATE', null, result, App.state.user?.id);
    }
    App.closeModal(); App.toast('型號已儲存 ✓','success');
    await this.render();
  },

  async removeModel(id) {
    if (!confirm('確定刪除此型號？')) return;
    const oldData = await DB.Models.get(id);
    await DB.AuditLogs.log('Model', id, 'DELETE', oldData, null, App.state.user?.id);
    await DB.Models.remove(id); App.toast('型號已刪除','warning');
    await this.render();
  },

  async copyBrand(id) {
    const brand = this._brands.find(b=>b.id===id);
    if (!brand) return;
    const newBrand = {...brand};
    delete newBrand.id;
    newBrand.name = `${brand.name} (複本)`;
    await DB.Brands.save(newBrand);
    App.toast(`已複製品牌「${brand.name}」✓`, 'success');
    await this.render();
  },

  async copyModel(id) {
    const model = this._models.find(m=>m.id===id);
    if (!model) return;
    const newModel = {...model};
    delete newModel.id;
    newModel.modelName = `${model.modelName} (複本)`;
    await DB.Models.save(newModel);
    App.toast(`已複製型號「${model.modelName}」✓`, 'success');
    await this.render();
  }
};
