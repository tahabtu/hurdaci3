import { Router, Response } from 'express';
import pool from '../db.js';
import { AuthRequest } from '../index.js';

const router = Router();

// Get inspections for a receiving item
router.get('/item/:itemId', async (req: AuthRequest, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT i.*, 
        json_agg(json_build_object('id', ii.id, 'ullage_type_id', ii.ullage_type_id, 'weight', ii.weight, 'type_name', ut.name)) as items
       FROM inspections i
       LEFT JOIN inspection_items ii ON i.id = ii.inspection_id
       LEFT JOIN ullage_types ut ON ii.ullage_type_id = ut.id
       WHERE i.receiving_item_id = $1 AND i.tenant_id = $2
       GROUP BY i.id`,
            [req.params.itemId, req.user!.tenant_id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get inspections error:', error);
        res.status(500).json({ error: 'Veriler alınamadı' });
    }
});

// Get inspection history (all inspections with details)
router.get('/history', async (req: AuthRequest, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT i.id, i.sample_weight, i.total_ullage_weight, i.ullage_percentage, i.inspection_date,
                    m.item_name as material_name, 
                    p.name as partner_name,
                    ri.gross_weight, ri.net_weight, ri.unit_price, ri.effective_unit_price,
                    json_agg(json_build_object('type_name', ut.name, 'weight', ii.weight)) FILTER (WHERE ii.id IS NOT NULL) as ullage_items
             FROM inspections i
             JOIN receiving_items ri ON i.receiving_item_id = ri.id
             JOIN materials m ON ri.material_id = m.id
             JOIN receiving_transactions rt ON ri.receiving_transaction_id = rt.id
             JOIN partners p ON rt.partner_id = p.id
             LEFT JOIN inspection_items ii ON i.id = ii.inspection_id
             LEFT JOIN ullage_types ut ON ii.ullage_type_id = ut.id
             WHERE i.tenant_id = $1
             GROUP BY i.id, m.item_name, p.name, ri.gross_weight, ri.net_weight, ri.unit_price, ri.effective_unit_price
             ORDER BY i.inspection_date DESC`,
            [req.user!.tenant_id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get inspection history error:', error);
        res.status(500).json({ error: 'Veriler alınamadı' });
    }
});

// Create inspection for a receiving item
router.post('/', async (req: AuthRequest, res: Response) => {
    const { receiving_item_id, sample_weight, items } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Get the receiving item
        const itemResult = await client.query(
            `SELECT ri.*, rt.tenant_id, rt.partner_id, rt.logistics_cost, rt.id as transaction_id
       FROM receiving_items ri
       JOIN receiving_transactions rt ON ri.receiving_transaction_id = rt.id
       WHERE ri.id = $1 AND rt.tenant_id = $2`,
            [receiving_item_id, req.user!.tenant_id]
        );

        if (itemResult.rows.length === 0) {
            return res.status(404).json({ error: 'Alım kalemi bulunamadı' });
        }

        const receivingItem = itemResult.rows[0];

        // Calculate total ullage weight
        let totalUllageWeight = 0;
        for (const item of items) {
            totalUllageWeight += parseFloat(item.weight);
        }

        // Calculate ullage percentage
        const ullagePercentage = (totalUllageWeight / parseFloat(sample_weight)) * 100;

        // Calculate net weight
        const netWeight = parseFloat(receivingItem.gross_weight) * (1 - ullagePercentage / 100);

        // Create inspection
        const inspectionResult = await client.query(
            `INSERT INTO inspections (tenant_id, receiving_item_id, sample_weight, total_ullage_weight, ullage_percentage)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [req.user!.tenant_id, receiving_item_id, sample_weight, totalUllageWeight, ullagePercentage]
        );

        const inspectionId = inspectionResult.rows[0].id;

        // Insert inspection items
        for (const item of items) {
            await client.query(
                `INSERT INTO inspection_items (inspection_id, ullage_type_id, weight)
         VALUES ($1, $2, $3)`,
                [inspectionId, item.ullage_type_id, item.weight]
            );
        }

        // Update receiving item with net weight and effective price
        // Effective price = total cost / net weight
        const totalItemCost = parseFloat(receivingItem.gross_weight) * parseFloat(receivingItem.unit_price);
        const effectiveUnitPrice = totalItemCost / netWeight;

        await client.query(
            `UPDATE receiving_items SET net_weight = $1, effective_unit_price = $2
       WHERE id = $3`,
            [netWeight, effectiveUnitPrice, receiving_item_id]
        );

        // Check if all items in transaction have been inspected
        const uninspectedResult = await client.query(
            `SELECT COUNT(*) as count FROM receiving_items ri
       WHERE ri.receiving_transaction_id = $1 AND ri.net_weight IS NULL`,
            [receivingItem.transaction_id]
        );

        // If all items inspected, update transaction status
        if (parseInt(uninspectedResult.rows[0].count) === 0) {
            // Recalculate total amount with effective prices
            const totalResult = await client.query(
                `SELECT SUM(net_weight * effective_unit_price) as total
         FROM receiving_items WHERE receiving_transaction_id = $1`,
                [receivingItem.transaction_id]
            );

            const newTotal = parseFloat(totalResult.rows[0].total) + parseFloat(receivingItem.logistics_cost);

            await client.query(
                `UPDATE receiving_transactions SET status = 'inspected', total_amount = $1
         WHERE id = $2`,
                [newTotal, receivingItem.transaction_id]
            );
        }

        await client.query('COMMIT');

        res.status(201).json({
            ...inspectionResult.rows[0],
            net_weight: netWeight,
            effective_unit_price: effectiveUnitPrice
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create inspection error:', error);
        res.status(500).json({ error: 'Fire analizi oluşturulamadı' });
    } finally {
        client.release();
    }
});

export default router;
