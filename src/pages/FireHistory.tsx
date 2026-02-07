import { useState, useEffect, Fragment } from 'react';
import {
    Box,
    Typography,
    Card,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Chip,
    CircularProgress,
    Collapse,
} from '@mui/material';
import {
    KeyboardArrowDown as KeyboardArrowDownIcon,
    KeyboardArrowUp as KeyboardArrowUpIcon,
} from '@mui/icons-material';
import { getInspectionHistory, type InspectionHistory } from '../services/api';

export default function FireHistory() {
    const [history, setHistory] = useState<InspectionHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await getInspectionHistory();
            setHistory(data);
        } catch (error) {
            console.error('Failed to load inspection history:', error);
        } finally {
            setLoading(false);
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
                Fire Geçmişi
            </Typography>

            <Card>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell />
                                <TableCell>Tarih</TableCell>
                                <TableCell>Malzeme</TableCell>
                                <TableCell>Tedarikçi</TableCell>
                                <TableCell>Fire %</TableCell>
                                <TableCell>Net Ağırlık</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {history.map((item) => (
                                <Fragment key={item.id}>
                                    <TableRow
                                        hover
                                        sx={{ cursor: 'pointer' }}
                                        onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                                    >
                                        <TableCell>
                                            <IconButton size="small">
                                                {expandedId === item.id ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                                            </IconButton>
                                        </TableCell>
                                        <TableCell>
                                            {new Date(item.inspection_date).toLocaleDateString('tr-TR')}
                                        </TableCell>
                                        <TableCell>{item.material_name}</TableCell>
                                        <TableCell>{item.partner_name}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={`%${parseFloat(String(item.ullage_percentage)).toFixed(2)}`}
                                                size="small"
                                                color={parseFloat(String(item.ullage_percentage)) > 10 ? 'error' : 'success'}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {parseFloat(String(item.net_weight)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} kg
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                                            <Collapse in={expandedId === item.id} timeout="auto" unmountOnExit>
                                                <Box sx={{ m: 2 }}>
                                                    <Typography variant="subtitle2" gutterBottom>
                                                        Fire Detayları
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                                        <Box>
                                                            <Typography variant="caption" color="text.secondary">Brüt Ağırlık</Typography>
                                                            <Typography>{parseFloat(String(item.gross_weight)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} kg</Typography>
                                                        </Box>
                                                        <Box>
                                                            <Typography variant="caption" color="text.secondary">Birim Fiyat</Typography>
                                                            <Typography>{parseFloat(String(item.unit_price)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</Typography>
                                                        </Box>
                                                        <Box>
                                                            <Typography variant="caption" color="text.secondary">Efektif Fiyat</Typography>
                                                            <Typography>{parseFloat(String(item.effective_unit_price)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</Typography>
                                                        </Box>
                                                    </Box>
                                                    {item.ullage_items && item.ullage_items.length > 0 && (
                                                        <Box sx={{ mt: 2 }}>
                                                            <Typography variant="caption" color="text.secondary">Bulunan Fire Tipleri:</Typography>
                                                            <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                                                                {item.ullage_items.map((u, idx) => (
                                                                    <Chip
                                                                        key={idx}
                                                                        label={`${u.type_name}: ${parseFloat(String(u.weight)).toFixed(1)} kg`}
                                                                        size="small"
                                                                        variant="outlined"
                                                                    />
                                                                ))}
                                                            </Box>
                                                        </Box>
                                                    )}
                                                </Box>
                                            </Collapse>
                                        </TableCell>
                                    </TableRow>
                                </Fragment>
                            ))}
                            {history.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                        Henüz fire analizi yapılmamış
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
