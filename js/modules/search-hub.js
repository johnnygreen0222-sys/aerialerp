/* search-hub.js — Global Search Module (Ctrl+K) */
const SearchHub = (() => {
  let searchModal = null;
  let searchResults = [];
  let searchIndex = 0;

  const buildSearchIndex = async () => {
    const index = [];

    // 搜尋零件
    const parts = await DB.Parts.all();
    parts.forEach(p => {
      index.push({
        type: 'part',
        id: p.id,
        name: p.name,
        subtext: `料號: ${p.partNumber}`,
        icon: '📦',
        action: () => {
          window.location.hash = '#/inventory';
          setTimeout(() => InventoryModule._filter.q = p.partNumber, 100);
        }
      });
    });

    // 搜尋型號
    const models = await DB.Models.all();
    const brands = await DB.Brands.all();
    const brandMap = Object.fromEntries(brands.map(b=>[b.id,b]));
    models.forEach(m => {
      const brand = brandMap[m.brandId];
      index.push({
        type: 'model',
        id: m.id,
        name: m.modelName,
        subtext: `品牌: ${brand?.name||'—'}`,
        icon: '🏗',
        action: () => {
          window.location.hash = '#/brands';
          setTimeout(() => { BrandsModule._tab='models'; BrandsModule.renderView(); }, 100);
        }
      });
    });

    // 搜尋設備
    const assets = await DB.Assets.all();
    assets.forEach(a => {
      index.push({
        type: 'asset',
        id: a.id,
        name: a.assetName || `設備 #${a.id}`,
        subtext: `編號: ${a.serialNumber}`,
        icon: '🏗',
        action: () => {
          window.location.hash = '#/assets';
          setTimeout(() => AssetsModule._filter.q = a.serialNumber, 100);
        }
      });
    });

    // 搜尋工單
    const workorders = await DB.WorkOrders.all();
    workorders.forEach(w => {
      index.push({
        type: 'workorder',
        id: w.id,
        name: `工單 #${w.id}`,
        subtext: `狀態: ${w.status}`,
        icon: '📋',
        action: () => {
          window.location.hash = '#/workorders';
          setTimeout(() => WorkOrdersModule._filter.status = w.status, 100);
        }
      });
    });

    return index;
  };

  const search = (query, index) => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return index.filter(item =>
      item.name.toLowerCase().includes(q) ||
      item.subtext.toLowerCase().includes(q)
    ).slice(0, 10);
  };

  const renderSearchPanel = (results) => {
    return `
      <div style="padding:16px;max-height:400px;overflow-y:auto">
        ${results.length===0
          ? '<div style="text-align:center;color:var(--c-text3);padding:20px">無搜尋結果</div>'
          : results.map((r,i) => `
            <div class="search-result-item ${i===searchIndex?'active':''}" 
              style="padding:10px;margin:8px 0;border-radius:6px;cursor:pointer;background:${i===searchIndex?'var(--c-surface2)':'transparent'};transition:background .15s"
              onclick="SearchHub.selectResult(${i})"
              onmouseover="SearchHub.setIndex(${i})">
              <div style="display:flex;gap:10px;align-items:start">
                <span style="font-size:1.2rem">${r.icon}</span>
                <div style="flex:1;min-width:0">
                  <div style="font-weight:600;color:var(--c-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.name}</div>
                  <div style="font-size:0.85rem;color:var(--c-text3);margin-top:4px">${r.subtext}</div>
                </div>
              </div>
            </div>
          `).join('')}
      </div>`;
  };

  const setIndex = (idx) => {
    searchIndex = idx;
  };

  const selectResult = (idx) => {
    if (searchResults[idx]) {
      searchResults[idx].action();
      App.closeModal();
    }
  };

  const open = async () => {
    const index = await buildSearchIndex();
    App.openModal('🔍 全局搜尋', `
      <div style="display:grid;grid-template-columns:1fr 280px;gap:16px;min-height:300px"><div>
        <input type="text" id="search-input" 
          placeholder="搜尋零件、型號、設備、工單…" 
          style="width:100%;padding:10px;border:1px solid var(--c-border);border-radius:6px;font-size:1rem;margin-bottom:12px;background:var(--c-surface);color:var(--c-text)"
          oninput="SearchHub.performSearch(this.value)"
          onkeydown="SearchHub.handleKeys(event)">
        <div id="search-results"></div>
      </div>
      <script>
        setTimeout(() => document.getElementById('search-input').focus(), 100);
      </script>`, 'modal-md');

    // 保存索引到全局變量供搜尋使用
    window._searchIndex = index;
    searchResults = [];
    searchIndex = 0;
  };


  const updateHistoryPanel = () => {
    const historyDiv = document.getElementById("search-history-panel");
    if (historyDiv && SearchHistory) {
      historyDiv.innerHTML = SearchHistory.renderHistoryPanel();
    }
  };  const performSearch = (query) => {
    if (query.trim().length >= 2 const performSearch = (query) => {const performSearch = (query) => { SearchHistory) SearchHistory.add(query, "global");
    searchResults = search(query, window._searchIndex || []);
    searchIndex = 0;
    const resultsDiv = document.getElementById('search-results');
    if (resultsDiv) resultsDiv.innerHTML = renderSearchPanel(searchResults);
  };

  const handleKeys = (e) => {
    if (e.key === 'Enter') {
      selectResult(searchIndex);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      searchIndex = Math.min(searchIndex + 1, searchResults.length - 1);
      const resultsDiv = document.getElementById('search-results');
      if (resultsDiv) resultsDiv.innerHTML = renderSearchPanel(searchResults);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      searchIndex = Math.max(searchIndex - 1, 0);
      const resultsDiv = document.getElementById('search-results');
      if (resultsDiv) resultsDiv.innerHTML = renderSearchPanel(searchResults);
    }
  };

  return {
    updateHistoryPanel,
    open,
    performSearch,
    handleKeys,
    selectResult,
    setIndex
  };
})();
