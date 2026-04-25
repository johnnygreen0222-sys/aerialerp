/* ═══════════════════════════════════════════
   data-seed.js — Sample Data for AerialERP
═══════════════════════════════════════════ */
const _hashPwd = async pwd => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pwd + '_aerial_salt_2026'));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
};

const DataSeed = {
  async run() {
    if (await DB.isSeeded()) return;

    // ── Default Users ────────────────────────
    await DB.add('users', { username:'admin',  passwordHash: await _hashPwd('admin1234'), role:'admin',      name:'系統管理員', active:true });
    await DB.add('users', { username:'sales1', passwordHash: await _hashPwd('sales1234'), role:'sales',      name:'業務員甲',   active:true });
    await DB.add('users', { username:'tech1',  passwordHash: await _hashPwd('tech1234'),  role:'technician', name:'技師陳大明', active:true });

    const jlg    = await DB.Brands.save({ name:'JLG', country:'USA', logo:'🟦', description:'全球最大高空作業平台品牌' });
    const genie  = await DB.Brands.save({ name:'Genie', country:'USA', logo:'🟥', description:'Terex 旗下高空設備品牌' });
    const sky    = await DB.Brands.save({ name:'Skyjack', country:'Canada', logo:'🟨', description:'加拿大高空作業平台品牌' });

    // ── Models ──────────────────────────────
    const m1 = await DB.Models.save({ brandId:jlg.id, modelName:'JLG 1930ES', category:'Scissor Lift', maxHeight:5.79, maxCapacity:227, weight:1678, engineType:'Electric', partIds:[] });
    const m2 = await DB.Models.save({ brandId:jlg.id, modelName:'JLG 450AJ', category:'Articulating Boom', maxHeight:15.72, maxCapacity:227, weight:7847, engineType:'Diesel', partIds:[] });
    const m3 = await DB.Models.save({ brandId:genie.id, modelName:'Genie GS-2632', category:'Scissor Lift', maxHeight:9.92, maxCapacity:340, weight:2376, engineType:'Electric', partIds:[] });
    const m4 = await DB.Models.save({ brandId:genie.id, modelName:'Genie Z-45/25', category:'Articulating Boom', maxHeight:15.95, maxCapacity:227, weight:8618, engineType:'Dual Fuel', partIds:[] });
    const m5 = await DB.Models.save({ brandId:sky.id, modelName:'Skyjack SJ3226E', category:'Scissor Lift', maxHeight:9.75, maxCapacity:340, weight:2041, engineType:'Electric', partIds:[] });
    const m6 = await DB.Models.save({ brandId:sky.id, modelName:'Skyjack SJ63AJ', category:'Articulating Boom', maxHeight:20.08, maxCapacity:230, weight:12724, engineType:'Diesel', partIds:[] });

    // ── Assets ──────────────────────────────
    const a1 = await DB.Assets.save({ modelId:m1.id, serialNumber:'JLG1930-001', status:'on_hand', purchaseDate:'2023-01-15', warrantyExpiry:'2025-01-15', hours:234, location:'台北倉庫 A-03', notes:'狀況良好' });
    const a2 = await DB.Assets.save({ modelId:m2.id, serialNumber:'JLG450AJ-007', status:'in_use', purchaseDate:'2022-06-20', warrantyExpiry:'2024-06-20', hours:1547, location:'新竹工地 - 台積電廠區', notes:'出租中' });
    const a3 = await DB.Assets.save({ modelId:m3.id, serialNumber:'GS2632-022', status:'maintenance', purchaseDate:'2021-03-10', warrantyExpiry:'2023-03-10', hours:3201, location:'維修廠', notes:'油壓系統故障維修中' });
    const a4 = await DB.Assets.save({ modelId:m4.id, serialNumber:'GZ4525-015', status:'on_hand', purchaseDate:'2023-08-05', warrantyExpiry:'2025-08-05', hours:89, location:'台北倉庫 B-01', notes:'新機' });
    const a5 = await DB.Assets.save({ modelId:m5.id, serialNumber:'SJ3226-033', status:'sold', purchaseDate:'2020-11-22', warrantyExpiry:'2022-11-22', hours:4890, location:'已售出 - 客戶:統一建設', notes:'' });

    // ── Parts ───────────────────────────────
    const now = new Date().toISOString();
    const parts = [
      { brandId:jlg.id,   partNumber:'JLG-1001228', name:'油壓濾芯 Hydraulic Filter', category:'Filter', unit:'個', unitCostUSD:28.5,  onHand:3,  inTransit:10, reserved:0, safetyStock:10, lastUpdated:now },
      { brandId:jlg.id,   partNumber:'JLG-7023051', name:'驅動輪胎 Drive Tire 15x5', category:'Tire',   unit:'條', unitCostUSD:65.0,  onHand:8,  inTransit:0,  reserved:2, safetyStock:4,  lastUpdated:now },
      { brandId:jlg.id,   partNumber:'JLG-3703375', name:'電池組 Battery Pack 6V', category:'Battery', unit:'組', unitCostUSD:320.0, onHand:2,  inTransit:4,  reserved:0, safetyStock:2,  lastUpdated:now },
      { brandId:genie.id, partNumber:'GE-97188',    name:'控制器 Controller PCB', category:'Electrical',unit:'個', unitCostUSD:480.0, onHand:1,  inTransit:0,  reserved:1, safetyStock:2,  lastUpdated:now },
      { brandId:genie.id, partNumber:'GE-118521',   name:'平台鏈條 Platform Chain', category:'Structural',unit:'條',unitCostUSD:95.0, onHand:6,  inTransit:0,  reserved:0, safetyStock:2,  lastUpdated:now },
      { brandId:genie.id, partNumber:'GE-56109',    name:'引擎機油濾芯 Oil Filter', category:'Filter', unit:'個', unitCostUSD:12.5,  onHand:4,  inTransit:20, reserved:0, safetyStock:10, lastUpdated:now },
      { brandId:sky.id,   partNumber:'SJ-159002',   name:'緊急下降閥 Emergency Valve', category:'Safety',unit:'個',unitCostUSD:145.0, onHand:3,  inTransit:0,  reserved:0, safetyStock:3,  lastUpdated:now },
      { brandId:sky.id,   partNumber:'SJ-105047',   name:'空氣濾清器 Air Filter', category:'Filter',   unit:'個', unitCostUSD:22.0,  onHand:2,  inTransit:0,  reserved:0, safetyStock:5,  lastUpdated:now },
      { brandId:jlg.id,   partNumber:'JLG-4640017', name:'腳踏板 Deck Extension', category:'Structural',unit:'片',unitCostUSD:210.0, onHand:5,  inTransit:0,  reserved:0, safetyStock:2,  lastUpdated:now },
      { brandId:genie.id, partNumber:'GE-101516',   name:'充電器 Charger 24V', category:'Electrical', unit:'台', unitCostUSD:380.0, onHand:2,  inTransit:2,  reserved:0, safetyStock:1,  lastUpdated:now },
      { brandId:sky.id,   partNumber:'SJ-157876',   name:'液壓泵浦 Hydraulic Pump', category:'Hydraulic',unit:'台',unitCostUSD:720.0, onHand:1,  inTransit:0,  reserved:0, safetyStock:1,  lastUpdated:now },
      { brandId:jlg.id,   partNumber:'JLG-1001467', name:'密封件套組 Seal Kit', category:'Hydraulic', unit:'套', unitCostUSD:55.0,  onHand:9,  inTransit:0,  reserved:0, safetyStock:5,  lastUpdated:now },
    ];
    const savedParts = [];
    for (const p of parts) savedParts.push(await DB.Parts.save(p));

    // ── Work Orders ─────────────────────────
    const wos = [
      { assetId:a3.id, type:'corrective', status:'in_progress', priority:'high',
        reportDate:'2026-04-20', dueDate:'2026-04-28',
        description:'油壓缸漏油，平台無法升降，需更換密封件及油壓濾芯',
        technicianName:'陳大明', laborHours:8, laborRate:1200,
        partsUsed:[{partId:savedParts[0].id, qty:1, cost:925},{partId:savedParts[11].id, qty:2, cost:1790}],
        totalCost:12090, photos:[], notes:'待零件到貨後繼續施工' },
      { assetId:a2.id, type:'preventive', status:'open', priority:'medium',
        reportDate:'2026-04-22', dueDate:'2026-05-02',
        description:'定期500小時保養 - 更換機油濾芯、清潔空氣濾清器、潤滑各活動部位',
        technicianName:'', laborHours:4, laborRate:1200,
        partsUsed:[], totalCost:4800, photos:[], notes:'' },
      { assetId:a1.id, type:'inspection', status:'completed', priority:'low',
        reportDate:'2026-03-15', dueDate:'2026-03-18', completedDate:'2026-03-17',
        description:'出租前安全檢查，確認所有安全裝置正常',
        technicianName:'李小華', laborHours:2, laborRate:1200,
        partsUsed:[], totalCost:2400, photos:[], notes:'通過檢查，可出租使用' },
      { assetId:a2.id, type:'corrective', status:'completed', priority:'high',
        reportDate:'2026-02-10', dueDate:'2026-02-15', completedDate:'2026-02-14',
        description:'Emergency stop按鈕失效，更換控制器',
        technicianName:'陳大明', laborHours:5, laborRate:1200,
        partsUsed:[{partId:savedParts[3].id, qty:1, cost:15600}],
        totalCost:21600, photos:[], notes:'更換完成，功能正常' },
      { assetId:a4.id, type:'preventive', status:'open', priority:'low',
        reportDate:'2026-04-25', dueDate:'2026-05-10',
        description:'新機入庫前全車檢測',
        technicianName:'', laborHours:3, laborRate:1200,
        partsUsed:[], totalCost:3600, photos:[], notes:'' },
      { assetId:a3.id, type:'corrective', status:'completed', priority:'medium',
        reportDate:'2025-12-05', dueDate:'2025-12-10', completedDate:'2025-12-09',
        description:'驅動輪胎磨損，更換兩條',
        technicianName:'李小華', laborHours:3, laborRate:1200,
        partsUsed:[{partId:savedParts[1].id, qty:2, cost:4225}],
        totalCost:7825, photos:[], notes:'' },
      { assetId:a1.id, type:'preventive', status:'completed', priority:'low',
        reportDate:'2025-10-20', dueDate:'2025-10-25', completedDate:'2025-10-24',
        description:'年度保養 - 全面檢查',
        technicianName:'陳大明', laborHours:6, laborRate:1200,
        partsUsed:[{partId:savedParts[0].id, qty:1, cost:925},{partId:savedParts[2].id, qty:1, cost:10400}],
        totalCost:18525, photos:[], notes:'年度保養完成' },
      { assetId:a2.id, type:'preventive', status:'pending_invoice', priority:'medium',
        reportDate:'2026-04-01', dueDate:'2026-04-05', completedDate:'2026-04-04',
        description:'季度保養完成，待開發票',
        technicianName:'李小華', laborHours:4, laborRate:1200,
        partsUsed:[{partId:savedParts[5].id, qty:2, cost:813}],
        totalCost:5613, photos:[], notes:'' },
    ];
    for (const w of wos) await DB.WorkOrders.save(w);

    // ── Transactions ────────────────────────
    await DB.Transactions.log({ type:'purchase', partId:savedParts[0].id, quantity:20, costTWD:18500, date:'2026-04-01', notes:'向 JLG 原廠採購', supplier:'JLG Industries' });
    await DB.Transactions.log({ type:'use', partId:savedParts[0].id, quantity:1, costTWD:925, date:'2026-04-20', notes:'WO#1 維修使用', workOrderId:1 });
    await DB.Transactions.log({ type:'purchase', partId:savedParts[1].id, quantity:8, costTWD:16900, date:'2026-03-15', notes:'採購補貨', supplier:'JLG Industries' });

    await DB.markSeeded();
    console.log('[AerialERP] Demo data seeded ✓');
  }
};
