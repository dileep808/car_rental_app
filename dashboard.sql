USE `sd2-db`;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  role ENUM('customer','agent') DEFAULT 'customer',
  password VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cars (
  id INT AUTO_INCREMENT PRIMARY KEY,
  make VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  year YEAR NOT NULL,
  status ENUM('available','booked','maintenance','retired')
    DEFAULT 'available',
  daily_rate DECIMAL(10,2) NOT NULL,
  location VARCHAR(120),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  car_id INT NOT NULL,
  user_id INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status ENUM('booked','ongoing','completed','cancelled')
    DEFAULT 'booked',
  total_price DECIMAL(10,2) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_bookings_car
    FOREIGN KEY (car_id) REFERENCES cars(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_bookings_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,

  INDEX idx_bookings_car (car_id),
  INDEX idx_bookings_user (user_id),
  INDEX idx_bookings_dates (start_date, end_date)
) ENGINE=InnoDB;

INSERT INTO users (full_name, email, phone, role, password) VALUES
('Amelia Stone', 'amelia.stone@gmail.com', '+44 7700 900001', 'customer', '$2b$10$dummyhash'),
('Oliver Reed', 'oliver.reed@gmail.com', '+44 7700 900002', 'customer', '$2b$10$dummyhash'),
('Priya Patel', 'priya.patel@gmail.com', '+44 7700 900003', 'customer', '$2b$10$dummyhash');

INSERT INTO cars (make, model, year, status, daily_rate, location) VALUES
('Tesla', 'Model 3', 2023, 'available', 145.00, 'London Central'),
('BMW', '3 Series', 2022, 'booked', 120.00, 'London Central'),
('Toyota', 'RAV4', 2021, 'maintenance', 95.00, 'Heathrow'),
('Audi', 'A4', 2020, 'available', 110.00, 'London Central'),
('Mercedes', 'C-Class', 2022, 'booked', 130.00, 'Heathrow');

INSERT INTO bookings (car_id, user_id, start_date, end_date, status, total_price) VALUES
(1, 1, CURRENT_DATE + INTERVAL 1 DAY, CURRENT_DATE + INTERVAL 3 DAY, 'booked', 435.00),
(2, 2, CURRENT_DATE - INTERVAL 1 DAY, CURRENT_DATE + INTERVAL 2 DAY, 'ongoing', 360.00),
(3, 3, CURRENT_DATE - INTERVAL 5 DAY, CURRENT_DATE - INTERVAL 2 DAY, 'completed', 285.00),
(4, 2, CURRENT_DATE, CURRENT_DATE + INTERVAL 1 DAY, 'booked', 110.00),
(5, 1, CURRENT_DATE - INTERVAL 3 DAY, CURRENT_DATE + INTERVAL 1 DAY, 'ongoing', 520.00);

CREATE OR REPLACE VIEW dashboard_metrics AS
SELECT
  (SELECT COUNT(*) FROM cars) AS total_cars,
  (SELECT COUNT(*) FROM cars WHERE status = 'available') AS cars_available,
  (SELECT COUNT(*) FROM cars WHERE status = 'booked') AS cars_booked_flag,
  (SELECT COUNT(*) FROM cars WHERE status = 'maintenance') AS cars_in_maintenance,
  (SELECT COUNT(DISTINCT car_id)
     FROM bookings
     WHERE status IN ('booked','ongoing')
       AND end_date >= CURRENT_DATE()) AS cars_with_active_bookings,
  (SELECT COUNT(*) FROM bookings WHERE status IN ('booked','ongoing')) AS active_bookings,
  (SELECT COUNT(*) FROM bookings WHERE status = 'cancelled') AS cancelled_bookings,
  (SELECT COUNT(*) FROM bookings WHERE DATE(start_date) = CURRENT_DATE()) AS pickups_today,
  (SELECT COUNT(*) FROM bookings WHERE DATE(end_date) = CURRENT_DATE()
     AND status IN ('booked','ongoing')) AS returns_today,
  (SELECT COUNT(*) FROM users WHERE role = 'customer') AS total_customers,
  (SELECT COALESCE(SUM(total_price), 0)
     FROM bookings
     WHERE status = 'completed'
       AND start_date >= DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01')) AS revenue_this_month;
