SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

CREATE DATABASE IF NOT EXISTS `kutyadb` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `kutyadb`;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `jelentesek`;
DROP TABLE IF EXISTS `kutyak`;
DROP TABLE IF EXISTS `kutyafajtak`;
DROP TABLE IF EXISTS `felhasznalok`;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE `felhasznalok` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `email` varchar(150) NOT NULL,
  `jelszo` varchar(255) NOT NULL,
  `szerepkor` tinyint(4) NOT NULL,
  `telefonszam` varchar(255) NOT NULL,
  `teljes_nev` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `felhasznalok_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `kutyafajtak` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `megnevezes` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `kutyak` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `nev` varchar(100) NOT NULL,
  `kutyafajta_id` int(10) UNSIGNED NOT NULL,
  `nem` tinyint(4) NOT NULL,
  `leiras` text NOT NULL,
  `letrehozva` datetime NOT NULL,
  `kep` varchar(255) NOT NULL,
  `felhasznalo_id` int(10) UNSIGNED NOT NULL,
  `status` int(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `kutyak_kutyafajta_id_index` (`kutyafajta_id`),
  KEY `kutyak_felhasznalo_id_index` (`felhasznalo_id`),
  CONSTRAINT `kutyak_felhasznalo_id_foreign`
    FOREIGN KEY (`felhasznalo_id`) REFERENCES `felhasznalok` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `kutyak_kutyafajta_id_foreign`
    FOREIGN KEY (`kutyafajta_id`) REFERENCES `kutyafajtak` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `jelentesek` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `tipus` varchar(50) NOT NULL,
  `felhasznalo_id` int(10) UNSIGNED NOT NULL,
  `nev` varchar(100) NOT NULL,
  `kutyafajta_id` int(10) UNSIGNED NOT NULL,
  `nem` tinyint(4) NOT NULL,
  `szin` varchar(100) NOT NULL,
  `utolso_latas_hely` varchar(255) NOT NULL,
  `utolso_latas_ido` datetime NOT NULL,
  `leiras` text NOT NULL,
  `kep` varchar(255) NOT NULL,
  `letrehozva` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `jelentesek_felhasznalo_id_index` (`felhasznalo_id`),
  KEY `jelentesek_kutyafajta_id_index` (`kutyafajta_id`),
  CONSTRAINT `jelentesek_felhasznalo_id_foreign`
    FOREIGN KEY (`felhasznalo_id`) REFERENCES `felhasznalok` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `jelentesek_kutyafajta_id_foreign`
    FOREIGN KEY (`kutyafajta_id`) REFERENCES `kutyafajtak` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `felhasznalok` (`id`, `email`, `jelszo`, `szerepkor`, `telefonszam`, `teljes_nev`) VALUES
(1, 'asd@asd.com', '1234', 0, '061234567', 'kiss pista'),
(2, 'a1@gmail.com', '$2b$10$9D9MY9DftGKUoeQaus0.tey1xWn..n2pvGpNmiPWSSYvhOoD9j9Du', 1, 'a', 'a'),
(8, 's@gamil.com', '$2b$10$DH0eD3IIWeEdgagFIHqVTO/fjAk5S4XkvIQt8pZv3WWiF1049/dfi', 0, 's', 's');

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

INSERT INTO `kutyak` (`id`, `nev`, `kutyafajta_id`, `nem`, `leiras`, `letrehozva`, `kep`, `felhasznalo_id`, `status`) VALUES
(1, 'szofi', 12, 1, 'assdfgg', '2026-03-05 12:36:48', 'img.jpg', 1, 0),
(4, 'DJ', 8, 0, 'Szine: vörös, barátságos, idegenektől nagyon fél. 
8éves tacskó nagyon féltjük és várjuk haza!', '2026-04-02 21:35:40', '1775158540125', 2, 0),
(5, 'Dönci', 15, 1, 'Szine: vörös és van egy fehér folt a mellkasán, nagyon ember barát. érzék szervei gátolják a haza jutásban (vak és süket) de várjuk haza sok szerettel mert féltjük nagyon!', '2026-04-02 21:45:23', '1775159123064', 2, 0),
(6, 'Szuszu', 15, 1, 'Szine: vörös és fehér foltok vannak rajta. Nagyon szeretjük várjuk haza. 5 éves szuka kutyus.', '2026-04-02 21:59:48', '1775159988398', 2, 0),
(7, 'Icuripicuri', 6, 1, 'Icuripicuri egy 1 éves nagyon szerethető kiskutyus. Szine: vörös fehér foltokkal. Nagyon szeretjük és várjuk haza.', '2026-04-02 22:03:19', '1775160199822.jpg', 2, 0),
(8, 'Bundi', 1, 0, '6 hónapos fehér kiskutyusunk eltűnt. Keressük éjt nappal, de sehol nem találjuk. Kérjük ha valaki látja jelezze nekünk.', '2026-04-02 22:09:10', '1775160550228', 2, 0);

ALTER TABLE `felhasznalok`
  AUTO_INCREMENT = 9;

ALTER TABLE `kutyafajtak`
  AUTO_INCREMENT = 16;

ALTER TABLE `kutyak`
  AUTO_INCREMENT = 13;

ALTER TABLE `jelentesek`
  AUTO_INCREMENT = 1;

COMMIT;