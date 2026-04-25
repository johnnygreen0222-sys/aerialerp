/* ═══════════════════════════════════════════
   app.js — Main Application, Router, Auth, Permissions
═══════════════════════════════════════════ */
const App = (() => {
  // ── State ────────────────────────────────
  let state = {
    user: null,
    sidebarOpen: true,
    currentPage: 'dashboard',
    exchangeRates: { USD: null, JPY: null },
    notifications: []
  };

  // ── Password Hashing (SHA-256 + salt) ────
  const hashPwd = async pwd => {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pwd + '_aerial_salt_2026'));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
  };

  // ── Role Config ──────────────────────────
  const ROLES = {
    admin:      { name:'管理者', eng:'Administrator', avatar:'A' },
    sales:      { name:'業務',   eng:'Sales',          avatar:'S' },
    technician: { name:'技師',   eng:'Technician',     avatar:'T' }
  };

  // ── Permission Matrix ────────────────────
  // pages: which pages can this role access
  // edit:  which resources can this role create/edit/delete
  const PERMISSIONS = {
    admin: {
      pages: ['dashboard','assets','inventory','workorders','scanner','brands','reports','users'],
      edit:  { assets:true, inventory:true, brands:true, workorders:true, users:true }
    },
    sales: {
      pages: ['dashboard','assets','inventory','workorders','scanner','reports'],
      edit:  { assets:false, inventory:false, brands:false, workorders:true, users:false }
    },
    technician: {
      pages: ['dashboard','assets','workorders','scanner'],
      edit:  { assets:false, inventory:false, brands:false, workorders:true, users:false }
    }
  };

  // can(resource) — check if current user can edit this resource
  const can = resource => {
    const perms = PERMISSIONS[state.user?.role];
    return perms?.edit?.[resource] === true;
  };

  // ── Formatters ───────────────────────────
  const fmt = {
    date:    d  => d ? new Date(d).toLocaleDateString('zh-TW') : '—',
    datetime:d  => d ? new Date(d).toLocaleString('zh-TW') : '—',
    twd:     n  => n != null ? `NT$ ${Number(n).toLocaleString()}` : '—',
    usd:     n  => n != null ? `USD ${Number(n).toFixed(2)}` : '—',
    num:     n  => n != null ? Number(n).toLocaleString() : '—',
    relDate: d  => {
      if (!d) return '—';
      const diff = Math.floor((new Date(d) - new Date()) / 86400000);
      if (diff < 0)  return `<span class="text-red">${Math.abs(diff)}天前到期</span>`;
      if (diff < 30) return `<span class="text-amber">${diff}天後到期</span>`;
      return `<span class="text-emerald">${diff}天後到期</span>`;
    },
    hours:   h => h != null ? `${Number(h).toLocaleString()} hrs` : '—',
    usdToTWD: usd => {
      if (!state.exchangeRates.USD || !usd) return '—';
      return fmt.twd(Math.round(usd * state.exchangeRates.USD));
    }
  };

  // ── Status Maps ──────────────────────────
  const ASSET_STATUS = {
    on_hand:    { label:'在庫 On-hand',      badge:'badge-emerald' },
    in_use:     { label:'施工中 In Use',      badge:'badge-blue' },
    maintenance:{ label:'維修中 Maintenance', badge:'badge-amber' },
    sold:       { label:'已售 Sold',          badge:'badge-gray' },
    in_transit: { label:'在途 In-transit',    badge:'badge-cyan' }
  };
  const WO_STATUS = {
    open:           { label:'待派工',   badge:'badge-gray' },
    in_progress:    { label:'進行中',   badge:'badge-blue' },
    completed:      { label:'已完成',   badge:'badge-emerald' },
    pending_invoice:{ label:'待開發票', badge:'badge-amber' },
    cancelled:      { label:'已取消',   badge:'badge-red' }
  };
  const WO_TYPE     = { preventive:{label:'定期保養',icon:'🔧'}, corrective:{label:'故障維修',icon:'🚨'}, inspection:{label:'安全檢查',icon:'🔍'} };
  const WO_PRIORITY = { high:{label:'緊急',badge:'badge-red'}, medium:{label:'一般',badge:'badge-amber'}, low:{label:'低',badge:'badge-gray'} };

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
    document.getElementById('modal-box').className = `modal ${size}`;
    document.getElementById('modal-overlay').classList.remove('hidden');
  };
  const closeModal = () => {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('modal-body').innerHTML = '';
  };

  // ── Router ───────────────────────────────
  const PAGES = {
    'dashboard': { title:'儀表板 Dashboard',    module: () => Dashboard.render() },
    'assets':    { title:'設備管理 Assets',      module: () => AssetsModule.render() },
    'inventory': { title:'零件庫存 Inventory',   module: () => InventoryModule.render() },
    'workorders':{ title:'維修工單 Work Orders', module: () => WorkOrdersModule.render() },
    'scanner':   { title:'掃描中心 Scanner',     module: () => ScannerHub.render() },
    'brands':    { title:'品牌型號庫 Brands',    module: () => BrandsModule.render() },
    'reports':   { title:'報表 Reports',         module: () => ReportsModule.render() },
    'users':     { title:'使用者管理 Users',     module: () => UsersModule.render() },
  };

  const navigate = (hash) => {
    const page = hash.replace('#/','').split('/')[0] || 'dashboard';
    if (!PAGES[page]) return navigate('#/');
    const allowed = PERMISSIONS[state.user?.role]?.pages || [];
    if (!allowed.includes(page)) { toast('您沒有權限訪問此頁面','warning'); return; }
    state.currentPage = page;
    updateNav(page);
    document.getElementById('breadcrumb').innerHTML = `<span>${PAGES[page].title}</span>`;
    const content = document.getElementById('page-content');
    content.style.opacity = '0';
    content.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
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

  // ── Apply role-based nav visibility ──────
  const applyRoleNav = () => {
    const allowed = PERMISSIONS[state.user.role]?.pages || [];
    document.querySelectorAll('.nav-item[data-page]').forEach(el => {
      el.style.display = allowed.includes(el.dataset.page) ? '' : 'none';
    });
  };

  // ── Auth ─────────────────────────────────
  const login = async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errEl    = document.getElementById('login-error');
    errEl.classList.add('hidden');

    try {
      const hash  = await hashPwd(password);
      const users = await DB.getAll('users');
      const user  = users.find(u => u.username === username && u.passwordHash === hash && u.active !== false);

      if (!user) {
        errEl.classList.remove('hidden');
        document.getElementById('login-password').value = '';
        return;
      }

      state.user = user;
      const roleInfo = ROLES[user.role] || { name: user.role, eng: user.role, avatar: user.name?.[0]||'U' };

      document.getElementById('login-screen').style.display = 'none';
      document.getElementById('app-shell').classList.remove('hidden');
      document.getElementById('sidebar-avatar').textContent   = roleInfo.avatar;
      document.getElementById('sidebar-username').textContent = user.name || user.username;
      document.getElementById('sidebar-role').textContent     = roleInfo.eng;

      applyRoleNav();
      loadExchangeRates();
      refreshBadges();
      buildNotifications();
      navigate(location.hash || '#/');
    } catch (err) {
      console.error('[Login]', err);
      errEl.textContent = '系統錯誤，請重新整理頁面';
      errEl.classList.remove('hidden');
    }
  };

  const logout = () => {
    state.user = null;
    document.getElementById('app-shell').classList.add('hidden');
    document.getElementById('login-screen').style.display = '';
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('login-error').classList.add('hidden');
    location.hash = '#/';
  };

  const togglePwd = () => {
    const inp = document.getElementById('login-password');
    inp.type = inp.type === 'password' ? 'text' : 'password';
  };

  // ── Exchange Rates ────────────────────────
  const loadExchangeRates = async () => {
    try {
      const r = await fetch('https://api.frankfurter.app/latest?from=USD&to=TWD,JPY');
      if (!r.ok) throw new Error();
      const data = await r.json();
      state.exchangeRates.USD = data.rates.TWD;
      state.exchangeRates.JPY = data.rates.TWD / data.rates.JPY;
      document.getElementById('rate-usd').textContent = data.rates.TWD.toFixed(2);
      document.getElementById('rate-jpy').textContent = (data.rates.TWD / data.rates.JPY).toFixed(4);
      DB.setSetting('rate_usd_twd', data.rates.TWD);
      DB.setSetting('rate_jpy_twd', data.rates.TWD / data.rates.JPY);
    } catch {
      const cached = await DB.getSetting('rate_usd_twd');
      state.exchangeRates.USD = cached || 32.5;
      document.getElementById('rate-usd').textContent = (cached || 32.5).toFixed(2) + '*';
      document.getElementById('rate-jpy').textContent = '0.2165*';
    }
  };

  // ── Badges ───────────────────────────────
  const refreshBadges = async () => {
    try {
      const low = await DB.Parts.lowStock();
      const badge = document.getElementById('badge-inventory');
      badge.textContent = low.length;
      badge.style.display = low.length > 0 ? 'inline-flex' : 'none';

      const pending = await DB.WorkOrders.pending();
      const wbadge = document.getElementById('badge-workorders');
      wbadge.textContent = pending.length;
      wbadge.style.display = pending.length > 0 ? 'inline-flex' : 'none';
    } catch(e) { console.warn('Badge refresh failed', e); }
  };

  // ── Notifications ────────────────────────
  const buildNotifications = async () => {
    state.notifications = [];
    try {
      const low = await DB.Parts.lowStock();
      low.forEach(p => state.notifications.push({ icon:'⚠️', title:`低庫存: ${p.name}`, text:`在庫: ${p.onHand} / 安全庫存: ${p.safetyStock}` }));
      const assets = await DB.Assets.all();
      assets.filter(a => {
        if (!a.warrantyExpiry) return false;
        const d = Math.floor((new Date(a.warrantyExpiry)-new Date())/86400000);
        return d >= 0 && d <= 60;
      }).forEach(a => {
        const d = Math.floor((new Date(a.warrantyExpiry)-new Date())/86400000);
        state.notifications.push({ icon:'📅', title:`保固即將到期: ${a.serialNumber}`, text:`剩餘 ${d} 天` });
      });
    } catch {}
    const dot = document.getElementById('notif-dot');
    state.notifications.length > 0 ? dot.classList.remove('hidden') : dot.classList.add('hidden');
  };

  const toggleNotifications = () => {
    const panel = document.getElementById('notif-panel');
    if (panel.classList.contains('hidden')) {
      const list = document.getElementById('notif-list');
      list.innerHTML = state.notifications.length === 0
        ? '<div class="empty-state" style="padding:24px"><div class="empty-icon">🔔</div><p>目前無通知</p></div>'
        : state.notifications.map(n => `<div class="notif-item"><span class="notif-item-icon">${n.icon}</span><div class="notif-item-text"><strong>${n.title}</strong><span>${n.text}</span></div></div>`).join('');
      panel.classList.remove('hidden');
    } else { panel.classList.add('hidden'); }
  };
  const closeNotifications = () => document.getElementById('notif-panel').classList.add('hidden');

  // ── Sidebar Toggle ───────────────────────
  const toggleSidebar = () => {
    const sb = document.getElementById('sidebar');
    window.innerWidth <= 768 ? sb.classList.toggle('mobile-open') : sb.classList.toggle('collapsed');
  };

  // ── Sync (placeholder) ───────────────────
  const syncCloud = () => toast('🔄 雲端同步功能開發中 (需串接後端 API)','info');

  // ── Init ─────────────────────────────────
  const init = async () => {
    await DB.open();
    await DataSeed.run();
    window.addEventListener('hashchange', () => { if (state.user) navigate(location.hash); });
    document.getElementById('modal-overlay').addEventListener('click', e => {
      if (e.target === document.getElementById('modal-overlay')) closeModal();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
  };

  document.addEventListener('DOMContentLoaded', init);

  return {
    login, logout, togglePwd, toggleSidebar, syncCloud,
    openModal, closeModal, toast,
    toggleNotifications, closeNotifications,
    refreshBadges, buildNotifications,
    can,
    get state()       { return state; },
    get fmt()         { return fmt; },
    get ASSET_STATUS(){ return ASSET_STATUS; },
    get WO_STATUS()   { return WO_STATUS; },
    get WO_TYPE()     { return WO_TYPE; },
    get WO_PRIORITY() { return WO_PRIORITY; },
    get hashPwd()     { return hashPwd; },
    get PERMISSIONS() { return PERMISSIONS; },
  };
})();
