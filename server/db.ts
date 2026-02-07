import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'hurdaci3',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '1',
});

export async function initDatabase() {
    try {
        const initSql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf-8');
        await pool.query(initSql);
        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Database initialization error:', error);
        throw error;
    }
}

export default pool;
