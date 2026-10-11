import { validateMedicine } from "./inventory.js";

const STORAGE_KEY = "medstock.inventory.v1";

function normalizeMedicine(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("Saved medicine entries must be objects.");
  }
  return {
    id: String(raw.id ?? crypto.randomUUID ? crypto.randomUUID() : `med-${Date.now()}`),
    name: String(raw.name ?? "").trim(),
    batch: String(raw.batch ?? "").trim(),
    category: String(raw.category ?? "").trim(),
    price: Number(raw.price ?? 0),
    quantity: Number(raw.quantity ?? 0),
    expiry: String(raw.expiry ?? "").trim(),
    supplier: String(raw.supplier ?? "").trim(),
    reorderLevel: Number(raw.reorderLevel ?? 0)
  };
}

export function loadMedicines() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === null) {
      return { medicines: [], warning: "" };
    }
    const medicines = JSON.parse(saved);
    if (!Array.isArray(medicines)) {
      throw new Error("Saved inventory must be a list.");
    }
    return { medicines: medicines.map(normalizeMedicine).map(validateMedicine), warning: "" };
  } catch (error) {
    console.error("Could not load saved inventory; keeping an empty list.", error);
    return { medicines: [], warning: "Saved inventory could not be read. The selected shop is starting with an empty stock list." };
  }
}

export function saveMedicines(medicines) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(medicines));
}
export function clearMedicines() {
  window.localStorage.removeItem(STORAGE_KEY);
}
