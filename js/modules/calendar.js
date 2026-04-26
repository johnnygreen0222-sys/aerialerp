/* calendar.js — Preventive Maintenance Calendar */
const CalendarModule = {
  _year: new Date().getFullYear(),
  _month: new Date().getMonth(),

  async render() {
    const [assets, models, brands, wos] = await Promise.all([
      DB.Assets.all(), DB.Models.all(), DB.Brands.all(), DB.WorkOrders.all()
    ]);
    const modelMap = Object.fromEntries(models.map(m=>[m.id,m]));
    const brandMap = Object.fromEntries(brands.map(b=>[b.id,b]));
    const fmt = App.fmt;

    // Collect upcoming maintenance events (assets with due dates)
    const events = [];
    assets.forEach(a => {
      if (a.nextMaintenanceDate) {
        events.push({ date: a.nextMaintenanceDate, asset: a, type:'scheduled', color:'blue' });
      }
      if (a.warrantyExpiry) {
        const d = Math.floor((new Date(a.warrantyExpiry)-new Date())/86400000);
        if (d >= 0 && d <= 90) events.push({ date: a.warrantyExpiry, asset: a, type:'warranty', color:'amber' });
      }
    });
    wos.filter(w => w.dueDate && ['open','in_progress'].includes(w.status)).forEach(w => {
      const asset = assets.find(a=>a.id===w.assetId)||{};
      events.push({ date: w.dueDate, wo: w, asset, type:'workorder', color:'emerald' });
    });

    const firstDay = new Date(this._year, this._month, 1).getDay();
    const daysInMonth = new Date(this._year, this._month+1, 0).getDate();
    const monthNames = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
    const today = new Date().toISOString().slice(0,10);

    const el = document.getElementById('page-content');
    el.innerHTML = `
      <div class="page-header">
        <div class="page-header-left"><h2>保養行事曆 Maintenance Calendar</h2><p>設備到期保養、工單截止日、保固到期一覽</p></div>
        <div class="page-header-right">
          ${App.can('calendar','create') ? `<button class="btn btn-primary" onclick="CalendarModule.scheduleMaint()">＋ 排定保養</button>` : ''}
        </div>
      </div>

      <div class="grid-2" style="gap:24px;align-items:start">
        <!-- Calendar -->
        <div class="card">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
            <button class="btn btn-sm btn-secondary" onclick="CalendarModule.prevMonth()">◀</button>
            <strong style="font-size:1.1rem">${this._year} 年 ${monthNames[this._month]}</strong>
            <button class="btn btn-sm btn-secondary" onclick="CalendarModule.nextMonth()">▶</button>
          </div>
          <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;text-align:center">
            ${['日','一','二','三','四','五','六'].map(d=>`<div style="font-size:.75rem;font-weight:600;color:var(--c-text3);padding:4px">${d}</div>`).join('')}
            ${Array(firstDay).fill('').map(()=>`<div></div>`).join('')}
            ${Array.from({length:daysInMonth},(_,i)=>{
              const day  = i+1;
              const dStr = `${this._year}-${String(this._month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
              const evs  = events.filter(e=>e.date===dStr);
              const isToday = dStr === today;
              return `<div onclick="CalendarModule.showDay('${dStr}')"
                style="padding:4px 2px;border-radius:6px;cursor:pointer;transition:background .15s;min-height:38px;${isToday?'background:rgba(59,130,246,.2);border:1px solid var(--c-blue)':''}">
                <div style="font-size:.82rem;font-weight:${isToday?'700':'400'};color:${isToday?'var(--c-blue)':'var(--c-text)'}">${day}</div>
                <div style="display:flex;flex-wrap:wrap;gap:2px;justify-content:center">
                  ${evs.map(e=>`<div style="width:6px;height:6px;border-radius:50%;background:var(--c-${e.color})" title="${e.asset?.serialNumber||''}"></div>`).join('')}
                </div>
              </div>`;
            }).join('')}
          </div>
          <div style="display:flex;gap:12px;margin-top:14px;flex-wrap:wrap">
            <div style="display:flex;align-items:center;gap:4px;font-size:.75rem"><div style="width:8px;height:8px;border-radius:50%;background:var(--c-blue)"></div>排定保養</div>
            <div style="display:flex;align-items:center;gap:4px;font-size:.75rem"><div style="width:8px;height:8px;border-radius:50%;background:var(--c-emerald)"></div>工單截止</div>
            <div style="display:flex;align-items:center;gap:4px;font-size:.75rem"><div style="width:8px;height:8px;border-radius:50%;background:var(--c-amber)"></div>保固到期</div>
          </div>
        </div>

        <!-- Upcoming Events List -->
        <div class="card">
          <div class="card-header"><span class="card-title">⏰ 即將到期事項（90天內）</span></div>
          <div style="max-height:500px;overflow-y:auto">
          ${events.length === 0 ? `<div class="empty-state"><p>90天內無待辦事項</p></div>` :
            events.sort((a,b)=>a.date.localeCompare(b.date)).filter(e => {
              const d = Math.floor((new Date(e.date)-new Date())/86400000);
              return d >= -3 && d <= 90;
            }).map(e => {
              const d = Math.floor((new Date(e.date)-new Date())/86400000);
              const m = modelMap[e.asset?.modelId]||{};
              const b = brandMap[m.brandId]||{};
              const typeLabel = { scheduled:'🔧 排定保養', warranty:'🛡 保固到期', workorder:'📋 工單截止' }[e.type];
              return `<div style="padding:10px 0;border-bottom:1px solid var(--c-border);display:flex;gap:10px;align-items:flex-start">
                <div style="text-align:center;min-width:52px">
                  <div style="font-size:.7rem;color:var(--c-text3)">${fmt.date(e.date)}</div>
                  <div style="font-size:.75rem;font-weight:600;color:${d<0?'var(--c-red)':d<7?'var(--c-amber)':'var(--c-text3)'}">${d<0?`逾期${Math.abs(d)}天`:d===0?'今天':`${d}天後`}</div>
                </div>
                <div style="flex:1">
                  <div style="font-size:.82rem;font-weight:600">${e.asset?.serialNumber||'—'}</div>
                  <div style="font-size:.75rem;color:var(--c-text3)">${b.name||''} ${m.modelName||''}</div>
                  <div style="font-size:.75rem;color:var(--c-text2)">${typeLabel}</div>
                </div>
              </div>`;
            }).join('') || '<div class="empty-state"><p>90天內無即將到期事項</p></div>'}
          </div>
        </div>
      </div>`;
  },

  prevMonth() { if (this._month === 0) { this._month=11; this._year--; } else { this._month--; } this.render(); },
  nextMonth() { if (this._month === 11) { this._month=0; this._year++; } else { this._month++; } this.render(); },

  showDay(date) {
    const fmt = App.fmt;
    App.openModal(`${fmt.date(date)} 事項`, `<p class="text-sm text-muted">此日無事項排定。</p><div class="form-actions"><button class="btn btn-primary" onclick="CalendarModule.scheduleMaint('${date}')">＋ 排定保養</button></div>`, 'modal-sm');
  },

  async scheduleMaint(date='') {
    const assets = await DB.Assets.all();
    const models = await DB.Models.all();
    const mMap   = Object.fromEntries(models.map(m=>[m.id,m]));
    App.openModal('排定保養', `
      <form onsubmit="CalendarModule.saveMaint(event)">
        <div class="form-group">
          <label class="form-label">設備 <span>*</span></label>
          <select class="form-control" id="cal-asset" required>
            <option value="">選擇設備…</option>
            ${assets.map(a=>`<option value="${a.id}">${a.serialNumber} — ${mMap[a.modelId]?.modelName||''}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">排定保養日期 <span>*</span></label>
          <input class="form-control" type="date" id="cal-date" value="${date}" required>
        </div>
        <div class="form-group">
          <label class="form-label">備註</label>
          <input class="form-control" id="cal-notes" placeholder="保養項目說明">
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="App.closeModal()">取消</button>
          <button type="submit" class="btn btn-primary">💾 儲存</button>
        </div>
      </form>`, 'modal-sm');
  },

  async saveMaint(e) {
    e.preventDefault();
    const id   = parseInt(document.getElementById('cal-asset').value);
    const date = document.getElementById('cal-date').value;
    const notes= document.getElementById('cal-notes').value;
    const asset = await DB.Assets.get(id);
    asset.nextMaintenanceDate = date;
    asset.maintenanceNotes    = notes;
    await DB.Assets.save(asset);
    App.closeModal(); App.toast('保養已排定 ✓','success');
    await this.render();
  }
};
