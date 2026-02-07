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
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    Typography,
    CircularProgress,
    Alert,
    Divider,
} from '@mui/material';
import {
    Science as ScienceIcon,
    Delete as DeleteIcon,
    Add as AddIcon,
} from '@mui/icons-material';
import {
    getPendingReceiving,
    getReceivingTransaction,
    getUllageTypes,
    createInspection,
} from '../services/api';
import type { ReceivingTransaction, ReceivingItem, UllageType } from '../types';

interface UllageInput {
    ullage_type_id: number;
    weight: string;
}

export default function Inspections() {
    const [transactions, setTransactions] = useState<ReceivingTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [ullageTypes, setUllageTypes] = useState<UllageType[]>([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<ReceivingItem | null>(null);
    const [selectedTx, setSelectedTx] = useState<ReceivingTransaction | null>(null);

    const [formData, setFormData] = useState({
        sample_weight: '',
        items: [{ ullage_type_id: 0, weight: '' }] as UllageInput[],
    });

    const [result, setResult] = useState<{
        net_weight: number;
        effective_unit_price: number;
        ullage_percentage: number;
        total_cost: number;
    } | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [txData, typesData] = await Promise.all([
                getPendingReceiving(),
                getUllageTypes(),
            ]);
            setTransactions(txData);
            setUllageTypes(typesData);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = async (tx: ReceivingTransaction) => {
        try {
            const details = await getReceivingTransaction(tx.id);
            setSelectedTx(details);
            // Find first non-inspected item
            const uninspected = details.items?.find((item) => !item.net_weight);
            if (uninspected) {
                setSelectedItem(uninspected);
                setFormData({
                    sample_weight: '',
                    items: [{ ullage_type_id: 0, weight: '' }],
                });
                setResult(null);
                setDialogOpen(true);
            } else {
                alert('Tüm kalemler incelendi');
            }
        } catch (error) {
            console.error('Failed to load transaction:', error);
        }
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setSelectedItem(null);
        setSelectedTx(null);
        setResult(null);
    };

    const handleAddUllage = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { ullage_type_id: 0, weight: '' }],
        });
    };

    const handleRemoveUllage = (index: number) => {
        const newItems = formData.items.filter((_, i) => i !== index);
        setFormData({ ...formData, items: newItems.length > 0 ? newItems : [{ ullage_type_id: 0, weight: '' }] });
    };

    const handleUllageChange = (index: number, field: keyof UllageInput, value: string | number) => {
        const newItems = [...formData.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setFormData({ ...formData, items: newItems });
    };

    const calculatePreview = () => {
        if (!selectedItem || !formData.sample_weight) return;

        const sampleWeight = parseFloat(formData.sample_weight);
        const totalUllage = formData.items.reduce(
            (sum, item) => sum + (parseFloat(item.weight) || 0),
            0
        );
        const ullagePercentage = (totalUllage / sampleWeight) * 100;
        const grossWeight = parseFloat(String(selectedItem.gross_weight));
        const netWeight = grossWeight * (1 - ullagePercentage / 100);
        const unitPrice = parseFloat(String(selectedItem.unit_price));
        const logisticsCost = parseFloat(String(selectedItem.logistics_cost || 0));
        // Total cost = (unit_price × gross_weight) + logistics_cost
        // Effective price = total_cost / net_weight
        const totalCost = (unitPrice * grossWeight) + logisticsCost;
        const effectiveUnitPrice = totalCost / netWeight;

        setResult({
            net_weight: netWeight,
            effective_unit_price: effectiveUnitPrice,
            ullage_percentage: ullagePercentage,
            total_cost: totalCost,
        });
    };

    useEffect(() => {
        calculatePreview();
    }, [formData.sample_weight, formData.items]);

    const handleSubmit = async () => {
        if (!selectedItem) return;

        try {
            const validItems = formData.items.filter(
                (item) => item.ullage_type_id && item.weight
            );

            await createInspection({
                receiving_item_id: selectedItem.id,
                sample_weight: parseFloat(formData.sample_weight),
                items: validItems.map((item) => ({
                    ullage_type_id: item.ullage_type_id,
                    weight: parseFloat(item.weight),
                })),
            });

            handleCloseDialog();
            loadData();
        } catch (error) {
            console.error('Failed to create inspection:', error);
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
                Fire Analizi (Bekleyen Alımlar)
            </Typography>

            <Card>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Tarih</TableCell>
                                <TableCell>Tedarikçi</TableCell>
                                <TableCell>Kalem Sayısı</TableCell>
                                <TableCell>Durum</TableCell>
                                <TableCell align="right">İşlem</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {transactions.map((tx) => (
                                <TableRow key={tx.id} hover>
                                    <TableCell>
                                        {new Date(tx.transaction_date).toLocaleDateString('tr-TR')}
                                    </TableCell>
                                    <TableCell>{tx.partner_name}</TableCell>
                                    <TableCell>-</TableCell>
                                    <TableCell>
                                        <Chip label="İnceleme Bekliyor" size="small" color="warning" />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Button
                                            size="small"
                                            startIcon={<ScienceIcon />}
                                            onClick={() => handleOpenDialog(tx)}
                                        >
                                            İncele
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {transactions.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                                        İnceleme bekleyen alım yok
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>Fire Analizi</DialogTitle>
                <DialogContent>
                    {selectedItem && selectedTx && (
                        <Box sx={{ pt: 2 }}>
                            <Alert severity="info" sx={{ mb: 3 }}>
                                <strong>Malzeme:</strong> {selectedItem.material_name} |{' '}
                                <strong>Brüt Ağırlık:</strong> {parseFloat(String(selectedItem.gross_weight)).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {selectedItem.unit_of_measure} |{' '}
                                <strong>Birim Fiyat:</strong> {parseFloat(String(selectedItem.unit_price)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                            </Alert>

                            <TextField
                                fullWidth
                                label="Numune Ağırlığı (kg)"
                                type="number"
                                value={formData.sample_weight}
                                onChange={(e) => setFormData({ ...formData, sample_weight: e.target.value })}
                                sx={{ mb: 3 }}
                            />

                            <Divider sx={{ my: 2 }} />
                            <Typography variant="subtitle2" sx={{ mb: 2 }}>
                                Fire Ölçümleri
                            </Typography>

                            {formData.items.map((item, index) => (
                                <Box key={index} sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                                    <FormControl sx={{ minWidth: 200 }}>
                                        <InputLabel>Fire Tipi</InputLabel>
                                        <Select
                                            value={item.ullage_type_id || ''}
                                            label="Fire Tipi"
                                            onChange={(e) => handleUllageChange(index, 'ullage_type_id', e.target.value as number)}
                                        >
                                            {ullageTypes.map((t) => (
                                                <MenuItem key={t.id} value={t.id}>
                                                    {t.name}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                    <TextField
                                        label="Ağırlık (kg)"
                                        type="number"
                                        value={item.weight}
                                        onChange={(e) => handleUllageChange(index, 'weight', e.target.value)}
                                        sx={{ width: 150 }}
                                    />
                                    <IconButton onClick={() => handleRemoveUllage(index)} color="error">
                                        <DeleteIcon />
                                    </IconButton>
                                </Box>
                            ))}

                            <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddUllage}>
                                Fire Ekle
                            </Button>

                            {result && (
                                <Card sx={{ mt: 3, p: 2, bgcolor: 'rgba(16, 185, 129, 0.1)' }}>
                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                        Hesaplama Sonucu
                                    </Typography>
                                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 2 }}>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">
                                                Fire Oranı
                                            </Typography>
                                            <Typography variant="h6">%{result.ullage_percentage.toFixed(2)}</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">
                                                Net Ağırlık
                                            </Typography>
                                            <Typography variant="h6">
                                                {result.net_weight.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {selectedItem.unit_of_measure}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">
                                                Toplam Tutar
                                            </Typography>
                                            <Typography variant="h6" sx={{ color: '#10b981' }}>
                                                {result.total_cost.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">
                                                Efektif Birim Fiyat
                                            </Typography>
                                            <Typography variant="h6">
                                                {result.effective_unit_price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Card>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={handleCloseDialog}>İptal</Button>
                    <Button variant="contained" onClick={handleSubmit} disabled={!result}>
                        Kaydet
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
