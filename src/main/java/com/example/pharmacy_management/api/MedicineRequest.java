package com.example.pharmacy_management.api;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record MedicineRequest(
		@NotBlank(message = "Enter a medicine name.")
		@Size(max = 100, message = "Medicine name must be 100 characters or fewer.") String name,
		@NotBlank(message = "Enter a batch number.")
		@Size(max = 40, message = "Batch number must be 40 characters or fewer.") String batch,
		@NotBlank(message = "Enter a category.")
		@Size(max = 50, message = "Category must be 50 characters or fewer.") String category,
		@NotNull(message = "Enter a unit price.")
		@DecimalMin(value = "0.01", message = "Unit price must be greater than zero.") BigDecimal price,
		@NotNull(message = "Enter the current quantity.")
		@Min(value = 0, message = "Current quantity cannot be negative.") Integer quantity,
		@NotNull(message = "Enter an expiry date.") LocalDate expiry,
		@NotBlank(message = "Enter a supplier name.")
		@Size(max = 100, message = "Supplier name must be 100 characters or fewer.") String supplier,
		@NotNull(message = "Enter a reorder level.")
		@Min(value = 0, message = "Reorder level cannot be negative.") Integer reorderLevel) {
	public MedicineRequest {
		if (price != null) {
			price = price.setScale(2, java.math.RoundingMode.HALF_UP);
		}
		if (name != null) name = name.trim();
		if (batch != null) batch = batch.trim();
		if (category != null) category = category.trim();
		if (supplier != null) supplier = supplier.trim();
	}
}
