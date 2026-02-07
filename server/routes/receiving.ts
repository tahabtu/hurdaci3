import { Router, Response } from 'express';
import pool from '../db.js';
import { AuthRequest } from '../index.js';

const router = Router();

// Get all receiving transactions
router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT rt.*, p.name as partner_name
       FROM receiving_transactions rt
       JOIN partners p ON rt.partner_id = p.id
       WHERE rt.tenant_id = $1
       ORDER BY rt.transaction_date DESC`,
            [req.user!.tenant_id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get receiving transactions error:', error);
        res.status(500).json({ error: 'Veriler alınamadı' });
    }
});

// Get pending transactions (for inspection)
router.get('/pending', async (req: AuthRequest, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT rt.*, p.name as partner_name
       FROM receiving_transactions rt
       JOIN partners p ON rt.partner_id = p.id
       WHERE rt.tenant_id = $1 AND rt.status = 'pending'
       ORDER BY rt.transaction_date DESC`,
            [req.user!.tenant_id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get pending transactions error:', error);
        res.status(500).json({ error: 'Veriler alınamadı' });
    }
});

// Get inspected transactions (for approval)
router.get('/awaiting-approval', async (req: AuthRequest, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT rt.*, p.name as partner_name
       FROM receiving_transactions rt
       JOIN partners p ON rt.partner_id = p.id
       WHERE rt.tenant_id = $1 AND rt.status = 'inspected'
       ORDER BY rt.transaction_date DESC`,
            [req.user!.tenant_id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get awaiting approval transactions error:', error);
        res.status(500).json({ error: 'Veriler alınamadı' });
    }
});

// Get single transaction with items
router.get('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const txResult = await pool.query(
            `SELECT rt.*, p.name as partner_name
       FROM receiving_transactions rt
       JOIN partners p ON rt.partner_id = p.id
       WHERE rt.id = $1 AND rt.tenant_id = $2`,
            [req.params.id, req.user!.tenant_id]
        );

        if (txResult.rows.length === 0) {
            return res.status(404).json({ error: 'İşlem bulunamadı' });
        }

        const itemsResult = await pool.query(
            `SELECT ri.*, m.item_name as material_name, m.unit_of_measure
       FROM receiving_items ri
       JOIN materials m ON ri.material_id = m.id
       WHERE ri.receiving_transaction_id = $1`,
            [req.params.id]
        );

        res.json({
            ...txResult.rows[0],
            items: itemsResult.rows
        });
    } catch (error) {
        console.error('Get transaction error:', error);
        res.status(500).json({ error: 'Veri alınamadı' });
    }
});

// Create receiving transaction with items
router.post('/', async (req: AuthRequest, res: Response) => {
    const { partner_id, doc_date, plate_no_1, plate_no_2, is_reported, logistics_cost, notes, items } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Calculate total amount
        let totalAmount = parseFloat(logistics_cost) || 0;
        for (const item of items) {
            totalAmount += parseFloat(item.gross_weight) * parseFloat(item.unit_price);
        }

        // Insert transaction
        const txResult = await client.query(
            `INSERT INTO receiving_transactions (tenant_id, partner_id, doc_date, plate_no_1, plate_no_2, is_reported, logistics_cost, total_amount, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [req.user!.tenant_id, partner_id, doc_date || null, plate_no_1, plate_no_2, is_reported || false, logistics_cost || 0, totalAmount, notes]
        );

        const transactionId = txResult.rows[0].id;

        // Calculate logistics cost per item (distribute equally)
        const logisticsCostPerItem = (parseFloat(logistics_cost) || 0) / items.length;

        // Insert items
        for (const item of items) {
            const itemTotal = parseFloat(item.gross_weight) * parseFloat(item.unit_price);
            await client.query(
                `INSERT INTO receiving_items (receiving_transaction_id, material_id, gross_weight, unit_price, logistics_cost, total_amount)
         VALUES ($1, $2, $3, $4, $5, $6)`,
                [transactionId, item.material_id, item.gross_weight, item.unit_price, logisticsCostPerItem, itemTotal]
            );
        }

        await client.query('COMMIT');
        res.status(201).json(txResult.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create receiving transaction error:', error);
        console.error('Request body:', JSON.stringify(req.body, null, 2));
        res.status(500).json({ error: 'İşlem oluşturulamadı', details: (error as Error).message });
    } finally {
        client.release();
    }
});

// Approve transaction (update stock and partner balance)
router.post('/:id/approve', async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Get transaction
        const txResult = await client.query(
            `SELECT * FROM receiving_transactions WHERE id = $1 AND tenant_id = $2 AND status = 'inspected'`,
            [req.params.id, req.user!.tenant_id]
        );

        if (txResult.rows.length === 0) {
            return res.status(404).json({ error: 'İşlem bulunamadı veya onay beklenmiyor' });
        }

        const transaction = txResult.rows[0];

        // Get items with net weights
        const itemsResult = await client.query(
            `SELECT * FROM receiving_items WHERE receiving_transaction_id = $1`,
            [req.params.id]
        );

        // Update stock for each item
        for (const item of itemsResult.rows) {
            const netWeight = item.net_weight || item.gross_weight;
            const effectivePrice = item.effective_unit_price || item.unit_price;

            await client.query(
                `INSERT INTO stock (tenant_id, material_id, partner_id, quantity, effective_unit_price)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (tenant_id, material_id, partner_id)
         DO UPDATE SET quantity = stock.quantity + $4, effective_unit_price = $5, last_updated = NOW()`,
                [req.user!.tenant_id, item.material_id, transaction.partner_id, netWeight, effectivePrice]
            );
        }

        // Update partner balance (increase debt to supplier)
        await client.query(
            `UPDATE partners SET balance = balance + $1 WHERE id = $2`,
            [transaction.total_amount, transaction.partner_id]
        );

        // Create automatic money transaction record (payment owed to supplier)
        await client.query(
            `INSERT INTO money_transactions (tenant_id, partner_id, type, amount, payment_method, notes)
       VALUES ($1, $2, 'payment', $3, 'Alım Onayı', $4)`,
            [req.user!.tenant_id, transaction.partner_id, transaction.total_amount, `Alım #${req.params.id} onaylandı`]
        );

        // Update transaction status
        await client.query(
            `UPDATE receiving_transactions SET status = 'approved' WHERE id = $1`,
            [req.params.id]
        );

        await client.query('COMMIT');
        res.json({ message: 'İşlem onaylandı' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Approve transaction error:', error);
        res.status(500).json({ error: 'İşlem onaylanamadı' });
    } finally {
        client.release();
    }
});

// Reject transaction
router.post('/:id/reject', async (req: AuthRequest, res: Response) => {
    try {
        const result = await pool.query(
            `UPDATE receiving_transactions SET status = 'rejected'
       WHERE id = $1 AND tenant_id = $2 AND status IN ('pending', 'inspected') RETURNING *`,
            [req.params.id, req.user!.tenant_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'İşlem bulunamadı' });
        }

        res.json({ message: 'İşlem reddedildi' });
    } catch (error) {
        console.error('Reject transaction error:', error);
        res.status(500).json({ error: 'İşlem reddedilemedi' });
    }
});

// Delete transaction
router.delete('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const result = await pool.query(
            `DELETE FROM receiving_transactions WHERE id = $1 AND tenant_id = $2 AND status = 'pending' RETURNING id`,
            [req.params.id, req.user!.tenant_id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'İşlem bulunamadı veya silinemez' });
        }
        res.json({ message: 'İşlem silindi' });
    } catch (error) {
        console.error('Delete transaction error:', error);
        res.status(500).json({ error: 'İşlem silinemedi' });
    }
});

export default router;
