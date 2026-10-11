CREATE TABLE IF NOT EXISTS shops (
    id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS shop_accounts (
    id BIGINT NOT NULL AUTO_INCREMENT,
    shop_id BIGINT NOT NULL,
    username VARCHAR(32) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uq_shop_accounts_username UNIQUE (username),
    CONSTRAINT uq_shop_accounts_shop UNIQUE (shop_id),
    CONSTRAINT fk_shop_accounts_shop FOREIGN KEY (shop_id) REFERENCES shops (id)
);

CREATE TABLE IF NOT EXISTS medicines (
    id BIGINT NOT NULL AUTO_INCREMENT,
    shop_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    batch_number VARCHAR(40) NOT NULL,
    category VARCHAR(50) NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    quantity INT NOT NULL,
    expiry_date DATE NOT NULL,
    supplier_name VARCHAR(100) NOT NULL,
    reorder_level INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_medicines_shop FOREIGN KEY (shop_id) REFERENCES shops (id),
    CONSTRAINT uq_medicine_batch_per_shop UNIQUE (shop_id, batch_number),
    CONSTRAINT chk_medicine_price CHECK (unit_price > 0),
    CONSTRAINT chk_medicine_quantity CHECK (quantity >= 0),
    CONSTRAINT chk_medicine_reorder CHECK (reorder_level >= 0)
);
