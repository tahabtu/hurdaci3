import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, TokenPayload } from '../middleware/jwt.js';

const router = Router();

// Login
router.post('/login', async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Kullanıcı adı ve şifre gerekli' });
    }

    try {
        const result = await pool.query(
            'SELECT id, tenant_id, username, password_hash, name FROM users WHERE username = $1',
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Geçersiz kullanıcı adı veya şifre' });
        }

        const user = result.rows[0];

        // Debug logging - remove after fixing
        console.log('Login attempt for:', username);
        console.log('User found:', user ? 'YES' : 'NO');
        console.log('Password hash exists:', user?.password_hash ? 'YES' : 'NO');
        console.log('Password hash length:', user?.password_hash?.length || 0);
        console.log('Stored hash:', user?.password_hash);

        // Generate a test hash to compare
        const testHash = await bcrypt.hash('admin123', 12);
        console.log('Test hash for admin123:', testHash);

        const validPassword = await bcrypt.compare(password, user.password_hash);
        console.log('Password valid:', validPassword);

        if (!validPassword) {
            return res.status(401).json({ error: 'Geçersiz kullanıcı adı veya şifre' });
        }

        const tokenPayload: TokenPayload = {
            id: user.id,
            tenant_id: user.tenant_id,
            username: user.username,
            name: user.name
        };

        const accessToken = generateAccessToken(tokenPayload);
        const refreshToken = generateRefreshToken(tokenPayload);

        // Store refresh token in database
        await pool.query(
            'UPDATE users SET refresh_token = $1 WHERE id = $2',
            [refreshToken, user.id]
        );

        res.json({
            user: {
                id: user.id,
                tenant_id: user.tenant_id,
                username: user.username,
                name: user.name
            },
            accessToken,
            refreshToken
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Giriş hatası' });
    }
});

// Refresh Token
router.post('/refresh', async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token gerekli' });
    }

    try {
        const decoded = verifyRefreshToken(refreshToken);

        // Verify refresh token exists in database
        const result = await pool.query(
            'SELECT id, tenant_id, username, name, refresh_token FROM users WHERE id = $1',
            [decoded.id]
        );

        if (result.rows.length === 0 || result.rows[0].refresh_token !== refreshToken) {
            return res.status(401).json({ error: 'Geçersiz refresh token' });
        }

        const user = result.rows[0];
        const tokenPayload: TokenPayload = {
            id: user.id,
            tenant_id: user.tenant_id,
            username: user.username,
            name: user.name
        };

        const newAccessToken = generateAccessToken(tokenPayload);
        const newRefreshToken = generateRefreshToken(tokenPayload);

        // Update refresh token in database
        await pool.query(
            'UPDATE users SET refresh_token = $1 WHERE id = $2',
            [newRefreshToken, user.id]
        );

        res.json({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
        });
    } catch (error) {
        console.error('Refresh token error:', error);
        res.status(401).json({ error: 'Geçersiz veya süresi dolmuş token' });
    }
});

// Logout
router.post('/logout', async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    try {
        if (refreshToken) {
            // Invalidate refresh token
            await pool.query(
                'UPDATE users SET refresh_token = NULL WHERE refresh_token = $1',
                [refreshToken]
            );
        }
        res.json({ message: 'Çıkış başarılı' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Çıkış hatası' });
    }
});

export default router;
