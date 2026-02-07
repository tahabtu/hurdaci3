import express from 'express';
import cors from 'cors';
import pool, { initDatabase } from './db.js';

// Import routes
import authRoutes from './routes/auth.js';
import partnersRoutes from './routes/partners.js';
import materialsRoutes from './routes/materials.js';
import ullageTypesRoutes from './routes/ullageTypes.js';
import receivingRoutes from './routes/receiving.js';
import inspectionsRoutes from './routes/inspections.js';
import sellingRoutes from './routes/selling.js';
import stockRoutes from './routes/stock.js';
import moneyRoutes from './routes/money.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Auth middleware
export interface AuthRequest extends express.Request {
    user?: { id: number; tenant_id: number; username: string; name: string };
}

export const authMiddleware = async (
    req: AuthRequest,
    res: express.Response,
    next: express.NextFunction
) => {
    const userId = req.headers['x-user-id'];
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const result = await pool.query(
            'SELECT id, tenant_id, username, name FROM users WHERE id = $1',
            [userId]
        );
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }
        req.user = result.rows[0];
        next();
    } catch (error) {
        res.status(500).json({ error: 'Auth error' });
    }
};

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/partners', authMiddleware, partnersRoutes);
app.use('/api/materials', authMiddleware, materialsRoutes);
app.use('/api/ullage-types', authMiddleware, ullageTypesRoutes);
app.use('/api/receiving', authMiddleware, receivingRoutes);
app.use('/api/inspections', authMiddleware, inspectionsRoutes);
app.use('/api/selling', authMiddleware, sellingRoutes);
app.use('/api/stock', authMiddleware, stockRoutes);
app.use('/api/money', authMiddleware, moneyRoutes);

// Initialize database and start server
initDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}).catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
