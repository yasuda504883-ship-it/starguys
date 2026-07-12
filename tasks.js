const TASK_STORAGE_KEY = "starguys-personal-tasks-v4";
const OLD_TASK_STORAGE_KEYS = ["starguys-personal-tasks-v3", "starguys-personal-tasks-v2", "starguys-personal-tasks-v1"];
const taskAssignees = typeof assignees !== "undefined" ? assignees : ["濱治", "羽賀", "佐藤", "鈴木", "安田"];
const taskStatuses = ["未着手", "進行中", "完了"];
const taskStoreMaster = Object.entries(window.STORE_GROUPS || {}).flatMap(([area, names]) =>
  String(names).split("\n").map((name) => name.trim()).filter(Boolean).map((name) => ({ id: makeTaskStoreId(area, name), name, area }))
);

let tasks = loadTasks();
let taskCloudLoaded = false;

const tasksView = document.getElementById("tasksView");
const taskForm = document.getElementById("taskForm");
const taskList = document.getElementById("taskList");
const taskSummary = document.getElementById("taskSummary");
const taskVisibleCount = document.getElementById("taskVisibleCount");
const taskSearch = document.getElementById("taskSearch");
const taskFilterAssignee = document.getElementById("taskFilterAssignee");
const taskDateFilter = document.getElementById("taskDateFilter");
const taskStatusFilter = document.getElementById("taskStatusFilter");
const clearCompletedTasks = document.getElementById("clearCompletedTasks");
const taskSyncStatus = document.getElementById("taskSyncStatus");
const loadTasksFromSheetButton = document.getElementById("loadTasksFromSheet");
const pushTasksToSheetButton = document.getElementById("pushTasksToSheet");

initTaskTab();
initTaskInputs();
renderTasks();

loadTasksFromSheetButton?.addEventListener("click", () => loadTasksFromSheet(true));
pushTasksToSheetButton?.addEventListener("click", pushAllTasksToSheet);

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = document.getElementById("taskTitle").value.trim();
  if (!title) return;

  const storeInput = document.getElementById("taskStore").value.trim();
  const selectedStore = findTaskStoreByInput(storeInput);
  const task = {
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title,
    assignee: document.getElementById("taskAssignee").value,
    dueDate: document.getElementById("taskDueDate").value,
    priority: document.getElementById("taskPriority").value,
    storeId: selectedStore?.id || "",
    store: selectedStore?.name || storeInput,
    storeArea: selectedStore?.area || "",
    memo: document.getElementById("taskMemo").value.trim(),
    status: "未着手",
    completedAt: "",
    createdAt: new Date().toISOString(),
  };

  tasks.unshift(task);
  saveTasks();
  syncTaskToSheet(task);
  taskForm.reset();
  document.getElementById("taskPriority").value = "中";
  refreshTaskStoreSuggestions();
  renderTasks();
});

[taskSearch, taskFilterAssignee, taskDateFilter, taskStatusFilter].forEach((element) => element.addEventListener("input", renderTasks));

clearCompletedTasks.addEventListener("click", () => {
  const completed = tasks.filter((task) => task.status === "完了");
  if (!completed.length) return;
  if (!confirm(`完了済みタスク${completed.length}件を削除しますか？`)) return;
  completed.forEach((task) => deleteTaskFromSheet(task.id));
  tasks = tasks.filter((task) => task.status !== "完了");
  saveTasks();
  refreshTaskStoreSuggestions();
  renderTasks();
});

function initTaskTab() {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      const isTasks = button.dataset.view === "tasks";
      tasksView.classList.toggle("active", isTasks);
      if (isTasks) {
        refreshTaskStoreSuggestions();
        renderTasks();
        if (!taskCloudLoaded) loadTasksFromSheet(false);
      }
    });
  });
}

function initTaskInputs() {
  document.getElementById("taskAssignee").innerHTML = taskAssignees.map((name) => `<option>${escapeTaskHtml(name)}</option>`).join("");
  taskFilterAssignee.innerHTML = `<option value="all">全員</option>${taskAssignees.map((name) => `<option>${escapeTaskHtml(name)}</option>`).join("")}`;

  const taskStore = document.getElementById("taskStore");
  taskStore.setAttribute("list", "taskStoreSuggestions");
  taskStore.setAttribute("autocomplete", "off");
  taskStore.placeholder = "店名を入力・候補から選択";
  taskStore.addEventListener("input", autoSetTaskAssignee);
  taskStore.addEventListener("change", autoSetTaskAssignee);
  refreshTaskStoreSuggestions();
}

function refreshTaskStoreSuggestions() {
  const datalist = document.getElementById("taskStoreSuggestions");
  if (!datalist) return;

  const registered = typeof stores !== "undefined"
    ? stores.map((store) => ({ id: store.id, name: store.name, area: store.area, source: "案件登録済み" }))
    : [];
  const master = taskStoreMaster.map((store) => ({ ...store, source: "掲載店舗" }));
  const previous = tasks
    .filter((task) => task.store && !task.storeId)
    .map((task) => ({ id: "", name: task.store, area: task.storeArea || "", source: "過去入力" }));

  const seen = new Set();
  const candidates = [...registered, ...master, ...previous].filter((store) => {
    const key = `${store.area}__${store.name}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  datalist.innerHTML = candidates.map((store) => {
    const label = [store.area, store.source].filter(Boolean).join(" / ");
    return `<option value="${escapeTaskHtml(store.name)}" label="${escapeTaskHtml(label)}"></option>`;
  }).join("");
}

function autoSetTaskAssignee(event) {
  const selectedStore = findTaskStoreByInput(event.target.value);
  if (!selectedStore || typeof stores === "undefined") return;
  const registeredCase = stores.find((store) => store.name === selectedStore.name && store.area === selectedStore.area);
  if (registeredCase?.assignee) document.getElementById("taskAssignee").value = registeredCase.assignee;
}

function findTaskStoreByInput(value) {
  const input = String(value || "").trim().toLowerCase();
  if (!input) return null;

  const registeredMatches = typeof stores !== "undefined"
    ? stores.filter((store) => store.name.trim().toLowerCase() === input)
    : [];
  if (registeredMatches.length) {
    const store = registeredMatches[0];
    return { id: store.id, name: store.name, area: store.area };
  }

  return taskStoreMaster.find((store) => store.name.trim().toLowerCase() === input) || null;
}

function loadTasks() {
  try {
    let raw = localStorage.getItem(TASK_STORAGE_KEY);
    if (!raw) {
      for (const key of OLD_TASK_STORAGE_KEYS) {
        raw = localStorage.getItem(key);
        if (raw) break;
      }
    }
    const saved = JSON.parse(raw || "[]");
    if (!Array.isArray(saved)) return [];
    const normalized = saved.map(normalizeTask);
    localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    return [];
  }
}

function normalizeTask(task) {
  const rawStoreName = task.store || task["店舗名"] || "";
  const matchedStore = task.storeId
    ? findTaskStoreById(task.storeId)
    : taskStoreMaster.find((store) => store.name === rawStoreName) || null;

  return {
    id: String(task.id || task["タスクID"] || `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
    title: String(task.title || task["タスク名"] || ""),
    assignee: task.assignee || task["担当者"] || "安田",
    dueDate: normalizeSheetDate(task.dueDate || task["期限"] || ""),
    priority: ["高", "中", "低"].includes(task.priority || task["優先度"]) ? (task.priority || task["優先度"]) : "中",
    storeId: matchedStore?.id || task.storeId || task["店舗ID"] || "",
    store: matchedStore?.name || rawStoreName,
    storeArea: matchedStore?.area || task.storeArea || task["エリア"] || "",
    memo: task.memo || task["メモ"] || "",
    status: taskStatuses.includes(task.status || task["ステータス"]) ? (task.status || task["ステータス"]) : "未着手",
    completedAt: task.completedAt || task["完了日時"] || "",
    createdAt: task.createdAt || task["作成日時"] || new Date().toISOString(),
  };
}

function saveTasks() { localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(tasks)); }

function renderTasks() {
  const filtered = getFilteredTasks();
  taskVisibleCount.textContent = `${filtered.length}件表示中`;
  renderTaskSummary();
  if (!filtered.length) {
    taskList.innerHTML = `<p class="empty">表示するタスクはありません。</p>`;
    return;
  }

  taskList.innerHTML = filtered.map(taskCard).join("");
  taskList.querySelectorAll("input[data-task-action='complete']").forEach((input) => input.addEventListener("change", () => updateTask(input.dataset.id, "status", input.checked ? "完了" : "未着手")));
  taskList.querySelectorAll("select[data-task-action]").forEach((select) => select.addEventListener("change", () => updateTask(select.dataset.id, select.dataset.taskAction, select.value)));
  taskList.querySelectorAll("input[data-task-action='dueDate']").forEach((input) => input.addEventListener("change", () => updateTask(input.dataset.id, "dueDate", input.value)));
  taskList.querySelectorAll("button[data-task-action='delete']").forEach((button) => button.addEventListener("click", () => deleteTask(button.dataset.id)));
  taskList.querySelectorAll("button[data-task-action='openStore']").forEach((button) => button.addEventListener("click", () => openLinkedStore(button.dataset.storeName, button.dataset.storeArea)));
}

function renderTaskSummary() {
  const today = dateString(new Date());
  const weekEnd = dateString(addDays(new Date(), 7));
  const active = tasks.filter((task) => task.status !== "完了");
  const cards = [
    ["未完了", active.length],
    ["今日", active.filter((task) => task.dueDate === today).length],
    ["期限切れ", active.filter((task) => task.dueDate && task.dueDate < today).length],
    ["今週", active.filter((task) => task.dueDate && task.dueDate >= today && task.dueDate <= weekEnd).length],
    ["完了", tasks.filter((task) => task.status === "完了").length],
  ];
  taskSummary.innerHTML = cards.map(([label, count]) => `<div class="summary-card"><span>${label}</span><strong>${count}</strong></div>`).join("");
}

function getFilteredTasks() {
  const keyword = taskSearch.value.trim().toLowerCase();
  const today = dateString(new Date());
  const weekEnd = dateString(addDays(new Date(), 7));
  return [...tasks].filter((task) => {
    const textMatch = !keyword || [task.title, task.store, task.storeArea, task.memo].some((value) => String(value || "").toLowerCase().includes(keyword));
    const assigneeMatch = taskFilterAssignee.value === "all" || task.assignee === taskFilterAssignee.value;
    const statusMatch = taskStatusFilter.value === "all" || task.status === taskStatusFilter.value;
    let dateMatch = true;
    if (taskDateFilter.value === "today") dateMatch = task.status !== "完了" && task.dueDate === today;
    if (taskDateFilter.value === "overdue") dateMatch = task.status !== "完了" && task.dueDate && task.dueDate < today;
    if (taskDateFilter.value === "week") dateMatch = task.status !== "完了" && task.dueDate && task.dueDate >= today && task.dueDate <= weekEnd;
    if (taskDateFilter.value === "completed") dateMatch = task.status === "完了";
    return textMatch && assigneeMatch && statusMatch && dateMatch;
  }).sort((a, b) => {
    if (a.status === "完了" && b.status !== "完了") return 1;
    if (a.status !== "完了" && b.status === "完了") return -1;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });
}

function taskCard(task) {
  const today = dateString(new Date());
  const overdue = task.status !== "完了" && task.dueDate && task.dueDate < today;
  const completed = task.status === "完了";
  const linkedStore = task.store && task.storeId;
  const storeDisplay = task.store
    ? linkedStore
      ? `<button class="linked-store" type="button" data-task-action="openStore" data-store-name="${escapeTaskHtml(task.store)}" data-store-area="${escapeTaskHtml(task.storeArea)}">${escapeTaskHtml(task.storeArea)} / ${escapeTaskHtml(task.store)}</button>`
      : `<span class="free-store">${escapeTaskHtml(task.store)}（手入力）</span>`
    : "";

  return `<article class="task-card ${completed ? "is-complete" : ""} ${overdue ? "is-overdue" : ""}">
    <label class="task-check"><input type="checkbox" data-task-action="complete" data-id="${escapeTaskHtml(task.id)}" ${completed ? "checked" : ""} /></label>
    <div class="task-main"><strong>${escapeTaskHtml(task.title)}</strong><div class="task-meta"><span>${escapeTaskHtml(task.assignee)}</span><span class="priority priority-${escapeTaskHtml(task.priority)}">優先度 ${escapeTaskHtml(task.priority)}</span><span class="${overdue ? "overdue-text" : ""}">${escapeTaskHtml(task.dueDate ? formatTaskDate(task.dueDate) : "期限なし")}</span>${storeDisplay}</div>${task.memo ? `<p>${escapeTaskHtml(task.memo)}</p>` : ""}</div>
    <select data-task-action="status" data-id="${escapeTaskHtml(task.id)}">${taskStatuses.map((status) => `<option ${task.status === status ? "selected" : ""}>${status}</option>`).join("")}</select>
    <input type="date" value="${escapeTaskHtml(task.dueDate || "")}" data-task-action="dueDate" data-id="${escapeTaskHtml(task.id)}" />
    <select data-task-action="priority" data-id="${escapeTaskHtml(task.id)}">${["高", "中", "低"].map((priority) => `<option ${task.priority === priority ? "selected" : ""}>${priority}</option>`).join("")}</select>
    <button class="danger" type="button" data-task-action="delete" data-id="${escapeTaskHtml(task.id)}">削除</button>
  </article>`;
}

function updateTask(id, key, value) {
  const task = tasks.find((item) => item.id === id);
  if (!task) return;
  task[key] = value;
  if (key === "status") task.completedAt = value === "完了" ? new Date().toISOString() : "";
  saveTasks();
  syncTaskToSheet(task);
  renderTasks();
}

function deleteTask(id) {
  const task = tasks.find((item) => item.id === id);
  if (!task || !confirm(`${task.title} を削除しますか？`)) return;
  tasks = tasks.filter((item) => item.id !== id);
  saveTasks();
  deleteTaskFromSheet(id);
  refreshTaskStoreSuggestions();
  renderTasks();
}

async function loadTasksFromSheet(showMessage = true) {
  if (typeof apiGet !== "function" || !window.APP_CONFIG?.API_URL) {
    setTaskSyncStatus("API URLが未設定です。");
    return;
  }
  try {
    if (showMessage) setTaskSyncStatus("最新タスクを読み込み中...");
    const response = await apiGet("readTasks");
    if (!response.ok) throw new Error(response.error || "読み込みに失敗しました");
    tasks = (response.tasks || []).map(normalizeTask).filter((task) => task.id && task.title);
    taskCloudLoaded = true;
    saveTasks();
    refreshTaskStoreSuggestions();
    renderTasks();
    setTaskSyncStatus(`同期済み：${tasks.length}件`);
  } catch (error) {
    setTaskSyncStatus(`同期エラー：${error.message}`);
  }
}

function pushAllTasksToSheet() {
  if (!tasks.length) {
    setTaskSyncStatus("反映するタスクがありません。");
    return;
  }
  if (!confirm(`この端末のタスク${tasks.length}件をスプレッドシートへ反映しますか？`)) return;
  apiPost("bulkUpsertTasks", { tasks: tasks.map(toSheetTask) });
  setTaskSyncStatus(`反映を送信しました：${tasks.length}件`);
}

function syncTaskToSheet(task) {
  if (typeof apiPost !== "function") return;
  apiPost("upsertTask", { task: toSheetTask(task) });
  setTaskSyncStatus(`保存送信：${task.title}`);
}

function deleteTaskFromSheet(id) {
  if (typeof apiPost !== "function") return;
  apiPost("deleteTask", { taskId: id });
  setTaskSyncStatus("削除を送信しました。");
}

function toSheetTask(task) {
  return {
    "タスクID": task.id,
    "タスク名": task.title,
    "担当者": task.assignee,
    "期限": task.dueDate || "",
    "優先度": task.priority,
    "店舗ID": task.storeId || "",
    "店舗名": task.store || "",
    "エリア": task.storeArea || "",
    "メモ": task.memo || "",
    "ステータス": task.status,
    "完了日時": task.completedAt || "",
    "作成日時": task.createdAt || "",
  };
}

function setTaskSyncStatus(message) { if (taskSyncStatus) taskSyncStatus.textContent = message; }
function openLinkedStore(storeName, storeArea) { document.querySelector('.tab-button[data-view="stores"]')?.click(); if (typeof searchText !== "undefined") searchText.value = storeName; if (typeof filterArea !== "undefined" && Array.from(filterArea.options).some((option) => option.value === storeArea)) filterArea.value = storeArea; if (typeof render === "function") render(); document.getElementById("areaList")?.scrollIntoView({ behavior: "smooth", block: "start" }); }
function findTaskStoreById(id) { return taskStoreMaster.find((store) => store.id === id) || null; }
function makeTaskStoreId(area, name) { return `${area}__${name}`.replace(/\s+/g, "_"); }
function formatTaskDate(value) { const [, month, day] = value.split("-"); return `${Number(month)}/${Number(day)}`; }
function normalizeSheetDate(value) { if (!value) return ""; if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10); const date = new Date(value); return Number.isNaN(date.getTime()) ? "" : dateString(date); }
function dateString(date) { const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, "0"); const day = String(date.getDate()).padStart(2, "0"); return `${year}-${month}-${day}`; }
function addDays(date, days) { const result = new Date(date); result.setDate(result.getDate() + days); return result; }
function escapeTaskHtml(value) { return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
