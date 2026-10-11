package com.example.pharmacy_management.data;

import java.util.Optional;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class AccountRepository {
	public record ShopAccount(long shopId, String username, String shopName, String passwordHash) {
	}

	private final JdbcTemplate jdbc;

	public AccountRepository(JdbcTemplate jdbc) {
		this.jdbc = jdbc;
	}

	@Transactional
	public ShopAccount createShop(String username, String shopName, String passwordHash) {
		KeyHolder shopKey = new GeneratedKeyHolder();
		jdbc.update(connection -> {
			var statement = connection.prepareStatement(
					"INSERT INTO shops (name) VALUES (?)", new String[] { "id" });
			statement.setString(1, shopName);
			return statement;
		}, shopKey);
		Number generatedId = shopKey.getKey();
		if (generatedId == null) {
			throw new IllegalStateException("The database did not return the new shop ID.");
		}
		long shopId = generatedId.longValue();
		jdbc.update("INSERT INTO shop_accounts (shop_id, username, password_hash) VALUES (?, ?, ?)",
				shopId, username, passwordHash);
		return new ShopAccount(shopId, username, shopName, passwordHash);
	}

	public boolean usernameExists(String username) {
		Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM shop_accounts WHERE username = ?", Integer.class,
				username);
		return count != null && count > 0;
	}

	public Optional<ShopAccount> findByUsername(String username) {
		return jdbc.query("""
				SELECT s.id AS shop_id, a.username, s.name AS shop_name, a.password_hash
				FROM shop_accounts a
				JOIN shops s ON s.id = a.shop_id
				WHERE a.username = ?
				""", (result, rowNumber) -> new ShopAccount(result.getLong("shop_id"),
				result.getString("username"), result.getString("shop_name"), result.getString("password_hash")),
				username).stream().findFirst();
	}
}
