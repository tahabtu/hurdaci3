import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export interface TokenPayload {
    id: number;
    tenant_id: number;
    username: string;
    name: string;
}

export function generateAccessToken(user: TokenPayload): string {
    return jwt.sign(
        { id: user.id, tenant_id: user.tenant_id, username: user.username, name: user.name },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
}

export function generateRefreshToken(user: TokenPayload): string {
    return jwt.sign(
        { id: user.id, tenant_id: user.tenant_id },
        JWT_REFRESH_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRY }
    );
}

export function verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): { id: number; tenant_id: number } {
    return jwt.verify(token, JWT_REFRESH_SECRET) as { id: number; tenant_id: number };
}
