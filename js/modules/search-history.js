/* search-history.js — Search history and quick access */
const SearchHistory = {
  MAX_HISTORY: 20,
  _history: [],

  async init() {
    this._history = await DB.getSetting('searchHistory') || [];
  },

  async add(query, type = 'global') {
    if (!query || query.trim().length < 2) return;
    
    const now = new Date().toISOString();
    const item = { query: query.trim(), type, timestamp: now, count: 1 };
    
    // Check if exists and increment
    const existing = this._history.findIndex(h => 
      h.query.toLowerCase() === query.toLowerCase() && h.type === type
    );
    
    if (existing >= 0) {
      this._history[existing].count++;
      this._history[existing].timestamp = now;
      // Move to top
      const moved = this._history.splice(existing, 1)[0];
      this._history.unshift(moved);
    } else {
      this._history.unshift(item);
    }

    // Keep only latest
    this._history = this._history.slice(0, this.MAX_HISTORY);
    await DB.setSetting('searchHistory', this._history);
  },

  renderHistoryPanel() {
    if (!this._history || this._history.length === 0) {
      return `<div style="padding:12px;color:var(--c-text3);font-size:0.85rem;text-align:center">
        🔍 尚無搜尋紀錄
      </div>`;
    }

    return `
      <div style="padding:8px 0;max-height:400px;overflow-y:auto">
        <div style="padding:8px 12px;font-size:0.75rem;color:var(--c-text3);font-weight:600;text-transform:uppercase">
          最近搜尋
        </div>
        ${this._history.map((h, i) => `
          <div style="padding:8px 12px;border-bottom:1px solid var(--c-surface2);cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:8px" 
            onmouseover="this.style.background='var(--c-surface2)'" onmouseout="this.style.background=''"
            onclick="SearchHub.performSearch('${h.query.replace(/'/g, "\\'")}'); SearchHistory.add('${h.query.replace(/'/g, "\\'")}')">
            <div style="flex:1;min-width:0">
              <div style="font-size:0.9rem;color:var(--c-text);word-break:break-word">${this.escapeHtml(h.query)}</div>
              <div style="font-size:0.75rem;color:var(--c-text3)">
                ${this.getTypeLabel(h.type)} · ${this.getRelativeTime(h.timestamp)}
              </div>
            </div>
            <div style="display:flex;gap:4px;align-items:center">
              <span style="font-size:0.75rem;color:var(--c-text3);background:var(--c-surface2);padding:2px 6px;border-radius:3px">${h.count}x</span>
              <button class="btn btn-sm" onclick="event.stopPropagation(); SearchHistory.removeItem('${h.query}', '${h.type}'); SearchHub.updateHistoryPanel()" 
                style="padding:2px 6px;font-size:0.75rem;background:none;border:1px solid var(--c-border);cursor:pointer" title="刪除">✕</button>
            </div>
          </div>
        `).join('')}
        <div style="padding:8px 12px;border-top:1px solid var(--c-border);margin-top:8px">
          <button class="btn btn-sm btn-secondary" onclick="SearchHistory.clearAll(); SearchHub.updateHistoryPanel()" style="width:100%">
            🗑 清除歷史
          </button>
        </div>
      </div>
    `;
  },

  async removeItem(query, type) {
    this._history = this._history.filter(h => !(h.query === query && h.type === type));
    await DB.setSetting('searchHistory', this._history);
  },

  async clearAll() {
    if (!confirm('確定要清除所有搜尋歷史？')) return;
    this._history = [];
    await DB.setSetting('searchHistory', []);
    App.toast('✅ 已清除搜尋歷史', 'success');
  },

  getTypeLabel(type) {
    const labels = {
      'global': '全局',
      'workorders': '工單',
      'assets': '設備',
      'parts': '零件',
      'brands': '品牌',
      'customers': '客戶'
    };
    return labels[type] || type;
  },

  getRelativeTime(timestamp) {
    const now = new Date();
    const then = new Date(timestamp);
    const diff = Math.floor((now - then) / 1000);
    
    if (diff < 60) return '剛才';
    if (diff < 3600) return `${Math.floor(diff / 60)}分鐘前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}小時前`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}天前`;
    return then.toLocaleDateString('zh-TW');
  },

  escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, m => map[m]);
  },

  // Get top searches for stats
  getTopSearches(limit = 5) {
    return this._history
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
};
