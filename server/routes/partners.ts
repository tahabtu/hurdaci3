import { Router, Response } from 'express';
import pool from '../db.js';
import { AuthRequest } from '../index.js';

const router = Router();

// Get all partners
router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const result = await pool.query(
            'SELECT * FROM partners WHERE tenant_id = $1 ORDER BY name',
            [req.user!.tenant_id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get partners error:', error);
        res.status(500).json({ error: 'Veriler alınamadı' });
    }
});

// Get partners by type
router.get('/type/:type', async (req: AuthRequest, res: Response) => {
    try {
        const { type } = req.params;
        const result = await pool.query(
            `SELECT * FROM partners WHERE tenant_id = $1 AND type = $2 ORDER BY name`,
            [req.user!.tenant_id, type]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get partners by type error:', error);
        res.status(500).json({ error: 'Veriler alınamadı' });
    }
});

// Get single partner
router.get('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const result = await pool.query(
            'SELECT * FROM partners WHERE id = $1 AND tenant_id = $2',
            [req.params.id, req.user!.tenant_id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Partner bulunamadı' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get partner error:', error);
        res.status(500).json({ error: 'Veri alınamadı' });
    }
});

// Create partner
router.post('/', async (req: AuthRequest, res: Response) => {
    const { name, type, phone, email, address } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO partners (tenant_id, name, type, phone, email, address)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [req.user!.tenant_id, name, type, phone, email, address]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create partner error:', error);
        res.status(500).json({ error: 'Partner oluşturulamadı' });
    }
});

// Update partner
router.put('/:id', async (req: AuthRequest, res: Response) => {
    const { name, type, phone, email, address } = req.body;

    try {
        const result = await pool.query(
            `UPDATE partners SET name = $1, type = $2, phone = $3, email = $4, address = $5
       WHERE id = $6 AND tenant_id = $7 RETURNING *`,
            [name, type, phone, email, address, req.params.id, req.user!.tenant_id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Partner bulunamadı' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update partner error:', error);
        res.status(500).json({ error: 'Partner güncellenemedi' });
    }
});

// Delete partner
router.delete('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const result = await pool.query(
            'DELETE FROM partners WHERE id = $1 AND tenant_id = $2 RETURNING id',
            [req.params.id, req.user!.tenant_id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Partner bulunamadı' });
        }
        res.json({ message: 'Partner silindi' });
    } catch (error) {
        console.error('Delete partner error:', error);
        res.status(500).json({ error: 'Partner silinemedi' });
    }
});

export default router;
