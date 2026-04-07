-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Gép: 127.0.0.1
-- Létrehozás ideje: 2026. Már 05. 12:38
-- Kiszolgáló verziója: 10.4.28-MariaDB
-- PHP verzió: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Adatbázis: `kutyadb`
--
CREATE DATABASE IF NOT EXISTS `kutyadb` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `kutyadb`;

-- --------------------------------------------------------

--
-- Tábla szerkezet ehhez a táblához `felhasznalok`
--

DROP TABLE IF EXISTS `felhasznalok`;
CREATE TABLE `felhasznalok` (
  `id` int(10) UNSIGNED NOT NULL,
  `email` varchar(150) NOT NULL,
  `jelszo` varchar(255) NOT NULL,
  `szerepkor` tinyint(4) NOT NULL,
  `telefonszam` varchar(255) NOT NULL,
  `teljes_nev` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- A tábla adatainak kiíratása `felhasznalok`
--

INSERT INTO `felhasznalok` (`id`, `email`, `jelszo`, `szerepkor`, `telefonszam`, `teljes_nev`) VALUES
(1, 'asd@asd.com', '1234', 1, '061234567', 'kiss pista');

-- --------------------------------------------------------

--
-- Tábla szerkezet ehhez a táblához `kutyafajtak`
--

DROP TABLE IF EXISTS `kutyafajtak`;
CREATE TABLE `kutyafajtak` (
  `id` int(10) UNSIGNED NOT NULL,
  `megnevezes` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- A tábla adatainak kiíratása `kutyafajtak`
--

INSERT INTO `kutyafajtak` (`id`, `megnevezes`) VALUES
(1, 'Labrador retriever'),
(2, 'Német juhász'),
(3, 'Golden retriever'),
(4, 'Francia bulldog'),
(5, 'Angol bulldog'),
(6, 'Beagle'),
(7, 'Uszkár'),
(8, 'Tacskó'),
(9, 'Border collie'),
(10, 'Rottweiler'),
(11, 'Dobermann'),
(12, 'Boxer'),
(13, 'Husky'),
(14, 'Shih tzu'),
(15, 'Corgi');

-- --------------------------------------------------------

--
-- Tábla szerkezet ehhez a táblához `kutyak`
--

DROP TABLE IF EXISTS `kutyak`;
CREATE TABLE `kutyak` (
  `id` int(10) UNSIGNED NOT NULL,
  `nev` varchar(100) NOT NULL,
  `kutyafajata_id` int(10) UNSIGNED NOT NULL,
  `nem` tinyint(4) NOT NULL,
  `leiras` text NOT NULL,
  `letrehozva` datetime NOT NULL,
  `kep` varchar(255) NOT NULL,
  `felhasznalo_id` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- A tábla adatainak kiíratása `kutyak`
--

INSERT INTO `kutyak` (`id`, `nev`, `kutyafajata_id`, `nem`, `leiras`, `letrehozva`, `kep`, `felhasznalo_id`) VALUES
(1, 'szofi', 12, 1, 'assdfgg', '2026-03-05 12:36:48', 'img.jpg', 1);

--
-- Indexek a kiírt táblákhoz
--

--
-- A tábla indexei `felhasznalok`
--
ALTER TABLE `felhasznalok`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `felhasznalok_email_unique` (`email`);

--
-- A tábla indexei `kutyafajtak`
--
ALTER TABLE `kutyafajtak`
  ADD PRIMARY KEY (`id`);

--
-- A tábla indexei `kutyak`
--
ALTER TABLE `kutyak`
  ADD PRIMARY KEY (`id`),
  ADD KEY `kutyak_kutyafajata_id_index` (`kutyafajata_id`),
  ADD KEY `kutyak_felhasznalo_id_index` (`felhasznalo_id`);

--
-- A kiírt táblák AUTO_INCREMENT értéke
--

--
-- AUTO_INCREMENT a táblához `felhasznalok`
--
ALTER TABLE `felhasznalok`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT a táblához `kutyafajtak`
--
ALTER TABLE `kutyafajtak`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT a táblához `kutyak`
--
ALTER TABLE `kutyak`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Megkötések a kiírt táblákhoz
--

--
-- Megkötések a táblához `kutyak`
--
ALTER TABLE `kutyak`
  ADD CONSTRAINT `kutyak_felhasznalo_id_foreign` FOREIGN KEY (`felhasznalo_id`) REFERENCES `felhasznalok` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `kutyak_kutyafajata_id_foreign` FOREIGN KEY (`kutyafajata_id`) REFERENCES `kutyafajtak` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
