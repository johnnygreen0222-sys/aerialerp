/* filter-presets.js — Advanced Filter Presets Manager */
const FilterPresets = (() => {
  const STORAGE_KEY = 'filter_presets';

  const init = async () => {
    const presets = await getPresets();
    window._filterPresets = presets || {};
  };

  const getPresets = async () => {
    const stored = await DB.getSetting(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  };

  const savePresets = async (presets) => {
    await DB.setSetting(STORAGE_KEY, JSON.stringify(presets));
    window._filterPresets = presets;
  };

  const savePreset = async (page, name, filterObj) => {
    const presets = window._filterPresets || {};
    if (!presets[page]) presets[page] = {};
    presets[page][name] = filterObj;
    await savePresets(presets);
    App.toast(`💾 已保存篩選預設「${name}」`, 'success');
  };

  const loadPreset = (page, name) => {
    const presets = window._filterPresets || {};
    return presets[page]?.[name];
  };

  const deletePreset = async (page, name) => {
    const presets = window._filterPresets || {};
    delete presets[page]?.[name];
    await savePresets(presets);
    App.toast(`🗑 已刪除篩選預設「${name}」`, 'warning');
  };

  const getPagePresets = (page) => {
    return window._filterPresets?.[page] || {};
  };

  const renderPresetButtons = (page) => {
    const presets = getPagePresets(page);
    const presetNames = Object.keys(presets);
    
    if (presetNames.length === 0) return '';

    return `
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
        <span style="font-size:0.85rem;color:var(--c-text3);align-self:center">📌 預設:</span>
        ${presetNames.map(name => `
          <button class="btn btn-sm" style="background:var(--c-surface2);border:1px solid var(--c-border)" 
            onclick="FilterPresets.applyPreset('${page}', '${name}')" 
            title="應用此預設">
            ${name}
            <span style="margin-left:6px;cursor:pointer;color:var(--c-red)" onclick="event.stopPropagation(); FilterPresets.deletePreset('${page}', '${name}'); location.reload()">✕</span>
          </button>
        `).join('')}
      </div>`;
  };

  const applyPreset = (page, name) => {
    const preset = loadPreset(page, name);
    if (!preset) return;

    if (page === 'inventory') {
      InventoryModule._filter = {...preset};
      InventoryModule.renderView();
      App.toast(`✨ 已應用篩選預設「${name}」`, 'success');
    } else if (page === 'brands') {
      BrandsModule._filter = {...preset};
      BrandsModule.renderView();
      App.toast(`✨ 已應用篩選預設「${name}」`, 'success');
    } else if (page === 'workorders') {
      WorkOrdersModule._filter = {...preset};
      WorkOrdersModule.renderView();
      App.toast(`✨ 已應用篩選預設「${name}」`, 'success');
    }
  };

  const showSavePresetDialog = (page, currentFilter, filterNames) => {
    const filterDesc = filterNames.map(f => `${f}: ${currentFilter[f]}`).join(', ');
    App.openModal('💾 保存篩選預設', `
      <div style="margin-bottom:16px">
        <div class="text-sm text-muted" style="margin-bottom:10px">當前篩選條件:</div>
        <div style="padding:10px;background:var(--c-surface);border-radius:6px;font-size:0.9rem">
          ${filterDesc || '無'}
        </div>
      </div>
      <form onsubmit="FilterPresets.processSavePreset(event, '${page}', ${JSON.stringify(filterNames)})">
        <div class="form-group">
          <label class="form-label">預設名稱</label>
          <input class="form-control" id="preset-name" placeholder="例：JLG低庫存、缺貨零件…" required style="max-width:300px">
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="App.closeModal()">取消</button>
          <button type="submit" class="btn btn-primary">💾 保存預設</button>
        </div>
      </form>`, 'modal-sm');
    setTimeout(() => document.getElementById('preset-name').focus(), 100);
  };

  const processSavePreset = async (e, page, filterNames) => {
    e.preventDefault();
    const presetName = document.getElementById('preset-name').value.trim();
    if (!presetName) return;

    let filterObj = {};
    if (page === 'inventory') {
      filterObj = InventoryModule._filter;
    } else if (page === 'brands') {
      filterObj = BrandsModule._filter;
    } else if (page === 'workorders') {
      filterObj = WorkOrdersModule._filter;
    }

    await savePreset(page, presetName, filterObj);
    App.closeModal();
    location.reload();
  };

  return {
    init,
    getPresets,
    savePreset,
    loadPreset,
    deletePreset,
    renderPresetButtons,
    applyPreset,
    showSavePresetDialog,
    processSavePreset
  };
})();
