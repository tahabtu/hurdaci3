import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from './jwt.js';

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: TokenPayload;
        }
    }
}

// Middleware to verify user is authenticated
export function requireAuth(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Yetkilendirme gerekli' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = verifyAccessToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Geçersiz veya süresi dolmuş token' });
    }
}

// Middleware to require superuser role
export function requireSuperuser(req: Request, res: Response, next: NextFunction) {
    if (!req.user) {
        return res.status(401).json({ error: 'Yetkilendirme gerekli' });
    }

    if (req.user.role !== 'superuser') {
        return res.status(403).json({ error: 'Bu işlem için süper kullanıcı yetkisi gerekli' });
    }

    next();
}

// Middleware to require admin or superuser role
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
    if (!req.user) {
        return res.status(401).json({ error: 'Yetkilendirme gerekli' });
    }

    if (req.user.role !== 'superuser' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Bu işlem için yönetici yetkisi gerekli' });
    }

    next();
}
