import { getSummary, getCategoryTotals, filterMedicines, suggestedOrderQuantity, isLowStock, isExpiringSoon } from "./inventory.js";

const state = {
  medicines: [],
  authView: "signin",
  csrfToken: "",
  currentShop: null,
  activeView: "dashboard",
  filters: {
    query: "",
    category: "",
    stock: "",
    expiry: "",
    now: new Date()
  }
};

const elements = {
  authScreen: document.getElementById("auth-screen"),
  appShell: document.getElementById("app-shell"),
  signinPanel: document.getElementById("signin-panel"),
  signupPanel: document.getElementById("signup-panel"),
  authMessage: document.getElementById("auth-message"),
  greetingUsername: document.getElementById("greeting-username"),
  storeName: document.getElementById("store-name"),
  storeUsername: document.getElementById("store-username"),
  signoutButton: document.getElementById("signout-button"),
  todayLabel: document.getElementById("today-label"),
  navLinks: [...document.querySelectorAll(".nav-link")],
  pageViews: [...document.querySelectorAll(".page-view")],
  currentPageLabel: document.getElementById("current-page-label"),
  summaryGrid: document.getElementById("summary-grid"),
  categoryChart: document.getElementById("category-chart"),
  attentionTable: document.getElementById("attention-table"),
  attentionEmpty: document.getElementById("attention-empty"),
  inventoryTable: document.getElementById("inventory-table"),
  inventoryEmpty: document.getElementById("inventory-empty"),
  inventoryResultCount: document.getElementById("inventory-result-count"),
  searchInput: document.getElementById("search-input"),
  categoryFilter: document.getElementById("category-filter"),
  stockFilter: document.getElementById("stock-filter"),
  expiryFilter: document.getElementById("expiry-filter"),
  ordersTable: document.getElementById("orders-table"),
  ordersEmpty: document.getElementById("orders-empty"),
  orderListCount: document.getElementById("order-list-count"),
  navInventoryCount: document.getElementById("nav-inventory-count"),
  navOrderCount: document.getElementById("nav-order-count"),
  exportOrders: document.getElementById("export-orders"),
  medicineDialog: document.getElementById("medicine-dialog"),
  medicineForm: document.getElementById("medicine-form"),
  dialogTitle: document.getElementById("dialog-title"),
  categoryOptions: document.getElementById("category-options"),
  toastRegion: document.getElementById("toast-region"),
  signinForm: document.getElementById("signin-form"),
  signupForm: document.getElementById("signup-form")
};

const summaryMeta = [
  { key: "totalMedicines", label: "Unique medicines", icon: "mint", note: "In stock", format: "number" },
  { key: "lowStockCount", label: "Low-stock alerts", icon: "amber", note: "Need attention", format: "number" },
  { key: "expiringCount", label: "Expiring soon", icon: "rose", note: "30-day check", format: "number" },
  { key: "inventoryValue", label: "Inventory value", icon: "blue", note: "Estimated total", format: "currency" }
];

function setAuthMessage(message, kind = "error") {
  elements.authMessage.hidden = !message;
  elements.authMessage.textContent = message || "";
  elements.authMessage.style.color = kind === "success" ? "#0d7a5c" : "#b34757";
  elements.authMessage.style.background = kind === "success" ? "#eafaf3" : "#fff1f2";
  elements.authMessage.style.border = `1px solid ${kind === "success" ? "#bfe7d6" : "#f5d1d5"}`;
}

function toCurrency(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value || 0);
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function setView(viewName) {
  state.activeView = viewName;
  elements.navLinks.forEach((button) => button.classList.toggle("is-active", button.dataset.view === viewName));
  const pageMap = {
    dashboard: "Overview",
    inventory: "Medicine stock",
    orders: "Order suggestions"
  };
  elements.currentPageLabel.textContent = pageMap[viewName] || "Overview";
  elements.pageViews.forEach((view) => {
    const isMatch = view.id === `${viewName}-view`;
    view.hidden = !isMatch;
    view.classList.toggle("is-visible", isMatch);
  });
}

function getCurrentFilters() {
  return {
    query: elements.searchInput.value.trim(),
    category: elements.categoryFilter.value,
    stock: elements.stockFilter.value,
    expiry: elements.expiryFilter.value,
    now: new Date()
  };
}

function updateCategoryOptions() {
  const categories = [...new Set(state.medicines.map((item) => item.category).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  elements.categoryOptions.innerHTML = categories.map((category) => `<option value="${category}"></option>`).join("");
  const current = elements.categoryFilter.value;
  elements.categoryFilter.innerHTML = ['<option value="">All categories</option>']
    .concat(categories.map((category) => `<option value="${category}">${category}</option>`))
    .join("");
  if (categories.includes(current)) {
    elements.categoryFilter.value = current;
  }
}

function renderSummary() {
  const summary = getSummary(state.medicines, new Date());
  elements.summaryGrid.innerHTML = summaryMeta.map((meta) => {
    const value = meta.format === "currency" ? toCurrency(summary[meta.key]) : summary[meta.key];
    return `
      <article class="summary-card">
        <div class="summary-card-top">
          <span>${meta.label}</span>
          <span class="summary-icon ${meta.icon}" aria-hidden="true">${meta.key === "inventoryValue" ? "₹" : meta.key === "lowStockCount" ? "!" : meta.key === "expiringCount" ? "⏳" : "▣"}</span>
        </div>
        <strong class="summary-value ${meta.format === "currency" ? "summary-value-money" : ""}">${value}</strong>
        <div class="summary-note">
          <span class="summary-note-dot ${meta.icon}"></span>
          <span>${meta.note}</span>
        </div>
      </article>`;
  }).join("");

  const attentionItems = state.medicines.filter((medicine) => isLowStock(medicine) || isExpiringSoon(medicine, new Date()));
  const attentionRows = attentionItems.slice(0, 5).map((medicine) => {
    const qty = Number(medicine.quantity ?? 0);
    const status = medicine.quantity <= medicine.reorderLevel ? "Low Stock" : "Expiring Soon";
    const statusClass = medicine.quantity <= medicine.reorderLevel ? "status-badge status-warning" : "status-badge status-danger";
    return `
      <tr>
        <td><div class="table-name"><strong>${medicine.name}</strong><small>${medicine.category}</small></div></td>
        <td>${medicine.batch}</td>
        <td>${qty}</td>
        <td>${medicine.reorderLevel}</td>
        <td>${formatDate(medicine.expiry)}</td>
        <td><span class="${statusClass}">${status}</span></td>
        <td><button class="mini-action" type="button" data-edit-id="${medicine.id}">Edit</button></td>
      </tr>`;
  }).join("");

  elements.attentionTable.innerHTML = attentionRows || "";
  elements.attentionEmpty.hidden = attentionRows.length > 0;

  const totalCount = state.medicines.length;
  elements.navInventoryCount.textContent = String(totalCount);
  elements.navOrderCount.textContent = String(state.medicines.filter((item) => isLowStock(item)).length);
}

function renderCategoryChart() {
  const categories = getCategoryTotals(state.medicines);
  if (!categories.length) {
    elements.categoryChart.innerHTML = '<div class="empty-mini">No stock yet</div>';
    return;
  }

  const max = Math.max(...categories.map(([, count]) => count), 1);
  elements.categoryChart.innerHTML = categories.map(([category, count]) => {
    const width = Math.max((count / max) * 100, 10);
    return `
      <div class="category-row">
        <div class="category-row-label">
          <span>${category}</span>
          <strong>${count}</strong>
        </div>
        <div class="category-bar-track">
          <span class="category-bar" style="width:${width}%"></span>
        </div>
      </div>`;
  }).join("");
}

function renderInventoryTable() {
  const filters = getCurrentFilters();
  const filtered = filterMedicines(state.medicines, filters);
  elements.inventoryResultCount.textContent = `${filtered.length} result${filtered.length === 1 ? "" : "s"}`;

  if (!filtered.length) {
    elements.inventoryTable.innerHTML = "";
    elements.inventoryEmpty.hidden = false;
    return;
  }

  elements.inventoryEmpty.hidden = true;
  elements.inventoryTable.innerHTML = filtered.map((medicine) => {
    const status = medicine.quantity <= medicine.reorderLevel ? "Low stock" : "In stock";
    const badgeClass = medicine.quantity <= medicine.reorderLevel ? "status-badge status-warning" : "status-badge status-success";
    const expirySoon = isExpiringSoon(medicine, new Date()) ? "status-badge status-danger" : "status-badge status-success";
    return `
      <tr>
        <td><div class="table-name"><strong>${medicine.name}</strong><small>${medicine.category}</small></div></td>
        <td>${medicine.batch}</td>
        <td>${medicine.category}</td>
        <td>${toCurrency(Number(medicine.price || 0))}</td>
        <td>${medicine.quantity}</td>
        <td>${formatDate(medicine.expiry)}</td>
        <td>${medicine.supplier}</td>
        <td><div class="status-stack"><span class="${badgeClass}">${status}</span>${isExpiringSoon(medicine, new Date()) ? `<span class="${expirySoon}">Near expiry</span>` : ""}</div></td>
        <td><div class="row-actions"><button class="mini-action" type="button" data-edit-id="${medicine.id}">Edit</button><button class="mini-action danger" type="button" data-delete-id="${medicine.id}">Delete</button></div></td>
      </tr>`;
  }).join("");
}

function renderOrderSuggestions() {
  const orderItems = state.medicines.filter((medicine) => isLowStock(medicine)).map((medicine) => ({
    ...medicine,
    suggestedQuantity: suggestedOrderQuantity(medicine)
  }));

  elements.orderListCount.textContent = `${orderItems.length} item${orderItems.length === 1 ? "" : "s"}`;
  if (!orderItems.length) {
    elements.ordersTable.innerHTML = "";
    elements.ordersEmpty.hidden = false;
    return;
  }

  elements.ordersEmpty.hidden = true;
  elements.ordersTable.innerHTML = orderItems.map((medicine) => `
    <tr>
      <td><strong>${medicine.name}</strong></td>
      <td>${medicine.batch}</td>
      <td>${medicine.supplier}</td>
      <td>${medicine.quantity}</td>
      <td>${medicine.reorderLevel}</td>
      <td>${medicine.suggestedQuantity}</td>
      <td>${toCurrency(Number(medicine.price || 0))}</td>
    </tr>`).join("");
}

function resetFilters() {
  elements.searchInput.value = "";
  elements.categoryFilter.value = "";
  elements.stockFilter.value = "";
  elements.expiryFilter.value = "";
  renderInventoryTable();
}

async function apiFetch(url, options = {}, retryCsrf = true) {
  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (state.csrfToken) {
    headers.set("X-CSRF-Token", state.csrfToken);
  }

  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
    headers
  });

  if (!response.ok) {
    let message = "Something went wrong.";
    try {
      const payload = await response.json();
      message = payload.error || message;
    } catch {
      // no-op
    }
    if (retryCsrf && response.status === 403 && message === "Your session token is invalid. Refresh and try again.") {
      await fetchCsrfToken();
      return apiFetch(url, options, false);
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  const contentType = response.headers.get("Content-Type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

async function fetchCsrfToken() {
  const profile = await apiFetch("/api/auth/csrf");
  state.csrfToken = profile.csrfToken || "";
}

async function loadCurrentSession() {
  try {
    const profile = await apiFetch("/api/auth/me");
    state.currentShop = profile;
    state.csrfToken = profile.csrfToken || state.csrfToken;
    elements.greetingUsername.textContent = profile.username || "there";
    elements.storeName.textContent = profile.shopName || "Your pharmacy";
    elements.storeUsername.textContent = profile.username || "Store manager";
    elements.appShell.hidden = false;
    elements.authScreen.hidden = true;
    await loadMedicines();
    setView("dashboard");
  } catch {
    state.currentShop = null;
    elements.appShell.hidden = true;
    elements.authScreen.hidden = false;
    setView("dashboard");
  }
}

async function loadMedicines() {
  const data = await apiFetch("/api/medicines");
  state.medicines = (data || []).map((item) => ({
    ...item,
    price: Number(item.price || 0),
    quantity: Number(item.quantity || 0),
    reorderLevel: Number(item.reorderLevel || 0),
    expiry: item.expiry || ""
  }));
  updateCategoryOptions();
  renderSummary();
  renderCategoryChart();
  renderInventoryTable();
  renderOrderSuggestions();
}

async function signInOrUp(form, endpoint, successText) {
  const formData = Object.fromEntries(new FormData(form).entries());
  const payload = endpoint === "/api/auth/signup"
    ? {
        shopName: formData.shopName,
        username: formData.username,
        password: formData.password
      }
    : {
        username: formData.username,
        password: formData.password
      };

  setAuthMessage("");
  const result = await apiFetch(endpoint, {
    method: "POST",
    body: JSON.stringify(payload)
  });

  state.currentShop = result;
  state.csrfToken = result.csrfToken || state.csrfToken;
  elements.greetingUsername.textContent = result.username || "there";
  elements.storeName.textContent = result.shopName || "Your pharmacy";
  elements.storeUsername.textContent = result.username || "Store manager";
  elements.authScreen.hidden = true;
  elements.appShell.hidden = false;
  setAuthMessage(successText, "success");
  form.reset();
  await loadMedicines();
  setView("dashboard");
}

async function submitMedicine(event) {
  event.preventDefault();
  const formData = new FormData(elements.medicineForm);
  const payload = {
    id: formData.get("id") || "",
    name: String(formData.get("name") || "").trim(),
    batch: String(formData.get("batch") || "").trim(),
    category: String(formData.get("category") || "").trim(),
    price: Number(formData.get("price") || 0),
    quantity: Number(formData.get("quantity") || 0),
    expiry: String(formData.get("expiry") || ""),
    supplier: String(formData.get("supplier") || "").trim(),
    reorderLevel: Number(formData.get("reorderLevel") || 0)
  };

  const isEdit = Boolean(payload.id);

  try {
    const result = await apiFetch(isEdit ? `/api/medicines/${payload.id}` : "/api/medicines", {
      method: isEdit ? "PUT" : "POST",
      body: JSON.stringify({
        name: payload.name,
        batch: payload.batch,
        category: payload.category,
        price: payload.price,
        quantity: payload.quantity,
        expiry: payload.expiry,
        supplier: payload.supplier,
        reorderLevel: payload.reorderLevel
      })
    });
    setToast(isEdit ? "Medicine updated" : "Medicine added");
    elements.medicineDialog.close();
    elements.medicineForm.reset();
    await loadMedicines();
    setView("inventory");
    return result;
  } catch (error) {
    setToast(error.message, true);
    throw error;
  }
}

async function deleteMedicine(medicineId) {
  const confirmed = window.confirm("Delete this medicine from your stock?");
  if (!confirmed) return;

  try {
    await apiFetch(`/api/medicines/${medicineId}`, { method: "DELETE" });
    setToast("Medicine removed");
    await loadMedicines();
  } catch (error) {
    setToast(error.message, true);
  }
}

function setToast(message, isError = false) {
  const toast = document.createElement("div");
  toast.className = `toast ${isError ? "toast-error" : "toast-success"}`;
  toast.textContent = message;
  elements.toastRegion.appendChild(toast);
  window.setTimeout(() => toast.remove(), 2200);
}

function openMedicineDialog(medicine = null) {
  elements.medicineForm.reset();
  const title = medicine ? "Edit medicine" : "Add medicine";
  elements.dialogTitle.textContent = title;
  const formData = new FormData(elements.medicineForm);
  if (medicine) {
    formData.set("id", String(medicine.id));
    formData.set("name", medicine.name);
    formData.set("batch", medicine.batch);
    formData.set("category", medicine.category);
    formData.set("price", String(Number(medicine.price || 0)));
    formData.set("quantity", String(Number(medicine.quantity || 0)));
    formData.set("expiry", medicine.expiry);
    formData.set("supplier", medicine.supplier);
    formData.set("reorderLevel", String(Number(medicine.reorderLevel || 0)));
  }

  for (const [key, value] of formData.entries()) {
    const input = elements.medicineForm.elements.namedItem(key);
    if (input) {
      input.value = value;
    }
  }

  elements.medicineDialog.showModal();
}

async function signOut() {
  try {
    await apiFetch("/api/auth/signout", { method: "POST" });
  } catch {
    // no-op
  } finally {
    state.currentShop = null;
    state.csrfToken = "";
    elements.authScreen.hidden = false;
    elements.appShell.hidden = true;
    elements.signinForm.reset();
    elements.signupForm.reset();
    setAuthMessage("You have been signed out.", "success");
  }
}

function bindEvents() {
  document.querySelectorAll("[data-auth-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.dataset.authView;
      state.authView = view;
      elements.signinPanel.hidden = view !== "signin";
      elements.signupPanel.hidden = view !== "signup";
    });
  });

  elements.signinForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await signInOrUp(elements.signinForm, "/api/auth/signin", "Signed in successfully.");
    } catch (error) {
      setAuthMessage(error.message, "error");
    }
  });

  elements.signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = Object.fromEntries(new FormData(elements.signupForm).entries());
    if (formData.password !== formData.confirmPassword) {
      setAuthMessage("Passwords do not match.");
      return;
    }
    try {
      await signInOrUp(elements.signupForm, "/api/auth/signup", "Shop created successfully.");
    } catch (error) {
      setAuthMessage(error.message, "error");
    }
  });

  elements.navLinks.forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });

  document.querySelectorAll("[data-go-view]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.goView || "dashboard"));
  });

  document.querySelectorAll("[data-open-form]").forEach((button) => {
    button.addEventListener("click", () => openMedicineDialog());
  });

  document.querySelectorAll("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () => {
      elements.medicineDialog.close();
      elements.medicineForm.reset();
    });
  });

  elements.medicineForm.addEventListener("submit", submitMedicine);

  elements.searchInput.addEventListener("input", () => {
    state.filters.query = elements.searchInput.value.trim();
    renderInventoryTable();
  });
  elements.categoryFilter.addEventListener("change", renderInventoryTable);
  elements.stockFilter.addEventListener("change", renderInventoryTable);
  elements.expiryFilter.addEventListener("change", renderInventoryTable);

  document.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-edit-id]");
    if (editButton) {
      const item = state.medicines.find((medicine) => String(medicine.id) === String(editButton.dataset.editId));
      if (item) openMedicineDialog(item);
      return;
    }
    const deleteButton = event.target.closest("[data-delete-id]");
    if (deleteButton) {
      deleteMedicine(deleteButton.dataset.deleteId);
    }
  });

  elements.exportOrders.addEventListener("click", () => {
    const items = state.medicines.filter((medicine) => isLowStock(medicine));
    if (!items.length) {
      setToast("No order suggestions to export");
      return;
    }
    const rows = [
      ["Medicine", "Batch", "Current Stock", "Reorder Level", "Suggested Quantity", "Unit Price"],
      ...items.map((medicine) => [
        medicine.name,
        medicine.batch,
        medicine.quantity,
        medicine.reorderLevel,
        suggestedOrderQuantity(medicine),
        Number(medicine.price || 0)
      ])
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "medstock-order-suggestions.csv";
    link.click();
    URL.revokeObjectURL(link.href);
    setToast("Order list exported");
  });

  elements.signoutButton.addEventListener("click", signOut);
  document.querySelector("[data-clear-filters]")?.addEventListener("click", resetFilters);
}

async function init() {
  elements.todayLabel.textContent = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  bindEvents();
  await fetchCsrfToken();
  await loadCurrentSession();
}

init();
