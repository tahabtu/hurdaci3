import { useState, useEffect } from 'react';
import {
    Box,
    Button,
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
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Typography,
    CircularProgress,
    Divider,
    Alert,
    Collapse,
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import {
    getSellingTransactions,
    getSellingTransaction,
    createSellingTransaction,
    getPartnersByType,
    getStock,
} from '../services/api';
import type { SellingTransaction, Partner, Stock } from '../types';

interface ItemInput {
    material_id: number;
    material_name: string;
    available: number;
    unit: string;
    quantity: string;
    unit_price: string;
}

export default function Selling() {
    const [transactions, setTransactions] = useState<SellingTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [customers, setCustomers] = useState<Partner[]>([]);
    const [stockItems, setStockItems] = useState<Stock[]>([]);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [expandedDetails, setExpandedDetails] = useState<SellingTransaction | null>(null);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        partner_id: '',
        notes: '',
        items: [] as ItemInput[],
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [txData, customersData, stockData] = await Promise.all([
                getSellingTransactions(),
                getPartnersByType('customer'),
                getStock(),
            ]);
            setTransactions(txData);
            setCustomers(customersData);
            setStockItems(stockData.filter((s) => parseFloat(String(s.total_quantity)) > 0));
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleExpand = async (id: number) => {
        if (expandedId === id) {
            setExpandedId(null);
            setExpandedDetails(null);
        } else {
            setExpandedId(id);
            try {
                const details = await getSellingTransaction(id);
                setExpandedDetails(details);
            } catch (error) {
                console.error('Failed to load details:', error);
            }
        }
    };

    const handleOpenDialog = () => {
        setFormData({
            partner_id: '',
            notes: '',
            items: [],
        });
        setError('');
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
    };

    const handleAddItem = () => {
        if (stockItems.length === 0) {
            setError('Stokta satılabilecek malzeme yok');
            return;
        }
        setFormData({
            ...formData,
            items: [
                ...formData.items,
                {
                    material_id: 0,
                    material_name: '',
                    available: 0,
                    unit: 'kg',
                    quantity: '',
                    unit_price: '',
                },
            ],
        });
    };

    const handleRemoveItem = (index: number) => {
        setFormData({
            ...formData,
            items: formData.items.filter((_, i) => i !== index),
        });
    };

    const handleItemChange = (index: number, field: keyof ItemInput, value: string | number) => {
        const newItems = [...formData.items];
        if (field === 'material_id') {
            const stock = stockItems.find((s) => s.material_id === value);
            if (stock) {
                newItems[index] = {
                    ...newItems[index],
                    material_id: value as number,
                    material_name: stock.material_name,
                    available: parseFloat(String(stock.total_quantity)),
                    unit: stock.unit_of_measure,
                };
            }
        } else {
            newItems[index] = { ...newItems[index], [field]: value };
        }
        setFormData({ ...formData, items: newItems });
    };

    const calculateTotal = () => {
        return formData.items.reduce((sum, item) => {
            return sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
        }, 0);
    };

    const handleSubmit = async () => {
        setError('');

        if (!formData.partner_id) {
            setError('Müşteri seçin');
            return;
        }

        const validItems = formData.items.filter(
            (item) => item.material_id && item.quantity && item.unit_price
        );

        if (validItems.length === 0) {
            setError('En az bir malzeme satırı ekleyin');
            return;
        }

        // Check stock availability
        for (const item of validItems) {
            if (parseFloat(item.quantity) > item.available) {
                setError(`Yetersiz stok: ${item.material_name}`);
                return;
            }
        }

        try {
            await createSellingTransaction({
                partner_id: parseInt(formData.partner_id),
                notes: formData.notes,
                items: validItems.map((item) => ({
                    material_id: item.material_id,
                    quantity: parseFloat(item.quantity),
                    unit_price: parseFloat(item.unit_price),
                })),
            });
            handleCloseDialog();
            loadData();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { error?: string } } };
            setError(error.response?.data?.error || 'Satış oluşturulamadı');
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
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    Satış İşlemleri
                </Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenDialog}>
                    Yeni Satış
                </Button>
            </Box>

            <Card>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell width={50}></TableCell>
                                <TableCell>Tarih</TableCell>
                                <TableCell>Müşteri</TableCell>
                                <TableCell align="right">Toplam (₺)</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {transactions.map((tx) => (
                                <>
                                    <TableRow key={tx.id} hover>
                                        <TableCell>
                                            <IconButton size="small" onClick={() => handleToggleExpand(tx.id)}>
                                                {expandedId === tx.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                            </IconButton>
                                        </TableCell>
                                        <TableCell>
                                            {new Date(tx.transaction_date).toLocaleDateString('tr-TR')}
                                        </TableCell>
                                        <TableCell>{tx.partner_name}</TableCell>
                                        <TableCell align="right">
                                            {parseFloat(String(tx.total_amount)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell colSpan={4} sx={{ py: 0, borderBottom: expandedId === tx.id ? undefined : 'none' }}>
                                            <Collapse in={expandedId === tx.id}>
                                                <Box sx={{ py: 2 }}>
                                                    {expandedDetails && expandedDetails.items && (
                                                        <Table size="small">
                                                            <TableHead>
                                                                <TableRow>
                                                                    <TableCell>Malzeme</TableCell>
                                                                    <TableCell align="right">Miktar</TableCell>
                                                                    <TableCell align="right">Birim Fiyat (₺)</TableCell>
                                                                    <TableCell align="right">Tutar (₺)</TableCell>
                                                                </TableRow>
                                                            </TableHead>
                                                            <TableBody>
                                                                {expandedDetails.items.map((item) => (
                                                                    <TableRow key={item.id}>
                                                                        <TableCell>{item.material_name}</TableCell>
                                                                        <TableCell align="right">
                                                                            {parseFloat(String(item.quantity)).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {item.unit_of_measure}
                                                                        </TableCell>
                                                                        <TableCell align="right">
                                                                            {parseFloat(String(item.unit_price)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                                                        </TableCell>
                                                                        <TableCell align="right">
                                                                            {parseFloat(String(item.total_amount)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    )}
                                                </Box>
                                            </Collapse>
                                        </TableCell>
                                    </TableRow>
                                </>
                            ))}
                            {transactions.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                                        Henüz satış işlemi yok
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>Yeni Satış</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {error && <Alert severity="error">{error}</Alert>}

                        <FormControl fullWidth>
                            <InputLabel>Müşteri</InputLabel>
                            <Select
                                value={formData.partner_id}
                                label="Müşteri"
                                onChange={(e) => setFormData({ ...formData, partner_id: e.target.value as string })}
                            >
                                {customers.map((c) => (
                                    <MenuItem key={c.id} value={c.id}>
                                        {c.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <Divider sx={{ my: 1 }} />
                        <Typography variant="subtitle2">Malzemeler</Typography>

                        {formData.items.map((item, index) => (
                            <Box key={index} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                <FormControl sx={{ minWidth: 200 }}>
                                    <InputLabel>Malzeme</InputLabel>
                                    <Select
                                        value={item.material_id || ''}
                                        label="Malzeme"
                                        onChange={(e) => handleItemChange(index, 'material_id', e.target.value as number)}
                                    >
                                        {stockItems.map((s) => (
                                            <MenuItem key={s.material_id} value={s.material_id}>
                                                {s.material_name} ({parseFloat(String(s.total_quantity)).toFixed(2)} {s.unit_of_measure})
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <TextField
                                    label={`Miktar (${item.unit})`}
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                    sx={{ width: 150 }}
                                    helperText={item.available ? `Mevcut: ${item.available.toFixed(2)}` : ''}
                                />
                                <TextField
                                    label="Birim Fiyat (₺)"
                                    type="number"
                                    value={item.unit_price}
                                    onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                                    sx={{ width: 150 }}
                                />
                                <IconButton onClick={() => handleRemoveItem(index)} color="error">
                                    <DeleteIcon />
                                </IconButton>
                            </Box>
                        ))}

                        <Button variant="outlined" onClick={handleAddItem}>
                            + Malzeme Ekle
                        </Button>

                        {formData.items.length > 0 && (
                            <Typography variant="h6" sx={{ textAlign: 'right', mt: 2 }}>
                                Toplam: {calculateTotal().toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                            </Typography>
                        )}

                        <TextField
                            fullWidth
                            label="Notlar"
                            multiline
                            rows={2}
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={handleCloseDialog}>İptal</Button>
                    <Button variant="contained" onClick={handleSubmit}>
                        Kaydet
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
