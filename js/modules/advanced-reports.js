/* advanced-reports.js — Advanced reporting and analytics */
const AdvancedReports = {
  async showReportsHub() {
    const html = `
      <div style="padding:20px;max-height:70vh;overflow-y:auto">
        <h2 style="margin-bottom:20px">📊 進階報表分析</h2>
        
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
          <div style="padding:16px;background:var(--c-surface2);border-radius:8px;cursor:pointer;transition:all 0.2s" 
            onclick="AdvancedReports.showInventoryForecast()" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform=''">
            <div style="font-size:2rem;margin-bottom:8px">📈</div>
            <div style="font-weight:600;margin-bottom:4px">庫存預測</div>
            <div style="font-size:0.85rem;color:var(--c-text3)">基于消耗趨勢預測缺貨</div>
          </div>
          
          <div style="padding:16px;background:var(--c-surface2);border-radius:8px;cursor:pointer;transition:all 0.2s"
            onclick="AdvancedReports.showPartsSalesRanking()" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform=''">
            <div style="font-size:2rem;margin-bottom:8px">🏆</div>
            <div style="font-weight:600;margin-bottom:4px">零件銷售排名</div>
            <div style="font-size:0.85rem;color:var(--c-text3)">最常用零件與成本</div>
          </div>
          
          <div style="padding:16px;background:var(--c-surface2);border-radius:8px;cursor:pointer;transition:all 0.2s"
            onclick="AdvancedReports.showMaintenanceCost()" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform=''">
            <div style="font-size:2rem;margin-bottom:8px">💰</div>
            <div style="font-weight:600;margin-bottom:4px">維修成本分析</div>
            <div style="font-size:0.85rem;color:var(--c-text3)">設備維修成本與頻率</div>
          </div>
          
          <div style="padding:16px;background:var(--c-surface2);border-radius:8px;cursor:pointer;transition:all 0.2s"
            onclick="AdvancedReports.showAssetHealth()" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform=''">
            <div style="font-size:2rem;margin-bottom:8px">⚕️</div>
            <div style="font-weight:600;margin-bottom:4px">設備健康度</div>
            <div style="font-size:0.85rem;color:var(--c-text3)">故障率與保固狀態</div>
          </div>
        </div>
      </div>
    `;
    
    App.openModal('進階報表', html, '700px');
  },

  async showInventoryForecast() {
    const parts = await DB.Parts.all();
    const wos = await DB.WorkOrders.all();
    
    // Calculate consumption per part
    const usage = {};
    wos.forEach(w => {
      if (w.partsUsed) {
        Object.entries(w.partsUsed).forEach(([partId, qty]) => {
          usage[partId] = (usage[partId] || 0) + qty;
        });
      }
    });

    // Forecast for each part
    const forecasts = parts.filter(p => p.onHand && p.onHand > 0).map(p => {
      const consumed = usage[p.id] || 0;
      const avgMonthly = consumed / 6; // Assuming 6-month history
      const daysUntilStockout = avgMonthly > 0 ? (p.onHand / avgMonthly) * 30 : 999;
      const status = daysUntilStockout < 30 ? '🔴 高風險' : daysUntilStockout < 60 ? '🟡 中風險' : '🟢 正常';
      
      return {
        name: p.name,
        partNumber: p.partNumber,
        onHand: p.onHand,
        avgMonthly: Math.round(avgMonthly),
        daysUntilStockout: Math.round(daysUntilStockout),
        status,
        recommendation: daysUntilStockout < 30 ? '⚠️ 立即補貨' : daysUntilStockout < 60 ? '💡 建議補貨' : '✓ 庫存充足'
      };
    }).sort((a, b) => a.daysUntilStockout - b.daysUntilStockout);

    const html = `
      <div style="padding:20px;max-height:80vh;overflow-y:auto">
        <h3 style="margin-bottom:16px">📈 庫存預測分析</h3>
        
        <table style="width:100%;font-size:0.85rem;border-collapse:collapse">
          <thead>
            <tr style="background:var(--c-surface2);border-bottom:2px solid var(--c-border)">
              <th style="padding:10px;text-align:left">零件名稱</th>
              <th style="padding:10px;text-align:center">現有庫存</th>
              <th style="padding:10px;text-align:center">月均消耗</th>
              <th style="padding:10px;text-align:center">缺貨天數</th>
              <th style="padding:10px;text-align:center">狀態</th>
              <th style="padding:10px;text-align:left">建議</th>
            </tr>
          </thead>
          <tbody>
            ${forecasts.map(f => `
              <tr style="border-bottom:1px solid var(--c-border)">
                <td style="padding:10px"><strong>${f.name}</strong><br><span style="font-size:0.75rem;color:var(--c-text3)">${f.partNumber}</span></td>
                <td style="padding:10px;text-align:center">${f.onHand}</td>
                <td style="padding:10px;text-align:center">${f.avgMonthly}</td>
                <td style="padding:10px;text-align:center"><strong>${f.daysUntilStockout}</strong></td>
                <td style="padding:10px;text-align:center">${f.status}</td>
                <td style="padding:10px">${f.recommendation}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="margin-top:20px;padding:12px;background:var(--c-surface2);border-radius:6px;font-size:0.9rem">
          <div style="font-weight:600;margin-bottom:8px">📌 預測說明</div>
          <ul style="margin:0;padding-left:20px;font-size:0.85rem;color:var(--c-text2)">
            <li>基于過去6個月的消耗趨勢計算</li>
            <li>缺貨天數 = 現有庫存 ÷ 月均消耗量 × 30 天</li>
            <li>高風險（&lt;30天）：建議立即補貨</li>
          </ul>
        </div>

        <div style="margin-top:16px;text-align:right">
          <button class="btn btn-secondary" onclick="App.closeModal()">關閉</button>
        </div>
      </div>
    `;
    
    App.openModal('庫存預測', html, '900px');
  },

  async showPartsSalesRanking() {
    const parts = await DB.Parts.all();
    const wos = await DB.WorkOrders.all();
    
    const usage = {};
    const cost = {};
    
    wos.forEach(w => {
      if (w.partsUsed) {
        Object.entries(w.partsUsed).forEach(([partId, qty]) => {
          usage[partId] = (usage[partId] || 0) + qty;
        });
      }
    });

    const ranking = parts.filter(p => usage[p.id]).map(p => {
      const qty = usage[p.id] || 0;
      const totalCost = qty * (p.unitCostUSD || 0) * (App.state.exchangeRates?.USD || 32.5);
      return {
        name: p.name,
        partNumber: p.partNumber,
        used: qty,
        unitCost: p.unitCostUSD,
        totalCost,
        brand: p.brandId
      };
    }).sort((a, b) => b.used - a.used);

    const topCost = [...ranking].sort((a, b) => b.totalCost - a.totalCost).slice(0, 10);
    const topUsage = ranking.slice(0, 10);

    const html = `
      <div style="padding:20px;max-height:80vh;overflow-y:auto">
        <h3 style="margin-bottom:20px">🏆 零件銷售排名</h3>
        
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
          <div>
            <h4 style="margin-bottom:12px;font-size:1rem">🔧 最常使用 TOP 10</h4>
            <table style="width:100%;font-size:0.85rem;border-collapse:collapse">
              <thead>
                <tr style="background:var(--c-surface2);border-bottom:1px solid var(--c-border)">
                  <th style="padding:8px;text-align:left">排名</th>
                  <th style="padding:8px;text-align:left">零件名稱</th>
                  <th style="padding:8px;text-align:center">次數</th>
                </tr>
              </thead>
              <tbody>
                ${topUsage.map((p, i) => `
                  <tr style="border-bottom:1px solid var(--c-border)">
                    <td style="padding:8px;text-align:center">#${i+1}</td>
                    <td style="padding:8px"><strong>${p.name}</strong><br><span style="font-size:0.75rem;color:var(--c-text3)">${p.partNumber}</span></td>
                    <td style="padding:8px;text-align:center"><strong>${p.used}</strong></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <div>
            <h4 style="margin-bottom:12px;font-size:1rem">💰 最高成本 TOP 10</h4>
            <table style="width:100%;font-size:0.85rem;border-collapse:collapse">
              <thead>
                <tr style="background:var(--c-surface2);border-bottom:1px solid var(--c-border)">
                  <th style="padding:8px;text-align:left">排名</th>
                  <th style="padding:8px;text-align:left">零件名稱</th>
                  <th style="padding:8px;text-align:right">成本</th>
                </tr>
              </thead>
              <tbody>
                ${topCost.map((p, i) => `
                  <tr style="border-bottom:1px solid var(--c-border)">
                    <td style="padding:8px;text-align:center">#${i+1}</td>
                    <td style="padding:8px"><strong>${p.name}</strong></td>
                    <td style="padding:8px;text-align:right">${App.fmt.twd(Math.round(p.totalCost))}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div style="margin-top:16px;text-align:right">
          <button class="btn btn-secondary" onclick="App.closeModal()">關閉</button>
        </div>
      </div>
    `;
    
    App.openModal('零件銷售排名', html, '1000px');
  },

  async showMaintenanceCost() {
    const assets = await DB.Assets.all();
    const wos = await DB.WorkOrders.all();
    
    const costs = {};
    const repairs = {};
    
    wos.filter(w => w.status === 'completed').forEach(w => {
      const assetKey = w.assetId || w.equipmentId || 'unknown';
      costs[assetKey] = (costs[assetKey] || 0) + (w.totalCost || 0);
      repairs[assetKey] = (repairs[assetKey] || 0) + 1;
    });

    const analysis = assets.map(a => {
      const assetKey = a.assetId;
      const totalCost = costs[assetKey] || 0;
      const repairCount = repairs[assetKey] || 0;
      const avgCost = repairCount > 0 ? totalCost / repairCount : 0;
      const status = repairCount > 5 ? '🔴 高維修頻率' : repairCount > 2 ? '🟡 中等' : '🟢 良好';
      
      return {
        assetId: a.assetId,
        brand: a.brand,
        model: a.model,
        totalCost,
        repairCount,
        avgCost,
        status,
        warrantyExpiry: a.warrantyExpiry
      };
    }).sort((a, b) => b.totalCost - a.totalCost);

    const html = `
      <div style="padding:20px;max-height:80vh;overflow-y:auto">
        <h3 style="margin-bottom:16px">💰 設備維修成本分析</h3>
        
        <table style="width:100%;font-size:0.85rem;border-collapse:collapse">
          <thead>
            <tr style="background:var(--c-surface2);border-bottom:2px solid var(--c-border)">
              <th style="padding:10px;text-align:left">設備編號</th>
              <th style="padding:10px;text-align:left">品牌 / 型號</th>
              <th style="padding:10px;text-align:center">維修次數</th>
              <th style="padding:10px;text-align:right">總成本</th>
              <th style="padding:10px;text-align:right">平均成本</th>
              <th style="padding:10px;text-align:center">狀態</th>
            </tr>
          </thead>
          <tbody>
            ${analysis.map(a => `
              <tr style="border-bottom:1px solid var(--c-border)">
                <td style="padding:10px"><strong>${a.assetId}</strong></td>
                <td style="padding:10px">${a.brand} ${a.model}</td>
                <td style="padding:10px;text-align:center">${a.repairCount}</td>
                <td style="padding:10px;text-align:right">${App.fmt.twd(Math.round(a.totalCost))}</td>
                <td style="padding:10px;text-align:right">${App.fmt.twd(Math.round(a.avgCost))}</td>
                <td style="padding:10px;text-align:center">${a.status}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="margin-top:16px;text-align:right">
          <button class="btn btn-secondary" onclick="App.closeModal()">關閉</button>
        </div>
      </div>
    `;
    
    App.openModal('維修成本分析', html, '1000px');
  },

  async showAssetHealth() {
    const assets = await DB.Assets.all();
    const wos = await DB.WorkOrders.all();
    
    const repairs = {};
    wos.filter(w => w.status === 'completed').forEach(w => {
      const key = w.assetId || w.equipmentId || 'unknown';
      repairs[key] = (repairs[key] || 0) + 1;
    });

    const health = assets.map(a => {
      const age = a.purchaseDate ? Math.floor((new Date() - new Date(a.purchaseDate)) / (365 * 24 * 60 * 60 * 1000)) : 0;
      const repairCount = repairs[a.assetId] || 0;
      const warranty = a.warrantyExpiry ? Math.floor((new Date(a.warrantyExpiry) - new Date()) / (24 * 60 * 60 * 1000)) : -1;
      
      let healthScore = 100;
      healthScore -= Math.min(40, repairCount * 5); // Deduct for repairs
      healthScore -= Math.min(20, age * 2); // Deduct for age
      if (warranty < 0) healthScore -= 10; // Out of warranty
      healthScore = Math.max(0, healthScore);
      
      const healthStatus = 
        healthScore >= 80 ? '🟢 優秀' :
        healthScore >= 60 ? '🟡 良好' :
        healthScore >= 40 ? '🟠 一般' : '🔴 需維修';
      
      return {
        assetId: a.assetId,
        brand: a.brand,
        model: a.model,
        status: a.status,
        age,
        repairCount,
        warranty: warranty < 0 ? '已過期' : `${warranty}天`,
        healthScore,
        healthStatus
      };
    }).sort((a, b) => a.healthScore - b.healthScore);

    const html = `
      <div style="padding:20px;max-height:80vh;overflow-y:auto">
        <h3 style="margin-bottom:16px">⚕️ 設備健康度評估</h3>
        
        <table style="width:100%;font-size:0.85rem;border-collapse:collapse">
          <thead>
            <tr style="background:var(--c-surface2);border-bottom:2px solid var(--c-border)">
              <th style="padding:10px;text-align:left">設備</th>
              <th style="padding:10px;text-align:center">狀態</th>
              <th style="padding:10px;text-align:center">年齡</th>
              <th style="padding:10px;text-align:center">維修次</th>
              <th style="padding:10px;text-align:center">保固</th>
              <th style="padding:10px;text-align:center">健康度</th>
            </tr>
          </thead>
          <tbody>
            ${health.map(h => `
              <tr style="border-bottom:1px solid var(--c-border)">
                <td style="padding:10px"><strong>${h.assetId}</strong><br><span style="font-size:0.75rem;color:var(--c-text3)">${h.brand} ${h.model}</span></td>
                <td style="padding:10px;text-align:center"><span class="chip" style="background:${h.status==='on_hand'?'var(--c-primary-light)':'var(--c-warn-light)'}">${h.status}</span></td>
                <td style="padding:10px;text-align:center">${h.age} 年</td>
                <td style="padding:10px;text-align:center">${h.repairCount}</td>
                <td style="padding:10px;text-align:center;font-size:0.8rem">${h.warranty}</td>
                <td style="padding:10px;text-align:center">
                  <div style="display:flex;align-items:center;gap:6px">
                    <div style="width:50px;height:8px;background:var(--c-surface2);border-radius:4px">
                      <div style="width:${h.healthScore}%;height:100%;background:${h.healthScore>=80?'var(--c-success)':h.healthScore>=60?'var(--c-warn)':'var(--c-danger)'};border-radius:4px"></div>
                    </div>
                    <span style="font-size:0.8rem">${h.healthStatus}</span>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="margin-top:16px;text-align:right">
          <button class="btn btn-secondary" onclick="App.closeModal()">關閉</button>
        </div>
      </div>
    `;
    
    App.openModal('設備健康度', html, '1000px');
  }
};
