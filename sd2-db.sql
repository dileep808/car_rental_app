-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: db
-- Generation Time: Dec 17, 2025 at 01:55 PM
-- Server version: 9.5.0
-- PHP Version: 8.3.26

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `sd2-db`
--

-- --------------------------------------------------------

--
-- Table structure for table `bookings`
--

CREATE TABLE `bookings` (
  `id` int NOT NULL,
  `car_id` int NOT NULL,
  `user_id` int NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `status` enum('booked','ongoing','completed','cancelled') DEFAULT 'booked',
  `total_price` decimal(10,2) DEFAULT '0.00',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `bookings`
--

INSERT INTO `bookings` (`id`, `car_id`, `user_id`, `start_date`, `end_date`, `status`, `total_price`, `created_at`, `updated_at`) VALUES
(1, 1, 1, '2025-12-14', '2025-12-16', 'booked', 435.00, '2025-12-13 19:46:17', '2025-12-13 19:46:17'),
(2, 2, 2, '2025-12-12', '2025-12-15', 'ongoing', 360.00, '2025-12-13 19:46:17', '2025-12-13 19:46:17'),
(3, 3, 3, '2025-12-08', '2025-12-11', 'completed', 285.00, '2025-12-13 19:46:17', '2025-12-13 19:46:17'),
(4, 4, 2, '2025-12-13', '2025-12-14', 'booked', 110.00, '2025-12-13 19:46:17', '2025-12-13 19:46:17'),
(5, 5, 1, '2025-12-10', '2025-12-14', 'ongoing', 520.00, '2025-12-13 19:46:17', '2025-12-13 19:46:17');

-- --------------------------------------------------------

--
-- Table structure for table `cars`
--

CREATE TABLE `cars` (
  `id` int NOT NULL,
  `make` varchar(100) NOT NULL,
  `model` varchar(100) NOT NULL,
  `year` year NOT NULL,
  `status` enum('available','booked','maintenance','retired') DEFAULT 'available',
  `daily_rate` decimal(10,2) NOT NULL,
  `location` varchar(120) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `cars`
--

INSERT INTO `cars` (`id`, `make`, `model`, `year`, `status`, `daily_rate`, `location`, `created_at`) VALUES
(1, 'Tesla', 'Model 3', '2023', 'available', 145.00, 'London Central', '2025-12-13 19:46:17'),
(2, 'BMW', '3 Series', '2022', 'booked', 120.00, 'London Central', '2025-12-13 19:46:17'),
(3, 'Toyota', 'RAV4', '2021', 'maintenance', 95.00, 'Heathrow', '2025-12-13 19:46:17'),
(4, 'Audi', 'A4', '2020', 'available', 110.00, 'London Central', '2025-12-13 19:46:17'),
(5, 'Mercedes', 'C-Class', '2022', 'booked', 130.00, 'Heathrow', '2025-12-13 19:46:17');

-- --------------------------------------------------------

--
-- Stand-in structure for view `dashboard_metrics`
-- (See below for the actual view)
--
CREATE TABLE `dashboard_metrics` (
`total_cars` bigint
,`cars_available` bigint
,`cars_booked_flag` bigint
,`cars_in_maintenance` bigint
,`cars_with_active_bookings` bigint
,`active_bookings` bigint
,`cancelled_bookings` bigint
,`pickups_today` bigint
,`returns_today` bigint
,`total_customers` bigint
,`revenue_this_month` decimal(32,2)
);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int NOT NULL,
  `full_name` varchar(150) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `role` enum('customer','agent') DEFAULT 'customer',
  `password` varchar(255) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `full_name`, `email`, `phone`, `role`, `password`, `created_at`) VALUES
(1, 'Amelia Stone', 'amelia.stone@gmail.com', '+44 7700 900001', 'customer', '$2b$10$dummyhash', '2025-12-13 19:46:17'),
(2, 'Oliver Reed', 'oliver.reed@gmail.com', '+44 7700 900002', 'customer', '$2b$10$dummyhash', '2025-12-13 19:46:17'),
(3, 'Priya Patel', 'priya.patel@gmail.com', '+44 7700 900003', 'customer', '$2b$10$dummyhash', '2025-12-13 19:46:17'),
(4, 'Nagarjuna Pasupula', 'demo@example.com', 'demo@example.com', 'agent', '$2a$10$ZxO77xuj7BM.4NxShZ7VteGm3TJFkAAj8Mc7zfvwQnRrjfnvGytry', '2025-12-13 19:57:50'),
(5, 'Nagarjuna Pasupula', 'demo1@example.com', 'demo1@example.com', 'agent', '$2a$10$KUlKBrwd2TWDDduo6syr6u6J9/0j70Q9MNSbSatJc9/LxhsW0Lj.i', '2025-12-17 13:49:45');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `bookings`
--
ALTER TABLE `bookings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_bookings_car` (`car_id`),
  ADD KEY `idx_bookings_user` (`user_id`),
  ADD KEY `idx_bookings_dates` (`start_date`,`end_date`);

--
-- Indexes for table `cars`
--
ALTER TABLE `cars`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `bookings`
--
ALTER TABLE `bookings`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `cars`
--
ALTER TABLE `cars`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

-- --------------------------------------------------------

--
-- Structure for view `dashboard_metrics`
--
DROP TABLE IF EXISTS `dashboard_metrics`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`%` SQL SECURITY DEFINER VIEW `dashboard_metrics`  AS SELECT (select count(0) from `cars`) AS `total_cars`, (select count(0) from `cars` where (`cars`.`status` = 'available')) AS `cars_available`, (select count(0) from `cars` where (`cars`.`status` = 'booked')) AS `cars_booked_flag`, (select count(0) from `cars` where (`cars`.`status` = 'maintenance')) AS `cars_in_maintenance`, (select count(distinct `bookings`.`car_id`) from `bookings` where ((`bookings`.`status` in ('booked','ongoing')) and (`bookings`.`end_date` >= curdate()))) AS `cars_with_active_bookings`, (select count(0) from `bookings` where (`bookings`.`status` in ('booked','ongoing'))) AS `active_bookings`, (select count(0) from `bookings` where (`bookings`.`status` = 'cancelled')) AS `cancelled_bookings`, (select count(0) from `bookings` where (cast(`bookings`.`start_date` as date) = curdate())) AS `pickups_today`, (select count(0) from `bookings` where ((cast(`bookings`.`end_date` as date) = curdate()) and (`bookings`.`status` in ('booked','ongoing')))) AS `returns_today`, (select count(0) from `users` where (`users`.`role` = 'customer')) AS `total_customers`, (select coalesce(sum(`bookings`.`total_price`),0) from `bookings` where ((`bookings`.`status` = 'completed') and (`bookings`.`start_date` >= date_format(curdate(),'%Y-%m-01')))) AS `revenue_this_month` ;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `bookings`
--
ALTER TABLE `bookings`
  ADD CONSTRAINT `fk_bookings_car` FOREIGN KEY (`car_id`) REFERENCES `cars` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_bookings_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
