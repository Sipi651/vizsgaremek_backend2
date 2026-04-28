require('dotenv').config()

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs/promises");


const app = express();
const PORT = process.env.PORT;

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN= process.env.JWT_EXPIRES_IN;
const COOKIE_NAME = "auth_token";

const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: ["http://localhost:5173","https://gazdivar.netlify.app"],
    credentials: true
}));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadPath = path.join(__dirname, "uploads");

        try {
            await fs.mkdir(uploadPath, { recursive: true });
            cb(null, uploadPath);
        } catch (error) {
            cb(error, uploadPath);
        }
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        cb(null, safeName);
    }
});

const upload = multer({ storage });

function createToken(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            teljes_nev: user.teljes_nev,
            szerepkor: user.szerepkor
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

function sendAuthCookie(res, token) {
    res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: 'none',
        secure: true,
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
}

async function auth(req, res, next) {
    const token = req.cookies.auth_token;

    if (!token) {
        return res.status(401).json({ message: "Nincs bejelentkezve" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        const [rows] = await db.query(
            "SELECT id, email, teljes_nev, telefonszam, szerepkor FROM felhasznalok WHERE id = ?",
            [decoded.id]
        );

        if (!rows.length) {
            return res.status(401).json({ message: "Érvénytelen munkamenet" });
        }

        req.user = rows[0];
        next();
    } catch (error) {
        console.log("AUTH HIBA:", error);
        return res.status(401).json({ message: "Érvénytelen token" });
    }
}
function adminOnly(req, res, next) {
    if (Number(req.user.szerepkor) !== 1) {
        return res.status(403).json({ message: "Nincs jogosultságod ehhez" });
    }
    next();
}

function mapNemToDb(nem) {
    if (String(nem) === "0") return "kan";
    if (String(nem) === "1") return "szuka";
    if (nem === "kan" || nem === "szuka") return nem;
    return null;
}

function formatDatetimeLocalToMysql(ido) {
    if (!ido) return null;
    if (typeof ido !== "string") return null;

    
    if (ido.includes("T")) {
        return `${ido.replace("T", " ")}:00`;
    }

    return ido;
}



// Alap teszt
app.get("/", (req, res) => {
    res.json({ message: "GazdiVár backend működik" });
});

// Regisztráció
app.post("/regisztracio", async (req, res) => {
    const { email, teljes_nev, jelszo, telefonszam } = req.body;

    if (!email || !teljes_nev || !jelszo || !telefonszam) {
        return res.status(400).json({ message: "Hiányzó bemeneti adatok" });
    }

    try {
        const [exists] = await db.query(
            "SELECT id FROM felhasznalok WHERE email = ?",
            [email]
        );

        if (exists.length) {
            return res.status(400).json({ message: "Ez az email már foglalt" });
        }

        const hash = await bcrypt.hash(jelszo, 10);

        const [result] = await db.query(
            `INSERT INTO felhasznalok (email, teljes_nev, jelszo, telefonszam, szerepkor)
             VALUES (?, ?, ?, ?, 0)`,
            [email, teljes_nev, hash, telefonszam]
        );

        return res.status(201).json({
            message: "Sikeres regisztráció",
            id: result.insertId
        });
    } catch (error) {
        console.log("REGISZTRÁCIÓ HIBA:", error);
        return res.status(500).json({ message: "Szerverhiba" });
    }
});

// Belépés
app.post("/belepes", async (req, res) => {
    const { teljes_nevVagyEmail, jelszo } = req.body;

    console.log("BELEPES BODY:", req.body);

    if (!teljes_nevVagyEmail || !jelszo) {
        return res.status(400).json({ message: "Hiányzó bemeneti adatok" });
    }

    try {
        const [rows] = await db.query(
            "SELECT * FROM felhasznalok WHERE email = ? OR teljes_nev = ? LIMIT 1",
            [teljes_nevVagyEmail, teljes_nevVagyEmail]
        );

        console.log("LEKERT USER:", rows);

        if (!rows.length) {
            return res.status(401).json({ message: "Hibás email/felhasználónév vagy jelszó" });
        }

        const user = rows[0];

        console.log("USER JELSZO:", user.jelszo);
        console.log("JWT_SECRET:", JWT_SECRET);

        if (!user.jelszo) {
            return res.status(500).json({ message: "A felhasználó jelszava hiányzik az adatbázisból" });
        }

        const joJelszo = await bcrypt.compare(jelszo, user.jelszo);
        console.log("JO JELSZO?:", joJelszo);

        if (!joJelszo) {
            return res.status(401).json({ message: "Hibás email/felhasználónév vagy jelszó" });
        }

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                teljes_nev: user.teljes_nev,
                szerepkor: user.szerepkor
            },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.cookie("auth_token", token, {
            httpOnly: true,
            sameSite: 'none',
            secure: true,
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return res.status(200).json({
            message: "Sikeres bejelentkezés",
            user: {
                id: user.id,
                email: user.email,
                teljes_nev: user.teljes_nev,
                telefonszam: user.telefonszam,
                szerepkor: user.szerepkor
            }
        });
    } catch (error) {
        console.log("BELÉPÉS HIBA TELJESEN:", error);
        console.log("HIBA MESSAGE:", error.message);
        console.log("HIBA CODE:", error.code);
        return res.status(500).json({ message: "Szerverhiba" });
    }
});

// Kijelentkezés
app.post("/kijelentkezes", (req, res) => {
    res.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        sameSite: 'none',
        secure: true
    } );
    return res.status(200).json({ message: "Sikeres kijelentkezés" });
});

// Adataim
app.get("/adataim", auth, async (req, res) => {
    return res.json(req.user);
});

// Kutyafajták
app.get("/kutyafajtak", auth, async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT id, megnevezes FROM kutyafajtak ORDER BY megnevezes ASC"
        );

        return res.json(rows);
    } catch (error) {
        console.log("KUTYAFAJTÁK HIBA:", error);
        return res.status(500).json({ message: "Szerverhiba" });
    }
});

// Új kutya / új jelentés létrehozása
app.post("/kutyak", auth, upload.single("kep"), async (req, res) => {
    const { nev, kutyafajta_id, nem, leiras, tipus, szin, hely, ido } = req.body;
    const kep = req.file ? req.file.filename : null;

    const dbNem = mapNemToDb(nem);
    const mysqlIdo = formatDatetimeLocalToMysql(ido);

    if (!nev || !kutyafajta_id || dbNem === null || !tipus || !szin || !hely || !ido || !kep) {
        return res.status(400).json({ message: "Hiányzó bemeneti adatok" });
    }

    if (tipus !== "elveszett" && tipus !== "talalt") {
        return res.status(400).json({ message: "Érvénytelen típus" });
    }

    const dbTipus = tipus === "talalt" ? "talalt" : "elveszett";

    try {
        const [result] = await db.query(
            `INSERT INTO jelentesek
            (tipus, felhasznalo_id, nev, kutyafajta_id, nem, szin, utolso_latas_hely, utolso_latas_ido, leiras, kep, letrehozva)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                dbTipus,
                req.user.id,
                nev,
                kutyafajta_id,
                dbNem,
                szin,
                hely,
                mysqlIdo,
                leiras || null,
                kep
            ]
        );

        return res.status(201).json({
            message: "Sikeres kutya felvitel",
            id: result.insertId
        });
    } catch (error) {
        console.log("KUTYA FELTÖLTÉS HIBA:", error);
        return res.status(500).json({ message: "Szerverhiba" });
    }
});

// Összes kutya
app.get("/kutyak", auth, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                j.id,
                j.tipus,
                j.nev,
                j.nem,
                j.szin,
                j.utolso_latas_hely AS hely,
                j.utolso_latas_ido AS ido,
                j.leiras,
                j.kep,
                j.letrehozva,
                j.felhasznalo_id,
                k.megnevezes AS kutyafajta_megnevezes,
                f.teljes_nev AS gazda_nev,
                f.email AS gazda_email,
                f.telefonszam AS gazda_telefonszam
            FROM jelentesek j
            LEFT JOIN kutyafajtak k ON j.kutyafajta_id = k.id
            LEFT JOIN felhasznalok f ON j.felhasznalo_id = f.id
            ORDER BY j.id DESC
        `);

        return res.json(rows);
    } catch (error) {
        console.log("ÖSSZES KUTYA HIBA:", error);
        return res.status(500).json({ message: "Szerverhiba" });
    }
});

// Elveszett kutyák
app.get("/kutyak/elveszett", auth, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                j.id,
                j.nev,
                j.nem,
                j.szin,
                j.utolso_latas_hely AS eltunes_helye,
                j.utolso_latas_ido AS eltunes_ideje,
                j.leiras,
                j.kep,
                j.letrehozva,
                k.megnevezes AS kutyafajta_megnevezes,
                f.teljes_nev AS gazda_nev,
                f.email AS gazda_email,
                f.telefonszam AS gazda_telefonszam
            FROM jelentesek j
            LEFT JOIN kutyafajtak k ON j.kutyafajta_id = k.id
            LEFT JOIN felhasznalok f ON j.felhasznalo_id = f.id
            WHERE j.tipus = 'elveszett'
            ORDER BY j.id DESC
        `);

        return res.json(rows);
    } catch (error) {
        console.log("ELVESZETT KUTYÁK HIBA:", error);
        return res.status(500).json({ message: "Szerverhiba" });
    }
});

// Talált kutyák
app.get("/kutyak/talalt", auth, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                j.id,
                j.nev,
                j.nem,
                j.szin,
                j.utolso_latas_hely AS megtalalas_helye,
                j.utolso_latas_ido AS megtalalas_ideje,
                j.leiras,
                j.kep,
                j.letrehozva,
                k.megnevezes AS kutyafajta_megnevezes,
                f.teljes_nev AS gazda_nev,
                f.email AS gazda_email,
                f.telefonszam AS gazda_telefonszam
            FROM jelentesek j
            LEFT JOIN kutyafajtak k ON j.kutyafajta_id = k.id
            LEFT JOIN felhasznalok f ON j.felhasznalo_id = f.id
            WHERE j.tipus = 'talalt'
            ORDER BY j.id DESC
        `);

        return res.json(rows);
    } catch (error) {
        console.log("TALÁLT KUTYÁK HIBA:", error);
        return res.status(500).json({ message: "Szerverhiba" });
    }
});

// Saját kutyáim
app.get("/en-kutyaim", auth, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                j.id,
                j.tipus,
                j.nev,
                j.nem,
                j.szin,
                j.utolso_latas_hely AS hely,
                j.utolso_latas_ido AS ido,
                j.leiras,
                j.kep,
                j.letrehozva,
                k.megnevezes AS kutyafajta_megnevezes
            FROM jelentesek j
            LEFT JOIN kutyafajtak k ON j.kutyafajta_id = k.id
            WHERE j.felhasznalo_id = ?
            ORDER BY j.id DESC
        `, [req.user.id]);

        return res.json(rows);
    } catch (error) {
        console.log("SAJÁT KUTYÁK HIBA:", error);
        return res.status(500).json({ message: "Szerverhiba" });
    }
});

// Kutya törlése
app.delete("/kutyak/:id", auth, async (req, res) => {
    const { id } = req.params;

    try {
        const [rows] = await db.query(
            "SELECT * FROM jelentesek WHERE id = ? AND felhasznalo_id = ?",
            [id, req.user.id]
        );

        if (!rows.length) {
            return res.status(404).json({ message: "Nem található a bejegyzés" });
        }

        const kutya = rows[0];

        await db.query(
            "DELETE FROM jelentesek WHERE id = ? AND felhasznalo_id = ?",
            [id, req.user.id]
        );

        if (kutya.kep) {
            const filePath = path.join(__dirname, "uploads", kutya.kep);
            try {
                await fs.unlink(filePath);
            } catch (error) {
                console.log("KÉP TÖRLÉS HIBA:", error.message);
            }
        }

        return res.json({ message: "Sikeres törlés" });
    } catch (error) {
        console.log("TÖRLÉS HIBA:", error);
        return res.status(500).json({ message: "Szerverhiba" });
    }
});

// Email módosítás
app.put("/email", auth, async (req, res) => {
    const { ujEmail } = req.body;

    if (!ujEmail) {
        return res.status(400).json({ message: "Hiányzó email" });
    }

    try {
        const [exists] = await db.query(
            "SELECT id FROM felhasznalok WHERE email = ? AND id != ?",
            [ujEmail, req.user.id]
        );

        if (exists.length) {
            return res.status(400).json({ message: "Ez az email már foglalt" });
        }

        await db.query(
            "UPDATE felhasznalok SET email = ? WHERE id = ?",
            [ujEmail, req.user.id]
        );

        return res.json({ message: "Email sikeresen módosítva" });
    } catch (error) {
        console.log("EMAIL MÓDOSÍTÁS HIBA:", error);
        return res.status(500).json({ message: "Szerverhiba" });
    }
});

//   Telefonszám modositása
app.post("/telefon-modositas", auth, async (req, res) => {
    const { telefon } = req.body;

    if (!telefon) {
        return res.status(400).json({ message: "Hiányzó telefonszám" });
    }

    try {
        const token = req.cookies.auth_token;

        if (!token) {
            return res.status(401).json({ message: "Nincs bejelentkezve" });
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        await db.query(
            "UPDATE felhasznalok SET telefonszam = ? WHERE id = ?",
            [telefon, decoded.id]
        );

        return res.status(200).json({ message: "Telefonszám sikeresen módosítva" });
    } catch (error) {
        console.log("TELEFONSZÁM MÓDOSÍTÁS HIBA:", error);
        return res.status(500).json({ message: "Szerverhiba" });
    }
});

// Jelszó módosítás
app.put("/jelszo", auth, async (req, res) => {
    const { jelenlegiJelszo, ujJelszo } = req.body;

    if (!jelenlegiJelszo || !ujJelszo) {
        return res.status(400).json({ message: "Hiányzó bemeneti adatok" });
    }

    try {
        const [rows] = await db.query(
            "SELECT jelszo FROM felhasznalok WHERE id = ?",
            [req.user.id]
        );

        if (!rows.length) {
            return res.status(404).json({ message: "Felhasználó nem található" });
        }

        const ok = await bcrypt.compare(jelenlegiJelszo, rows[0].jelszo);

        if (!ok) {
            return res.status(400).json({ message: "A jelenlegi jelszó hibás" });
        }

        const hash = await bcrypt.hash(ujJelszo, 10);

        await db.query(
            "UPDATE felhasznalok SET jelszo = ? WHERE id = ?",
            [hash, req.user.id]
        );

        return res.json({ message: "Jelszó sikeresen módosítva" });
    } catch (error) {
        console.log("JELSZÓ MÓDOSÍTÁS HIBA:", error);
        return res.status(500).json({ message: "Szerverhiba" });
    }
});

// Fiók törlése
app.delete("/fiokom", auth, async (req, res) => {
    try {
        const [kutyak] = await db.query(
            "SELECT kep FROM jelentesek WHERE felhasznalo_id = ?",
            [req.user.id]
        );

        for (const kutya of kutyak) {
            if (kutya.kep) {
                const filePath = path.join(__dirname, "uploads", kutya.kep);
                try {
                    await fs.unlink(filePath);
                } catch (error) {
                    console.log("KÉP TÖRLÉS HIBA:", error.message);
                }
            }
        }

        await db.query("DELETE FROM jelentesek WHERE felhasznalo_id = ?", [req.user.id]);
        await db.query("DELETE FROM felhasznalok WHERE id = ?", [req.user.id]);

        res.clearCookie(COOKIE_NAME);
        return res.json({ message: "Fiók sikeresen törölve" });
    } catch (error) {
        console.log("FIÓK TÖRLÉS HIBA:", error);
        return res.status(500).json({ message: "Szerverhiba" });
    }
});

// Admin - felhasználók lekérése
app.get("/felhasznalok", auth, adminOnly, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT id, email, teljes_nev, telefonszam, szerepkor
            FROM felhasznalok
            ORDER BY id DESC
        `);

        return res.json(rows);
    } catch (error) {
        console.log("FELHASZNÁLÓK HIBA:", error);
        return res.status(500).json({ message: "Szerverhiba" });
    }
});

// Admin - felhasználó törlése
app.delete("/felhasznalo/:id", auth, adminOnly, async (req, res) => {
    const { id } = req.params;

    try {
        const [users] = await db.query(
            "SELECT id FROM felhasznalok WHERE id = ?",
            [id]
        );

        if (!users.length) {
            return res.status(404).json({ message: "Felhasználó nem található" });
        }

        const [kutyak] = await db.query(
            "SELECT kep FROM jelentesek WHERE felhasznalo_id = ?",
            [id]
        );

        for (const kutya of kutyak) {
            if (kutya.kep) {
                const filePath = path.join(__dirname, "uploads", kutya.kep);
                try {
                    await fs.unlink(filePath);
                } catch (error) {
                    console.log("KÉP TÖRLÉS HIBA:", error.message);
                }
            }
        }

        await db.query("DELETE FROM jelentesek WHERE felhasznalo_id = ?", [id]);
        await db.query("DELETE FROM felhasznalok WHERE id = ?", [id]);

        return res.json({ message: "Felhasználó sikeresen törölve" });
    } catch (error) {
        console.log("ADMIN TÖRLÉS HIBA:", error);
        return res.status(500).json({ message: "Szerverhiba" });
    }
});

// Admin - szerepkör módosítás
app.put("/szerepkor/:id", auth, adminOnly, async (req, res) => {
    const { id } = req.params;
    const { szerepkor } = req.body;

    if (szerepkor === undefined) {
        return res.status(400).json({ message: "Hiányzó szerepkör" });
    }

    try {
        await db.query(
            "UPDATE felhasznalok SET szerepkor = ? WHERE id = ?",
            [Number(szerepkor), id]
        );

        return res.json({ message: "Szerepkör sikeresen módosítva" });
    } catch (error) {
        console.log("SZEREPKÖR HIBA:", error);
        return res.status(500).json({ message: "Szerverhiba" });
    }
});

app.listen(PORT, () => {
    console.log(`Szerver fut: http://$:${PORT}`);
});