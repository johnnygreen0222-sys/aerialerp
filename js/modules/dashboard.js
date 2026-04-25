/* dashboard.js — Dashboard Module */
const Dashboard = {
  async render() {
    const el = document.getElementById('page-content');
    el.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
    try {
      const [assets, parts, wos, brands] = await Promise.all([
        DB.Assets.all(), DB.Parts.all(), DB.WorkOrders.all(), DB.Brands.all()
      ]);
      const fmt = App.fmt;
      const lowStock = parts.filter(p => (p.onHand||0) <= (p.safetyStock||0));
      const pending = wos.filter(w => ['open','in_progress'].includes(w.status));
      const dueSoon = assets.filter(a => {
        if (!a.warrantyExpiry) return false;
        const d = Math.floor((new Date(a.warrantyExpiry)-new Date())/86400000);
        return d >= 0 && d <= 60;
      });
      const totalPartsValue = parts.reduce((s,p) => s + (p.onHand||0)*(p.unitCostUSD||0)*(App.state.exchangeRates.USD||32.5), 0);

      // Stats
      const statuses = assets.reduce((acc,a) => { acc[a.status]=(acc[a.status]||0)+1; return acc; }, {});
      const completedWOs = wos.filter(w=>w.status==='completed');
      const revenue = completedWOs.reduce((s,w)=>s+(w.totalCost||0), 0);

      // Monthly WO trend (last 6 months)
      const months = [], moCounts = [];
      for (let i=5; i>=0; i--) {
        const d = new Date(); d.setMonth(d.getMonth()-i);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        months.push(`${d.getMonth()+1}月`);
        moCounts.push(wos.filter(w => w.reportDate?.startsWith(key)).length);
      }

      el.innerHTML = `
        <!-- Stats -->
        <div class="stats-grid">
          <div class="stat-card blue">
            <div class="stat-info">
              <div class="stat-label">設備總數 Total Assets</div>
              <div class="stat-value">${assets.length}</div>
              <div class="stat-sub">在庫 ${statuses.on_hand||0} / 施工中 ${statuses.in_use||0}</div>
            </div>
            <div class="stat-icon blue">🏗</div>
          </div>
          <div class="stat-card ${lowStock.length>0?'amber':'emerald'}">
            <div class="stat-info">
              <div class="stat-label">低庫存警報 Low Stock</div>
              <div class="stat-value">${lowStock.length}</div>
              <div class="stat-sub">共 ${parts.length} 種零件</div>
            </div>
            <div class="stat-icon ${lowStock.length>0?'amber':'emerald'}">📦</div>
          </div>
          <div class="stat-card blue">
            <div class="stat-info">
              <div class="stat-label">待處理工單 Pending WOs</div>
              <div class="stat-value">${pending.length}</div>
              <div class="stat-sub">本月共 ${wos.filter(w=>w.reportDate?.startsWith(new Date().toISOString().slice(0,7))).length} 筆</div>
            </div>
            <div class="stat-icon blue">📋</div>
          </div>
          <div class="stat-card ${dueSoon.length>0?'amber':'emerald'}">
            <div class="stat-info">
              <div class="stat-label">保固即將到期 Warranty</div>
              <div class="stat-value">${dueSoon.length}</div>
              <div class="stat-sub">60天內到期台數</div>
            </div>
            <div class="stat-icon ${dueSoon.length>0?'amber':'emerald'}">📅</div>
          </div>
          <div class="stat-card purple">
            <div class="stat-info">
              <div class="stat-label">零件庫存價值</div>
              <div class="stat-value text-number" style="font-size:1.4rem">${fmt.twd(Math.round(totalPartsValue))}</div>
              <div class="stat-sub">含在途庫存</div>
            </div>
            <div class="stat-icon purple">💰</div>
          </div>
          <div class="stat-card cyan">
            <div class="stat-info">
              <div class="stat-label">維修累計收入</div>
              <div class="stat-value text-number" style="font-size:1.4rem">${fmt.twd(revenue)}</div>
              <div class="stat-sub">${completedWOs.length} 張已完工</div>
            </div>
            <div class="stat-icon cyan">📈</div>
          </div>
        </div>

        <!-- Charts -->
        <div class="charts-grid">
          <div class="chart-card">
            <div class="card-header">
              <span class="card-title">📊 工單趨勢 (近6個月)</span>
            </div>
            <canvas id="chart-wo-trend" height="220"></canvas>
          </div>
          <div class="chart-card">
            <div class="card-header">
              <span class="card-title">🏗 設備狀態分布</span>
            </div>
            <canvas id="chart-asset-status" height="220"></canvas>
          </div>
        </div>

        <!-- Alerts + Low Stock -->
        <div class="grid-2">
          <div class="card">
            <div class="card-header">
              <span class="card-title">⚠️ 低庫存警報</span>
              <a href="#/inventory" class="btn btn-sm btn-secondary">查看全部</a>
            </div>
            ${lowStock.length === 0 ? '<div class="empty-state" style="padding:20px"><div class="empty-icon">✅</div><p>目前無低庫存警報</p></div>' :
              lowStock.slice(0,5).map(p => {
                const pct = Math.min(100, Math.round((p.onHand||0)/(p.safetyStock||1)*100));
                return `<div style="margin-bottom:14px">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                    <span style="font-size:.85rem;font-weight:500">${p.name}</span>
                    <span class="badge ${p.onHand===0?'badge-red':'badge-amber'}">${p.onHand===0?'缺貨':'不足'}</span>
                  </div>
                  <div style="display:flex;gap:8px;align-items:center">
                    <div class="progress-bar" style="flex:1"><div class="progress-fill ${p.onHand===0?'red':'amber'}" style="width:${pct}%"></div></div>
                    <span style="font-size:.75rem;color:var(--c-text3);white-space:nowrap">${p.onHand}/${p.safetyStock}</span>
                  </div>
                  <div style="font-size:.72rem;color:var(--c-text3);margin-top:2px">${p.partNumber} · 在途: ${p.inTransit||0}</div>
                </div>`;
              }).join('')}
          </div>

          <div class="card">
            <div class="card-header">
              <span class="card-title">📋 待處理工單</span>
              <a href="#/workorders" class="btn btn-sm btn-secondary">查看全部</a>
            </div>
            ${pending.length === 0 ? '<div class="empty-state" style="padding:20px"><div class="empty-icon">✅</div><p>目前無待處理工單</p></div>' :
              pending.slice(0,4).map(w => {
                const ws = App.WO_STATUS[w.status]||{};
                const wt = App.WO_TYPE[w.type]||{};
                const wp = App.WO_PRIORITY[w.priority]||{};
                return `<div style="padding:10px 0;border-bottom:1px solid var(--c-border);display:flex;gap:10px;align-items:flex-start">
                  <span style="font-size:1.3rem">${wt.icon||'🔧'}</span>
                  <div style="flex:1;min-width:0">
                    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                      <span class="badge ${ws.badge}">${ws.label}</span>
                      <span class="badge ${wp.badge}">${wp.label}</span>
                    </div>
                    <div style="font-size:.85rem;font-weight:500;margin-top:4px;color:var(--c-text)">${w.description?.slice(0,45)||'—'}…</div>
                    <div style="font-size:.72rem;color:var(--c-text3);margin-top:3px">${wt.label} · 負責人: ${w.technicianName||'未指派'} · 到期: ${fmt.date(w.dueDate)}</div>
                  </div>
                </div>`;
              }).join('')}
          </div>
        </div>
      `;

      // Draw charts
      Charts.woTrend('chart-wo-trend', months, moCounts);
      Charts.assetStatus('chart-asset-status', statuses);

    } catch(e) {
      console.error(e);
      el.innerHTML = `<div class="alert-banner danger">儀表板載入失敗: ${e.message}</div>`;
    }
  }
};
