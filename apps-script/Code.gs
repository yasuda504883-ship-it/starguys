const SPREADSHEET_ID = '1sMh7LURDYJMbWArTMrC3XQuC2D2sYatql-IXY8wztXI';
const CALENDAR_ID = 'primary';
const TASK_EVENT_PROPERTY_PREFIX = 'TASK_CALENDAR_EVENT_';

const SHEETS = {
  stores: '店舗マスター',
  sales: '営業管理',
  tasks: '個人タスク',
  settings: '設定',
  logs: 'ログ',
};

const STORE_HEADERS = ['店舗ID', '店舗名', 'エリア', '契約状況', '店舗URL', 'Instagram', '作成日時', '更新日時'];
const SALES_HEADERS = ['店舗ID', '担当者', 'ステータス', '撮影ステータス', '案件種別', '最終連絡日', '次回連絡日', 'メモ', '更新日時'];
const TASK_HEADERS = ['タスクID', 'タスク名', '担当者', '期限', '優先度', '店舗ID', '店舗名', 'エリア', 'メモ', 'ステータス', '完了日時', '作成日時', '更新日時'];
const SETTINGS_HEADERS = ['種別', '値', '並び順'];
const LOG_HEADERS = ['日時', '操作', '店舗ID', '内容'];

function doGet(e) { return handleRequest(e); }
function doPost(e) { return handleRequest(e); }

function handleRequest(e) {
  const params = e && e.parameter ? e.parameter : {};
  const callback = params.callback || '';
  try {
    setupSheets();
    const body = parseBody(e, params);
    const action = body.action || params.action || 'read';
    let result;
    if (action === 'setup') result = { ok: true, message: 'setup complete' };
    else if (action === 'read') result = readAll();
    else if (action === 'readTasks') result = { ok: true, tasks: sheetToObjects(SHEETS.tasks) };
    else if (action === 'upsertStore') result = upsertStore(body.store);
    else if (action === 'updateSales') result = updateSales(body.sales);
    else if (action === 'bulkUpsert') result = bulkUpsert(body.stores || []);
    else if (action === 'deleteStore') result = deleteStore(body.storeId);
    else if (action === 'clearAllCases') result = clearAllCases();
    else if (action === 'upsertTask') result = upsertTask(body.task);
    else if (action === 'bulkUpsertTasks') result = bulkUpsertTasks(body.tasks || []);
    else if (action === 'deleteTask') result = deleteTask(body.taskId);
    else result = { ok: false, error: 'unknown action: ' + action };
    return outputResponse(result, callback);
  } catch (error) {
    return outputResponse({ ok: false, error: String(error && error.message ? error.message : error) }, callback);
  }
}

function parseBody(e, params) {
  if (params && params.data) {
    try { return JSON.parse(params.data); } catch (error) {}
  }
  if (!e || !e.postData || !e.postData.contents) return {};
  try { return JSON.parse(e.postData.contents); } catch (error) { return {}; }
}

function outputResponse(data, callback) {
  if (callback) return ContentService.createTextOutput(callback + '(' + JSON.stringify(data) + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function getSpreadsheet() { return SpreadsheetApp.openById(SPREADSHEET_ID); }

function setupSheets() {
  const ss = getSpreadsheet();
  ensureSheet(ss, SHEETS.stores, STORE_HEADERS);
  ensureSheet(ss, SHEETS.sales, SALES_HEADERS);
  ensureSheet(ss, SHEETS.tasks, TASK_HEADERS);
  ensureSheet(ss, SHEETS.settings, SETTINGS_HEADERS);
  ensureSheet(ss, SHEETS.logs, LOG_HEADERS);
  seedSettings();
}

function ensureSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  const currentLastColumn = Math.max(sheet.getLastColumn(), 1);
  const currentHeaders = sheet.getRange(1, 1, 1, currentLastColumn).getValues()[0].filter(Boolean);
  if (currentHeaders.length === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    return sheet;
  }
  headers.forEach((header) => { if (!currentHeaders.includes(header)) sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header); });
  sheet.setFrozenRows(1);
  return sheet;
}

function seedSettings() {
  const sheet = getSpreadsheet().getSheetByName(SHEETS.settings);
  const existing = sheetToObjects(SHEETS.settings).map((row) => row['種別'] + '::' + row['値']);
  const rows = [
    ['担当者', '濱治', 1], ['担当者', '羽賀', 2], ['担当者', '佐藤', 3], ['担当者', '鈴木', 4], ['担当者', '安田', 5],
    ['ステータス', '未連絡', 1], ['ステータス', '連絡済', 2], ['ステータス', '返信待ち', 3],
    ['撮影ステータス', '未設定', 1], ['撮影ステータス', '撮影日確定', 2], ['撮影ステータス', '撮影済', 3], ['撮影ステータス', '完了', 4],
    ['案件種別', 'ホスト特集', 1], ['案件種別', 'トップグラビア', 2], ['案件種別', '有料宣材', 3], ['案件種別', '30秒PV', 4], ['案件種別', '有料動画', 5], ['案件種別', 'その他', 6],
  ].filter((row) => !existing.includes(row[0] + '::' + row[1]));
  if (rows.length > 0) sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, SETTINGS_HEADERS.length).setValues(rows);
}

function readAll() {
  return { ok: true, stores: sheetToObjects(SHEETS.stores), sales: sheetToObjects(SHEETS.sales), tasks: sheetToObjects(SHEETS.tasks), settings: sheetToObjects(SHEETS.settings) };
}

function sheetToObjects(sheetName) {
  const sheet = getSpreadsheet().getSheetByName(sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  const headers = values[0];
  return values.slice(1).filter((row) => row.some(Boolean)).map((row) => {
    const item = {};
    headers.forEach((header, index) => item[header] = row[index]);
    return item;
  });
}

function bulkUpsert(stores) {
  if (!Array.isArray(stores)) throw new Error('stores must be array');
  stores.forEach((item) => { if (item.store) upsertStore(item.store); if (item.sales) updateSales(item.sales); });
  addLog('bulkUpsert', 'bulk', stores.length + '件');
  return { ok: true, count: stores.length };
}

function upsertStore(store) {
  if (!store || !store['店舗ID']) throw new Error('store.店舗ID is required');
  const sheet = getSpreadsheet().getSheetByName(SHEETS.stores);
  const id = String(store['店舗ID']);
  const row = findRowById(sheet, id);
  const now = new Date();
  const values = STORE_HEADERS.map((header) => {
    if (header === '作成日時') return store[header] || now;
    if (header === '更新日時') return now;
    return store[header] || '';
  });
  if (row > 0) sheet.getRange(row, 1, 1, values.length).setValues([values]);
  else sheet.appendRow(values);
  addLog('upsertStore', id, store['店舗名'] || '');
  return { ok: true, store };
}

function updateSales(sales) {
  if (!sales || !sales['店舗ID']) throw new Error('sales.店舗ID is required');
  const sheet = getSpreadsheet().getSheetByName(SHEETS.sales);
  const id = String(sales['店舗ID']);
  const row = findRowById(sheet, id);
  const now = new Date();
  const values = SALES_HEADERS.map((header) => header === '更新日時' ? now : (sales[header] || ''));
  if (row > 0) sheet.getRange(row, 1, 1, values.length).setValues([values]);
  else sheet.appendRow(values);
  addLog('updateSales', id, sales['ステータス'] || '');
  return { ok: true, sales };
}

function upsertTask(task) {
  if (!task || !task['タスクID']) throw new Error('task.タスクID is required');
  const sheet = getSpreadsheet().getSheetByName(SHEETS.tasks);
  const id = String(task['タスクID']);
  const row = findRowById(sheet, id);
  const now = new Date();
  const values = TASK_HEADERS.map((header) => {
    if (header === '作成日時') return task[header] || now;
    if (header === '更新日時') return now;
    return task[header] || '';
  });
  if (row > 0) sheet.getRange(row, 1, 1, values.length).setValues([values]);
  else sheet.appendRow(values);
  syncTaskCalendar(task);
  addLog('upsertTask', id, task['タスク名'] || '');
  return { ok: true, task };
}

function bulkUpsertTasks(tasks) {
  if (!Array.isArray(tasks)) throw new Error('tasks must be array');
  tasks.forEach(upsertTask);
  addLog('bulkUpsertTasks', 'bulk', tasks.length + '件');
  return { ok: true, count: tasks.length };
}

function deleteTask(taskId) {
  if (!taskId) throw new Error('taskId is required');
  deleteTaskCalendar(String(taskId));
  const sheet = getSpreadsheet().getSheetByName(SHEETS.tasks);
  const row = findRowById(sheet, String(taskId));
  if (row > 0) sheet.deleteRow(row);
  addLog('deleteTask', taskId, '');
  return { ok: true, taskId };
}

function syncTaskCalendar(task) {
  const taskId = String(task['タスクID'] || '');
  if (!taskId) return;
  const dueDate = parseDateOnly(task['期限']);
  const status = String(task['ステータス'] || '');
  if (!dueDate || status === '完了') {
    deleteTaskCalendar(taskId);
    return;
  }

  const calendar = getTargetCalendar();
  const properties = PropertiesService.getScriptProperties();
  const propertyKey = TASK_EVENT_PROPERTY_PREFIX + taskId;
  const savedEventId = properties.getProperty(propertyKey);
  let event = savedEventId ? calendar.getEventById(savedEventId) : null;
  const title = '【タスク】' + String(task['タスク名'] || '名称未設定');
  const description = [
    '担当者：' + String(task['担当者'] || ''),
    task['店舗名'] ? '関連店舗：' + String(task['店舗名']) : '',
    task['エリア'] ? 'エリア：' + String(task['エリア']) : '',
    task['優先度'] ? '優先度：' + String(task['優先度']) : '',
    task['メモ'] ? 'メモ：' + String(task['メモ']) : '',
    'STAR GUYS管理システムから同期',
  ].filter(Boolean).join('\n');

  if (event) {
    event.setTitle(title);
    event.setDescription(description);
    event.setAllDayDate(dueDate);
  } else {
    event = calendar.createAllDayEvent(title, dueDate, { description: description });
    properties.setProperty(propertyKey, event.getId());
  }
}

function deleteTaskCalendar(taskId) {
  const properties = PropertiesService.getScriptProperties();
  const propertyKey = TASK_EVENT_PROPERTY_PREFIX + String(taskId);
  const eventId = properties.getProperty(propertyKey);
  if (!eventId) return;
  try {
    const event = getTargetCalendar().getEventById(eventId);
    if (event) event.deleteEvent();
  } catch (error) {}
  properties.deleteProperty(propertyKey);
}

function getTargetCalendar() {
  if (!CALENDAR_ID || CALENDAR_ID === 'primary') return CalendarApp.getDefaultCalendar();
  const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
  if (!calendar) throw new Error('指定したGoogleカレンダーが見つかりません');
  return calendar;
}

function parseDateOnly(value) {
  if (!value) return null;
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  const text = String(value).slice(0, 10);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function deleteStore(storeId) {
  if (!storeId) throw new Error('storeId is required');
  const ss = getSpreadsheet();
  [SHEETS.stores, SHEETS.sales].forEach((sheetName) => {
    const sheet = ss.getSheetByName(sheetName);
    const row = findRowById(sheet, String(storeId));
    if (row > 0) sheet.deleteRow(row);
  });
  addLog('deleteStore', storeId, '');
  return { ok: true, storeId };
}

function clearAllCases() {
  const ss = getSpreadsheet();
  [SHEETS.stores, SHEETS.sales].forEach((sheetName) => {
    const sheet = ss.getSheetByName(sheetName);
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) sheet.deleteRows(2, lastRow - 1);
  });
  addLog('clearAllCases', 'all', '全案件削除');
  return { ok: true };
}

function findRowById(sheet, id) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1;
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat().map(String);
  const index = ids.indexOf(String(id));
  return index >= 0 ? index + 2 : -1;
}

function addLog(action, storeId, detail) {
  const sheet = getSpreadsheet().getSheetByName(SHEETS.logs);
  sheet.appendRow([new Date(), action, storeId, detail]);
}
