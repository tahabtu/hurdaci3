import { Router, Response } from 'express';
import pool from '../db.js';
import { AuthRequest } from '../index.js';

const router = Router();

// Get all money transactions
router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT mt.*, p.name as partner_name
       FROM money_transactions mt
       JOIN partners p ON mt.partner_id = p.id
       WHERE mt.tenant_id = $1
       ORDER BY mt.transaction_date DESC`,
            [req.user!.tenant_id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get money transactions error:', error);
        res.status(500).json({ error: 'Veriler alınamadı' });
    }
});

// Get money transactions by partner
router.get('/partner/:partnerId', async (req: AuthRequest, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT * FROM money_transactions
       WHERE tenant_id = $1 AND partner_id = $2
       ORDER BY transaction_date DESC`,
            [req.user!.tenant_id, req.params.partnerId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get partner money transactions error:', error);
        res.status(500).json({ error: 'Veriler alınamadı' });
    }
});

// Create money transaction
router.post('/', async (req: AuthRequest, res: Response) => {
    const { partner_id, type, amount, payment_method, notes } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Create transaction
        const result = await client.query(
            `INSERT INTO money_transactions (tenant_id, partner_id, type, amount, payment_method, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [req.user!.tenant_id, partner_id, type, amount, payment_method, notes]
        );

        // Update partner balance
        // payment = we pay supplier = decrease supplier balance (our debt decreases)
        // receipt = customer pays us = decrease customer balance (their debt decreases)
        const balanceChange = -parseFloat(amount); // Both decrease the balance

        await client.query(
            `UPDATE partners SET balance = balance + $1 WHERE id = $2`,
            [balanceChange, partner_id]
        );

        await client.query('COMMIT');
        res.status(201).json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create money transaction error:', error);
        res.status(500).json({ error: 'İşlem oluşturulamadı' });
    } finally {
        client.release();
    }
});

export default router;
