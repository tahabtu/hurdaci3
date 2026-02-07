import { useState } from 'react';
import {
    Box,
    Card,
    TextField,
    Button,
    Typography,
    Alert,
    Avatar,
} from '@mui/material';
import { login } from '../services/api';
import type { User } from '../types';

interface LoginProps {
    onLogin: (user: User) => void;
}

export default function Login({ onLogin }: LoginProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const user = await login(username, password);
            onLogin(user);
        } catch (err: unknown) {
            const error = err as { response?: { data?: { error?: string } } };
            setError(error.response?.data?.error || 'Giriş başarısız');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfeff 50%, #f0f9ff 100%)',
            }}
        >
            <Card
                sx={{
                    p: 5,
                    width: '100%',
                    maxWidth: 420,
                    textAlign: 'center',
                }}
            >
                <Avatar
                    sx={{
                        width: 72,
                        height: 72,
                        mx: 'auto',
                        mb: 2,
                        background: 'linear-gradient(135deg, #0d9488 0%, #2563eb 100%)',
                        fontSize: '2.5rem',
                    }}
                >
                    ♻
                </Avatar>
                <Typography variant="h4" sx={{ mb: 1, fontWeight: 700, color: '#1e293b' }}>
                    Hurdacı
                </Typography>
                <Typography variant="body2" sx={{ mb: 4, color: '#64748b' }}>
                    Geri Dönüşüm Yönetim Sistemi
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {error}
                    </Alert>
                )}

                <form onSubmit={handleSubmit}>
                    <TextField
                        fullWidth
                        label="Kullanıcı Adı"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        sx={{ mb: 2 }}
                        autoFocus
                    />
                    <TextField
                        fullWidth
                        label="Şifre"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        sx={{ mb: 3 }}
                    />
                    <Button
                        type="submit"
                        variant="contained"
                        fullWidth
                        size="large"
                        disabled={loading}
                        sx={{
                            py: 1.5,
                            fontSize: '1rem',
                        }}
                    >
                        {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                    </Button>
                </form>
            </Card>
        </Box>
    );
}
