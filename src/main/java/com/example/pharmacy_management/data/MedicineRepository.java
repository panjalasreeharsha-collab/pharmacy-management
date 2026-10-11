package com.example.pharmacy_management.data;

import java.sql.Date;
import java.util.List;
import java.util.Optional;

import com.example.pharmacy_management.api.MedicineRequest;
import com.example.pharmacy_management.api.MedicineResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class MedicineRepository {
	private static final String SELECT_COLUMNS = """
			SELECT id, name, batch_number, category, unit_price, quantity, expiry_date, supplier_name, reorder_level
			FROM medicines
			""";
	private final JdbcTemplate jdbc;

	public MedicineRepository(JdbcTemplate jdbc) {
		this.jdbc = jdbc;
	}

	public List<MedicineResponse> findAll(long shopId) {
		return jdbc.query(SELECT_COLUMNS + " WHERE shop_id = ? ORDER BY name, batch_number",
				(result, rowNumber) -> new MedicineResponse(result.getLong("id"), result.getString("name"),
						result.getString("batch_number"), result.getString("category"),
						result.getBigDecimal("unit_price"), result.getInt("quantity"),
						result.getDate("expiry_date").toLocalDate(), result.getString("supplier_name"),
						result.getInt("reorder_level")), shopId);
	}

	public Optional<MedicineResponse> create(long shopId, MedicineRequest medicine) {
		KeyHolder keyHolder = new GeneratedKeyHolder();
		jdbc.update(connection -> {
			var statement = connection.prepareStatement("""
					INSERT INTO medicines
						(shop_id, name, batch_number, category, unit_price, quantity, expiry_date, supplier_name, reorder_level)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
					""", new String[] { "id" });
			statement.setLong(1, shopId);
			statement.setString(2, medicine.name());
			statement.setString(3, medicine.batch());
			statement.setString(4, medicine.category());
			statement.setBigDecimal(5, medicine.price());
			statement.setInt(6, medicine.quantity());
			statement.setDate(7, Date.valueOf(medicine.expiry()));
			statement.setString(8, medicine.supplier());
			statement.setInt(9, medicine.reorderLevel());
			return statement;
		}, keyHolder);
		Number id = keyHolder.getKey();
		if (id == null) {
			throw new IllegalStateException("The database did not return the new medicine ID.");
		}
		return findOne(shopId, id.longValue());
	}

	public Optional<MedicineResponse> update(long shopId, long medicineId, MedicineRequest medicine) {
		int updated = jdbc.update("""
				UPDATE medicines
				SET name = ?, batch_number = ?, category = ?, unit_price = ?, quantity = ?,
				    expiry_date = ?, supplier_name = ?, reorder_level = ?
				WHERE id = ? AND shop_id = ?
				""", medicine.name(), medicine.batch(), medicine.category(), medicine.price(), medicine.quantity(),
				Date.valueOf(medicine.expiry()), medicine.supplier(), medicine.reorderLevel(), medicineId, shopId);
		return updated == 0 ? Optional.empty() : findOne(shopId, medicineId);
	}

	public boolean delete(long shopId, long medicineId) {
		return jdbc.update("DELETE FROM medicines WHERE id = ? AND shop_id = ?", medicineId, shopId) > 0;
	}

	private Optional<MedicineResponse> findOne(long shopId, long medicineId) {
		return jdbc.query(SELECT_COLUMNS + " WHERE id = ? AND shop_id = ?",
				(result, rowNumber) -> new MedicineResponse(result.getLong("id"), result.getString("name"),
						result.getString("batch_number"), result.getString("category"),
						result.getBigDecimal("unit_price"), result.getInt("quantity"),
						result.getDate("expiry_date").toLocalDate(), result.getString("supplier_name"),
						result.getInt("reorder_level")), medicineId, shopId).stream().findFirst();
	}
}
