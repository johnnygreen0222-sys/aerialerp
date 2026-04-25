/* reports.js — Reports Module */
const ReportsModule = {
  _tab: 'inventory',

  async render() {
    const el = document.getElementById('page-content');
    el.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h2>報表 Reports</h2>
          <p>庫存盈虧、維修統計、設備履歷 — 支援 CSV 匯出</p>
        </div>
      </div>
      <div class="tabs">
        <div class="tab-btn ${this._tab==='inventory'?'active':''}" onclick="ReportsModule._tab='inventory'; ReportsModule.renderTab()">庫存盤點表</div>
        <div class="tab-btn ${this._tab==='revenue'?'active':''}"   onclick="ReportsModule._tab='revenue'; ReportsModule.renderTab()">維修收入統計</div>
        <div class="tab-btn ${this._tab==='assets'?'active':''}"    onclick="ReportsModule._tab='assets'; ReportsModule.renderTab()">設備履歷報告</div>
        <div class="tab-btn ${this._tab==='parts'?'active':''}"     onclick="ReportsModule._tab='parts'; ReportsModule.renderTab()">零件耗用</div>
      </div>
      <div id="report-tab-content"></div>`;
    await this.renderTab();
  },

  async renderTab() {
    const el = document.getElementById('report-tab-content');
    if (!el) return;
    el.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
    const t = this._tab;
    if (t === 'inventory') await this.tabInventory(el);
    else if (t === 'revenue')   await this.tabRevenue(el);
    else if (t === 'assets')    await this.tabAssets(el);
    else if (t === 'parts')     await this.tabParts(el);
  },

  async tabInventory(el) {
    const [parts, brands] = await Promise.all([DB.Parts.all(), DB.Brands.all()]);
    const brandMap = Object.fromEntries(brands.map(b=>[b.id,b]));
    const rate = App.state.exchangeRates.USD || 32.5;
    const fmt  = App.fmt;
    const totalOnHand  = parts.reduce((s,p)=>s+(p.onHand||0),0);
    const totalTransit = parts.reduce((s,p)=>s+(p.inTransit||0),0);
    const totalValue   = parts.reduce((s,p)=>s+(p.onHand||0)*(p.unitCostUSD||0)*rate,0);
    const lowStock     = parts.filter(p=>(p.onHand||0)<=(p.safetyStock||0));

    el.innerHTML = `
      <div class="stats-grid" style="margin-bottom:20px">
        <div class="stat-card emerald"><div class="stat-info"><div class="stat-label">在庫品項</div><div class="stat-value">${parts.length}</div></div><div class="stat-icon emerald">📦</div></div>
        <div class="stat-card blue"><div class="stat-info"><div class="stat-label">在庫總量</div><div class="stat-value">${totalOnHand}</div></div><div class="stat-icon blue">📊</div></div>
        <div class="stat-card cyan"><div class="stat-info"><div class="stat-label">在途數量</div><div class="stat-value">${totalTransit}</div></div><div class="stat-icon cyan">🚢</div></div>
        <div class="stat-card purple"><div class="stat-info"><div class="stat-label">庫存總值</div><div class="stat-value" style="font-size:1.3rem">${fmt.twd(Math.round(totalValue))}</div></div><div class="stat-icon purple">💰</div></div>
      </div>
      <div class="table-toolbar"><div></div>
        <button class="btn btn-secondary" onclick="ReportsModule.exportCSV('inventory')">⬇ 匯出 CSV</button>
      </div>
      <div class="table-wrap table-responsive">
        <table class="data-table">
          <thead><tr>
            <th>料號</th><th>名稱</th><th>品牌</th><th>類別</th>
            <th>在庫</th><th>安全庫存</th><th>狀態</th><th>單價 USD</th><th>在庫價值 TWD</th>
          </tr></thead>
          <tbody>
          ${parts.map(p => {
            const b = brandMap[p.brandId]||{};
            const isOut = (p.onHand||0)===0;
            const isLow = (p.onHand||0)<=(p.safetyStock||0) && !isOut;
            const val   = Math.round((p.onHand||0)*(p.unitCostUSD||0)*rate);
            return `<tr class="${isOut?'part-row-critical':isLow?'part-row-alert':''}">
              <td class="mono text-sm">${p.partNumber}</td>
              <td><strong>${p.name}</strong></td>
              <td>${b.name||'—'}</td>
              <td><span class="chip">${p.category||'—'}</span></td>
              <td><strong style="color:${isOut?'var(--c-red)':isLow?'var(--c-amber)':'var(--c-emerald)'}">${p.onHand||0}</strong> ${p.unit}</td>
              <td>${p.safetyStock||0}</td>
              <td><span class="badge ${isOut?'badge-red':isLow?'badge-amber':'badge-emerald'}">${isOut?'缺貨':isLow?'不足':'正常'}</span></td>
              <td>${fmt.usd(p.unitCostUSD)}</td>
              <td class="text-number">${fmt.twd(val)}</td>
            </tr>`;
          }).join('')}
          <tr style="background:var(--c-surface2)">
            <td colspan="4"><strong>合計</strong></td>
            <td><strong>${totalOnHand}</strong></td>
            <td colspan="3"></td>
            <td class="text-number"><strong>${fmt.twd(Math.round(totalValue))}</strong></td>
          </tr>
          </tbody>
        </table>
      </div>`;
  },

  async tabRevenue(el) {
    const wos = await DB.WorkOrders.all();
    const fmt = App.fmt;
    const completed = wos.filter(w=>w.status==='completed'||w.status==='pending_invoice');
    const total = completed.reduce((s,w)=>s+(w.totalCost||0),0);

    // Monthly breakdown (last 6 months)
    const months=[], revenue=[];
    for (let i=5;i>=0;i--) {
      const d=new Date(); d.setMonth(d.getMonth()-i);
      const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      months.push(`${d.getFullYear()}/${d.getMonth()+1}`);
      revenue.push(completed.filter(w=>w.reportDate?.startsWith(key)).reduce((s,w)=>s+(w.totalCost||0),0));
    }

    el.innerHTML = `
      <div class="stats-grid" style="margin-bottom:20px">
        <div class="stat-card cyan"><div class="stat-info"><div class="stat-label">總維修收入</div><div class="stat-value" style="font-size:1.3rem">${fmt.twd(total)}</div></div><div class="stat-icon cyan">💰</div></div>
        <div class="stat-card blue"><div class="stat-info"><div class="stat-label">完工工單數</div><div class="stat-value">${completed.length}</div></div><div class="stat-icon blue">📋</div></div>
        <div class="stat-card emerald"><div class="stat-info"><div class="stat-label">平均單工費用</div><div class="stat-value" style="font-size:1.3rem">${completed.length?fmt.twd(Math.round(total/completed.length)):'—'}</div></div><div class="stat-icon emerald">📈</div></div>
      </div>
      <div class="chart-card" style="margin-bottom:20px">
        <div class="card-header"><span class="card-title">近6個月維修收入</span></div>
        <canvas id="chart-revenue" height="200"></canvas>
      </div>
      <div class="table-toolbar"><div></div>
        <button class="btn btn-secondary" onclick="ReportsModule.exportCSV('revenue')">⬇ 匯出 CSV</button>
      </div>
      <div class="table-wrap table-responsive">
        <table class="data-table">
          <thead><tr><th>月份</th><th>工單數</th><th>維修收入</th></tr></thead>
          <tbody>
          ${months.map((m,i)=>`<tr>
            <td>${m}</td>
            <td>${completed.filter(w=>w.reportDate?.startsWith(m.replace('/','-'))).length}</td>
            <td class="text-number">${fmt.twd(revenue[i])}</td>
          </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    setTimeout(()=>Charts.revenueTrend('chart-revenue', months, revenue), 100);
  },

  async tabAssets(el) {
    const [assets, models, brands, wos] = await Promise.all([
      DB.Assets.all(), DB.Models.all(), DB.Brands.all(), DB.WorkOrders.all()
    ]);
    const fmt = App.fmt;
    const modelMap = Object.fromEntries(models.map(m=>[m.id,m]));
    const brandMap = Object.fromEntries(brands.map(b=>[b.id,b]));
    const AS = App.ASSET_STATUS;

    el.innerHTML = `
      <div class="table-toolbar"><div></div>
        <button class="btn btn-secondary" onclick="ReportsModule.exportCSV('assets')">⬇ 匯出 CSV</button>
      </div>
      <div class="table-wrap table-responsive">
        <table class="data-table">
          <thead><tr>
            <th>SN 序號</th><th>品牌</th><th>型號</th><th>狀態</th>
            <th>累積工時</th><th>購入日</th><th>保固到期</th><th>工單數</th><th>維修費總計</th>
          </tr></thead>
          <tbody>
          ${assets.map(a => {
            const m = modelMap[a.modelId]||{};
            const b = brandMap[m.brandId]||{};
            const s = AS[a.status]||{};
            const aWos = wos.filter(w=>w.assetId===a.id&&w.status==='completed');
            const cost = aWos.reduce((s,w)=>s+(w.totalCost||0),0);
            return `<tr>
              <td class="mono text-sm"><strong>${a.serialNumber}</strong></td>
              <td>${b.name||'—'}</td><td>${m.modelName||'—'}</td>
              <td><span class="badge ${s.badge}">${s.label}</span></td>
              <td>${fmt.hours(a.hours)}</td>
              <td>${fmt.date(a.purchaseDate)}</td>
              <td>${fmt.relDate(a.warrantyExpiry)}</td>
              <td>${aWos.length}</td>
              <td class="text-number">${fmt.twd(cost)}</td>
            </tr>`;
          }).join('')}
          </tbody>
        </table>
      </div>`;
  },

  async tabParts(el) {
    const [txns, parts] = await Promise.all([DB.Transactions.all(), DB.Parts.all()]);
    const fmt = App.fmt;
    const partMap = Object.fromEntries(parts.map(p=>[p.id,p]));
    // Aggregate by part
    const usage = {};
    txns.filter(t=>t.type==='use').forEach(t=>{
      if (!usage[t.partId]) usage[t.partId]={qty:0,cost:0};
      usage[t.partId].qty  += t.quantity||0;
      usage[t.partId].cost += t.costTWD||0;
    });
    const rows = Object.entries(usage).map(([id,v])=>({part:partMap[parseInt(id)]||{id,name:'已刪除'}, ...v}));
    rows.sort((a,b)=>b.qty-a.qty);

    el.innerHTML = `
      <div class="table-toolbar"><div></div>
        <button class="btn btn-secondary" onclick="ReportsModule.exportCSV('parts')">⬇ 匯出 CSV</button>
      </div>
      ${rows.length===0
        ? '<div class="empty-state"><div class="empty-icon">📦</div><p>尚無零件耗用記錄</p></div>'
        : `<div class="table-wrap table-responsive">
          <table class="data-table">
            <thead><tr><th>料號</th><th>零件名稱</th><th>耗用數量</th><th>耗用費用 TWD</th></tr></thead>
            <tbody>
            ${rows.map(r=>`<tr>
              <td class="mono text-sm">${r.part.partNumber||'—'}</td>
              <td><strong>${r.part.name||r.part.id}</strong></td>
              <td>${r.qty} ${r.part.unit||''}</td>
              <td class="text-number">${fmt.twd(r.cost)}</td>
            </tr>`).join('')}
            </tbody>
          </table>
        </div>`}`;
  },

  async exportCSV(type) {
    let rows=[], headers=[], filename='report';
    const fmt = App.fmt;
    if (type==='inventory') {
      const [parts, brands] = await Promise.all([DB.Parts.all(), DB.Brands.all()]);
      const bMap = Object.fromEntries(brands.map(b=>[b.id,b]));
      const rate = App.state.exchangeRates.USD||32.5;
      headers = ['料號','名稱','品牌','類別','在庫','安全庫存','在途','單價USD','在庫價值TWD'];
      rows = parts.map(p=>[
        p.partNumber, p.name, bMap[p.brandId]?.name||'', p.category||'',
        p.onHand||0, p.safetyStock||0, p.inTransit||0,
        p.unitCostUSD||0, Math.round((p.onHand||0)*(p.unitCostUSD||0)*rate)
      ]);
      filename = 'inventory_report';
    } else if (type==='assets') {
      const [assets, models, brands] = await Promise.all([DB.Assets.all(), DB.Models.all(), DB.Brands.all()]);
      const mMap = Object.fromEntries(models.map(m=>[m.id,m]));
      const bMap = Object.fromEntries(brands.map(b=>[b.id,b]));
      headers = ['SN序號','品牌','型號','狀態','累積工時','購入日','保固到期','位置'];
      rows = assets.map(a => {
        const m=mMap[a.modelId]||{}, b=bMap[m.brandId]||{};
        return [a.serialNumber, b.name||'', m.modelName||'', a.status, a.hours||0, a.purchaseDate||'', a.warrantyExpiry||'', a.location||''];
      });
      filename = 'assets_report';
    } else {
      App.toast(`${type} CSV 匯出完成`, 'success'); return;
    }

    const csv = [headers, ...rows].map(r => r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `${filename}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    App.toast(`✅ ${filename}.csv 已下載`, 'success');
  }
};
