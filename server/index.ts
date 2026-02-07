import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pool, { initDatabase } from './db.js';
import { verifyAccessToken, TokenPayload } from './middleware/jwt.js';

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

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: { error: 'Çok fazla istek, lütfen daha sonra tekrar deneyin.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 login attempts per 15 min
    message: { error: 'Çok fazla giriş denemesi, lütfen 15 dakika sonra tekrar deneyin.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/auth/login', authLimiter);

// CORS configuration
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Auth middleware with JWT verification
export interface AuthRequest extends Request {
    user?: TokenPayload;
}

export const authMiddleware = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Yetkilendirme gerekli' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = verifyAccessToken(token);

        // Verify user still exists
        const result = await pool.query(
            'SELECT id, tenant_id, username, name FROM users WHERE id = $1',
            [decoded.id]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Kullanıcı bulunamadı' });
        }

        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Geçersiz veya süresi dolmuş token' });
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

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Sunucu hatası' });
});

// Initialize database and start server
initDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}).catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
