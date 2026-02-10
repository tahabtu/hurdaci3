import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { requireAuth, requireSuperuser } from '../middleware/authMiddleware.js';

const router = Router();

// All admin routes require authentication and superuser role
router.use(requireAuth);
router.use(requireSuperuser);

// ============================================
// TENANTS
// ============================================

// Get all tenants with user counts
router.get('/tenants', async (req: Request, res: Response) => {
    try {
        const result = await pool.query(`
            SELECT t.*, 
                   COALESCE(user_counts.count, 0) as user_count
            FROM tenants t
            LEFT JOIN (
                SELECT tenant_id, COUNT(*) as count 
                FROM users 
                GROUP BY tenant_id
            ) user_counts ON t.id = user_counts.tenant_id
            ORDER BY t.id
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching tenants:', error);
        res.status(500).json({ error: 'Tenantlar alınırken hata oluştu' });
    }
});

// Create a new tenant
router.post('/tenants', async (req: Request, res: Response) => {
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Tenant adı gerekli' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO tenants (name) VALUES ($1) RETURNING *',
            [name]
        );
        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Bu isimde bir tenant zaten mevcut' });
        }
        console.error('Error creating tenant:', error);
        res.status(500).json({ error: 'Tenant oluşturulurken hata oluştu' });
    }
});

// Update a tenant
router.put('/tenants/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Tenant adı gerekli' });
    }

    try {
        const result = await pool.query(
            'UPDATE tenants SET name = $1 WHERE id = $2 RETURNING *',
            [name, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Tenant bulunamadı' });
        }

        res.json(result.rows[0]);
    } catch (error: any) {
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Bu isimde bir tenant zaten mevcut' });
        }
        console.error('Error updating tenant:', error);
        res.status(500).json({ error: 'Tenant güncellenirken hata oluştu' });
    }
});

// Delete a tenant
router.delete('/tenants/:id', async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        // Check if tenant has users
        const userCheck = await pool.query(
            'SELECT COUNT(*) FROM users WHERE tenant_id = $1',
            [id]
        );

        if (parseInt(userCheck.rows[0].count) > 0) {
            return res.status(400).json({
                error: 'Bu tenant\'a ait kullanıcılar var. Önce kullanıcıları silmeniz gerekiyor.'
            });
        }

        const result = await pool.query(
            'DELETE FROM tenants WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Tenant bulunamadı' });
        }

        res.json({ message: 'Tenant silindi' });
    } catch (error) {
        console.error('Error deleting tenant:', error);
        res.status(500).json({ error: 'Tenant silinirken hata oluştu' });
    }
});

// ============================================
// USERS
// ============================================

// Get all users (across all tenants)
router.get('/users', async (req: Request, res: Response) => {
    try {
        const result = await pool.query(`
            SELECT u.id, u.tenant_id, u.username, u.name, u.role, u.created_at,
                   t.name as tenant_name
            FROM users u
            LEFT JOIN tenants t ON u.tenant_id = t.id
            ORDER BY u.id
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Kullanıcılar alınırken hata oluştu' });
    }
});

// Get users for a specific tenant
router.get('/users/tenant/:tenantId', async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    try {
        const result = await pool.query(`
            SELECT u.id, u.tenant_id, u.username, u.name, u.role, u.created_at,
                   t.name as tenant_name
            FROM users u
            LEFT JOIN tenants t ON u.tenant_id = t.id
            WHERE u.tenant_id = $1
            ORDER BY u.id
        `, [tenantId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Kullanıcılar alınırken hata oluştu' });
    }
});

// Create a new user
router.post('/users', async (req: Request, res: Response) => {
    const { tenant_id, username, password, name, role } = req.body;

    if (!username || !password || !name) {
        return res.status(400).json({ error: 'Kullanıcı adı, şifre ve isim gerekli' });
    }

    if (role && !['superuser', 'admin', 'user'].includes(role)) {
        return res.status(400).json({ error: 'Geçersiz rol' });
    }

    try {
        // Hash the password
        const password_hash = await bcrypt.hash(password, 12);

        const result = await pool.query(
            `INSERT INTO users (tenant_id, username, password_hash, name, role) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING id, tenant_id, username, name, role, created_at`,
            [tenant_id || null, username, password_hash, name, role || 'user']
        );
        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Bu kullanıcı adı zaten kullanılıyor' });
        }
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Kullanıcı oluşturulurken hata oluştu' });
    }
});

// Update a user
router.put('/users/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { tenant_id, username, password, name, role } = req.body;

    if (!username || !name) {
        return res.status(400).json({ error: 'Kullanıcı adı ve isim gerekli' });
    }

    if (role && !['superuser', 'admin', 'user'].includes(role)) {
        return res.status(400).json({ error: 'Geçersiz rol' });
    }

    try {
        let result;

        if (password) {
            // Update with new password
            const password_hash = await bcrypt.hash(password, 12);
            result = await pool.query(
                `UPDATE users 
                 SET tenant_id = $1, username = $2, password_hash = $3, name = $4, role = $5
                 WHERE id = $6 
                 RETURNING id, tenant_id, username, name, role, created_at`,
                [tenant_id || null, username, password_hash, name, role || 'user', id]
            );
        } else {
            // Update without changing password
            result = await pool.query(
                `UPDATE users 
                 SET tenant_id = $1, username = $2, name = $3, role = $4
                 WHERE id = $5 
                 RETURNING id, tenant_id, username, name, role, created_at`,
                [tenant_id || null, username, name, role || 'user', id]
            );
        }

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        }

        res.json(result.rows[0]);
    } catch (error: any) {
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Bu kullanıcı adı zaten kullanılıyor' });
        }
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Kullanıcı güncellenirken hata oluştu' });
    }
});

// Delete a user
router.delete('/users/:id', async (req: Request, res: Response) => {
    const { id } = req.params;

    // Prevent deleting yourself
    if (req.user && req.user.id === parseInt(id)) {
        return res.status(400).json({ error: 'Kendinizi silemezsiniz' });
    }

    try {
        const result = await pool.query(
            'DELETE FROM users WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        }

        res.json({ message: 'Kullanıcı silindi' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Kullanıcı silinirken hata oluştu' });
    }
});

// ============================================
// SYSTEM STATS
// ============================================

router.get('/stats', async (req: Request, res: Response) => {
    try {
        const [tenants, users, partners, materials, receiving, selling] = await Promise.all([
            pool.query('SELECT COUNT(*) FROM tenants'),
            pool.query('SELECT COUNT(*) FROM users'),
            pool.query('SELECT COUNT(*) FROM partners'),
            pool.query('SELECT COUNT(*) FROM materials'),
            pool.query('SELECT COUNT(*) FROM receiving_transactions'),
            pool.query('SELECT COUNT(*) FROM selling_transactions'),
        ]);

        res.json({
            tenants: parseInt(tenants.rows[0].count),
            users: parseInt(users.rows[0].count),
            partners: parseInt(partners.rows[0].count),
            materials: parseInt(materials.rows[0].count),
            receiving_transactions: parseInt(receiving.rows[0].count),
            selling_transactions: parseInt(selling.rows[0].count),
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'İstatistikler alınırken hata oluştu' });
    }
});

export default router;
