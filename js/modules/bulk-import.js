/* bulk-import.js — Batch Import for Brands, Models, Parts */
const BulkImport = (() => {
  const validateBrandsCSV = (rows) => {
    const errors = [];
    const required = ['name'];
    rows.forEach((row, idx) => {
      required.forEach(field => {
        if (!row[field]?.trim()) errors.push(`第 ${idx+1} 列缺少「${field}」欄位`);
      });
    });
    return errors;
  };

  const validateModelsCSV = (rows) => {
    const errors = [];
    const required = ['brandName', 'modelName'];
    rows.forEach((row, idx) => {
      required.forEach(field => {
        if (!row[field]?.trim()) errors.push(`第 ${idx+1} 列缺少「${field}」欄位`);
      });
    });
    return errors;
  };

  const validatePartsCSV = (rows) => {
    const errors = [];
    const required = ['brandName', 'partNumber', 'name'];
    rows.forEach((row, idx) => {
      required.forEach(field => {
        if (!row[field]?.trim()) errors.push(`第 ${idx+1} 列缺少「${field}」欄位`);
      });
      if (row.partNumber && !/^[A-Z0-9\-\.]+$/.test(row.partNumber)) {
        errors.push(`第 ${idx+1} 列料號格式不正確（僅允許英數字、-、.）`);
      }
    });
    return errors;
  };

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });
      if (Object.values(row).some(v => v)) rows.push(row);
    }
    return rows;
  };

  const importBrands = async (rows) => {
    const errors = validateBrandsCSV(rows);
    if (errors.length > 0) {
      App.toast('❌ ' + errors[0], 'error');
      return 0;
    }

    let count = 0;
    for (const row of rows) {
      const existing = await DB.getAll('brands', b => b.name === row.name.trim());
      if (existing.length === 0) {
        await DB.Brands.save({
          name: row.name.trim(),
          logo: row.logo?.trim() || '🏷',
          country: row.country?.trim() || '',
          description: row.description?.trim() || ''
        });
        count++;
      }
    }
    return count;
  };

  const importModels = async (rows) => {
    const errors = validateModelsCSV(rows);
    if (errors.length > 0) {
      App.toast('❌ ' + errors[0], 'error');
      return 0;
    }

    const brands = await DB.Brands.all();
    const brandMap = Object.fromEntries(brands.map(b => [b.name, b]));
    let count = 0;

    for (const row of rows) {
      const brand = brandMap[row.brandName.trim()];
      if (!brand) {
        App.toast(`❌ 找不到品牌「${row.brandName}」`, 'error');
        continue;
      }

      const existing = await DB.getAll('models', m => m.modelName === row.modelName.trim());
      if (existing.length === 0) {
        await DB.Models.save({
          brandId: brand.id,
          modelName: row.modelName.trim(),
          category: row.category?.trim() || '',
          engineType: row.engineType?.trim() || '',
          maxHeight: parseFloat(row.maxHeight) || null,
          maxCapacity: parseFloat(row.maxCapacity) || null,
          weight: parseFloat(row.weight) || null
        });
        count++;
      }
    }
    return count;
  };

  const importParts = async (rows) => {
    const errors = validatePartsCSV(rows);
    if (errors.length > 0) {
      App.toast('❌ ' + errors[0], 'error');
      return 0;
    }

    const brands = await DB.Brands.all();
    const brandMap = Object.fromEntries(brands.map(b => [b.name, b]));
    let count = 0;

    for (const row of rows) {
      const brand = brandMap[row.brandName.trim()];
      if (!brand) {
        App.toast(`❌ 找不到品牌「${row.brandName}」`, 'error');
        continue;
      }

      const existing = await DB.getAll('parts', p => p.partNumber === row.partNumber.trim());
      if (existing.length === 0) {
        await DB.Parts.save({
          brandId: brand.id,
          partNumber: row.partNumber.trim().toUpperCase(),
          name: row.name.trim(),
          category: row.category?.trim() || 'Other',
          unit: row.unit?.trim() || '個',
          unitCostUSD: parseFloat(row.unitCostUSD) || 0,
          safetyStock: parseInt(row.safetyStock) || 0,
          onHand: parseInt(row.onHand) || 0,
          inTransit: parseInt(row.inTransit) || 0,
          reserved: parseInt(row.reserved) || 0
        });
        count++;
      }
    }
    return count;
  };

  const showImportForm = (type) => {
    const titles = {
      brands: '批量導入品牌',
      models: '批量導入型號',
      parts: '批量導入零件'
    };

    const samples = {
      brands: 'name,logo,country,description\nJLG,🏗,USA,美國升降機品牌\nGenie,🚜,USA,升降機領先品牌',
      models: 'brandName,modelName,category,engineType,maxHeight,maxCapacity,weight\nJLG,1930ES,Scissor Lift,Electric,8.0,544,2300\nGenie,S-40,Scissor Lift,Electric,12.0,600,2500',
      parts: 'brandName,partNumber,name,category,unit,unitCostUSD,safetyStock,onHand\nJLG,JLG-FILTER-001,空氣濾芯,Filter,個,15.50,5,10\nGenie,GEN-BATTERY-02,電池組,Electrical,組,450.00,2,3'
    };

    const headers = {
      brands: 'name*,logo,country,description',
      models: 'brandName*,modelName*,category,engineType,maxHeight,maxCapacity,weight',
      parts: 'brandName*,partNumber*,name*,category,unit,unitCostUSD,safetyStock,onHand'
    };

    App.openModal(titles[type], `
      <div style="margin-bottom:16px">
        <div class="alert-banner info">
          <strong>CSV 格式說明：</strong><br>
          欄位（*為必填）: ${headers[type]}<br>
          <a href="#" onclick="BulkImport.downloadTemplate('${type}'); return false;" style="color:var(--c-blue);text-decoration:underline">下載範本</a>
        </div>
      </div>
      <form id="import-form" onsubmit="BulkImport.processImport(event, '${type}')">
        <div class="form-group">
          <label class="form-label">貼上 CSV 內容</label>
          <textarea class="form-control" id="import-text" placeholder="${samples[type]}" style="font-family:monospace;font-size:0.9rem;height:250px;min-height:150px" required></textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="App.closeModal()">取消</button>
          <button type="submit" class="btn btn-primary">📥 開始導入</button>
        </div>
      </form>`, 'modal-md');
  };

  const processImport = async (e, type) => {
    e.preventDefault();
    const text = document.getElementById('import-text').value.trim();
    if (!text) {
      App.toast('❌ 請輸入 CSV 內容', 'warning');
      return;
    }

    const rows = parseCSV(text);
    if (rows.length === 0) {
      App.toast('❌ 無有效資料列', 'error');
      return;
    }

    App.closeModal();
    const spinner = App.toast('⏳ 導入中…', 'info');

    try {
      let count = 0;
      if (type === 'brands') count = await importBrands(rows);
      else if (type === 'models') count = await importModels(rows);
      else if (type === 'parts') count = await importParts(rows);

      App.toast(`✅ 成功導入 ${count} 筆資料`, 'success');
      
      if (type === 'brands') await BrandsModule.render();
      else if (type === 'models') await BrandsModule.render();
      else if (type === 'parts') await InventoryModule.render();
    } catch (err) {
      console.error('[Import]', err);
      App.toast('❌ 導入失敗: ' + err.message, 'error');
    }
  };

  const downloadTemplate = (type) => {
    const templates = {
      brands: 'name,logo,country,description\nJLG,🏗,USA,美國升降機品牌\nGenie,🚜,USA,升降機領先品牌',
      models: 'brandName,modelName,category,engineType,maxHeight,maxCapacity,weight\nJLG,1930ES,Scissor Lift,Electric,8.0,544,2300\nGenie,S-40,Scissor Lift,Electric,12.0,600,2500',
      parts: 'brandName,partNumber,name,category,unit,unitCostUSD,safetyStock,onHand\nJLG,JLG-FILTER-001,空氣濾芯,Filter,個,15.50,5,10\nGenie,GEN-BATTERY-02,電池組,Electrical,組,450.00,2,3'
    };

    const blob = new Blob([templates[type]], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `template-${type}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return {
    showImportForm,
    processImport,
    downloadTemplate
  };
})();
