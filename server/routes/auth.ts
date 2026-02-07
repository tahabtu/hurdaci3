import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// Login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const result = await pool.query(
            'SELECT id, tenant_id, username, name FROM users WHERE username = $1 AND password = $2',
            [username, password]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Geçersiz kullanıcı adı veya şifre' });
        }

        res.json({ user: result.rows[0] });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Giriş hatası' });
    }
});

export default router;
