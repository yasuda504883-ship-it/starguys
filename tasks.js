const TASK_STORAGE_KEY = "starguys-personal-tasks-v1";
const taskAssignees = typeof assignees !== "undefined" ? assignees : ["濱治", "羽賀", "佐藤", "鈴木", "安田"];
const taskStatuses = ["未着手", "進行中", "完了"];

let tasks = loadTasks();

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

initTaskTab();
initTaskInputs();
renderTasks();

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = document.getElementById("taskTitle").value.trim();
  if (!title) return;

  tasks.unshift({
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title,
    assignee: document.getElementById("taskAssignee").value,
    dueDate: document.getElementById("taskDueDate").value,
    priority: document.getElementById("taskPriority").value,
    store: document.getElementById("taskStore").value.trim(),
    memo: document.getElementById("taskMemo").value.trim(),
    status: "未着手",
    completedAt: "",
    createdAt: new Date().toISOString(),
  });

  saveTasks();
  taskForm.reset();
  document.getElementById("taskPriority").value = "中";
  renderTasks();
});

[taskSearch, taskFilterAssignee, taskDateFilter, taskStatusFilter].forEach((element) => {
  element.addEventListener("input", renderTasks);
});

clearCompletedTasks.addEventListener("click", () => {
  const completedCount = tasks.filter((task) => task.status === "完了").length;
  if (!completedCount) return;
  if (!confirm(`完了済みタスク${completedCount}件を削除しますか？`)) return;
  tasks = tasks.filter((task) => task.status !== "完了");
  saveTasks();
  renderTasks();
});

function initTaskTab() {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      const isTasks = button.dataset.view === "tasks";
      tasksView.classList.toggle("active", isTasks);
      if (!isTasks) tasksView.classList.remove("active");
      if (isTasks) renderTasks();
    });
  });
}

function initTaskInputs() {
  const taskAssignee = document.getElementById("taskAssignee");
  taskAssignee.innerHTML = taskAssignees.map((name) => `<option>${escapeTaskHtml(name)}</option>`).join("");
  taskFilterAssignee.innerHTML = `<option value="all">全員</option>${taskAssignees.map((name) => `<option>${escapeTaskHtml(name)}</option>`).join("")}`;

  const groups = window.STORE_GROUPS || {};
  const names = Object.values(groups)
    .flatMap((value) => String(value).split("\n"))
    .map((name) => name.trim())
    .filter(Boolean);
  document.getElementById("taskStoreSuggestions").innerHTML = names
    .map((name) => `<option value="${escapeTaskHtml(name)}"></option>`)
    .join("");
}

function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(TASK_STORAGE_KEY) || "[]");
    if (!Array.isArray(saved)) return [];
    return saved.map((task) => ({
      ...task,
      status: taskStatuses.includes(task.status) ? task.status : "未着手",
      priority: ["高", "中", "低"].includes(task.priority) ? task.priority : "中",
      memo: task.memo || "",
      store: task.store || "",
      completedAt: task.completedAt || "",
    }));
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(tasks));
}

function renderTasks() {
  const filtered = getFilteredTasks();
  taskVisibleCount.textContent = `${filtered.length}件表示中`;
  renderTaskSummary();

  if (!filtered.length) {
    taskList.innerHTML = `<p class="empty">表示するタスクはありません。</p>`;
    return;
  }

  taskList.innerHTML = filtered.map(taskCard).join("");

  taskList.querySelectorAll("input[data-task-action='complete']").forEach((input) => {
    input.addEventListener("change", () => updateTaskStatus(input.dataset.id, input.checked ? "完了" : "未着手"));
  });

  taskList.querySelectorAll("select[data-task-action]").forEach((select) => {
    select.addEventListener("change", () => updateTask(select.dataset.id, select.dataset.taskAction, select.value));
  });

  taskList.querySelectorAll("input[data-task-action='dueDate']").forEach((input) => {
    input.addEventListener("change", () => updateTask(input.dataset.id, "dueDate", input.value));
  });

  taskList.querySelectorAll("button[data-task-action='delete']").forEach((button) => {
    button.addEventListener("click", () => deleteTask(button.dataset.id));
  });
}

function renderTaskSummary() {
  const today = dateString(new Date());
  const weekEnd = dateString(addDays(new Date(), 7));
  const active = tasks.filter((task) => task.status !== "完了");
  const todayCount = active.filter((task) => task.dueDate === today).length;
  const overdueCount = active.filter((task) => task.dueDate && task.dueDate < today).length;
  const weekCount = active.filter((task) => task.dueDate && task.dueDate >= today && task.dueDate <= weekEnd).length;
  const doneCount = tasks.filter((task) => task.status === "完了").length;

  taskSummary.innerHTML = [
    ["未完了", active.length],
    ["今日", todayCount],
    ["期限切れ", overdueCount],
    ["今週", weekCount],
    ["完了", doneCount],
  ].map(([label, count]) => `<div class="summary-card"><span>${label}</span><strong>${count}</strong></div>`).join("");
}

function getFilteredTasks() {
  const keyword = taskSearch.value.trim().toLowerCase();
  const today = dateString(new Date());
  const weekEnd = dateString(addDays(new Date(), 7));

  return [...tasks]
    .filter((task) => {
      const textMatch = !keyword || [task.title, task.store, task.memo].some((value) => String(value || "").toLowerCase().includes(keyword));
      const assigneeMatch = taskFilterAssignee.value === "all" || task.assignee === taskFilterAssignee.value;
      const statusMatch = taskStatusFilter.value === "all" || task.status === taskStatusFilter.value;
      let dateMatch = true;

      if (taskDateFilter.value === "today") dateMatch = task.status !== "完了" && task.dueDate === today;
      if (taskDateFilter.value === "overdue") dateMatch = task.status !== "完了" && task.dueDate && task.dueDate < today;
      if (taskDateFilter.value === "week") dateMatch = task.status !== "完了" && task.dueDate && task.dueDate >= today && task.dueDate <= weekEnd;
      if (taskDateFilter.value === "completed") dateMatch = task.status === "完了";

      return textMatch && assigneeMatch && statusMatch && dateMatch;
    })
    .sort((a, b) => {
      if (a.status === "完了" && b.status !== "完了") return 1;
      if (a.status !== "完了" && b.status === "完了") return -1;
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });
}

function taskCard(task) {
  const today = dateString(new Date());
  const overdue = task.status !== "完了" && task.dueDate && task.dueDate < today;
  const completed = task.status === "完了";
  const dueLabel = task.dueDate ? formatTaskDate(task.dueDate) : "期限なし";

  return `
    <article class="task-card ${completed ? "is-complete" : ""} ${overdue ? "is-overdue" : ""}">
      <label class="task-check" aria-label="完了にする">
        <input type="checkbox" data-task-action="complete" data-id="${escapeTaskHtml(task.id)}" ${completed ? "checked" : ""} />
      </label>
      <div class="task-main">
        <strong>${escapeTaskHtml(task.title)}</strong>
        <div class="task-meta">
          <span>${escapeTaskHtml(task.assignee)}</span>
          <span class="priority priority-${escapeTaskHtml(task.priority)}">優先度 ${escapeTaskHtml(task.priority)}</span>
          <span class="${overdue ? "overdue-text" : ""}">${escapeTaskHtml(dueLabel)}</span>
          ${task.store ? `<span>店舗：${escapeTaskHtml(task.store)}</span>` : ""}
        </div>
        ${task.memo ? `<p>${escapeTaskHtml(task.memo)}</p>` : ""}
      </div>
      <select data-task-action="status" data-id="${escapeTaskHtml(task.id)}">
        ${taskStatuses.map((status) => `<option ${task.status === status ? "selected" : ""}>${status}</option>`).join("")}
      </select>
      <input type="date" value="${escapeTaskHtml(task.dueDate || "")}" data-task-action="dueDate" data-id="${escapeTaskHtml(task.id)}" />
      <select data-task-action="priority" data-id="${escapeTaskHtml(task.id)}">
        ${["高", "中", "低"].map((priority) => `<option ${task.priority === priority ? "selected" : ""}>${priority}</option>`).join("")}
      </select>
      <button class="danger" type="button" data-task-action="delete" data-id="${escapeTaskHtml(task.id)}">削除</button>
    </article>
  `;
}

function updateTask(id, key, value) {
  const task = tasks.find((item) => item.id === id);
  if (!task) return;
  task[key] = value;
  if (key === "status") {
    task.completedAt = value === "完了" ? new Date().toISOString() : "";
  }
  saveTasks();
  renderTasks();
}

function updateTaskStatus(id, status) {
  updateTask(id, "status", status);
}

function deleteTask(id) {
  const task = tasks.find((item) => item.id === id);
  if (!task) return;
  if (!confirm(`${task.title} を削除しますか？`)) return;
  tasks = tasks.filter((item) => item.id !== id);
  saveTasks();
  renderTasks();
}

function formatTaskDate(value) {
  const [year, month, day] = value.split("-");
  return `${Number(month)}/${Number(day)}`;
}

function dateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function escapeTaskHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
