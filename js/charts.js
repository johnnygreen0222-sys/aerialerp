/* charts.js — Chart.js wrappers for AerialERP */
const Charts = (() => {
  const instances = {};
  const destroy = id => { if (instances[id]) { instances[id].destroy(); delete instances[id]; } };

  const COLORS = {
    blue:    'rgba(59,130,246,',
    emerald: 'rgba(16,185,129,',
    amber:   'rgba(245,158,11,',
    red:     'rgba(239,68,68,',
    purple:  'rgba(139,92,246,',
    cyan:    'rgba(6,182,212,',
    gray:    'rgba(100,116,139,'
  };
  const c = (name, a=1) => `${COLORS[name]}${a})`;

  const baseOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { labels: { color: '#94A3B8', font: { size: 11 }, boxWidth: 12 } },
      tooltip: {
        backgroundColor: '#0D1B2E',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        titleColor: '#E8F0FE',
        bodyColor: '#94A3B8'
      }
    }
  };

  // ── Inventory Status Pie ──────────────────
  const inventoryStatus = (canvasId, data) => {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    instances[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['在庫 On-hand', '在途 In-transit', '已售待出 Reserved'],
        datasets: [{
          data: [data.onHand, data.inTransit, data.reserved],
          backgroundColor: [c('emerald',.8), c('cyan',.8), c('amber',.8)],
          borderColor: '#0A1628', borderWidth: 3,
          hoverOffset: 8
        }]
      },
      options: {
        ...baseOptions,
        cutout: '68%',
        plugins: { ...baseOptions.plugins, legend: { position: 'bottom', labels: { color:'#94A3B8', font:{size:11}, padding:12 } } }
      }
    });
  };

  // ── Work Order Trend Line ─────────────────
  const woTrend = (canvasId, labels, data) => {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    instances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: '維修工單 Work Orders',
          data,
          borderColor: c('blue'),
          backgroundColor: c('blue',.1),
          fill: true, tension: 0.4, pointRadius: 4,
          pointBackgroundColor: c('blue'), pointBorderColor: '#0A1628', pointBorderWidth: 2
        }]
      },
      options: {
        ...baseOptions,
        scales: {
          x: { ticks: { color:'#64748B', font:{size:10} }, grid: { color:'rgba(255,255,255,0.04)' } },
          y: { ticks: { color:'#64748B', font:{size:10} }, grid: { color:'rgba(255,255,255,0.04)' }, beginAtZero: true }
        }
      }
    });
  };

  // ── Parts Category Bar ────────────────────
  const partsCategory = (canvasId, labels, data) => {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    const colors = ['blue','emerald','amber','purple','cyan','red','gray'];
    instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: '庫存量',
          data,
          backgroundColor: colors.map((col,i) => c(colors[i%colors.length], .7)),
          borderRadius: 6, borderSkipped: false
        }]
      },
      options: {
        ...baseOptions,
        scales: {
          x: { ticks: { color:'#64748B', font:{size:10} }, grid: { color:'rgba(255,255,255,0.04)' } },
          y: { ticks: { color:'#64748B', font:{size:10} }, grid: { color:'rgba(255,255,255,0.04)' }, beginAtZero: true }
        }
      }
    });
  };

  // ── Asset Status Doughnut ─────────────────
  const assetStatus = (canvasId, counts) => {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    instances[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['在庫','施工中','維修中','已售'],
        datasets: [{
          data: [counts.on_hand||0, counts.in_use||0, counts.maintenance||0, counts.sold||0],
          backgroundColor: [c('emerald',.8),c('blue',.8),c('amber',.8),c('gray',.8)],
          borderColor: '#0A1628', borderWidth: 3
        }]
      },
      options: { ...baseOptions, cutout:'65%' }
    });
  };

  // ── Revenue Bar ───────────────────────────
  const revenueTrend = (canvasId, labels, data) => {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: '維修收入 (NT$)',
          data,
          backgroundColor: c('blue',.7), borderRadius: 6, borderSkipped: false
        }]
      },
      options: {
        ...baseOptions,
        scales: {
          x: { ticks:{color:'#64748B',font:{size:10}}, grid:{color:'rgba(255,255,255,0.04)'} },
          y: { ticks:{color:'#64748B',font:{size:10},callback:v=>`$${(v/1000).toFixed(0)}k`}, grid:{color:'rgba(255,255,255,0.04)'}, beginAtZero:true }
        }
      }
    });
  };

  return { inventoryStatus, woTrend, partsCategory, assetStatus, revenueTrend, destroy };
})();
