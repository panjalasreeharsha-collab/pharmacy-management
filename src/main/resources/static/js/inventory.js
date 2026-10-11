const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function startOfToday(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function parseDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function daysUntilExpiry(medicine, now = new Date()) {
  return Math.ceil((parseDate(medicine.expiry) - startOfToday(now)) / DAY_IN_MS);
}

export function isLowStock(medicine) {
  return medicine.quantity <= medicine.reorderLevel;
}

export function isExpiringSoon(medicine, now = new Date()) {
  return daysUntilExpiry(medicine, now) <= 30;
}

export function suggestedOrderQuantity(medicine) {
  return Math.max(0, medicine.reorderLevel * 2 - medicine.quantity);
}

export function getSummary(medicines, now = new Date()) {
  return {
    totalMedicines: medicines.length,
    lowStockCount: medicines.filter(isLowStock).length,
    expiringCount: medicines.filter((medicine) => isExpiringSoon(medicine, now)).length,
    inventoryValue: medicines.reduce((total, medicine) => total + medicine.price * medicine.quantity, 0)
  };
}

export function getCategoryTotals(medicines) {
  const totals = new Map();
  for (const medicine of medicines) {
    totals.set(medicine.category, (totals.get(medicine.category) || 0) + medicine.quantity);
  }
  return [...totals.entries()].sort((a, b) => b[1] - a[1]);
}

export function filterMedicines(medicines, filters) {
  const query = filters.query.trim().toLocaleLowerCase();
  return medicines.filter((medicine) => {
    const matchesQuery = !query
      || medicine.name.toLocaleLowerCase().includes(query)
      || medicine.batch.toLocaleLowerCase().includes(query);
    const matchesCategory = !filters.category || medicine.category === filters.category;
    const matchesStock = !filters.stock
      || (filters.stock === "low" ? isLowStock(medicine) : !isLowStock(medicine));
    const matchesExpiry = !filters.expiry || isExpiringSoon(medicine, filters.now);
    return matchesQuery && matchesCategory && matchesStock && matchesExpiry;
  });
}

export function validateMedicine(medicine) {
  const requiredText = ["id", "name", "batch", "category", "supplier", "expiry"];
  for (const field of requiredText) {
    if (typeof medicine[field] !== "string" || !medicine[field].trim()) {
      const label = { id: "medicine ID", expiry: "expiry date" }[field] || field;
      throw new Error(`Please enter a valid ${label}.`);
    }
  }
  if (!Number.isFinite(medicine.price) || medicine.price <= 0) {
    throw new Error("Unit price must be greater than zero.");
  }
  if (!Number.isInteger(medicine.quantity) || medicine.quantity < 0) {
    throw new Error("Current quantity must be a whole number of zero or more.");
  }
  if (!Number.isInteger(medicine.reorderLevel) || medicine.reorderLevel < 0) {
    throw new Error("Reorder level must be a whole number of zero or more.");
  }
  const parsedExpiry = /^\d{4}-\d{2}-\d{2}$/.test(medicine.expiry) ? parseDate(medicine.expiry) : null;
  const [year, month, day] = medicine.expiry.split("-").map(Number);
  if (!parsedExpiry || Number.isNaN(parsedExpiry.getTime())
    || parsedExpiry.getFullYear() !== year
    || parsedExpiry.getMonth() !== month - 1
    || parsedExpiry.getDate() !== day) {
    throw new Error("Please enter a valid expiry date.");
  }
  return medicine;
}
