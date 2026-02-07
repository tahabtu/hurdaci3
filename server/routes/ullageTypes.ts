import { Router, Response } from 'express';
import pool from '../db.js';
import { AuthRequest } from '../index.js';

const router = Router();

// Get all ullage types
router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const result = await pool.query(
            'SELECT * FROM ullage_types WHERE tenant_id = $1 ORDER BY name',
            [req.user!.tenant_id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get ullage types error:', error);
        res.status(500).json({ error: 'Veriler alınamadı' });
    }
});

// Create ullage type
router.post('/', async (req: AuthRequest, res: Response) => {
    const { name, description } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO ullage_types (tenant_id, name, description)
       VALUES ($1, $2, $3) RETURNING *`,
            [req.user!.tenant_id, name, description]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create ullage type error:', error);
        res.status(500).json({ error: 'Fire tipi oluşturulamadı' });
    }
});

// Update ullage type
router.put('/:id', async (req: AuthRequest, res: Response) => {
    const { name, description } = req.body;

    try {
        const result = await pool.query(
            `UPDATE ullage_types SET name = $1, description = $2
       WHERE id = $3 AND tenant_id = $4 RETURNING *`,
            [name, description, req.params.id, req.user!.tenant_id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Fire tipi bulunamadı' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update ullage type error:', error);
        res.status(500).json({ error: 'Fire tipi güncellenemedi' });
    }
});

// Delete ullage type
router.delete('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const result = await pool.query(
            'DELETE FROM ullage_types WHERE id = $1 AND tenant_id = $2 RETURNING id',
            [req.params.id, req.user!.tenant_id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Fire tipi bulunamadı' });
        }
        res.json({ message: 'Fire tipi silindi' });
    } catch (error) {
        console.error('Delete ullage type error:', error);
        res.status(500).json({ error: 'Fire tipi silinemedi' });
    }
});

export default router;
