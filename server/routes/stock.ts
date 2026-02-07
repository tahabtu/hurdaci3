import { Router, Response } from 'express';
import pool from '../db.js';
import { AuthRequest } from '../index.js';

const router = Router();

// Get stock summary by material
router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT m.id as material_id, m.item_name as material_name, m.item_code, m.unit_of_measure,
              COALESCE(SUM(s.quantity), 0) as total_quantity
       FROM materials m
       LEFT JOIN stock s ON m.id = s.material_id AND s.tenant_id = $1
       WHERE m.tenant_id = $1
       GROUP BY m.id, m.item_name, m.item_code, m.unit_of_measure
       ORDER BY m.item_name`,
            [req.user!.tenant_id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get stock error:', error);
        res.status(500).json({ error: 'Veriler alınamadı' });
    }
});

// Get stock detail by material (with partner breakdown)
router.get('/material/:materialId', async (req: AuthRequest, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT s.*, p.name as partner_name, m.item_name as material_name, m.item_code, m.unit_of_measure
       FROM stock s
       JOIN partners p ON s.partner_id = p.id
       JOIN materials m ON s.material_id = m.id
       WHERE s.tenant_id = $1 AND s.material_id = $2 AND s.quantity > 0
       ORDER BY s.last_updated ASC`,
            [req.user!.tenant_id, req.params.materialId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get stock detail error:', error);
        res.status(500).json({ error: 'Veriler alınamadı' });
    }
});

export default router;
