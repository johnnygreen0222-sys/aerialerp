/* ═══════════════════════════════════════════
   data-seed.js — 台灣高空 服務團隊 示範資料
   品牌：Audient / Austrian Audio / Dynaudio /
         Strymon / Schoeps / Superlux
═══════════════════════════════════════════ */
const _hashPwd = async pwd => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pwd + '_aerial_salt_2026'));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
};

const DataSeed = {
  SEED_KEY: 'seeded_v3', // 版本升級 → 自動重新 seed

  async run() {
    const seeded = await DB.getSetting(this.SEED_KEY);
    if (seeded) return;

    // ── 清除舊資料 ──────────────────────────
    for (const s of ['brands','models','assets','parts','workorders','transactions','settings']) {
      try { await DB.clear(s); } catch {}
    }

    // ── 使用者帳號（保留，不清除）──────────────
    const existingUsers = await DB.getAll('users');
    if (existingUsers.length === 0) {
      // 從 config.js 取得 hash，或動態計算
      const cfg = window.__AERIALERP_CONFIG__ || {};
      if (cfg.seedUsers && cfg.seedUsers.length > 0) {
        for (const u of cfg.seedUsers) {
          await DB.add('users', { ...u, createdAt: new Date().toISOString() });
        }
      } else {
        await DB.add('users', { username:'admin',  passwordHash: await _hashPwd('admin1234'), role:'admin',      name:'系統管理員', active:true });
        await DB.add('users', { username:'sales1', passwordHash: await _hashPwd('sales1234'), role:'sales',      name:'業務員甲',   active:true });
        await DB.add('users', { username:'tech1',  passwordHash: await _hashPwd('tech1234'),  role:'technician', name:'維修技師',   active:true });
      }
    }

    // ════════════════════════════════════════
    // 品牌資料 Brands
    // ════════════════════════════════════════
    const audient      = await DB.Brands.save({ name:'Audient',       country:'UK',          logo:'🎛', description:'英國專業錄音介面與調音台品牌，以高品質前級聞名業界' });
    const austrianAudio= await DB.Brands.save({ name:'Austrian Audio',country:'Austria',     logo:'🎙', description:'奧地利頂級麥克風與耳機品牌，AKG 原班人馬創立' });
    const dynaudio     = await DB.Brands.save({ name:'Dynaudio',      country:'Denmark',     logo:'🔊', description:'丹麥頂級監聽喇叭品牌，自製單體技術獨步全球' });
    const strymon      = await DB.Brands.save({ name:'Strymon',       country:'USA',         logo:'🎸', description:'美國頂級效果器品牌，DSP 演算法業界標竿' });
    const schoeps      = await DB.Brands.save({ name:'Schoeps',       country:'Germany',     logo:'🎚', description:'德國百年麥克風品牌，廣播與錄音室首選' });
    const superlux     = await DB.Brands.save({ name:'Superlux',      country:'Taiwan',      logo:'🎧', description:'台灣麥克風與耳機品牌，高性價比專業音頻設備' });

    // ════════════════════════════════════════
    // 型號資料 Models
    // ════════════════════════════════════════
    // Audient
    const au_id4   = await DB.Models.save({ brandId:audient.id, modelName:'iD4 mkII',       category:'USB Audio Interface', description:'2-in/2-out USB錄音介面，Class-A 前級', partIds:[] });
    const au_id14  = await DB.Models.save({ brandId:audient.id, modelName:'iD14 mkII',      category:'USB Audio Interface', description:'10-in/6-out USB錄音介面，業界標竿', partIds:[] });
    const au_id22  = await DB.Models.save({ brandId:audient.id, modelName:'iD22',           category:'USB Audio Interface', description:'高端 USB 錄音介面，支援 ADAT 擴充', partIds:[] });
    const au_id44  = await DB.Models.save({ brandId:audient.id, modelName:'iD44 mkII',      category:'USB Audio Interface', description:'20-in/24-out，適合專業錄音室', partIds:[] });
    const au_asp   = await DB.Models.save({ brandId:audient.id, modelName:'ASP8024-HE',     category:'Recording Console',  description:'Heritage Edition 大型類比調音台', partIds:[] });

    // Austrian Audio
    const aa_oc818 = await DB.Models.save({ brandId:austrianAudio.id, modelName:'OC818',    category:'Condenser Microphone', description:'大震膜電容麥，可切換指向、含藍牙遙控', partIds:[] });
    const aa_oc18  = await DB.Models.save({ brandId:austrianAudio.id, modelName:'OC18',     category:'Condenser Microphone', description:'專業錄音室大震膜電容麥', partIds:[] });
    const aa_cc8   = await DB.Models.save({ brandId:austrianAudio.id, modelName:'CC8',      category:'Condenser Microphone', description:'小震膜電容麥，樂器收音首選', partIds:[] });
    const aa_hix55 = await DB.Models.save({ brandId:austrianAudio.id, modelName:'Hi-X55',  category:'Studio Headphone',     description:'封閉式監聽耳機，參考級調音', partIds:[] });
    const aa_hix65 = await DB.Models.save({ brandId:austrianAudio.id, modelName:'Hi-X65',  category:'Studio Headphone',     description:'半開放式監聽耳機', partIds:[] });

    // Dynaudio
    const dy_lyd5  = await DB.Models.save({ brandId:dynaudio.id, modelName:'LYD 5',         category:'Studio Monitor', description:'5" 近場監聽喇叭，入門專業首選', partIds:[] });
    const dy_lyd7  = await DB.Models.save({ brandId:dynaudio.id, modelName:'LYD 7',         category:'Studio Monitor', description:'7" 近場監聽喇叭', partIds:[] });
    const dy_lyd8  = await DB.Models.save({ brandId:dynaudio.id, modelName:'LYD 8',         category:'Studio Monitor', description:'8" 近場監聽喇叭，大動態表現', partIds:[] });
    const dy_core7 = await DB.Models.save({ brandId:dynaudio.id, modelName:'Core 7',        category:'Studio Monitor', description:'旗艦近場監聽，錄音室核心配置', partIds:[] });
    const dy_c47   = await DB.Models.save({ brandId:dynaudio.id, modelName:'Core 47',       category:'Studio Monitor', description:'中場監聽，自然精確的聲音重現', partIds:[] });

    // Strymon
    const st_bigsky= await DB.Models.save({ brandId:strymon.id, modelName:'BigSky MX',      category:'Reverb Pedal',    description:'旗艦殘響效果器，11 種演算法', partIds:[] });
    const st_tline = await DB.Models.save({ brandId:strymon.id, modelName:'Timeline',        category:'Delay Pedal',     description:'旗艦延遲效果器，12 種延遲類型', partIds:[] });
    const st_mob   = await DB.Models.save({ brandId:strymon.id, modelName:'Mobius',          category:'Modulation Pedal',description:'旗艦調製效果器', partIds:[] });
    const st_iri   = await DB.Models.save({ brandId:strymon.id, modelName:'Iridium',         category:'Amp Simulator',   description:'擴大機與箱體模擬，直入錄音神器', partIds:[] });
    const st_nsky  = await DB.Models.save({ brandId:strymon.id, modelName:'NightSky',        category:'Reverb Pedal',    description:'實驗性音景殘響效果器', partIds:[] });

    // Schoeps
    const sc_cmc6  = await DB.Models.save({ brandId:schoeps.id, modelName:'CMC 6',           category:'Microphone Body', description:'模組化麥克風放大器本體，搭配各式振膜', partIds:[] });
    const sc_mk4   = await DB.Models.save({ brandId:schoeps.id, modelName:'MK 4',            category:'Microphone Capsule', description:'心型指向振膜，廣播首選', partIds:[] });
    const sc_mk8   = await DB.Models.save({ brandId:schoeps.id, modelName:'MK 8',            category:'Microphone Capsule', description:'8字型指向振膜', partIds:[] });
    const sc_cmit  = await DB.Models.save({ brandId:schoeps.id, modelName:'CMIT 5 U',        category:'Shotgun Microphone', description:'電影錄音超指向麥克風', partIds:[] });
    const sc_ortf  = await DB.Models.save({ brandId:schoeps.id, modelName:'ORTF Set',        category:'Stereo Microphone', description:'ORTF 立體聲麥克風套組', partIds:[] });

    // Superlux
    const sl_hd668 = await DB.Models.save({ brandId:superlux.id, modelName:'HD 668B',        category:'Studio Headphone',  description:'半開放式監聽耳機，高性價比', partIds:[] });
    const sl_hd681 = await DB.Models.save({ brandId:superlux.id, modelName:'HD 681',         category:'Studio Headphone',  description:'半開放式耳機，錄音混音監聽', partIds:[] });
    const sl_e205  = await DB.Models.save({ brandId:superlux.id, modelName:'E205',           category:'Condenser Microphone', description:'大震膜錄音室電容麥', partIds:[] });
    const sl_pra628= await DB.Models.save({ brandId:superlux.id, modelName:'PRA 628',        category:'Dynamic Microphone', description:'專業動圈人聲麥克風', partIds:[] });
    const sl_ha3d  = await DB.Models.save({ brandId:superlux.id, modelName:'HA3D',           category:'Headphone Amplifier', description:'獨立耳機放大器，三路輸出', partIds:[] });

    // ════════════════════════════════════════
    // 展示機/庫存設備 Assets (Demo Units)
    // ════════════════════════════════════════
    const a1 = await DB.Assets.save({ modelId:au_id14.id,  serialNumber:'AUD-ID14-001', status:'on_hand',    purchaseDate:'2025-06-01', warrantyExpiry:'2027-06-01', hours:0,   location:'台北展示中心 A區', notes:'展示機，良好狀態' });
    const a2 = await DB.Assets.save({ modelId:dy_core7.id, serialNumber:'DYN-C7-002',  status:'in_use',     purchaseDate:'2025-03-15', warrantyExpiry:'2027-03-15', hours:320, location:'客戶試聽室 — 信義展間', notes:'長期借展' });
    const a3 = await DB.Assets.save({ modelId:aa_oc818.id, serialNumber:'AAU-818-003', status:'maintenance',purchaseDate:'2024-11-20', warrantyExpiry:'2026-11-20', hours:180, location:'維修部', notes:'振膜清潔保養中' });
    const a4 = await DB.Assets.save({ modelId:st_bigsky.id,serialNumber:'STR-BSM-004', status:'on_hand',    purchaseDate:'2026-01-10', warrantyExpiry:'2028-01-10', hours:0,   location:'台北展示中心 B區', notes:'新品展示' });
    const a5 = await DB.Assets.save({ modelId:sc_cmit.id,  serialNumber:'SCH-CM5-005', status:'sold',       purchaseDate:'2024-08-05', warrantyExpiry:'2026-08-05', hours:95,  location:'已售 — 目宿媒體', notes:'電影製作用途' });

    // ════════════════════════════════════════
    // 備用零件/耗材 Parts & Accessories
    // ════════════════════════════════════════
    const now = new Date().toISOString();
    const parts = [
      // Audient 周邊
      { brandId:audient.id,       partNumber:'AUD-PSU-15V',  name:'iD 系列 電源變壓器 15V',        category:'電源 Power',        unit:'個', unitCostUSD:35.0,  onHand:5,  inTransit:0,  reserved:0, safetyStock:3,  lastUpdated:now },
      { brandId:audient.id,       partNumber:'AUD-USB-CBL',  name:'USB-C 連接線 1.5m',             category:'連接線 Cable',      unit:'條', unitCostUSD:12.0,  onHand:20, inTransit:0,  reserved:2, safetyStock:10, lastUpdated:now },
      { brandId:audient.id,       partNumber:'AUD-RACK-1U',  name:'iD44 機架耳 1U',                category:'配件 Accessory',   unit:'組', unitCostUSD:25.0,  onHand:4,  inTransit:5,  reserved:0, safetyStock:2,  lastUpdated:now },
      // Austrian Audio 周邊
      { brandId:austrianAudio.id, partNumber:'AAU-SHK-M',    name:'OC818 防震架 Shockmount',       category:'麥克風配件 Mic Acc',unit:'個', unitCostUSD:65.0,  onHand:6,  inTransit:0,  reserved:1, safetyStock:3,  lastUpdated:now },
      { brandId:austrianAudio.id, partNumber:'AAU-POP-F',    name:'防噴罩 Pop Filter',             category:'麥克風配件 Mic Acc',unit:'個', unitCostUSD:20.0,  onHand:10, inTransit:0,  reserved:0, safetyStock:5,  lastUpdated:now },
      { brandId:austrianAudio.id, partNumber:'AAU-EPADS',    name:'Hi-X 系列 替換耳墊',            category:'耳機配件 HP Acc',   unit:'對', unitCostUSD:28.0,  onHand:8,  inTransit:0,  reserved:0, safetyStock:4,  lastUpdated:now },
      // Dynaudio 周邊
      { brandId:dynaudio.id,      partNumber:'DYN-PWR-CBL',  name:'監聽喇叭電源線 IEC 1.8m',       category:'連接線 Cable',      unit:'條', unitCostUSD:15.0,  onHand:12, inTransit:0,  reserved:0, safetyStock:6,  lastUpdated:now },
      { brandId:dynaudio.id,      partNumber:'DYN-ISO-PAD',  name:'喇叭隔離墊 Isolation Pad 5"',   category:'配件 Accessory',   unit:'對', unitCostUSD:45.0,  onHand:7,  inTransit:10, reserved:0, safetyStock:4,  lastUpdated:now },
      { brandId:dynaudio.id,      partNumber:'DYN-STAND-S',  name:'監聽架 Studio Stand 小型',      category:'架台 Stand',        unit:'對', unitCostUSD:120.0, onHand:3,  inTransit:0,  reserved:1, safetyStock:2,  lastUpdated:now },
      // Strymon 周邊
      { brandId:strymon.id,       partNumber:'STR-PSU-9V',   name:'Strymon Zuma 電源供應器',       category:'電源 Power',        unit:'個', unitCostUSD:199.0, onHand:4,  inTransit:0,  reserved:0, safetyStock:2,  lastUpdated:now },
      { brandId:strymon.id,       partNumber:'STR-MIDI-CBL', name:'MIDI 連接線 TRS 30cm',          category:'連接線 Cable',      unit:'條', unitCostUSD:18.0,  onHand:15, inTransit:0,  reserved:0, safetyStock:8,  lastUpdated:now },
      // Schoeps 周邊
      { brandId:schoeps.id,       partNumber:'SCH-MZW-1',    name:'防風罩 MZW 100',                category:'麥克風配件 Mic Acc',unit:'個', unitCostUSD:85.0,  onHand:3,  inTransit:0,  reserved:0, safetyStock:2,  lastUpdated:now },
      { brandId:schoeps.id,       partNumber:'SCH-SG-20',    name:'延伸桿 SG 20cm',               category:'麥克風配件 Mic Acc',unit:'個', unitCostUSD:55.0,  onHand:5,  inTransit:0,  reserved:0, safetyStock:2,  lastUpdated:now },
      // Superlux 周邊
      { brandId:superlux.id,      partNumber:'SLX-XLR-CBL',  name:'XLR 平衡線 3m',                category:'連接線 Cable',      unit:'條', unitCostUSD:8.0,   onHand:30, inTransit:20, reserved:5, safetyStock:15, lastUpdated:now },
      { brandId:superlux.id,      partNumber:'SLX-MIC-STAND','name':'桌上型麥克風架',              category:'架台 Stand',        unit:'個', unitCostUSD:12.0,  onHand:15, inTransit:0,  reserved:0, safetyStock:8,  lastUpdated:now },
      { brandId:superlux.id,      partNumber:'SLX-EPADS-668','name':'HD 668B 替換耳墊',            category:'耳機配件 HP Acc',   unit:'對', unitCostUSD:10.0,  onHand:20, inTransit:0,  reserved:0, safetyStock:10, lastUpdated:now },
    ];
    const savedParts = [];
    for (const p of parts) savedParts.push(await DB.Parts.save(p));

    // ════════════════════════════════════════
    // 服務工單 Work Orders
    // ════════════════════════════════════════
    await DB.WorkOrders.save({
      assetId:a3.id, type:'preventive', status:'in_progress', priority:'medium',
      reportDate:'2026-04-20', dueDate:'2026-04-28',
      description:'Austrian Audio OC818 振膜例行清潔保養，含電路板防塵處理，測試頻率響應',
      technicianName:'維修技師', laborHours:2, laborRate:1200,
      partsUsed:[], totalCost:2400, photos:[], notes:'待確認清潔後頻響是否恢復標準'
    });
    await DB.WorkOrders.save({
      assetId:a2.id, type:'inspection', status:'open', priority:'low',
      reportDate:'2026-04-22', dueDate:'2026-05-05',
      description:'Dynaudio Core 7 展示機定期檢查，確認高低音單體、功放板運作正常',
      technicianName:'', laborHours:1, laborRate:1200,
      partsUsed:[], totalCost:1200, photos:[], notes:''
    });
    await DB.WorkOrders.save({
      assetId:a1.id, type:'corrective', status:'completed', priority:'high',
      reportDate:'2026-03-10', dueDate:'2026-03-15', completedDate:'2026-03-14',
      description:'Audient iD14 mkII USB-C 接頭接觸不良，更換連接線並清潔接點',
      technicianName:'維修技師', laborHours:1, laborRate:1200,
      partsUsed:[{ partId:savedParts[1].id, qty:1, cost:390 }],
      totalCost:1590, photos:[], notes:'更換後測試正常，建議每6個月檢查一次'
    });
    await DB.WorkOrders.save({
      assetId:a4.id, type:'inspection', status:'completed', priority:'low',
      reportDate:'2026-01-12', dueDate:'2026-01-14', completedDate:'2026-01-13',
      description:'Strymon BigSky MX 入庫展示前全機測試，確認11種演算法及 MIDI 功能正常',
      technicianName:'維修技師', laborHours:1, laborRate:1200,
      partsUsed:[], totalCost:1200, photos:[], notes:'通過測試，可上架展示'
    });

    // ── 交易記錄 ──────────────────────────────
    await DB.Transactions.log({ type:'purchase', partId:savedParts[0].id,  quantity:5,  costTWD:5688,  date:'2026-04-01', notes:'Audient 原廠採購',       supplier:'Audient Limited' });
    await DB.Transactions.log({ type:'purchase', partId:savedParts[13].id, quantity:50, costTWD:13000, date:'2026-04-05', notes:'Superlux XLR線 補貨',    supplier:'Superlux Taiwan' });
    await DB.Transactions.log({ type:'use',      partId:savedParts[1].id,  quantity:1,  costTWD:390,   date:'2026-03-14', notes:'WO#3 維修使用',         workOrderId:3 });

    await DB.setSetting(this.SEED_KEY, true);
    console.log('[台灣高空] 示範資料已載入 ✓ (Audient / Austrian Audio / Dynaudio / Strymon / Schoeps / Superlux)');
  }
};
