/* ═══════════════════════════════════════════
   db.js — IndexedDB Data Layer for AerialERP
═══════════════════════════════════════════ */
const DB = (() => {
  const NAME = 'AerialERP', VER = 4;
  let _db = null;

  const open = () => new Promise((res, rej) => {
    if (_db) return res(_db);
    const req = indexedDB.open(NAME, 4); // bump version for new stores
    req.onupgradeneeded = e => {
      const db = e.target.result;
      const stores = {
        brands:           { key: 'id', auto: true },
        models:           { key: 'id', auto: true },
        assets:           { key: 'id', auto: true },
        parts:            { key: 'id', auto: true },
        workorders:       { key: 'id', auto: true },
        transactions:     { key: 'id', auto: true },
        inventory_counts: { key: 'id', auto: true },
        settings:         { key: 'key', auto: false },
        users:            { key: 'id', auto: true },
        service_requests: { key: 'id', auto: true },
        customers:        { key: 'id', auto: true },
        audit_logs:       { key: 'id', auto: true },
      };
      Object.entries(stores).forEach(([name, cfg]) => {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: cfg.key, autoIncrement: cfg.auto });
        }
      });
    };
    req.onsuccess = e => { _db = e.target.result; res(_db); };
    req.onerror   = e => rej(e.target.error);
  });

  const tx  = (store, mode) => _db.transaction(store, mode).objectStore(store);
  const p   = req => new Promise((res, rej) => { req.onsuccess = e => res(e.target.result); req.onerror = e => rej(e.target.error); });

  const getAll  = async (store, filter) => { await open(); const all = await p(tx(store,'readonly').getAll()); return filter ? all.filter(filter) : all; };
  const getOne  = async (store, id)     => { await open(); return p(tx(store,'readonly').get(id)); };
  const add     = async (store, obj)    => { await open(); const id = await p(tx(store,'readwrite').add({...obj, createdAt: obj.createdAt||new Date().toISOString()})); return {...obj, id}; };
  const put     = async (store, obj)    => { await open(); await p(tx(store,'readwrite').put({...obj, updatedAt: new Date().toISOString()})); return obj; };
  const remove  = async (store, id)     => { await open(); return p(tx(store,'readwrite').delete(id)); };
  const clear   = async (store)         => { await open(); return p(tx(store,'readwrite').clear()); };
  const count   = async (store, filter) => { const all = await getAll(store, filter); return all.length; };
  const getSetting = async key   => { await open(); const r = await p(tx('settings','readonly').get(key)); return r?.value; };
  const setSetting = async (key, value) => { await open(); return p(tx('settings','readwrite').put({key, value})); };
  const isSeeded = async () => { const v = await getSetting('seeded'); return !!v; };
  const markSeeded = ()     => setSetting('seeded', true);

  // ── Domain helpers ──────────────────────
  const Brands = {
    all:    ()      => getAll('brands'),
    get:    id      => getOne('brands', id),
    save:   obj     => obj.id ? put('brands', obj) : add('brands', obj),
    remove: id      => remove('brands', id),
  };
  const Models = {
    all:     ()       => getAll('models'),
    byBrand: brandId  => getAll('models', m => m.brandId === brandId),
    get:     id       => getOne('models', id),
    save:    obj      => obj.id ? put('models', obj) : add('models', obj),
    remove:  id       => remove('models', id),
  };
  const Assets = {
    all:      ()      => getAll('assets'),
    byStatus: status  => getAll('assets', a => a.status === status),
    get:      id      => getOne('assets', id),
    bySN:     sn      => getAll('assets', a => a.serialNumber === sn),
    save:     obj     => obj.id ? put('assets', obj) : add('assets', obj),
    remove:   id      => remove('assets', id),
  };
  const Parts = {
    all:          ()   => getAll('parts'),
    lowStock:     ()   => getAll('parts', p => (p.onHand||0) <= (p.safetyStock||0)),
    get:          id   => getOne('parts', id),
    byPartNumber: pn   => getAll('parts', p => p.partNumber === pn),
    save:         obj  => obj.id ? put('parts', obj) : add('parts', obj),
    remove:       id   => remove('parts', id),
    adjustStock:  async (id, delta, field='onHand') => {
      const p = await getOne('parts', id);
      if (!p) throw new Error('Part not found');
      p[field] = Math.max(0, (p[field]||0) + delta);
      return put('parts', p);
    }
  };
  const WorkOrders = {
    all:      ()       => getAll('workorders'),
    byStatus: status   => getAll('workorders', w => status==='all' || w.status===status),
    byAsset:  assetId  => getAll('workorders', w => w.assetId===assetId),
    get:      id       => getOne('workorders', id),
    save:     obj      => obj.id ? put('workorders', obj) : add('workorders', obj),
    remove:   id       => remove('workorders', id),
    pending:  ()       => getAll('workorders', w => ['open','in_progress'].includes(w.status)),
  };
  const Transactions = {
    all:     ()       => getAll('transactions'),
    byPart:  partId   => getAll('transactions', t => t.partId===partId),
    log:     obj      => add('transactions', obj),
  };
  const InventoryCounts = {
    all:  ()  => getAll('inventory_counts'),
    get:  id  => getOne('inventory_counts', id),
    save: obj => obj.id ? put('inventory_counts', obj) : add('inventory_counts', obj),
  };

  const ServiceRequests = {
    all:      ()      => getAll('service_requests'),
    get:      id      => getOne('service_requests', id),
    byStatus: status  => getAll('service_requests', r => status==='all' || r.status===status),
    save:     obj     => obj.id ? put('service_requests', obj) : add('service_requests', obj),
    remove:   id      => remove('service_requests', id),
    pending:  ()      => getAll('service_requests', r => r.status === 'pending'),
  };
  const Customers = {
    all:    ()   => getAll('customers'),
    get:    id   => getOne('customers', id),
    save:   obj  => obj.id ? put('customers', obj) : add('customers', obj),
    remove: id   => remove('customers', id),
    search: q    => getAll('customers', c => {
      const lq = q.toLowerCase();
      return c.name?.toLowerCase().includes(lq) || c.phone?.includes(lq) || c.company?.toLowerCase().includes(lq);
    }),
  };

  const AuditLogs = {
    all:          ()       => getAll('audit_logs'),
    byEntity:     (type, id) => getAll('audit_logs', log => log.entityType===type && log.entityId===id),
    log:          async (type, entityId, action, oldData, newData, userId) => {
      return add('audit_logs', {
        entityType: type,
        entityId: entityId,
        action: action,
        oldData: oldData,
        newData: newData,
        userId: userId || (await getSetting('currentUserId')) || 'unknown',
        timestamp: new Date().toISOString()
      });
    },
    clear:        () => clear('audit_logs'),
  };

  return {
    open, getAll, getOne, add, put, remove, clear, count,
    getSetting, setSetting, isSeeded, markSeeded,
    Brands, Models, Assets, Parts, WorkOrders, Transactions, InventoryCounts,
    ServiceRequests, Customers, AuditLogs
  };
})();
