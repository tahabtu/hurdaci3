import { Router, Response } from 'express';
import pool from '../db.js';
import { AuthRequest } from '../index.js';

const router = Router();

// Get all selling transactions
router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT st.*, p.name as partner_name
       FROM selling_transactions st
       JOIN partners p ON st.partner_id = p.id
       WHERE st.tenant_id = $1
       ORDER BY st.transaction_date DESC`,
            [req.user!.tenant_id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get selling transactions error:', error);
        res.status(500).json({ error: 'Veriler alınamadı' });
    }
});

// Get single transaction with items
router.get('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const txResult = await pool.query(
            `SELECT st.*, p.name as partner_name
       FROM selling_transactions st
       JOIN partners p ON st.partner_id = p.id
       WHERE st.id = $1 AND st.tenant_id = $2`,
            [req.params.id, req.user!.tenant_id]
        );

        if (txResult.rows.length === 0) {
            return res.status(404).json({ error: 'Satış bulunamadı' });
        }

        const itemsResult = await pool.query(
            `SELECT si.*, m.item_name as material_name, m.unit_of_measure
       FROM selling_items si
       JOIN materials m ON si.material_id = m.id
       WHERE si.selling_transaction_id = $1`,
            [req.params.id]
        );

        res.json({
            ...txResult.rows[0],
            items: itemsResult.rows
        });
    } catch (error) {
        console.error('Get selling transaction error:', error);
        res.status(500).json({ error: 'Veri alınamadı' });
    }
});

// Create selling transaction
router.post('/', async (req: AuthRequest, res: Response) => {
    const { partner_id, notes, items } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Calculate total and check stock
        let totalAmount = 0;
        for (const item of items) {
            // Check available stock
            const stockResult = await client.query(
                `SELECT COALESCE(SUM(quantity), 0) as total
         FROM stock WHERE tenant_id = $1 AND material_id = $2`,
                [req.user!.tenant_id, item.material_id]
            );

            const availableStock = parseFloat(stockResult.rows[0].total);
            if (availableStock < parseFloat(item.quantity)) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: `Yetersiz stok: ${item.material_name || 'Malzeme'}` });
            }

            totalAmount += parseFloat(item.quantity) * parseFloat(item.unit_price);
        }

        // Create transaction
        const txResult = await client.query(
            `INSERT INTO selling_transactions (tenant_id, partner_id, total_amount, notes)
       VALUES ($1, $2, $3, $4) RETURNING *`,
            [req.user!.tenant_id, partner_id, totalAmount, notes]
        );

        const transactionId = txResult.rows[0].id;

        // Insert items and deduct from stock
        for (const item of items) {
            const itemTotal = parseFloat(item.quantity) * parseFloat(item.unit_price);

            await client.query(
                `INSERT INTO selling_items (selling_transaction_id, material_id, quantity, unit_price, total_amount)
         VALUES ($1, $2, $3, $4, $5)`,
                [transactionId, item.material_id, item.quantity, item.unit_price, itemTotal]
            );

            // Deduct from stock (FIFO - first from partners with oldest stock)
            let remainingQty = parseFloat(item.quantity);
            const stockRows = await client.query(
                `SELECT * FROM stock WHERE tenant_id = $1 AND material_id = $2 AND quantity > 0
         ORDER BY last_updated ASC`,
                [req.user!.tenant_id, item.material_id]
            );

            for (const stock of stockRows.rows) {
                if (remainingQty <= 0) break;

                const deductQty = Math.min(remainingQty, parseFloat(stock.quantity));
                await client.query(
                    `UPDATE stock SET quantity = quantity - $1, last_updated = NOW()
           WHERE id = $2`,
                    [deductQty, stock.id]
                );
                remainingQty -= deductQty;
            }
        }

        // Update partner balance (increase receivable from customer)
        await client.query(
            `UPDATE partners SET balance = balance + $1 WHERE id = $2`,
            [totalAmount, partner_id]
        );

        // Create automatic money transaction record (receipt expected from customer)
        await client.query(
            `INSERT INTO money_transactions (tenant_id, partner_id, type, amount, payment_method, notes)
       VALUES ($1, $2, 'receipt', $3, 'Satış', $4)`,
            [req.user!.tenant_id, partner_id, totalAmount, `Satış #${transactionId}`]
        );

        await client.query('COMMIT');
        res.status(201).json(txResult.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create selling transaction error:', error);
        res.status(500).json({ error: 'Satış oluşturulamadı' });
    } finally {
        client.release();
    }
});

export default router;
