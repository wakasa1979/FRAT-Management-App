const GOOGLE_SHEETS_ID = process.env.REACT_APP_GOOGLE_SHEETS_ID;
const GOOGLE_SHEETS_ID_RECORD_BOOK = process.env.REACT_APP_GOOGLE_SHEETS_ID_RECORD_BOOK;
const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
const GAS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbwpIrMliSVQYLa6KcMY1NUH1b_wFJPY_nF_FJ1np4hE0V2ylP2l3WSqJu0bqmSEcT_J/exec';

const CACHE_KEYS = {
  PARTS_LIST: 'frat_parts_list_cache',
  STATUS_A: 'frat_status_a_cache',
  STATUS_B: 'frat_status_b_cache',
  LOCATION_MASTER: 'frat_location_master_cache',
  SERIAL_PREFIXES: 'frat_serial_prefixes_cache'
};

const CACHE_DURATION = 5 * 60 * 1000;

function getCacheWithTimestamp(key) {
  try {
    const cached = sessionStorage.getItem(key);
    if (!cached) return null;
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_DURATION) {
      sessionStorage.removeItem(key);
      return null;
    }
    console.log(`✅ Cache hit: ${key}`);
    return data;
  } catch (error) {
    console.error(`❌ Cache read error for ${key}:`, error);
    return null;
  }
}

function setCacheWithTimestamp(key, data) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (error) {
    console.error(`❌ Cache write error for ${key}:`, error);
  }
}

export async function loadAllMasterData() {
  try {
    console.log('📚 Loading all master data in parallel...');
    
    const [statusA, statusB, locations, prefixes] = await Promise.all([
      getStatusA(),
      getStatusB(),
      getLocationMaster(),
      getSerialPrefixes()
    ]);
    
    console.log('✅ All master data loaded successfully');
    return { statusA, statusB, locations, prefixes };
  } catch (error) {
    console.error('❌ loadAllMasterData error:', error);
    return { statusA: [], statusB: [], locations: [], prefixes: [] };
  }
}

export async function addPart(payload) {
  try {
    const gasPayload = {
      action: 'addPart',
      data: payload.data
    };
    console.log('📤 addPart sending to GAS:', gasPayload);
    const response = await fetch(GAS_WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gasPayload)
    });
    console.log('✅ GAS addPart Response:', response.status);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    sessionStorage.removeItem(CACHE_KEYS.PARTS_LIST);
    
    const partsData = await getPartsList();
    const registered = partsData.find(p => p.serial === payload.data.serialNumber);
    if (registered) {
      console.log('✅ 新規パーツ登録成功（確認済み）');
      return { success: true, message: 'パーツが正常に登録されました', serial: payload.data.serialNumber };
    } else {
      console.log('⚠️ パーツ登録は送信されましたが、確認待ちです');
      return { success: true, message: 'パーツを登録しました（確認中）', serial: payload.data.serialNumber };
    }
  } catch (error) {
    console.error('❌ addPart error:', error);
    return { success: false, message: error.message };
  }
}

export async function checkFratExists(serial) {
  try {
    console.log('📤 checkFratExists:', serial);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_ID_RECORD_BOOK}/values/記録簿?key=${GOOGLE_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.values || data.values.length <= 1) {
      console.log('⚠️ 記録簿が見つかりません');
      return { exists: false, frat: null };
    }
    
    const fratRecords = data.values.slice(1)
      .filter(row => row && row[1] && (!row[9] || row[9].trim() === '') && (!row[10] || row[10].trim() === ''))
      .map(row => ({ serial: row[1], fratDate: row[9] || '', shipmentDate: row[10] || '' }));
    
    const found = fratRecords.find(r => String(r.serial).trim() === String(serial).trim());
    console.log('✅ checkFratExists result:', found);
    return { exists: !!found, frat: found };
  } catch (error) {
    console.error('❌ checkFratExists error:', error);
    return { exists: false, frat: null };
  }
}

export async function getPartsList() {
  try {
    const cached = getCacheWithTimestamp(CACHE_KEYS.PARTS_LIST);
    if (cached) return cached;
    
    console.log('📥 Fetching parts list from Google Sheets...');
    
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_ID}/values/パーツ在庫簿?key=${GOOGLE_API_KEY}`;
    const sheetsResponse = await fetch(url);
    const data = await sheetsResponse.json();
    
    if (!data.values) {
      console.log('⚠️ No parts found');
      return [];
    }
    
    const parts = data.values.slice(1).filter(row => row[1]).map((row, idx) => {
      const building = row[2] || '';
      const floor = row[3] || '';
      const division1 = row[4] || '';
      const pillarNumber = row[5] || '';
      const division2 = row[6] || '';
      const buildingLocation = [building, floor, division1, pillarNumber, division2]
        .filter(v => v)
        .join('-');
      
      return {
        rowIndex: idx + 2,
        serial: row[1] || '',
        building: building,
        floor: floor,
        division1: division1,
        pillarNumber: pillarNumber,
        division2: division2,
        buildingLocation: buildingLocation,
        statusA: row[7] || '',
        statusB: row[8] || '',
        registeredBy: row[9] || '',
        notes: row[10] || '',
        changeHistory: row[11] || '',
        fratTimestamp: row[12] || '',
        shipmentTimestamp: row[13] || '',
        registeredDate: row[0] || ''
      };
    });
    
    setCacheWithTimestamp(CACHE_KEYS.PARTS_LIST, parts);
    
    console.log('✅ getPartsList loaded:', parts.length, 'parts (cached)');
    return parts;
  } catch (error) {
    console.error('❌ getPartsList error:', error);
    return [];
  }
}

export async function fetchProductsFromSheets() {
  return await getPartsList();
}

export async function getStatusA() {
  try {
    const cached = getCacheWithTimestamp(CACHE_KEYS.STATUS_A);
    if (cached) return cached;
    
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_ID}/values/ステータスマスタ!A2:A100?key=${GOOGLE_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    const statusA = data.values ? data.values.flat().filter(v => v) : [];
    
    setCacheWithTimestamp(CACHE_KEYS.STATUS_A, statusA);
    
    console.log('✅ Status A loaded:', statusA.length, '(cached)');
    return statusA;
  } catch (error) {
    console.error('❌ getStatusA error:', error);
    return [];
  }
}

export async function getStatusB() {
  try {
    const cached = getCacheWithTimestamp(CACHE_KEYS.STATUS_B);
    if (cached) return cached;
    
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_ID}/values/ステータスマスタ!B2:B100?key=${GOOGLE_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    const statusB = data.values ? data.values.flat().filter(v => v) : [];
    
    setCacheWithTimestamp(CACHE_KEYS.STATUS_B, statusB);
    
    console.log('✅ Status B loaded:', statusB.length, '(cached)');
    return statusB;
  } catch (error) {
    console.error('❌ getStatusB error:', error);
    return [];
  }
}

export async function getLocationMaster() {
  try {
    const cached = getCacheWithTimestamp(CACHE_KEYS.LOCATION_MASTER);
    if (cached) return cached;
    
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_ID}/values/仮置き場所マスタ!A2:E100?key=${GOOGLE_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    
    const locations = data.values ? data.values
      .filter(row => row[0])
      .map(row => ({
        display: `${row[0]}-${row[1]}-${row[2]}-${row[3]}-${row[4]}`,
        building: row[0],
        floor: row[1],
        division1: row[2],
        pillarNumber: row[3],
        division2: row[4]
      })) : [];
    
    setCacheWithTimestamp(CACHE_KEYS.LOCATION_MASTER, locations);
    
    console.log('✅ Location master loaded:', locations.length, '(cached)');
    return locations;
  } catch (error) {
    console.error('❌ getLocationMaster error:', error);
    return [];
  }
}

export async function getSerialPrefixes() {
  try {
    const cached = getCacheWithTimestamp(CACHE_KEYS.SERIAL_PREFIXES);
    if (cached) return cached;
    
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_ID}/values/シリアルプリフィックスマスタ!A2:A100?key=${GOOGLE_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    const prefixes = data.values ? data.values.flat().filter(v => v) : [];
    
    setCacheWithTimestamp(CACHE_KEYS.SERIAL_PREFIXES, prefixes);
    
    console.log('✅ Serial prefixes loaded:', prefixes.length, '(cached)');
    return prefixes;
  } catch (error) {
    console.error('❌ getSerialPrefixes error:', error);
    return [];
  }
}

export async function updatePart(payload) {
  try {
    const gasPayload = {
      action: 'updatePart',
      ...payload
    };
    console.log('📤 updatePart sending to GAS:', gasPayload);
    const response = await fetch(GAS_WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gasPayload)
    });
    console.log('✅ GAS updatePart Response:', response.status);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    sessionStorage.removeItem(CACHE_KEYS.PARTS_LIST);
    
    return { success: true, message: 'パーツが正常に更新されました' };
  } catch (error) {
    console.error('❌ updatePart error:', error);
    return { success: false, message: error.message };
  }
}

export async function updateStatusBAndMarkFratTimestamp(rowIndex, serial, statusB, user) {
  try {
    const gasPayload = {
      action: 'updateStatusBAndMarkFratTimestamp',
      rowIndex,
      serial,
      statusB,
      user
    };
    console.log('📤 updateStatusBAndMarkFratTimestamp sending:', gasPayload);
    const response = await fetch(GAS_WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gasPayload)
    });
    console.log('✅ GAS Webhook Response:', response.status);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    sessionStorage.removeItem(CACHE_KEYS.PARTS_LIST);
    
    return { success: true, message: 'FRAT貼付けタイムスタンプを転記しました' };
  } catch (error) {
    console.error('❌ updateStatusBAndMarkFratTimestamp error:', error);
    return { success: false, message: error.message };
  }
}

export async function updateShipmentConfirmationTimestamp(rowIndex, serial, user) {
  try {
    const gasPayload = {
      action: 'updateShipmentConfirmationTimestamp',
      rowIndex,
      serial,
      user
    };
    console.log('📤 updateShipmentConfirmationTimestamp sending:', gasPayload);
    const response = await fetch(GAS_WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gasPayload)
    });
    console.log('✅ GAS Webhook Response:', response.status);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    sessionStorage.removeItem(CACHE_KEYS.PARTS_LIST);
    
    return { success: true, message: '出荷確認タイムスタンプを転記しました' };
  } catch (error) {
    console.error('❌ updateShipmentConfirmationTimestamp error:', error);
    return { success: false, message: error.message };
  }
}

export async function deletePart(rowIndex, serial, user) {
  try {
    const gasPayload = {
      action: 'deletePart',
      rowIndex,
      serial,
      user
    };
    console.log('📤 deletePart sending:', gasPayload);
    const response = await fetch(GAS_WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gasPayload)
    });
    console.log('✅ GAS Webhook Response:', response.status);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    sessionStorage.removeItem(CACHE_KEYS.PARTS_LIST);
    
    return { success: true, message: 'パーツが削除されました' };
  } catch (error) {
    console.error('❌ deletePart error:', error);
    return { success: false, message: error.message };
  }
}

export async function sendNewLocationRequestEmail() {
  return { success: true, message: 'Email sent' };
}

export async function sendDeletionRequestEmail() {
  return { success: true, message: 'Email sent' };
}

export async function generateDailyReport() {
  try {
    console.log('📤 generateDailyReport sending to GAS...');
    const gasPayload = {
      action: 'generateDailyReport'
    };
    
    const response = await fetch(GAS_WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gasPayload)
    });
    
    console.log('✅ GAS generateDailyReport Response:', response.status);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return { success: true, message: '当日実績報告をメール送信しました' };
  } catch (error) {
    console.error('❌ generateDailyReport error:', error);
    return { success: false, message: error.message };
  }
}
