
USE `sd2-db`;

-- Core tables
CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(50),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cars (
  id INT AUTO_INCREMENT PRIMARY KEY,
  make VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  year YEAR NOT NULL,
  status ENUM('available','booked','maintenance','retired') NOT NULL DEFAULT 'available',
  daily_rate DECIMAL(10,2) NOT NULL,
  location VARCHAR(120),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  car_id INT NOT NULL,
  customer_id INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status ENUM('booked','ongoing','completed','cancelled') NOT NULL DEFAULT 'booked',
  total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_bookings_car FOREIGN KEY (car_id) REFERENCES cars(id),
  CONSTRAINT fk_bookings_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
  INDEX idx_bookings_car (car_id),
  INDEX idx_bookings_start_end (start_date, end_date)
) ENGINE=InnoDB;

-- Seed data for testing dashboards
INSERT INTO customers (first_name, last_name, email, phone) VALUES
  ('Amelia', 'Stone', 'amelia.stone@gmail.com', '+44 7700 900001'),
  ('Oliver', 'Reed', 'oliver.reed@gmail.com', '+44 7700 900002'),
  ('Priya', 'Patel', 'priya.patel@gmail.com', '+44 7700 900003')
ON DUPLICATE KEY UPDATE phone = VALUES(phone);

INSERT INTO cars (make, model, year, status, daily_rate, location) VALUES
  ('Tesla', 'Model 3', 2023, 'available', 145.00, 'London Central'),
  ('BMW', '3 Series', 2022, 'booked', 120.00, 'London Central'),
  ('Toyota', 'RAV4', 2021, 'maintenance', 95.00, 'Heathrow'),
  ('Audi', 'A4', 2020, 'available', 110.00, 'London Central'),
  ('Mercedes', 'C-Class', 2022, 'booked', 130.00, 'Heathrow')
ON DUPLICATE KEY UPDATE status = VALUES(status), daily_rate = VALUES(daily_rate);

-- Add a unique booking span index if it is missing (keeps seeding idempotent)
SET @idx_exists = (
  SELECT COUNT(1)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'bookings'
    AND INDEX_NAME = 'uniq_booking_span'
);
SET @create_idx_sql = IF(
  @idx_exists = 0,
  'ALTER TABLE bookings ADD UNIQUE KEY uniq_booking_span (car_id, start_date, end_date)',
  'SELECT 1'
);
PREPARE create_idx_stmt FROM @create_idx_sql;
EXECUTE create_idx_stmt;
DEALLOCATE PREPARE create_idx_stmt;

INSERT IGNORE INTO bookings (car_id, customer_id, start_date, end_date, status, total_price) VALUES
  (1, 1, CURRENT_DATE + INTERVAL 1 DAY, CURRENT_DATE + INTERVAL 3 DAY, 'booked', 435.00),
  (2, 2, CURRENT_DATE - INTERVAL 1 DAY, CURRENT_DATE + INTERVAL 2 DAY, 'ongoing', 360.00),
  (3, 3, CURRENT_DATE - INTERVAL 5 DAY, CURRENT_DATE - INTERVAL 2 DAY, 'completed', 285.00),
  (4, 2, CURRENT_DATE, CURRENT_DATE + INTERVAL 1 DAY, 'booked', 110.00),
  (5, 1, CURRENT_DATE - INTERVAL 3 DAY, CURRENT_DATE + INTERVAL 1 DAY, 'ongoing', 520.00),
  (5, 1, CURRENT_DATE - INTERVAL 10 DAY, CURRENT_DATE - INTERVAL 8 DAY, 'cancelled', 0.00);

-- Dashboard metrics view
CREATE OR REPLACE VIEW dashboard_metrics AS
SELECT
  (SELECT COUNT(*) FROM cars) AS total_cars,
  (SELECT COUNT(*) FROM cars WHERE status = 'available') AS cars_available,
  (SELECT COUNT(*) FROM cars WHERE status = 'booked') AS cars_booked_flag,
  (SELECT COUNT(*) FROM cars WHERE status = 'maintenance') AS cars_in_maintenance,
  (SELECT COUNT(DISTINCT car_id) FROM bookings WHERE status IN ('booked','ongoing') AND end_date >= CURRENT_DATE()) AS cars_with_active_bookings,
  (SELECT COUNT(*) FROM bookings WHERE status IN ('booked','ongoing')) AS active_bookings,
  (SELECT COUNT(*) FROM bookings WHERE status = 'cancelled') AS cancelled_bookings,
  (SELECT COUNT(*) FROM bookings WHERE DATE(start_date) = CURRENT_DATE()) AS pickups_today,
  (SELECT COUNT(*) FROM bookings WHERE DATE(end_date) = CURRENT_DATE() AND status IN ('booked','ongoing')) AS returns_today,
  (SELECT COUNT(*) FROM customers) AS total_customers,
  (SELECT COALESCE(SUM(total_price), 0) FROM bookings WHERE status = 'completed' AND start_date >= DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01')) AS revenue_this_month
;

