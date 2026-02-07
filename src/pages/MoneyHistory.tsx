import { useState, useEffect } from 'react';
import {
    Box,
    Card,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Typography,
    CircularProgress,
} from '@mui/material';
import { getMoneyTransactions } from '../services/api';
import type { MoneyTransaction } from '../types';

export default function MoneyHistory() {
    const [transactions, setTransactions] = useState<MoneyTransaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const txData = await getMoneyTransactions();
            setTransactions(txData);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getTypeChip = (type: string) => {
        if (type === 'payment') {
            return <Chip label="Ödeme (Biz → Tedarikçi)" size="small" color="error" />;
        }
        return <Chip label="Tahsilat (Müşteri → Biz)" size="small" color="success" />;
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
                Kasa Hareketleri
            </Typography>

            <Card>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Tarih</TableCell>
                                <TableCell>Partner</TableCell>
                                <TableCell>Tip</TableCell>
                                <TableCell>Ödeme Yöntemi</TableCell>
                                <TableCell align="right">Tutar (₺)</TableCell>
                                <TableCell>Not</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {transactions.map((tx) => (
                                <TableRow key={tx.id} hover>
                                    <TableCell>
                                        {new Date(tx.transaction_date).toLocaleDateString('tr-TR')}
                                    </TableCell>
                                    <TableCell>{tx.partner_name}</TableCell>
                                    <TableCell>{getTypeChip(tx.type)}</TableCell>
                                    <TableCell>{tx.payment_method || '-'}</TableCell>
                                    <TableCell align="right">
                                        <Typography
                                            sx={{
                                                fontWeight: 600,
                                                color: tx.type === 'receipt' ? '#10b981' : '#ef4444',
                                            }}
                                        >
                                            {tx.type === 'payment' ? '-' : '+'}
                                            {parseFloat(String(tx.amount)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>{tx.notes || '-'}</TableCell>
                                </TableRow>
                            ))}
                            {transactions.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                        Henüz kasa hareketi yok
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>
        </Box>
    );
}
