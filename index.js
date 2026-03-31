const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const emailValidator = require('node-email-verifier');
const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');

// config
const PORT = 3000;
const HOST = 'localhost';
const JWT_SECRET = 'nagyon_titkos_egyedi_jelszo';
const JWT_EXPIRES_IN = '7d';
const COOKIE_NAME = 'auth_token';
//cookie be állitás
const COOKIE_OPTS = {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 nap
}

//adatbázis be állitás
const db = mysql.createPool({
    host: 'localhost',
    port: '3306',
    user: 'root',
    password: '',
    database: 'kutyadb'
})

// app
const app = express();


app.use(express.json())
app.use(cookieParser())
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}))
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))


// --- Middleware ---
function auth(req, res, next) {
    const token = req.cookies[COOKIE_NAME];
    if (!token) {
        return res.status(409).json({ message: "nincs be jelentkezve :( " })
    }
    try {
        req.user = JWT.verify(token, JWT_SECRET)
        next();
    } catch (error) {
        return res.status(410).json({ message: "nem érvényes a token" })
    }
}

function isAdmin(req, res, next) {
    if (!req.user.admin) {
        return res.status(411).json({ message: "Nincs megfelelő jogosultság" })
    }
    next();
}


const storage = multer.diskStorage({
    destination: "./uploads/",
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname))
    }
})

const upload = multer({ storage })

// VÉGPONTOK

//bementi adatok ellenőrzése
app.post('/regisztracio', async (req, res) => {
    const { email, teljes_nev, jelszo, telefonszam } = req.body;

    console.log(req.body);
    if (!email || !teljes_nev || !jelszo || !telefonszam) {  // ezt tedd visza majd  ---->   ||  !(szerepkor === 0 || szerepkor === 1)
        console.log(!email, !teljes_nev, !jelszo, !telefonszam);
        return res.status(400).json({ message: "hiányzó bemeneti adatok :( " })
    }

    try {
        //elenőrizük hogy valós email cim e
        const isValid = await emailValidator(email)
        if (!isValid) {
            return res.status(401).json({ message: "nem valós emailt adtál meg (ne verj átt) :(" })
        }

        //ellenőrízni emailt, hogy egyedi-e
        const emailSQL = 'SELECT * FROM felhasznalok WHERE email = ? '
        const [exists] = await db.query(emailSQL, [email]);
        if (exists.length) {
            return res.status(402).json({ message: "az email cím vagy név már foglalt :( " })
        }

        //regisztráció elvégzése
        const hash = await bcrypt.hash(jelszo, 10);
        const regisztracioSQL = 'INSERT INTO felhasznalok (email, teljes_nev, jelszo, szerepkor) VALUES (?,?,?,?)'
        const [result] = await db.query(regisztracioSQL, [email, teljes_nev, hash, 0])

        //válasz a felhasználónak
        return res.status(200).json({
            message: "sikeress regisztráció jár a keksz :D",
            id: result.insertId
        })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Szerverhiba, sajnálom :(" })
    }
})

app.get("/adataim", (req, res) => {
    const token = req.cookies[COOKIE_NAME];

    if (!token) {
      return res.status(401).json({ message: "Nincs bejelentkezve (hiányzik a token)" });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      res.status(200).json(decoded);
    } catch (err) {
      res.status(401).json({ message: "Érvénytelen token" });
    }
  });

app.post('/belepes', async (req, res) => {
    const { teljes_nevVagyEmail, jelszo } = req.body;

    if (!teljes_nevVagyEmail || !jelszo) {
        return res.status(400).json({ message: "Hiányos adatok" });
    }

    try {
        const sql = `
            SELECT * FROM felhasznalok 
            WHERE email = ? OR teljes_nev = ?
        `;

        const [rows] = await db.query(sql, [teljes_nevVagyEmail, teljes_nevVagyEmail]);

        if (!rows.length) {
            return res.status(401).json({ message: "Hibás belépési adatok" });
        }

        const user = rows[0];

        const ok = await bcrypt.compare(jelszo, user.jelszo);

        if (!ok) {
            return res.status(401).json({ message: "Hibás belépési adatok" });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, teljes_nev: user.teljes_nev, szerepkor: user.szerepkor },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
        res.status(200).json({ message: "Sikeres belépés" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Szerverhiba" });
    }
});

// VÉDETT
app.post("/kijelentkezes", (req, res) => {
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: true,
      sameSite: "none"
    });
    res.status(200).json({ message: "Sikeres kijelentkezés" });
  });
/*app.post('/kijelentkezes', auth, async (req, res) => {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    res.status(200).json({ message: "sikeres kijelentkezés! Jár a keksz :D " })
})*/

// védet utvonal
app.get('/adataim', auth, async (req, res) => {
    res.status(200).json(req.user)
})

/*
app.get('/kutyak', auth, async (req, res) => {
    res.status(200).json(req.user)
})*/

app.get('/kutyak', auth, async (req, res) => {
    try {
        const sql = 'SELECT * FROM `kutyak`';
        const [rows] = await db.query(sql)
        return res.status(200).json(rows)
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "szerverhiba" })
    }
})

// VÉDETT
app.put('/email', auth, async (req, res) => {
    const { ujEmail } = req.body;
    if (!ujEmail) {
        req.status(401).json({ message: "az új email megadása kötelező. :) " })
    }
    const isValid = await emailValidator(ujEmail)
    if (!isValid) {
        return res.status(402).json({ message: "az email formátum nem megfelelő. :( " })
    }
    try {
        const sql1 = 'SELECT * FROM felhasznalok WHERE email = ?'
        const [result] = await db.query(sql1, [ujEmail]);
        if (result.length) {
            return res.status(402).json({ message: "az email cim már foglalat. :( " })
        }
        const sql2 = 'UPDATE felhasznalok SET email = ? WHERE id = ?'
        await db.query(sql2, [ujEmail, req.user.id]);
        return res.status(200).json({ message: "sikeres modositás :D" })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Szerever hiba bocsi :(  " })
    }
})

app.put('/teljes_nev', auth, async (req, res) => {
    const { ujteljes_nev } = req.body;
    if (!ujteljes_nev) {
        req.status(401).json({ message: "az új teljes_nev megadása kötelező. :) " })
    }
    try {
        const sql2 = 'UPDATE felhasznalok SET teljes_nev = ? WHERE id = ?'
        await db.query(sql2, [ujteljes_nev, req.user.id]);
        return res.status(200).json({ message: "sikeres modositás :D" })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Szerever hiba bocsi :(  " })
    }
})

app.delete('/fiokom', auth, async (req, res) => {
    try {
        const sql = 'DELETE FROM felhasznalok WHERE id = ?'
        await db.query(sql, [req.user.id])
        res.clearCookie(COOKIE_NAME, { path: '/' });
        res.status(200).json({ message: "sikeres törlés! Jár a keksz :D " })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "szreverhiba bocsi :( " })
    }

})

app.get('/felhasznalok', auth, isAdmin, async (req, res) => {
    try {
        const sql = 'SELECT id, email, felhasznalonev, admin FROM felhasznalok';
        const [rows] = await db.query(sql);
        return res.status(200).json(rows)
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "szerverhiba" })
    }
})

app.post('/kepek', auth, upload.single('kep_neve'), async (req, res) => {
    const image = req.file ? req.file.filename : null;
    const user = req.user;
    if (image == null) {
        return res.status(400).json({ message: "Hiányzó bemeneti adatok" })
    }
    try {
        const sql = 'INSERT INTO kepek (felhasznalo_id, kep_neve) VALUES (?,?)';
        await db.query(sql, [user.id, zsuri_id, image]);
        return res.status(200).json({ message: 'Sikeres felvitel' })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "szerverhiba" })
    }
})

app.delete('/kepek', auth, async (req, res) => {
    const { kep_neve } = req.body;
    const felhasznalo_id = req.user.id;
    try {
        const sql = 'DELETE FROM kepek WHERE kep_neve = ? AND felhasznalo_id = ?'
        const [result] = await db.query(sql, [kep_neve, felhasznalo_id]);
        if (!result.affectedRows) {
            return res.status(404).json({ message: "nincs ilyen kép" })
        }
        const filePath = path.join(__dirname, 'uploads', kep_neve)
        await fs.unlink(filePath); // kép törlése
        res.status(200).json({ message: 'Sikeres törlés' })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "szerverhiba" })
    }
})

app.put('/szerepkor/:felhasznalo_id', auth, isAdmin, async (req, res) => {
    const { felhasznalo_id } = req.params
    const { szerepkor } = req.body
    if (szerepkor == undefined) {
        return res.status(400).json({ message: 'a szerepkork megadása kötelező' })
    }
    try {
        const sql = 'UPDATE felhasznalok SET admin = ? WHERE id = ?';
        await db.query(sql, [szerepkor, felhasznalo_id])
        return res.status(200).json('Sikeres módositás')
    } catch (error) {
        res.status(500).json({ message: "szerverhiba" })
    }
})

app.delete('/felhasznalo/:id', auth, isAdmin, async (req, res) => {
    const { id } = req.params
    try {
        const sql = 'DELETE FROM felhasznalok WHERE id=?';
        await db.query(sql, [id])
        return res.status(200).json({ message: 'Sikeres törlés' })
    } catch (error) {
        res.status(500).json({ message: "szerverhiba" })
    }
})



// SZERVER INDITÁS
app.listen(PORT, HOST, () => {
    console.log(`API fut: http://${HOST}:${PORT}/`);
})