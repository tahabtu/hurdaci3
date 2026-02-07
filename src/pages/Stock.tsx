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
    Typography,
    CircularProgress,
    Collapse,
    IconButton,
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    Inventory as InventoryIcon,
} from '@mui/icons-material';
import { getStock, getStockByMaterial } from '../services/api';
import type { Stock } from '../types';

export default function StockPage() {
    const [stockSummary, setStockSummary] = useState<Stock[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [expandedDetails, setExpandedDetails] = useState<Stock[]>([]);

    useEffect(() => {
        loadStock();
    }, []);

    const loadStock = async () => {
        try {
            const data = await getStock();
            setStockSummary(data);
        } catch (error) {
            console.error('Failed to load stock:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleExpand = async (materialId: number) => {
        if (expandedId === materialId) {
            setExpandedId(null);
            setExpandedDetails([]);
        } else {
            setExpandedId(materialId);
            try {
                const details = await getStockByMaterial(materialId);
                setExpandedDetails(details);
            } catch (error) {
                console.error('Failed to load stock details:', error);
            }
        }
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
                Stok Durumu
            </Typography>

            <Card>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell width={50}></TableCell>
                                <TableCell>Malzeme</TableCell>
                                <TableCell>Malzeme Kodu</TableCell>
                                <TableCell align="right">Toplam Miktar</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {stockSummary.map((stock) => (
                                <>
                                    <TableRow key={stock.material_id} hover>
                                        <TableCell>
                                            {parseFloat(String(stock.total_quantity)) > 0 && (
                                                <IconButton size="small" onClick={() => handleToggleExpand(stock.material_id)}>
                                                    {expandedId === stock.material_id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                                </IconButton>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <InventoryIcon sx={{ color: '#64748b', fontSize: 20 }} />
                                                {stock.material_name}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            {stock.item_code || '-'}
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography
                                                sx={{
                                                    fontWeight: 600,
                                                    color: parseFloat(String(stock.total_quantity)) > 0 ? '#0d9488' : '#94a3b8',
                                                }}
                                            >
                                                {parseFloat(String(stock.total_quantity)).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {stock.unit_of_measure}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell colSpan={4} sx={{ py: 0, borderBottom: expandedId === stock.material_id ? undefined : 'none' }}>
                                            <Collapse in={expandedId === stock.material_id}>
                                                <Box sx={{ py: 2, pl: 6 }}>
                                                    <Typography variant="subtitle2" sx={{ mb: 1, color: '#64748b' }}>
                                                        Tedarikçi Bazlı Dağılım
                                                    </Typography>
                                                    <Table size="small">
                                                        <TableHead>
                                                            <TableRow>
                                                                <TableCell>Tedarikçi</TableCell>
                                                                <TableCell align="right">Miktar</TableCell>
                                                                <TableCell align="right">Efektif Fiyat (₺)</TableCell>
                                                                <TableCell>Son Güncelleme</TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {expandedDetails.map((detail) => (
                                                                <TableRow key={detail.id}>
                                                                    <TableCell>{detail.partner_name}</TableCell>
                                                                    <TableCell align="right">
                                                                        {parseFloat(String(detail.quantity)).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {detail.unit_of_measure}
                                                                    </TableCell>
                                                                    <TableCell align="right">
                                                                        {detail.effective_unit_price
                                                                            ? parseFloat(String(detail.effective_unit_price)).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                                                            : '-'}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {detail.last_updated
                                                                            ? new Date(detail.last_updated).toLocaleDateString('tr-TR')
                                                                            : '-'}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </Box>
                                            </Collapse>
                                        </TableCell>
                                    </TableRow>
                                </>
                            ))}
                            {stockSummary.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                                        Stok verisi yok
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
