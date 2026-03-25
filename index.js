const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const mysql = require('mysql2/promise')
const bcrypt = require('bcrypt')
const JWT = require('jsonwebtoken')
const emailValidator = require('node-email-verifier');

// config
const PORT = 3000;
const HOST = 'localhost';
const JWT_SECRET = 'nagyon_titkos_egyedi_jelszo'
const JWT_EXPIRES_IN = '7d'
const COOKIE_NAME = 'auth_token'


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

function auth(req, res, next) {
    const token = req.cookies[COOKIE_NAME];
    if (!token) {
        return res.status(409).json({ message: "nincs be jelentkezve :( " })
    }
    try {
        req.user = JWT.verify(token, JWT_SECRET)
        next();
    } catch (error) {
        return res.status(410).json({ message: "" })
    }
}



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

app.post('/belepes', async (req, res) => {
    const { email, jelszo } = req.body;
    if (!email || !jelszo) {
        return res.status(400).json({ message: "Hiányos bementi adatok (hiányzik valami barátom)  :(" })
    }
    try {
        const sql1 = 'SELECT * FROM felhasznalok WHERE email = ?'
        const [rows1] = await db.query(sql1, [email])
        if (rows1.length) {
           const user = rows1[0];
           const hashJelszo = user.jelszo;
            const ok = bcrypt.compare(jelszo, hashJelszo) // felhasznalánév vagy emailhez tartózó jelszó)
            if (!ok) {
                return res.status(403).json({ message: "rossz jelszót adtál meg! :(  " })
            }
            const token = JWT.sign(
                { id: user.id, email: user.email, teljes_nev: user.teljes_nev, szerepkor: user.szerepkor },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRES_IN }
            )
            res.cookie(COOKIE_NAME, token, COOKIE_OPTS)
            res.status(200).json({ message: "sikeress belépés! jár a keksz :D " })
        } else {
            return res.status(401).json({ message: " ezzel az emailel még nem regisztráltak :( " })
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Szerverhiba sajnálom :( " })
    }
})

// VÉDETT
app.post('/kijelentkezes', auth, async (req, res) => {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    res.status(200).json({ message: "sikeres kijelentkezés! Jár a keksz :D " })
})

// védet utvonal
app.get('/adataim', auth, async (req, res) => {
    res.status(200).json(req.user)
})

/*
app.get('/kutyak', auth, async (req, res) => {
    res.status(200).json(req.user)
})*/
/*
app.get('/kutyak', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute("SELECT * FROM kutyak");
        await connection.end();
        res.status(200).json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Valami hiba történt a lekérdezésnél" });
    }
});    */

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
        const sql1 = 'SELECT * FROM felhasznalok WHERE id = ?'
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

// SZERVER INDITÁS
app.listen(PORT, HOST, () => {
    console.log(`API fut: http://${HOST}:${PORT}/`);
})