package com.example.pharmacy_management.api;

import java.math.BigDecimal;
import java.time.LocalDate;

public record MedicineResponse(
		long id,
		String name,
		String batch,
		String category,
		BigDecimal price,
		int quantity,
		LocalDate expiry,
		String supplier,
		int reorderLevel) {
}
