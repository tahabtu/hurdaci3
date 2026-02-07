import { Router, Response } from 'express';
import pool from '../db.js';
import { AuthRequest } from '../index.js';

const router = Router();

// Get all materials
router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const result = await pool.query(
            'SELECT * FROM materials WHERE tenant_id = $1 ORDER BY item_name',
            [req.user!.tenant_id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get materials error:', error);
        res.status(500).json({ error: 'Veriler alınamadı' });
    }
});

// Get single material
router.get('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const result = await pool.query(
            'SELECT * FROM materials WHERE id = $1 AND tenant_id = $2',
            [req.params.id, req.user!.tenant_id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Malzeme bulunamadı' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get material error:', error);
        res.status(500).json({ error: 'Veri alınamadı' });
    }
});

// Create material
router.post('/', async (req: AuthRequest, res: Response) => {
    const { item_name, item_code, item_type, unit_of_measure, description } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO materials (tenant_id, item_name, item_code, item_type, unit_of_measure, description)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [req.user!.tenant_id, item_name, item_code, item_type, unit_of_measure || 'kg', description]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create material error:', error);
        res.status(500).json({ error: 'Malzeme oluşturulamadı' });
    }
});

// Update material
router.put('/:id', async (req: AuthRequest, res: Response) => {
    const { item_name, item_code, item_type, unit_of_measure, description } = req.body;

    try {
        const result = await pool.query(
            `UPDATE materials SET item_name = $1, item_code = $2, item_type = $3, unit_of_measure = $4, description = $5
       WHERE id = $6 AND tenant_id = $7 RETURNING *`,
            [item_name, item_code, item_type, unit_of_measure, description, req.params.id, req.user!.tenant_id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Malzeme bulunamadı' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update material error:', error);
        res.status(500).json({ error: 'Malzeme güncellenemedi' });
    }
});

// Delete material
router.delete('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const result = await pool.query(
            'DELETE FROM materials WHERE id = $1 AND tenant_id = $2 RETURNING id',
            [req.params.id, req.user!.tenant_id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Malzeme bulunamadı' });
        }
        res.json({ message: 'Malzeme silindi' });
    } catch (error) {
        console.error('Delete material error:', error);
        res.status(500).json({ error: 'Malzeme silinemedi' });
    }
});

export default router;
