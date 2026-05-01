const API = window.location.origin.includes("http") ? window.location.origin : "http://localhost:5000";

function getSession() {
  try {
    return JSON.parse(localStorage.getItem("session") || "null");
  } catch {
    return null;
  }
}

function setSession(session) {
  localStorage.setItem("session", JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem("session");
}

function authHeaders() {
  const session = getSession();
  return session?.token ? { Authorization: `Bearer ${session.token}` } : {};
}

async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders()
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
  return json;
}

async function checkApi() {
  const el = document.getElementById("apiStatus");
  if (!el) return;
  try {
    await api("/health");
    el.textContent = "";
  } catch {
    el.textContent = "";
  }
}

let authMode = "login"; // login | signup
function toggleAuthMode() {
  authMode = authMode === "login" ? "signup" : "login";
  const modeBtn = document.getElementById("modeBtn");
  const authBtn = document.getElementById("authBtn");
  const nameInput = document.getElementById("name");
  if (!modeBtn || !authBtn || !nameInput) return;

  if (authMode === "signup") {
    modeBtn.textContent = "Use Login";
    authBtn.textContent = "Signup";
    nameInput.style.display = "block";
  } else {
    modeBtn.textContent = "Use Signup";
    authBtn.textContent = "Login";
    nameInput.style.display = "none";
  }
  const msg = document.getElementById("authMsg");
  if (msg) msg.textContent = "";
}

async function authSubmit() {
  const msg = document.getElementById("authMsg");
  if (msg) msg.textContent = "Working…";

  try {
    const email = document.getElementById("email")?.value?.trim();
    const password = document.getElementById("password")?.value;
    const name = document.getElementById("name")?.value?.trim();

    if (!email || !password) throw new Error("Email + password required");
    const payload = authMode === "signup" ? { name: name || "User", email, password } : { email, password };
    const out = await api(authMode === "signup" ? "/auth/signup" : "/auth/login", { method: "POST", body: payload });
    setSession(out);
    window.location = out?.user?.role === "admin" ? "admin.html" : "member.html";
  } catch (e) {
    if (msg) msg.textContent = e.message || "Auth failed";
  }
}

async function seedDemo() {
  const msg = document.getElementById("authMsg");
  if (msg) msg.textContent = "Creating demo…";
  try {
    const out = await api("/seed", { method: "POST" });
    setSession({ token: out.token, user: { email: out.demo.admin.email, name: "Demo Admin", role: "admin" } });
    window.location = "admin.html";
  } catch (e) {
    if (msg) msg.textContent = e.message || "Seed failed";
  }
}

async function quickLogin(role) {
  const msg = document.getElementById("authMsg");
  if (msg) msg.textContent = "Signing in…";

  try {
    // Ensure demo accounts exist
    await api("/seed", { method: "POST" });

    const creds =
      role === "admin"
        ? { email: "demo@team.local", password: "demo1234" }
        : { email: "member@team.local", password: "member1234" };

    const emailEl = document.getElementById("email");
    const passEl = document.getElementById("password");
    const nameEl = document.getElementById("name");
    if (nameEl) nameEl.value = "";
    if (emailEl) emailEl.value = creds.email;
    if (passEl) passEl.value = creds.password;

    // Force login mode
    authMode = "login";
    const modeBtn = document.getElementById("modeBtn");
    const authBtn = document.getElementById("authBtn");
    if (modeBtn) modeBtn.textContent = "Use Signup";
    if (authBtn) authBtn.textContent = "Login";
    if (nameEl) nameEl.style.display = "none";

    const out = await api("/auth/login", { method: "POST", body: creds });
    setSession(out);
    window.location = out?.user?.role === "admin" ? "admin.html" : "member.html";
  } catch (e) {
    if (msg) msg.textContent = e.message || "Login failed";
  }
}

function goDashboardIfAuthed() {
  const s = getSession();
  if (s?.token) window.location = s?.user?.role === "admin" ? "admin.html" : "member.html";
  else {
    const msg = document.getElementById("authMsg");
    if (msg) msg.textContent = "Login or create demo first.";
  }
}

function logout() {
  clearSession();
  window.location = "index.html";
}

async function addMember() {
  const msg = document.getElementById("memberMsg");
  if (msg) msg.textContent = "";
  try {
    const email = document.getElementById("memberEmail")?.value?.trim();
    if (!email) throw new Error("Email required");
    await api(`/projects/${encodeURIComponent(state.activeProjectId)}/members`, { method: "POST", body: { email } });
    document.getElementById("memberEmail").value = "";
    await loadMembers();
  } catch (e) {
    if (msg) msg.textContent = e.message || "Failed";
  }
}

// Dashboard logic
let state = {
  projects: [],
  activeProjectId: null,
  tasks: [],
  members: []
};

function ensureAuthedOrRedirect() {
  const s = getSession();
  if (!s?.token) window.location = "index.html";
  return s;
}

async function loadProjects() {
  state.projects = await api("/projects");
  renderProjects();
  if (!state.activeProjectId && state.projects[0]?._id) {
    setActiveProject(state.projects[0]._id);
  } else {
    await loadTasks();
  }
}

function setActiveProject(id) {
  state.activeProjectId = id;
  renderProjects();
  loadTasks();
}

function renderProjects() {
  const list = document.getElementById("projectList");
  const count = document.getElementById("projectCount");
  const label = document.getElementById("activeProjectLabel");
  if (count) count.textContent = String(state.projects.length);
  if (!list) return;

  list.innerHTML = "";
  state.projects.forEach((p) => {
    const row = document.createElement("div");
    row.className = "projectItem" + (p._id === state.activeProjectId ? " active" : "");
    row.onclick = () => setActiveProject(p._id);

    const left = document.createElement("div");
    left.innerHTML = `<div class="projectName">${escapeHtml(p.name)}</div><div class="muted">Created ${new Date(p.createdAt).toLocaleString()}</div>`;

    const right = document.createElement("button");
    right.className = "btn danger mini";
    right.textContent = "Delete";
    right.onclick = async (e) => {
      e.stopPropagation();
      await api("/projects/" + p._id, { method: "DELETE" });
      if (p._id === state.activeProjectId) state.activeProjectId = null;
      await loadProjects();
    };

    row.appendChild(left);
    row.appendChild(right);
    list.appendChild(row);
  });

  const active = state.projects.find((p) => p._id === state.activeProjectId);
  if (label) label.textContent = active ? `Active project: ${active.name}` : "Pick a project to load tasks.";
}

async function createProject() {
  const msg = document.getElementById("projectMsg");
  if (msg) msg.textContent = "";
  try {
    const name = document.getElementById("projectName")?.value?.trim();
    if (!name) throw new Error("Project name required");
    const p = await api("/projects", { method: "POST", body: { name } });
    document.getElementById("projectName").value = "";
    state.activeProjectId = p._id;
    await loadProjects();
  } catch (e) {
    if (msg) msg.textContent = e.message || "Create failed";
  }
}

async function loadTasks() {
  if (!state.activeProjectId) {
    state.tasks = [];
    renderTasks();
    return;
  }
  state.tasks = await api(`/tasks?projectId=${encodeURIComponent(state.activeProjectId)}`);
  await loadMembers();
  renderTasks();
}

async function loadMembers() {
  const s = getSession();
  if (s?.user?.role !== "admin") {
    state.members = [];
    renderMembers();
    return;
  }
  try {
    state.members = await api(`/projects/${encodeURIComponent(state.activeProjectId)}/members`);
  } catch {
    state.members = [];
  }
  renderMembers();
}

function renderMembers() {
  const box = document.getElementById("teamBox");
  const list = document.getElementById("memberList");
  const sel = document.getElementById("assigneeSelect");
  const s = getSession();

  if (!box || !list || !sel) return;

  if (s?.user?.role !== "admin") {
    box.style.display = "none";
    sel.style.display = "none";
    return;
  }

  box.style.display = "block";
  sel.style.display = "block";

  list.innerHTML = "";
  state.members.forEach((m) => {
    const row = document.createElement("div");
    row.className = "projectItem";
    row.style.cursor = "default";
    row.innerHTML = `<div><div class="projectName">${escapeHtml(m.name || m.email)}</div><div class="muted">${escapeHtml(m.email)} • ${escapeHtml(m.role)}</div></div>`;

    const kick = document.createElement("button");
    kick.className = "btn danger mini";
    kick.textContent = "Remove";
    kick.onclick = async () => {
      await api(`/projects/${encodeURIComponent(state.activeProjectId)}/members/${encodeURIComponent(m._id)}`, { method: "DELETE" });
      await loadMembers();
    };
    row.appendChild(kick);
    list.appendChild(row);
  });

  const current = sel.value;
  sel.innerHTML =
    `<option value="">Unassigned</option>` +
    state.members.map((m) => `<option value="${m._id}">${escapeHtml(m.name || m.email)}</option>`).join("");
  sel.value = current;
}

function renderTasks() {
  const pending = state.tasks.filter((t) => t.status === "Pending");
  const progress = state.tasks.filter((t) => t.status === "In Progress");
  const done = state.tasks.filter((t) => t.status === "Completed");

  setText("bPending", pending.length);
  setText("bProgress", progress.length);
  setText("bDone", done.length);
  setText("taskCount", state.tasks.length);

  renderTaskList("listPending", pending);
  renderTaskList("listProgress", progress);
  renderTaskList("listDone", done);
}

function renderTaskList(id, items) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = "";

  items.forEach((t) => {
    const card = document.createElement("div");
    card.className = "task";
    const overdue = t.status !== "Completed" && typeof t.dueDate === "number" && t.dueDate < Date.now();
    const due = typeof t.dueDate === "number" ? new Date(t.dueDate).toLocaleDateString() : "—";
    card.innerHTML = `
      <div class="t">${escapeHtml(t.title)}</div>
      <div class="m">
        ${t.assignedToName ? "Assigned to " + escapeHtml(t.assignedToName) : "Unassigned"}
        • Due ${escapeHtml(due)}
        ${overdue ? " • OVERDUE" : ""}
      </div>
      <div class="actions"></div>
    `;

    const actions = card.querySelector(".actions");
    const btn1 = document.createElement("button");
    btn1.className = "btn mini";
    btn1.textContent = "Pending";
    btn1.disabled = t.status === "Pending";
    btn1.onclick = () => updateTaskStatus(t._id, "Pending");

    const btn2 = document.createElement("button");
    btn2.className = "btn mini primary";
    btn2.textContent = "In Progress";
    btn2.disabled = t.status === "In Progress";
    btn2.onclick = () => updateTaskStatus(t._id, "In Progress");

    const btn3 = document.createElement("button");
    btn3.className = "btn mini good";
    btn3.textContent = "Completed";
    btn3.disabled = t.status === "Completed";
    btn3.onclick = () => updateTaskStatus(t._id, "Completed");

    const del = document.createElement("button");
    del.className = "btn mini danger";
    del.textContent = "Delete";
    del.onclick = async () => {
      await api("/tasks/" + t._id, { method: "DELETE" });
      await loadTasks();
    };
    const s = getSession();
    if (s?.user?.role !== "admin") del.style.display = "none";

    actions.appendChild(btn1);
    actions.appendChild(btn2);
    actions.appendChild(btn3);
    actions.appendChild(del);
    el.appendChild(card);
  });
}

async function createTask() {
  const msg = document.getElementById("taskMsg");
  if (msg) msg.textContent = "";
  try {
    const title = document.getElementById("taskTitle")?.value?.trim();
    const assignedToName = document.getElementById("assignedTo")?.value?.trim();
    const assigneeId = document.getElementById("assigneeSelect")?.value || "";
    const dueRaw = document.getElementById("dueDate")?.value || "";
    const dueDate = dueRaw ? new Date(dueRaw + "T00:00:00").getTime() : null;
    if (!state.activeProjectId) throw new Error("Create/select a project first");
    if (!title) throw new Error("Task title required");
    const s = getSession();
    const body = { title, projectId: state.activeProjectId, dueDate };
    if (s?.user?.role === "admin") {
      body.assignedToUserId = assigneeId;
      body.assignedToName = assigneeId ? (state.members.find((m) => m._id === assigneeId)?.name || "") : (assignedToName || "");
    } else {
      body.assignedToName = assignedToName || "";
    }
    await api("/tasks", { method: "POST", body });
    document.getElementById("taskTitle").value = "";
    document.getElementById("assignedTo").value = "";
    const due = document.getElementById("dueDate");
    if (due) due.value = "";
    await loadTasks();
  } catch (e) {
    if (msg) msg.textContent = e.message || "Create failed";
  }
}

async function updateTaskStatus(id, status) {
  await api("/tasks/" + id, { method: "PUT", body: { status } });
  await loadTasks();
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value);
}

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Boot
(async function boot() {
  await checkApi();

  const page = window.location.pathname.toLowerCase();
  const onAdmin = page.includes("admin");
  const onMember = page.includes("member");
  const onAnyDashboard = onAdmin || onMember;

  if (!onAnyDashboard) {
    const nameInput = document.getElementById("name");
    if (nameInput) nameInput.style.display = "none";
    return;
  }

  const s = ensureAuthedOrRedirect();
  const who = document.getElementById("whoami");
  if (who) who.textContent = `${s.user?.name || "User"} • ${s.user?.email || ""} • ${s.user?.role || ""}`;

  if (onAdmin) {
    if (s.user?.role !== "admin") window.location = "member.html";
    await loadProjects();
    return;
  }

  if (onMember) {
    if (s.user?.role === "admin") {
      // Allow admin to peek member view too.
    }
    await loadMyTasks();
    return;
  }
})();

// Member dashboard (My tasks)
let myFilter = "";
function setMyFilter(status) {
  myFilter = status || "";
  setChip("chipAll", myFilter === "");
  setChip("chipPending", myFilter === "Pending");
  setChip("chipProgress", myFilter === "In Progress");
  setChip("chipDone", myFilter === "Completed");
  loadMyTasks();
}

function setChip(id, active) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = active ? "chip active" : "chip";
}

async function loadMyTasks() {
  const msg = document.getElementById("myMsg");
  if (msg) msg.textContent = "";
  try {
    const qs = myFilter ? `?status=${encodeURIComponent(myFilter)}` : "";
    const data = await api(`/tasks/my${qs}`);
    renderMyTasks(Array.isArray(data) ? data : []);
  } catch (e) {
    if (msg) msg.textContent = e.message || "Failed";
  }
}

function renderMyTasks(items) {
  const box = document.getElementById("myTasks");
  const count = document.getElementById("myCount");
  if (!box) return;
  if (count) count.textContent = String(items.length);
  box.innerHTML = "";

  items.forEach((t) => {
    const card = document.createElement("div");
    card.className = "task";
    const overdue = t.status !== "Completed" && typeof t.dueDate === "number" && t.dueDate < Date.now();
    const due = typeof t.dueDate === "number" ? new Date(t.dueDate).toLocaleDateString() : "—";

    card.innerHTML = `
      <div class="t">${escapeHtml(t.title)}</div>
      <div class="m">
        Project: ${escapeHtml(t.projectId || "—")} • Due ${escapeHtml(due)} ${overdue ? " • OVERDUE" : ""}
      </div>
      <div class="actions"></div>
    `;

    const actions = card.querySelector(".actions");
    const s = getSession();

    const btn1 = document.createElement("button");
    btn1.className = "btn mini";
    btn1.textContent = "Pending";
    btn1.disabled = t.status === "Pending";
    btn1.onclick = () => updateTaskStatus(t._id, "Pending");

    const btn2 = document.createElement("button");
    btn2.className = "btn mini primary";
    btn2.textContent = "In Progress";
    btn2.disabled = t.status === "In Progress";
    btn2.onclick = () => updateTaskStatus(t._id, "In Progress");

    const btn3 = document.createElement("button");
    btn3.className = "btn mini good";
    btn3.textContent = "Completed";
    btn3.disabled = t.status === "Completed";
    btn3.onclick = () => updateTaskStatus(t._id, "Completed");

    actions.appendChild(btn1);
    actions.appendChild(btn2);
    actions.appendChild(btn3);

    // Admin viewing member page still shouldn't delete here.
    if (s?.user?.role === "admin") {
      const hint = document.createElement("div");
      hint.className = "muted";
      hint.style.marginTop = "6px";
      hint.textContent = "Tip: Admin can edit assignments in Admin view.";
      card.appendChild(hint);
    }

    box.appendChild(card);
  });
}