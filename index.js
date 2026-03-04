const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const mysql = require('mysql2/promise')
const bcrypt = require('bcrypt')
const JWT = require('jsonwebtoken')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const emailValidator = require('node-email-verifier')

// CONFIG
const PORT = 3000;
const JWT_SECRET = 'nagyon_titkos_egyedi_jelszo'
const COOKIE_NAME = 'auth_token'

const COOKIE_OPTS = {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
}

// uploads mappa
if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}

// MULTER
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, './uploads'),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.random()
        cb(null, unique + path.extname(file.originalname))
    }
})

const upload = multer({ storage })

// DB
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'kutya_menhely'
})

const app = express()

app.use(express.json())
app.use(cookieParser())
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}))

app.use('/uploads', express.static(path.join(__dirname, 'uploads')))


// ---------------- MIDDLEWARE ----------------

function auth(req, res, next) {
    const token = req.cookies[COOKIE_NAME]
    if (!token)
        return res.status(401).json({ message: "Be kell jelentkezni" })

    try {
        req.user = JWT.verify(token, JWT_SECRET)
        next()
    } catch {
        return res.status(401).json({ message: "Érvénytelen token" })
    }
}

function adminOnly(req, res, next) {
    if (!req.user.admin)
        return res.status(403).json({ message: "Admin jogosultság szükséges" })

    next()
}


// ---------------- PUBLIKUS VÉGPONTOK ----------------

// REGISZTRÁCIÓ
app.post('/regisztracio', async (req, res) => {

    const { email, jelszo } = req.body

    if (!email || !jelszo)
        return res.status(400).json({ message: "Hiányzó adat" })

    try {
        const isValid = await emailValidator(email)

        if (!isValid)
            return res.status(400).json({ message: "Nem valós email cím" })

        const [exists] = await db.query(
            'SELECT id FROM felhasznalok WHERE email=?',
            [email]
        )

        if (exists.length)
            return res.status(409).json({ message: "Email már foglalt" })

        const hash = await bcrypt.hash(jelszo, 10)

        await db.query(
            'INSERT INTO felhasznalok (email,jelszo,admin) VALUES (?,?,0)',
            [email, hash]
        )

        res.json({ message: "Sikeres regisztráció" })

    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Email ellenőrzési hiba vagy szerver hiba" })
    }
})


// BELÉPÉS
app.post('/belepes', async (req, res) => {

    const { email, jelszo } = req.body

    if (!email || !jelszo)
        return res.status(400).json({ message: "Hiányzó adat" })

    const [rows] = await db.query(
        'SELECT * FROM felhasznalok WHERE email=?',
        [email]
    )

    if (!rows.length)
        return res.status(401).json({ message: "Hibás adatok" })

    const user = rows[0]

    const ok = await bcrypt.compare(jelszo, user.jelszo)

    if (!ok)
        return res.status(401).json({ message: "Hibás adatok" })

    const token = JWT.sign(
        { id: user.id, admin: user.admin },
        JWT_SECRET,
        { expiresIn: '7d' }
    )

    res.cookie(COOKIE_NAME, token, COOKIE_OPTS)

    res.json({ message: "Belépve" })
})


// ÖSSZES ÁLLAT
app.get('/allatok', async (req, res) => {
    const [rows] = await db.query(
        'SELECT * FROM allatok ORDER BY id DESC'
    )
    res.json(rows)
})


// ---------------- VÉDETT ----------------

app.post('/kijelentkezes', auth, (req, res) => {
    res.clearCookie(COOKIE_NAME)
    res.json({ message: "Kijelentkezve" })
})

app.get('/adataim', auth, (req, res) => {
    res.json(req.user)
})

app.put('/email', auth, async (req, res) => {

    const { ujEmail } = req.body

    if (!ujEmail)
        return res.status(400).json({ message: "Hiányzó email" })

    const isValid = await emailValidator(ujEmail)

    if (!isValid)
        return res.status(400).json({ message: "Nem valós email cím" })

    const [exists] = await db.query(
        'SELECT id FROM felhasznalok WHERE email=?',
        [ujEmail]
    )

    if (exists.length)
        return res.status(409).json({ message: "Email már foglalt" })

    await db.query(
        'UPDATE felhasznalok SET email=? WHERE id=?',
        [ujEmail, req.user.id]
    )

    res.json({ message: "Email módosítva" })
})


// ÁLLAT FELTÖLTÉS - VÉDETT
app.post('/allatok', auth, upload.single('kep'), async (req, res) => {

    const { nev, fajta, kor, leiras } = req.body

    if (!nev || !fajta || !kor)
        return res.status(400).json({ message: "Hiányzó adat" })

    const kep = req.file ? req.file.filename : null

    await db.query(
        `INSERT INTO allatok
        (nev,fajta,kor,leiras,kep,user_id)
        VALUES (?,?,?,?,?,?)`,
        [nev, fajta, kor, leiras, kep, req.user.id]
    )

    res.json({ message: "Állat feltöltve" })
})


// ADMIN
app.get('/admin/felhasznalok', auth, adminOnly, async (req, res) => {
    const [rows] = await db.query(
        'SELECT id,email,admin FROM felhasznalok'
    )
    res.json(rows)
})


// ----------------

app.listen(PORT, () => {
    console.log(`API fut: http://localhost:${PORT}`)
})