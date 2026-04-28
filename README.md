# 🐕GazdiVár Backend🐕

## 🎯A projektről

A GazdiVár egy közösségi webalkalmazás backendje, amely az elveszett és talált kutyák bejelentését és kezelését teszi lehetővé.  
A rendszer célja, hogy a felhasználók gyorsan és egyszerűen feltölthessék a kutyákkal kapcsolatos információkat, és segítsék azok hazatalálását.

---

## 🙋‍♂️Készítette

- [Sipos Árpád Dávid](https://github.com/Sipi651)
- [Szabó Bálint](https://github.com/szabobalint17)

---

## 🛠️Fejlesztési környezet

- Node.js  
- Express  
- MySQL  
- JWT  
- Multer  
- bcrypt  

---

## 🗄️Adatbázis

A backend a `kutyadb` adatbázist használja.

### Táblák

#### felhasznalok
- id  
- email  
- teljes_nev  
- jelszo  
- telefonszam  
- szerepkor  

#### kutyafajtak
- id  
- megnevezes  

#### jelentesek
- id  
- tipus  
- felhasznalo_id  
- nev  
- kutyafajta_id  
- nem  
- szin  
- utolso_latas_hely  
- utolso_latas_ido  
- leiras  
- kep  
- letrehozva  

---

## 🎰Backend

A backend egyetlen index.js fájlban valósul meg, amely tartalmazza:
- az Express szerver konfigurációját
- az adatbázis kapcsolatot
- az autentikációt
- a végpontokat
- a fájlkezelést

A rendszer REST API-ként működik, amely JSON válaszokat ad vissza a frontend számára.

---

## 📂Mappa struktúra

```bash
Backend/
 ├── uploads/
 ├── index.js
 ├── package.json
 └── README.md
```

---

## 📦Használt package-ek
- express
- cors
- cookie-parser
- mysql2
- bcrypt
- jsonwebtoken
- multer
- node-email-verifier
- nodemon

```json

{
  "name": "kutya_backend",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "dev": "nodemon ."
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "description": "",
  "dependencies": {
    "bcrypt": "^6.0.0",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.6",
    "express": "^5.2.1",
    "jsonwebtoken": "^9.0.3",
    "multer": "^2.1.1",
    "mysql": "^2.18.1",
    "mysql2": "^3.20.0",
    "node-email-verifier": "^4.0.0",
    "nodemon": "^3.1.14"
  }
}

```

---

## 🔒 Biztonsági funkciók

- Jelszavak bcrypt-tel hashelve
- JWT token alapú autentikáció
- HTTP-only cookie használata
- Auth middleware védi a végpontokat
- Admin jogosultság ellenőrzés

--- 

## ✨Middleware-ek

### ❄Auth middleware

- token ellenőrzés
- felhasználó betöltése

### ♨Admin middleware

-  szerepkör ellenőrzés

---

## 📸Képfeltöltés

- Multer használata
- A képek az uploads mappába kerülnek

---

## 🌐Végpontok

### Alap

| Művelet | HTTP | Végpont | Leírás |
|--------|------|--------|-------|
| Teszt | GET | `/` | A backend működésének ellenőrzése, visszaad egy alap üzenetet |

---

### Auth

| Művelet | HTTP | Végpont | Leírás |
|--------|------|--------|-------|
| Regisztráció | POST | `/regisztracio` | Új felhasználó létrehozása  |
| Bejelentkezés | POST | `/belepes` | Felhasználó hitelesítése és bejelentkeztetése |
| Kijelentkezés | POST | `/kijelentkezes` | A felhasználó kijelentkezése, token törlése |
| Saját adatok | GET | `/adataim` | A bejelentkezett felhasználó adatainak lekérése |

---

### Kutyafajták

| Művelet | HTTP | Végpont | Leírás |
|--------|------|--------|-------|
| Lekérés | GET | `/kutyafajtak` | Az összes kutyafajta lekérése |

---

### Kutyák

| Művelet | HTTP | Végpont | Leírás |
|--------|------|--------|-------|
| Feltöltés | POST | `/kutyak` | Új kutya bejelentése (elveszett vagy talált) képpel együtt |
| Összes | GET | `/kutyak` | Az összes bejelentett kutya lekérése |
| Elveszett | GET | `/kutyak/elveszett` | Csak az elveszett kutyák listázása |
| Talált | GET | `/kutyak/talalt` | Csak a talált kutyák listázása |
| Saját | GET | `/en-kutyaim` | A bejelentkezett felhasználó saját bejelentései |
| Törlés | DELETE | `/kutyak/:id` | Egy kutya bejelentés törlése (csak saját) |

---

### Profil

| Művelet | HTTP | Végpont | Leírás |
|--------|------|--------|-------|
| Email módosítás | PUT | `/email` | A felhasználó email címének módosítása |
| Telefonszám módosítás | POST | `/telefon-modositas` | A felhasználó telefonszámának frissítése |
| Jelszó módosítás | PUT | `/jelszo` | A felhasználó jelszavának módosítása |
| Fiók törlés | DELETE | `/fiokom` | A felhasználó teljes fiókjának törlése |

---

### Admin

| Művelet | HTTP | Végpont | Leírás |
|--------|------|--------|-------|
| Felhasználók | GET | `/felhasznalok` | Az összes felhasználó listázása (admin jogosultság szükséges) |
| Törlés | DELETE | `/felhasznalo/:id` | Egy felhasználó törlése (admin) |
| Szerepkör | PUT | `/szerepkor/:id` | Felhasználó szerepkörének módosítása (admin) |

---

## 📨Példa válaszok

### ✅Siker

```json
{
  "message": "Sikeres művelet"
}

```
### ❌Hiba‼️

```json
{
  "message": "Szerverhiba"
}
```

--- 

## 🔗Telepítés és futtatás

```bash
npm install
node index.js
```

---

## 🖥️Tesztelés

- Postman használatával
- Böngészőből
- Frontend alkalmazással

### Teszt URL:
- https://nodejs311.dszcbaross.edu.hu/

---

## 🌠Továbbfejlesztési lehetőségek

- Jelszó erősség ellenőrzés
- Értesítési rendszer
- Több kép feltöltése egy kutyához
- Jelentések szerkesztésének lehetősége
- Admin felület bővítése 
- Rate limiting bevezetése a túlterhelés és spam ellen
- Naplózás (logging) implementálása a hibák és események követésére
- Külön staging és production környezet kialakítása

---

## 📲Használt eszközök

- VS Code
- Node.js
- MySQL
- Postman
- GitHub

---


## 🔐 Megjegyzés

A JWT_SECRET jelenleg a kódban van megadva, éles környezetben érdemes lenne `.env` fájlba helyezni biztonsági okokból.


---

© 2026 GazdiVár. Minden jog fenntartva.
