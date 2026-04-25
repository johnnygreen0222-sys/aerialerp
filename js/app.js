/* ═══════════════════════════════════════════
   app.js — Main Application, Router, Auth
═══════════════════════════════════════════ */
const App = (() => {
  // ── State ────────────────────────────────
  let state = {
    user: null,        // { role, name, avatar }
    sidebarOpen: true,
    currentPage: 'dashboard',
    exchangeRates: { USD: null, JPY: null },
    notifications: []
  };

  // ── Role Config ──────────────────────────
  const ROLES = {
    admin:      { name:'管理者', eng:'Administrator', avatar:'A', color:'#7c3aed' },
    sales:      { name:'業務',   eng:'Sales',          avatar:'S', color:'#0891b2' },
    technician: { name:'技師',   eng:'Technician',     avatar:'T', color:'#d97706' }
  };
  const ROLE_ACCESS = {
    admin:      ['dashboard','assets','inventory','workorders','scanner','brands','reports'],
    sales:      ['dashboard','assets','inventory','workorders','scanner','reports'],
    technician: ['dashboard','assets','workorders','scanner']
  };

  // ── Formatters ───────────────────────────
  const fmt = {
    date:    d  => d ? new Date(d).toLocaleDateString('zh-TW') : '—',
    datetime:d  => d ? new Date(d).toLocaleString('zh-TW') : '—',
    twd:     n  => n != null ? `NT$ ${Number(n).toLocaleString()}` : '—',
    usd:     n  => n != null ? `USD ${Number(n).toFixed(2)}` : '—',
    num:     n  => n != null ? Number(n).toLocaleString() : '—',
    pct:     n  => n != null ? `${n}%` : '—',
    relDate: d  => {
      if (!d) return '—';
      const diff = Math.floor((new Date(d) - new Date()) / 86400000);
      if (diff < 0)  return `<span class="text-red">${Math.abs(diff)}天前到期</span>`;
      if (diff < 30) return `<span class="text-amber">${diff}天後到期</span>`;
      return `<span class="text-emerald">${diff}天後到期</span>`;
    },
    hours: h => h != null ? `${Number(h).toLocaleString()} hrs` : '—',
    usdToTWD: usd => {
      if (!state.exchangeRates.USD || !usd) return '—';
      return fmt.twd(Math.round(usd * state.exchangeRates.USD));
    }
  };

  // ── Status Maps ──────────────────────────
  const ASSET_STATUS = {
    on_hand:    { label:'在庫 On-hand',       badge:'badge-emerald' },
    in_use:     { label:'施工中 In Use',       badge:'badge-blue' },
    maintenance:{ label:'維修中 Maintenance',  badge:'badge-amber' },
    sold:       { label:'已售 Sold',           badge:'badge-gray' },
    in_transit: { label:'在途 In-transit',     badge:'badge-cyan' }
  };
  const WO_STATUS = {
    open:           { label:'待派工',     badge:'badge-gray' },
    in_progress:    { label:'進行中',     badge:'badge-blue' },
    completed:      { label:'已完成',     badge:'badge-emerald' },
    pending_invoice:{ label:'待開發票',   badge:'badge-amber' },
    cancelled:      { label:'已取消',     badge:'badge-red' }
  };
  const WO_TYPE = {
    preventive: { label:'定期保養', icon:'🔧' },
    corrective: { label:'故障維修', icon:'🚨' },
    inspection: { label:'安全檢查', icon:'🔍' }
  };
  const WO_PRIORITY = {
    high:   { label:'緊急', badge:'badge-red' },
    medium: { label:'一般', badge:'badge-amber' },
    low:    { label:'低',   badge:'badge-gray' }
  };

  // ── Toast ────────────────────────────────
  const toast = (msg, type='info') => {
    const icons = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span class="toast-icon">${icons[type]||'ℹ️'}</span><span>${msg}</span>`;
    document.getElementById('toast-container').appendChild(el);
    setTimeout(() => { el.classList.add('removing'); setTimeout(() => el.remove(), 300); }, 3000);
  };

  // ── Modal ────────────────────────────────
  const openModal = (title, html, size='') => {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = html;
    const box = document.getElementById('modal-box');
    box.className = `modal ${size}`;
    document.getElementById('modal-overlay').classList.remove('hidden');
  };
  const closeModal = () => {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('modal-body').innerHTML = '';
  };

  // ── Router ───────────────────────────────
  const PAGES = {
    'dashboard': { title:'儀表板 Dashboard', module: () => Dashboard.render() },
    'assets':    { title:'設備管理 Assets',  module: () => AssetsModule.render() },
    'inventory': { title:'零件庫存 Inventory', module: () => InventoryModule.render() },
    'workorders':{ title:'維修工單 Work Orders', module: () => WorkOrdersModule.render() },
    'scanner':   { title:'掃描中心 Scanner', module: () => ScannerHub.render() },
    'brands':    { title:'品牌型號庫 Brands', module: () => BrandsModule.render() },
    'reports':   { title:'報表 Reports',     module: () => ReportsModule.render() },
  };

  const navigate = (hash) => {
    const page = hash.replace('#/','').split('/')[0] || 'dashboard';
    if (!PAGES[page]) return navigate('#/');
    const allowed = ROLE_ACCESS[state.user?.role] || [];
    if (!allowed.includes(page)) { toast('您沒有權限訪問此頁面','warning'); return; }
    state.currentPage = page;
    updateNav(page);
    document.getElementById('breadcrumb').innerHTML = `<span>${PAGES[page].title}</span>`;
    const content = document.getElementById('page-content');
    content.style.opacity = '0';
    content.innerHTML = '<div class="page-loading"><div class="spinner"></div><p>載入中…</p></div>';
    setTimeout(() => {
      PAGES[page].module();
      content.style.transition = 'opacity .25s';
      content.style.opacity = '1';
    }, 80);
  };

  const updateNav = page => {
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });
  };

  // ── Sidebar visibility based on role ─────
  const applyRoleNav = () => {
    const allowed = ROLE_ACCESS[state.user.role] || [];
    document.querySelectorAll('.nav-item').forEach(el => {
      const pg = el.dataset.page;
      el.style.display = (!pg || allowed.includes(pg)) ? '' : 'none';
    });
  };

  // ── Auth ─────────────────────────────────
  const login = role => {
    const r = ROLES[role];
    state.user = { role, ...r };
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-shell').classList.remove('hidden');
    document.getElementById('sidebar-avatar').textContent = r.avatar;
    document.getElementById('sidebar-username').textContent = r.name;
    document.getElementById('sidebar-role').textContent = r.eng;
    applyRoleNav();
    loadExchangeRates();
    refreshBadges();
    buildNotifications();
    const hash = location.hash || '#/';
    navigate(hash);
  };
  const logout = () => {
    state.user = null;
    document.getElementById('app-shell').classList.add('hidden');
    document.getElementById('login-screen').style.display = '';
    location.hash = '#/';
  };

  // ── Exchange Rates ────────────────────────
  const loadExchangeRates = async () => {
    try {
      const r = await fetch('https://api.frankfurter.app/latest?from=USD&to=TWD,JPY');
      if (!r.ok) throw new Error();
      const data = await r.json();
      // data.rates = { TWD: 32.5, JPY: 150.2 }
      state.exchangeRates.USD = data.rates.TWD;
      // JPY/TWD = TWD per USD / JPY per USD
      state.exchangeRates.JPY = data.rates.TWD / data.rates.JPY;
      document.getElementById('rate-usd').textContent = data.rates.TWD.toFixed(2);
      document.getElementById('rate-jpy').textContent = (data.rates.TWD / data.rates.JPY).toFixed(4);
      DB.setSetting('rate_usd_twd', data.rates.TWD);
      DB.setSetting('rate_jpy_twd', data.rates.TWD / data.rates.JPY);
    } catch {
      // Use cached or fallback
      const cached = await DB.getSetting('rate_usd_twd');
      if (cached) {
        state.exchangeRates.USD = cached;
        document.getElementById('rate-usd').textContent = Number(cached).toFixed(2) + '*';
      } else {
        state.exchangeRates.USD = 32.5;
        document.getElementById('rate-usd').textContent = '32.50*';
      }
      document.getElementById('rate-jpy').textContent = '0.2165*';
    }
  };

  // ── Badges ───────────────────────────────
  const refreshBadges = async () => {
    try {
      const low = await DB.Parts.lowStock();
      const badge = document.getElementById('badge-inventory');
      if (low.length > 0) {
        badge.textContent = low.length;
        badge.style.display = 'inline-flex';
      } else badge.style.display = 'none';

      const pending = await DB.WorkOrders.pending();
      const wbadge = document.getElementById('badge-workorders');
      if (pending.length > 0) {
        wbadge.textContent = pending.length;
        wbadge.style.display = 'inline-flex';
      } else wbadge.style.display = 'none';
    } catch(e) { console.warn('Badge refresh failed', e); }
  };

  // ── Notifications ────────────────────────
  const buildNotifications = async () => {
    state.notifications = [];
    try {
      const low = await DB.Parts.lowStock();
      low.forEach(p => {
        state.notifications.push({
          icon: '⚠️',
          title: `低庫存警報: ${p.name}`,
          text: `在庫: ${p.onHand} / 安全庫存: ${p.safetyStock}`
        });
      });
      const assets = await DB.Assets.all();
      const soon = assets.filter(a => {
        if (!a.warrantyExpiry) return false;
        const days = Math.floor((new Date(a.warrantyExpiry)-new Date())/86400000);
        return days >= 0 && days <= 60;
      });
      soon.forEach(a => {
        const days = Math.floor((new Date(a.warrantyExpiry)-new Date())/86400000);
        state.notifications.push({ icon:'📅', title:`保固即將到期: SN ${a.serialNumber}`, text:`剩餘 ${days} 天` });
      });
    } catch {}
    const dot = document.getElementById('notif-dot');
    if (state.notifications.length > 0) dot.classList.remove('hidden');
    else dot.classList.add('hidden');
  };
  const toggleNotifications = () => {
    const panel = document.getElementById('notif-panel');
    const isHidden = panel.classList.contains('hidden');
    if (isHidden) {
      const list = document.getElementById('notif-list');
      if (state.notifications.length === 0) {
        list.innerHTML = '<div class="empty-state" style="padding:24px"><div class="empty-icon">🔔</div><p>目前無通知</p></div>';
      } else {
        list.innerHTML = state.notifications.map(n => `
          <div class="notif-item">
            <span class="notif-item-icon">${n.icon}</span>
            <div class="notif-item-text"><strong>${n.title}</strong><span>${n.text}</span></div>
          </div>`).join('');
      }
      panel.classList.remove('hidden');
    } else { panel.classList.add('hidden'); }
  };
  const closeNotifications = () => document.getElementById('notif-panel').classList.add('hidden');

  // ── Sidebar Toggle ───────────────────────
  const toggleSidebar = () => {
    const sb = document.getElementById('sidebar');
    if (window.innerWidth <= 768) {
      sb.classList.toggle('mobile-open');
    } else {
      sb.classList.toggle('collapsed');
      state.sidebarOpen = !sb.classList.contains('collapsed');
    }
  };

  // ── Sync (placeholder) ───────────────────
  const syncCloud = () => {
    toast('🔄 雲端同步功能開發中 (需串接後端 API)','info');
    const icon = document.getElementById('sync-icon');
    if (icon) { icon.style.animation = 'spin 1s linear infinite'; setTimeout(()=>{ icon.style.animation=''; }, 2000); }
  };

  // ── Init ─────────────────────────────────
  const init = async () => {
    await DB.open();
    await DataSeed.run();
    window.addEventListener('hashchange', e => {
      if (state.user) navigate(location.hash);
    });
    document.getElementById('modal-overlay').addEventListener('click', e => {
      if (e.target === document.getElementById('modal-overlay')) closeModal();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(()=>{});
    }
  };

  document.addEventListener('DOMContentLoaded', init);

  return {
    login, logout, toggleSidebar, syncCloud,
    openModal, closeModal, toast,
    toggleNotifications, closeNotifications,
    refreshBadges, buildNotifications,
    get state() { return state; },
    get fmt() { return fmt; },
    get ASSET_STATUS() { return ASSET_STATUS; },
    get WO_STATUS()    { return WO_STATUS; },
    get WO_TYPE()      { return WO_TYPE; },
    get WO_PRIORITY()  { return WO_PRIORITY; },
  };
})();
