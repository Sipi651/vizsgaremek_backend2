-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Gép: 192.168.255.103
-- Létrehozás ideje: 2026. Ápr 28. 11:04
-- Kiszolgáló verziója: 11.4.7-MariaDB-log
-- PHP verzió: 8.4.11

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
CREATE DATABASE IF NOT EXISTS `kutyadb` DEFAULT CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci;
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
  `szerepkor` tinyint(4) NOT NULL DEFAULT 0 COMMENT '0 = felhasználó, 1 = admin',
  `telefonszam` varchar(30) NOT NULL,
  `teljes_nev` varchar(255) NOT NULL,
  `letrehozva` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- A tábla adatainak kiíratása `felhasznalok`
--

INSERT INTO `felhasznalok` (`id`, `email`, `jelszo`, `szerepkor`, `telefonszam`, `teljes_nev`, `letrehozva`) VALUES
(2, 'felhasznalo@gmail.com', '$2b$10$9D9MY9DftGKUoeQaus0.tey1xWn..n2pvGpNmiPWSSYvhOoD9j9Du', 0, '0612345678', 'Teszt Elek', '2026-04-17 07:42:54'),
(5, 'admin@gmail.com', '$2b$10$15pUvmcxDonrWjSRGjdqPeUISEbI3M/dqj1JAxEcddiz3FyZhG4pK', 1, '0612345678', 'Admin Elek', '2026-04-17 07:47:35');

-- --------------------------------------------------------

--
-- Tábla szerkezet ehhez a táblához `jelentesek`
--

DROP TABLE IF EXISTS `jelentesek`;
CREATE TABLE `jelentesek` (
  `id` int(10) UNSIGNED NOT NULL,
  `tipus` enum('elveszett','talalt') NOT NULL,
  `felhasznalo_id` int(10) UNSIGNED NOT NULL,
  `nev` varchar(100) NOT NULL,
  `kutyafajta_id` int(10) UNSIGNED NOT NULL,
  `nem` enum('kan','szuka') NOT NULL,
  `szin` varchar(100) NOT NULL,
  `utolso_latas_hely` varchar(255) NOT NULL,
  `utolso_latas_ido` datetime NOT NULL,
  `leiras` text DEFAULT NULL,
  `kep` varchar(255) NOT NULL,
  `letrehozva` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- A tábla adatainak kiíratása `jelentesek`
--

INSERT INTO `jelentesek` (`id`, `tipus`, `felhasznalo_id`, `nev`, `kutyafajta_id`, `nem`, `szin`, `utolso_latas_hely`, `utolso_latas_ido`, `leiras`, `kep`, `letrehozva`) VALUES
(2, 'elveszett', 2, 'DJ', 8, 'kan', 'vörös', 'Debrecen, Piac utca', '2026-04-02 21:35:40', 'Barátságos, idegenektől nagyon fél. 8 éves tacskó, nagyon várjuk haza.', 'd37b2d3b-b67f-427d-ac6d-efc3ccbd14bf.jfif', '2026-04-02 21:35:40'),
(3, 'elveszett', 2, 'Dönci', 15, 'szuka', 'vörös, fehér mellkasi folttal', 'Miskolc, Győri kapu', '2026-04-02 21:45:23', 'Nagyon emberbarát. Vak és süket, ezért nem tud hazajutni egyedül.', 'dönci.jfif', '2026-04-02 21:45:23'),
(4, 'elveszett', 2, 'Szuszu', 15, 'szuka', 'vörös-fehér', 'Pécs, Kertváros', '2026-04-02 21:59:48', '5 éves szuka kutyus, nagyon szeretjük és várjuk haza.', 'szuszu.jfif', '2026-04-02 21:59:48'),
(5, 'talalt', 2, 'Icuripicuri', 6, 'szuka', 'vörös, fehér foltokkal', 'Győr, Belváros', '2026-04-02 22:03:19', '1 éves, nagyon szerethető kiskutyus. Nagyon várjuk haza.', 'd37b2d3b-b67f-427d-ac6d-efc3ccbd14bf.jfif', '2026-04-02 22:03:19'),
(6, 'talalt', 2, 'Bundi', 1, 'kan', 'fehér', 'Budapest, XI. kerület', '2026-04-02 22:09:10', '6 hónapos fehér kiskutyusunk eltűnt. Kérjük, ha valaki látja, jelezze nekünk.', 'bundi.jfif', '2026-04-02 22:09:10');

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
(5, 'Angol bulldog'),
(6, 'Beagle'),
(9, 'Border collie'),
(12, 'Boxer'),
(15, 'Corgi'),
(11, 'Dobermann'),
(4, 'Francia bulldog'),
(3, 'Golden retriever'),
(13, 'Husky'),
(1, 'Labrador retriever'),
(2, 'Német juhász'),
(10, 'Rottweiler'),
(14, 'Shih tzu'),
(8, 'Tacskó'),
(7, 'Uszkár');

--
-- Indexek a kiírt táblákhoz
--

--
-- A tábla indexei `felhasznalok`
--
ALTER TABLE `felhasznalok`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_felhasznalok_email` (`email`);

--
-- A tábla indexei `jelentesek`
--
ALTER TABLE `jelentesek`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_jelentesek_felhasznalo_id` (`felhasznalo_id`),
  ADD KEY `idx_jelentesek_kutyafajta_id` (`kutyafajta_id`),
  ADD KEY `idx_jelentesek_tipus` (`tipus`);

--
-- A tábla indexei `kutyafajtak`
--
ALTER TABLE `kutyafajtak`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_kutyafajtak_megnevezes` (`megnevezes`);

--
-- A kiírt táblák AUTO_INCREMENT értéke
--

--
-- AUTO_INCREMENT a táblához `felhasznalok`
--
ALTER TABLE `felhasznalok`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- AUTO_INCREMENT a táblához `jelentesek`
--
ALTER TABLE `jelentesek`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT a táblához `kutyafajtak`
--
ALTER TABLE `kutyafajtak`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- Megkötések a kiírt táblákhoz
--

--
-- Megkötések a táblához `jelentesek`
--
ALTER TABLE `jelentesek`
  ADD CONSTRAINT `fk_jelentesek_felhasznalo` FOREIGN KEY (`felhasznalo_id`) REFERENCES `felhasznalok` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_jelentesek_kutyafajta` FOREIGN KEY (`kutyafajta_id`) REFERENCES `kutyafajtak` (`id`) ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
