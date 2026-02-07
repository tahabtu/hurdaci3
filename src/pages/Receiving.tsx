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
    Chip,
    Typography,
    CircularProgress,
    Collapse,
    Divider,
    Checkbox,
    Tooltip,
} from '@mui/material';
import {
    Add as AddIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    Check as CheckIcon,
    Close as CloseIcon,
    Delete as DeleteIcon,
} from '@mui/icons-material';
import {
    getReceivingTransactions,
    getReceivingTransaction,
    createReceivingTransaction,
    approveReceiving,
    rejectReceiving,
    getPartnersByType,
    getMaterials,
} from '../services/api';
import type { ReceivingTransaction, Partner, Material } from '../types';

interface ItemInput {
    material_id: number;
    gross_weight: string;
    unit_price: string;
}

export default function Receiving() {
    const [transactions, setTransactions] = useState<ReceivingTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [suppliers, setSuppliers] = useState<Partner[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [expandedDetails, setExpandedDetails] = useState<ReceivingTransaction | null>(null);

    const [formData, setFormData] = useState({
        partner_id: '',
        doc_date: new Date().toISOString().split('T')[0],
        plate_no_1: '',
        plate_no_2: '',
        is_reported: false,
        logistics_cost: '0',
        notes: '',
        items: [{ material_id: 0, gross_weight: '', unit_price: '' }] as ItemInput[],
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [txData, suppliersData, materialsData] = await Promise.all([
                getReceivingTransactions(),
                getPartnersByType('supplier'),
                getMaterials(),
            ]);
            setTransactions(txData);
            setSuppliers(suppliersData);
            setMaterials(materialsData);
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
                const details = await getReceivingTransaction(id);
                setExpandedDetails(details);
            } catch (error) {
                console.error('Failed to load details:', error);
            }
        }
    };

    const handleOpenDialog = () => {
        setFormData({
            partner_id: '',
            doc_date: new Date().toISOString().split('T')[0],
            plate_no_1: '',
            plate_no_2: '',
            is_reported: false,
            logistics_cost: '0',
            notes: '',
            items: [{ material_id: 0, gross_weight: '', unit_price: '' }],
        });
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
    };

    const handleAddItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { material_id: 0, gross_weight: '', unit_price: '' }],
        });
    };

    const handleRemoveItem = (index: number) => {
        const newItems = formData.items.filter((_, i) => i !== index);
        setFormData({ ...formData, items: newItems.length > 0 ? newItems : [{ material_id: 0, gross_weight: '', unit_price: '' }] });
    };

    const handleItemChange = (index: number, field: keyof ItemInput, value: string | number) => {
        const newItems = [...formData.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setFormData({ ...formData, items: newItems });
    };

    const handleSubmit = async () => {
        try {
            const validItems = formData.items.filter(
                (item) => item.material_id && item.gross_weight && item.unit_price
            );

            if (validItems.length === 0) {
                alert('En az bir malzeme satırı ekleyin');
                return;
            }

            await createReceivingTransaction({
                partner_id: parseInt(formData.partner_id),
                doc_date: formData.doc_date || undefined,
                plate_no_1: formData.plate_no_1 || undefined,
                plate_no_2: formData.plate_no_2 || undefined,
                is_reported: formData.is_reported,
                logistics_cost: parseFloat(formData.logistics_cost) || 0,
                notes: formData.notes,
                items: validItems.map((item) => ({
                    material_id: item.material_id,
                    gross_weight: parseFloat(item.gross_weight),
                    unit_price: parseFloat(item.unit_price),
                })),
            });
            handleCloseDialog();
            loadData();
        } catch (error) {
            console.error('Failed to create transaction:', error);
        }
    };

    const handleApprove = async (id: number) => {
        if (confirm('Bu işlemi onaylamak istediğinizden emin misiniz?')) {
            try {
                await approveReceiving(id);
                loadData();
            } catch (error) {
                console.error('Failed to approve:', error);
            }
        }
    };

    const handleReject = async (id: number) => {
        if (confirm('Bu işlemi reddetmek istediğinizden emin misiniz?')) {
            try {
                await rejectReceiving(id);
                loadData();
            } catch (error) {
                console.error('Failed to reject:', error);
            }
        }
    };

    const getStatusChip = (status: string) => {
        const config: Record<string, { label: string; color: 'warning' | 'info' | 'success' | 'error' }> = {
            pending: { label: 'Bekliyor', color: 'warning' },
            inspected: { label: 'Onay Bekliyor', color: 'info' },
            approved: { label: 'Onaylandı', color: 'success' },
            rejected: { label: 'Reddedildi', color: 'error' },
        };
        const { label, color } = config[status] || { label: status, color: 'warning' as const };
        return <Chip label={label} size="small" color={color} />;
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
                    Alım İşlemleri
                </Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenDialog}>
                    Yeni Alım
                </Button>
            </Box>

            <Card>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell width={50}></TableCell>
                                <TableCell>Tarih</TableCell>
                                <TableCell>Tedarikçi</TableCell>
                                <TableCell>Plaka 1</TableCell>
                                <TableCell>Plaka 2</TableCell>
                                <TableCell align="right">Lojistik (₺)</TableCell>
                                <TableCell align="right">Toplam (₺)</TableCell>
                                <TableCell>Durum</TableCell>
                                <TableCell align="right">İşlemler</TableCell>
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
                                        <TableCell>{tx.plate_no_1 || '-'}</TableCell>
                                        <TableCell>{tx.plate_no_2 || '-'}</TableCell>
                                        <TableCell align="right">
                                            {parseFloat(String(tx.logistics_cost)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                        </TableCell>
                                        <TableCell align="right">
                                            {parseFloat(String(tx.total_amount)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                        </TableCell>
                                        <TableCell>{getStatusChip(tx.status)}</TableCell>
                                        <TableCell align="right">
                                            {tx.status === 'inspected' && (
                                                <>
                                                    <IconButton size="small" color="success" onClick={() => handleApprove(tx.id)}>
                                                        <CheckIcon fontSize="small" />
                                                    </IconButton>
                                                    <IconButton size="small" color="error" onClick={() => handleReject(tx.id)}>
                                                        <CloseIcon fontSize="small" />
                                                    </IconButton>
                                                </>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell colSpan={9} sx={{ py: 0, borderBottom: expandedId === tx.id ? undefined : 'none' }}>
                                            <Collapse in={expandedId === tx.id}>
                                                <Box sx={{ py: 2 }}>
                                                    {expandedDetails && expandedDetails.items && (
                                                        <Table size="small">
                                                            <TableHead>
                                                                <TableRow>
                                                                    <TableCell>Malzeme</TableCell>
                                                                    <TableCell align="right">Brüt Ağırlık</TableCell>
                                                                    <TableCell align="right">Net Ağırlık</TableCell>
                                                                    <TableCell align="right">Birim Fiyat (₺)</TableCell>
                                                                    <TableCell align="right">Efektif Fiyat (₺)</TableCell>
                                                                    <TableCell align="right">Tutar (₺)</TableCell>
                                                                </TableRow>
                                                            </TableHead>
                                                            <TableBody>
                                                                {expandedDetails.items.map((item) => (
                                                                    <TableRow key={item.id}>
                                                                        <TableCell>{item.material_name}</TableCell>
                                                                        <TableCell align="right">
                                                                            {parseFloat(String(item.gross_weight)).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {item.unit_of_measure}
                                                                        </TableCell>
                                                                        <TableCell align="right">
                                                                            {item.net_weight
                                                                                ? `${parseFloat(String(item.net_weight)).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${item.unit_of_measure}`
                                                                                : '-'}
                                                                        </TableCell>
                                                                        <TableCell align="right">
                                                                            {parseFloat(String(item.unit_price)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                                                        </TableCell>
                                                                        <TableCell align="right">
                                                                            {item.effective_unit_price
                                                                                ? parseFloat(String(item.effective_unit_price)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })
                                                                                : '-'}
                                                                        </TableCell>
                                                                        <TableCell align="right">
                                                                            {parseFloat(String(item.total_amount)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    )}
                                                    {expandedDetails?.notes && (
                                                        <Typography variant="body2" sx={{ mt: 2, color: '#64748b' }}>
                                                            Not: {expandedDetails.notes}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </Collapse>
                                        </TableCell>
                                    </TableRow>
                                </>
                            ))}
                            {transactions.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                                        Henüz alım işlemi yok
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>Yeni Alım İşlemi</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <FormControl fullWidth>
                            <InputLabel>Tedarikçi</InputLabel>
                            <Select
                                value={formData.partner_id}
                                label="Tedarikçi"
                                onChange={(e) => setFormData({ ...formData, partner_id: e.target.value as string })}
                            >
                                {suppliers.map((s) => (
                                    <MenuItem key={s.id} value={s.id}>
                                        {s.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                            <TextField
                                fullWidth
                                label="Evrak Tarihi"
                                type="date"
                                value={formData.doc_date}
                                onChange={(e) => setFormData({ ...formData, doc_date: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            />
                            <Tooltip title="Rapor için işaretle">
                                <Checkbox
                                    checked={formData.is_reported}
                                    onChange={(e) => setFormData({ ...formData, is_reported: e.target.checked })}
                                />
                            </Tooltip>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                fullWidth
                                label="Plaka 1 (Çekici)"
                                value={formData.plate_no_1}
                                onChange={(e) => setFormData({ ...formData, plate_no_1: e.target.value.toUpperCase() })}
                            />
                            <TextField
                                fullWidth
                                label="Plaka 2 (Dorse)"
                                value={formData.plate_no_2}
                                onChange={(e) => setFormData({ ...formData, plate_no_2: e.target.value.toUpperCase() })}
                            />
                        </Box>

                        <TextField
                            fullWidth
                            label="Lojistik Maliyeti (₺)"
                            type="number"
                            value={formData.logistics_cost}
                            onChange={(e) => setFormData({ ...formData, logistics_cost: e.target.value })}
                        />

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
                                        {materials.map((m) => (
                                            <MenuItem key={m.id} value={m.id}>
                                                {m.item_name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <TextField
                                    label="Brüt Ağırlık (kg)"
                                    type="number"
                                    value={item.gross_weight}
                                    onChange={(e) => handleItemChange(index, 'gross_weight', e.target.value)}
                                    sx={{ width: 150 }}
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
