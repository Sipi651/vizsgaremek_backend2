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

const COOKIE_OPTS = {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000
};

// adatbázis
const db = mysql.createPool({
    host: 'localhost',
    port: '3306',
    user: 'root',
    password: '',
    database: 'kutyadb'
});

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// middleware
function auth(req, res, next) {
    console.log('AUTH LEFUTOTT');
    console.log('COOKIEK:', req.cookies);
    console.log('TOKEN:', req.cookies[COOKIE_NAME]);

    return res.status(418).json({ message: 'AUTH TESZT' });
}

function isAdmin(req, res, next) {
    if (req.user.szerepkor !== 1) {
        return res.status(403).json({ message: 'Nincs megfelelő jogosultság' });
    }
    next();
}

// multer
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// REGISZTRÁCIÓ
app.post('/regisztracio', async (req, res) => {
    const { email, teljes_nev, jelszo, telefonszam } = req.body;

    if (!email || !teljes_nev || !jelszo || !telefonszam) {
        return res.status(400).json({ message: 'Hiányzó bemeneti adatok' });
    }

    try {
        const isValid = await emailValidator(email);
        if (!isValid) {
            return res.status(400).json({ message: 'Nem valós email cím' });
        }

        const [emailExists] = await db.query(
            'SELECT id FROM felhasznalok WHERE email = ?',
            [email]
        );

        if (emailExists.length) {
            return res.status(409).json({ message: 'Az email cím már foglalt' });
        }

        const hash = await bcrypt.hash(jelszo, 10);

        const [result] = await db.query(
            'INSERT INTO felhasznalok (email, teljes_nev, jelszo, telefonszam, szerepkor) VALUES (?, ?, ?, ?, ?)',
            [email, teljes_nev, hash, telefonszam, 0]
        );

        return res.status(201).json({
            message: 'Sikeres regisztráció',
            id: result.insertId
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Szerverhiba' });
    }
});

// BELÉPÉS
app.post('/belepes', async (req, res) => {
    const { teljes_nevVagyEmail, jelszo } = req.body;

    if (!teljes_nevVagyEmail || !jelszo) {
        return res.status(400).json({ message: 'Hiányos adatok' });
    }

    try {
        const [rows] = await db.query(
            `SELECT * FROM felhasznalok WHERE email = ? OR teljes_nev = ?`,
            [teljes_nevVagyEmail, teljes_nevVagyEmail]
        );

        if (!rows.length) {
            return res.status(401).json({ message: 'Hibás belépési adatok' });
        }

        const user = rows[0];
        const ok = await bcrypt.compare(jelszo, user.jelszo);

        if (!ok) {
            return res.status(401).json({ message: 'Hibás belépési adatok' });
        }

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                teljes_nev: user.teljes_nev,
                szerepkor: user.szerepkor
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        res.cookie(COOKIE_NAME, token, COOKIE_OPTS);

        return res.status(200).json({
            message: 'Sikeres belépés',
            user: {
                id: user.id,
                email: user.email,
                teljes_nev: user.teljes_nev,
                szerepkor: user.szerepkor,
                telefonszam: user.telefonszam
            }
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Szerverhiba' });
    }
});

// KIJELENTKEZÉS
app.post('/kijelentkezes', (req, res) => {
    res.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/'
    });

    return res.status(200).json({ message: 'Sikeres kijelentkezés' });
});

// ADATAIM
app.get('/adataim', async (req, res) => {
    console.log('ADATAIM ELÉRVE');
    return res.status(200).json({ message: 'mukodik' });
});

// KUTYÁK LEKÉRÉSE
app.get('/kutyak', auth, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                k.id,
                k.nev,
                k.kutyafajta_id,
                k.nem,
                k.leiras,
                k.letrehozva,
                k.kep,
                k.felhasznalo_id,
                f.megnevezes AS fajta_nev,
                u.teljes_nev AS gazda_nev
            FROM kutyak k
            LEFT JOIN kutyafajtak f ON k.kutyafajta_id = f.id
            LEFT JOIN felhasznalok u ON k.felhasznalo_id = u.id
            ORDER BY k.id DESC
        `);

        return res.status(200).json(rows);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Szerverhiba' });
    }
});

// SAJÁT KUTYÁIM
app.get('/en-kutyaim', auth, async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM kutyak WHERE felhasznalo_id = ? ORDER BY id DESC',
            [req.user.id]
        );

        return res.status(200).json(rows);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Szerverhiba' });
    }
});

// KUTYAFAJTÁK
app.get('/kutyafajtak', auth, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM kutyafajtak ORDER BY megnevezes');
        return res.status(200).json(rows);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Szerverhiba' });
    }
});

// ÚJ KUTYA LÉTREHOZÁSA KÉPFELTÖLTÉSSEL
app.post('/kutyak', auth, upload.single('kep'), async (req, res) => {
    const { nev, kutyafajta_id, nem, leiras } = req.body;
    const kep = req.file ? req.file.filename : null;

    if (!nev || !kutyafajta_id || nem === undefined) {
        return res.status(400).json({ message: 'Hiányzó bemeneti adatok' });
    }

    try {
        const [result] = await db.query(
            `INSERT INTO kutyak (nev, kutyafajta_id, nem, leiras, letrehozva, kep, felhasznalo_id)
             VALUES (?, ?, ?, ?, NOW(), ?, ?)`,
            [nev, kutyafajta_id, nem, leiras || null, kep, req.user.id]
        );

        return res.status(201).json({
            message: 'Sikeres kutya felvitel',
            id: result.insertId
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Szerverhiba' });
    }
});

// KUTYA KÉP CSERÉJE
app.put('/kutyak/:id/kep', auth, upload.single('kep'), async (req, res) => {
    const { id } = req.params;
    const ujKep = req.file ? req.file.filename : null;

    if (!ujKep) {
        return res.status(400).json({ message: 'Nincs feltöltött kép' });
    }

    try {
        const [rows] = await db.query(
            'SELECT * FROM kutyak WHERE id = ? AND felhasznalo_id = ?',
            [id, req.user.id]
        );

        if (!rows.length) {
            return res.status(404).json({ message: 'A kutya nem található' });
        }

        const regiKep = rows[0].kep;

        await db.query(
            'UPDATE kutyak SET kep = ? WHERE id = ? AND felhasznalo_id = ?',
            [ujKep, id, req.user.id]
        );

        if (regiKep) {
            const filePath = path.join(__dirname, 'uploads', regiKep);
            try {
                await fs.unlink(filePath);
            } catch (e) {
                console.log('Régi kép törlése nem sikerült:', e.message);
            }
        }

        return res.status(200).json({ message: 'Kép sikeresen frissítve' });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Szerverhiba' });
    }
});

// KUTYA TÖRLÉSE
app.delete('/kutyak/:id', auth, async (req, res) => {
    const { id } = req.params;

    try {
        const [rows] = await db.query(
            'SELECT * FROM kutyak WHERE id = ? AND felhasznalo_id = ?',
            [id, req.user.id]
        );

        if (!rows.length) {
            return res.status(404).json({ message: 'A kutya nem található' });
        }

        const kutya = rows[0];

        await db.query(
            'DELETE FROM kutyak WHERE id = ? AND felhasznalo_id = ?',
            [id, req.user.id]
        );

        if (kutya.kep) {
            const filePath = path.join(__dirname, 'uploads', kutya.kep);
            try {
                await fs.unlink(filePath);
            } catch (e) {
                console.log('Kép törlése nem sikerült:', e.message);
            }
        }

        return res.status(200).json({ message: 'Kutya sikeresen törölve' });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Szerverhiba' });
    }
});

// EMAIL MÓDOSÍTÁS
app.put('/email', auth, async (req, res) => {
    const { ujEmail } = req.body;

    if (!ujEmail) {
        return res.status(400).json({ message: 'Az új email megadása kötelező' });
    }

    try {
        const isValid = await emailValidator(ujEmail);
        if (!isValid) {
            return res.status(400).json({ message: 'Az email formátum nem megfelelő' });
        }

        const [existing] = await db.query(
            'SELECT id FROM felhasznalok WHERE email = ? AND id <> ?',
            [ujEmail, req.user.id]
        );

        if (existing.length) {
            return res.status(409).json({ message: 'Az email cím már foglalt' });
        }

        await db.query(
            'UPDATE felhasznalok SET email = ? WHERE id = ?',
            [ujEmail, req.user.id]
        );

        return res.status(200).json({ message: 'Sikeres módosítás' });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Szerverhiba' });
    }
});

// TELJES NÉV MÓDOSÍTÁS
app.put('/teljes_nev', auth, async (req, res) => {
    const { ujTeljesNev } = req.body;

    if (!ujTeljesNev) {
        return res.status(400).json({ message: 'Az új teljes név megadása kötelező' });
    }

    try {
        await db.query(
            'UPDATE felhasznalok SET teljes_nev = ? WHERE id = ?',
            [ujTeljesNev, req.user.id]
        );

        return res.status(200).json({ message: 'Sikeres módosítás' });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Szerverhiba' });
    }
});

// JELSZÓ MÓDOSÍTÁS
app.put('/jelszo', auth, async (req, res) => {
    const { jelenlegiJelszo, ujJelszo } = req.body;

    if (!jelenlegiJelszo || !ujJelszo) {
        return res.status(400).json({ message: 'Hiányzó adatok' });
    }

    try {
        const [rows] = await db.query(
            'SELECT jelszo FROM felhasznalok WHERE id = ?',
            [req.user.id]
        );

        if (!rows.length) {
            return res.status(404).json({ message: 'Felhasználó nem található' });
        }

        const ok = await bcrypt.compare(jelenlegiJelszo, rows[0].jelszo);
        if (!ok) {
            return res.status(401).json({ message: 'A jelenlegi jelszó hibás' });
        }

        const hash = await bcrypt.hash(ujJelszo, 10);

        await db.query(
            'UPDATE felhasznalok SET jelszo = ? WHERE id = ?',
            [hash, req.user.id]
        );

        return res.status(200).json({ message: 'Jelszó sikeresen módosítva' });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Szerverhiba' });
    }
});

// FIÓK TÖRLÉSE
app.delete('/fiokom', auth, async (req, res) => {
    try {
        const [dogs] = await db.query(
            'SELECT kep FROM kutyak WHERE felhasznalo_id = ?',
            [req.user.id]
        );

        await db.query('DELETE FROM kutyak WHERE felhasznalo_id = ?', [req.user.id]);
        await db.query('DELETE FROM felhasznalok WHERE id = ?', [req.user.id]);

        for (const kutya of dogs) {
            if (kutya.kep) {
                const filePath = path.join(__dirname, 'uploads', kutya.kep);
                try {
                    await fs.unlink(filePath);
                } catch (e) {
                    console.log('Kép törlése nem sikerült:', e.message);
                }
            }
        }

        res.clearCookie(COOKIE_NAME, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            path: '/'
        });

        return res.status(200).json({ message: 'A fiók sikeresen törölve lett' });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Szerverhiba' });
    }
});

// ADMIN FELHASZNÁLÓK LISTÁZÁSA
app.get('/felhasznalok', auth, isAdmin, async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT id, email, teljes_nev, telefonszam, szerepkor FROM felhasznalok ORDER BY id DESC'
        );

        return res.status(200).json(rows);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Szerverhiba' });
    }
});

// ADMIN SZEREPKÖR MÓDOSÍTÁS
app.put('/szerepkor/:felhasznalo_id', auth, isAdmin, async (req, res) => {
    const { felhasznalo_id } = req.params;
    const { szerepkor } = req.body;

    if (szerepkor === undefined) {
        return res.status(400).json({ message: 'A szerepkör megadása kötelező' });
    }

    try {
        await db.query(
            'UPDATE felhasznalok SET szerepkor = ? WHERE id = ?',
            [szerepkor, felhasznalo_id]
        );

        return res.status(200).json({ message: 'Sikeres módosítás' });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Szerverhiba' });
    }
});

// ADMIN FELHASZNÁLÓ TÖRLÉS
app.delete('/felhasznalo/:id', auth, isAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        const [dogs] = await db.query(
            'SELECT kep FROM kutyak WHERE felhasznalo_id = ?',
            [id]
        );

        await db.query('DELETE FROM kutyak WHERE felhasznalo_id = ?', [id]);
        await db.query('DELETE FROM felhasznalok WHERE id = ?', [id]);

        for (const kutya of dogs) {
            if (kutya.kep) {
                const filePath = path.join(__dirname, 'uploads', kutya.kep);
                try {
                    await fs.unlink(filePath);
                } catch (e) {
                    console.log('Kép törlése nem sikerült:', e.message);
                }
            }
        }

        return res.status(200).json({ message: 'Sikeres törlés' });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Szerverhiba' });
    }
});

app.listen(PORT, HOST, () => {
    console.log(`API fut: http://${HOST}:${PORT}/`);
});