import { useState, useEffect, Fragment } from 'react';
import {
    Box,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Typography,
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
    CircularProgress,
    Alert,
    Divider,
    Collapse,
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Science as ScienceIcon,
    History as HistoryIcon,
    CategoryOutlined as CategoryIcon,
    KeyboardArrowDown as KeyboardArrowDownIcon,
    KeyboardArrowUp as KeyboardArrowUpIcon,
} from '@mui/icons-material';
import {
    getUllageTypes,
    createUllageType,
    updateUllageType,
    deleteUllageType,
    getPendingReceiving,
    getReceivingTransaction,
    createInspection,
    getInspectionHistory,
    type InspectionHistory,
} from '../services/api';
import type { UllageType, ReceivingTransaction, ReceivingItem } from '../types';

interface UllageInput {
    ullage_type_id: number;
    weight: string;
}

export default function Fire() {
    const [expanded, setExpanded] = useState<string | false>('panel1');
    const [loading, setLoading] = useState(true);

    // Fire Types state
    const [ullageTypes, setUllageTypes] = useState<UllageType[]>([]);
    const [typeDialogOpen, setTypeDialogOpen] = useState(false);
    const [editingType, setEditingType] = useState<UllageType | null>(null);
    const [typeFormData, setTypeFormData] = useState({ name: '', description: '' });

    // Inspections state
    const [transactions, setTransactions] = useState<ReceivingTransaction[]>([]);
    const [inspectionDialogOpen, setInspectionDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<ReceivingItem | null>(null);
    const [selectedTx, setSelectedTx] = useState<ReceivingTransaction | null>(null);
    const [inspectionFormData, setInspectionFormData] = useState({
        sample_weight: '',
        items: [{ ullage_type_id: 0, weight: '' }] as UllageInput[],
    });
    const [result, setResult] = useState<{
        net_weight: number;
        effective_unit_price: number;
        ullage_percentage: number;
        total_cost: number;
    } | null>(null);

    // History state
    const [history, setHistory] = useState<InspectionHistory[]>([]);
    const [expandedHistory, setExpandedHistory] = useState<number | null>(null);

    useEffect(() => {
        loadAllData();
    }, []);

    const loadAllData = async () => {
        try {
            const [typesData, txData, historyData] = await Promise.all([
                getUllageTypes(),
                getPendingReceiving(),
                getInspectionHistory(),
            ]);
            setUllageTypes(typesData);
            setTransactions(txData);
            setHistory(historyData);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAccordionChange = (panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
        setExpanded(isExpanded ? panel : false);
    };

    // ===== FIRE TYPES HANDLERS =====
    const handleOpenTypeDialog = (type?: UllageType) => {
        if (type) {
            setEditingType(type);
            setTypeFormData({ name: type.name, description: type.description || '' });
        } else {
            setEditingType(null);
            setTypeFormData({ name: '', description: '' });
        }
        setTypeDialogOpen(true);
    };

    const handleCloseTypeDialog = () => {
        setTypeDialogOpen(false);
        setEditingType(null);
    };

    const handleTypeSubmit = async () => {
        try {
            if (editingType) {
                await updateUllageType(editingType.id, typeFormData);
            } else {
                await createUllageType(typeFormData);
            }
            handleCloseTypeDialog();
            const data = await getUllageTypes();
            setUllageTypes(data);
        } catch (error) {
            console.error('Failed to save ullage type:', error);
        }
    };

    const handleDeleteType = async (id: number) => {
        if (confirm('Bu fire tipini silmek istediğinizden emin misiniz?')) {
            try {
                await deleteUllageType(id);
                const data = await getUllageTypes();
                setUllageTypes(data);
            } catch (error) {
                console.error('Failed to delete ullage type:', error);
            }
        }
    };

    // ===== INSPECTION HANDLERS =====
    const handleOpenInspectionDialog = async (tx: ReceivingTransaction) => {
        try {
            const details = await getReceivingTransaction(tx.id);
            setSelectedTx(details);
            const uninspected = details.items?.find((item) => !item.net_weight);
            if (uninspected) {
                setSelectedItem(uninspected);
                setInspectionFormData({
                    sample_weight: '',
                    items: [{ ullage_type_id: 0, weight: '' }],
                });
                setResult(null);
                setInspectionDialogOpen(true);
            } else {
                alert('Tüm kalemler incelendi');
            }
        } catch (error) {
            console.error('Failed to load transaction:', error);
        }
    };

    const handleCloseInspectionDialog = () => {
        setInspectionDialogOpen(false);
        setSelectedItem(null);
        setSelectedTx(null);
        setResult(null);
    };

    const handleAddUllage = () => {
        setInspectionFormData({
            ...inspectionFormData,
            items: [...inspectionFormData.items, { ullage_type_id: 0, weight: '' }],
        });
    };

    const handleRemoveUllage = (index: number) => {
        const newItems = inspectionFormData.items.filter((_, i) => i !== index);
        setInspectionFormData({
            ...inspectionFormData,
            items: newItems.length > 0 ? newItems : [{ ullage_type_id: 0, weight: '' }]
        });
    };

    const handleUllageChange = (index: number, field: keyof UllageInput, value: string | number) => {
        const newItems = [...inspectionFormData.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setInspectionFormData({ ...inspectionFormData, items: newItems });
    };

    useEffect(() => {
        if (!selectedItem || !inspectionFormData.sample_weight) {
            setResult(null);
            return;
        }

        const sampleWeight = parseFloat(inspectionFormData.sample_weight);
        const totalUllage = inspectionFormData.items.reduce(
            (sum, item) => sum + (parseFloat(item.weight) || 0), 0
        );
        const ullagePercentage = (totalUllage / sampleWeight) * 100;
        const grossWeight = parseFloat(String(selectedItem.gross_weight));
        const netWeight = grossWeight * (1 - ullagePercentage / 100);
        const unitPrice = parseFloat(String(selectedItem.unit_price));
        const logisticsCost = parseFloat(String(selectedItem.logistics_cost || 0));
        const totalCost = (unitPrice * grossWeight) + logisticsCost;
        const effectiveUnitPrice = totalCost / netWeight;

        setResult({ net_weight: netWeight, effective_unit_price: effectiveUnitPrice, ullage_percentage: ullagePercentage, total_cost: totalCost });
    }, [inspectionFormData.sample_weight, inspectionFormData.items, selectedItem]);

    const handleInspectionSubmit = async () => {
        if (!selectedItem) return;
        try {
            const validItems = inspectionFormData.items.filter(
                (item) => item.ullage_type_id && item.weight
            );
            await createInspection({
                receiving_item_id: selectedItem.id,
                sample_weight: parseFloat(inspectionFormData.sample_weight),
                items: validItems.map((item) => ({
                    ullage_type_id: item.ullage_type_id,
                    weight: parseFloat(item.weight),
                })),
            });
            handleCloseInspectionDialog();
            loadAllData();
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
                Fire Yönetimi
            </Typography>

            {/* Panel 1: Fire Types */}
            <Accordion expanded={expanded === 'panel1'} onChange={handleAccordionChange('panel1')}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <CategoryIcon sx={{ mr: 2, color: 'primary.main' }} />
                    <Typography sx={{ fontWeight: 500 }}>Fire Tipleri</Typography>
                    <Chip label={ullageTypes.length} size="small" sx={{ ml: 2 }} />
                </AccordionSummary>
                <AccordionDetails>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenTypeDialog()}>
                            Yeni Fire Tipi
                        </Button>
                    </Box>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Ad</TableCell>
                                    <TableCell>Açıklama</TableCell>
                                    <TableCell align="right">İşlemler</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {ullageTypes.map((type) => (
                                    <TableRow key={type.id} hover>
                                        <TableCell>{type.name}</TableCell>
                                        <TableCell>{type.description || '-'}</TableCell>
                                        <TableCell align="right">
                                            <IconButton size="small" onClick={() => handleOpenTypeDialog(type)}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton size="small" onClick={() => handleDeleteType(type.id)} color="error">
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {ullageTypes.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                                            Henüz fire tipi eklenmemiş
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </AccordionDetails>
            </Accordion>

            {/* Panel 2: Fire Analysis */}
            <Accordion expanded={expanded === 'panel2'} onChange={handleAccordionChange('panel2')}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <ScienceIcon sx={{ mr: 2, color: 'warning.main' }} />
                    <Typography sx={{ fontWeight: 500 }}>Fire Analizi (Bekleyen Alımlar)</Typography>
                    <Chip label={transactions.length} size="small" color="warning" sx={{ ml: 2 }} />
                </AccordionSummary>
                <AccordionDetails>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Tarih</TableCell>
                                    <TableCell>Tedarikçi</TableCell>
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
                                        <TableCell>
                                            <Chip label="İnceleme Bekliyor" size="small" color="warning" />
                                        </TableCell>
                                        <TableCell align="right">
                                            <Button size="small" startIcon={<ScienceIcon />} onClick={() => handleOpenInspectionDialog(tx)}>
                                                İncele
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {transactions.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                                            İnceleme bekleyen alım yok
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </AccordionDetails>
            </Accordion>

            {/* Panel 3: Fire History */}
            <Accordion expanded={expanded === 'panel3'} onChange={handleAccordionChange('panel3')}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <HistoryIcon sx={{ mr: 2, color: 'success.main' }} />
                    <Typography sx={{ fontWeight: 500 }}>Fire Geçmişi</Typography>
                    <Chip label={history.length} size="small" color="success" sx={{ ml: 2 }} />
                </AccordionSummary>
                <AccordionDetails>
                    <TableContainer>
                        <Table size="small">
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
                                        <TableRow hover sx={{ cursor: 'pointer' }} onClick={() => setExpandedHistory(expandedHistory === item.id ? null : item.id)}>
                                            <TableCell>
                                                <IconButton size="small">
                                                    {expandedHistory === item.id ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
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
                                                <Collapse in={expandedHistory === item.id} timeout="auto" unmountOnExit>
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
                </AccordionDetails>
            </Accordion>

            {/* Fire Type Dialog */}
            <Dialog open={typeDialogOpen} onClose={handleCloseTypeDialog} maxWidth="sm" fullWidth>
                <DialogTitle>{editingType ? 'Fire Tipi Düzenle' : 'Yeni Fire Tipi'}</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            fullWidth
                            label="Ad"
                            value={typeFormData.name}
                            onChange={(e) => setTypeFormData({ ...typeFormData, name: e.target.value })}
                        />
                        <TextField
                            fullWidth
                            label="Açıklama"
                            multiline
                            rows={2}
                            value={typeFormData.description}
                            onChange={(e) => setTypeFormData({ ...typeFormData, description: e.target.value })}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={handleCloseTypeDialog}>İptal</Button>
                    <Button variant="contained" onClick={handleTypeSubmit}>
                        {editingType ? 'Güncelle' : 'Kaydet'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Inspection Dialog */}
            <Dialog open={inspectionDialogOpen} onClose={handleCloseInspectionDialog} maxWidth="md" fullWidth>
                <DialogTitle>Fire Analizi</DialogTitle>
                <DialogContent>
                    {selectedItem && selectedTx && (
                        <Box sx={{ pt: 2 }}>
                            <Alert severity="info" sx={{ mb: 3 }}>
                                <strong>Malzeme:</strong> {selectedItem.material_name} |{' '}
                                <strong>Brüt Ağırlık:</strong> {parseFloat(String(selectedItem.gross_weight)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {selectedItem.unit_of_measure} |{' '}
                                <strong>Birim Fiyat:</strong> {parseFloat(String(selectedItem.unit_price)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                            </Alert>

                            <TextField
                                fullWidth
                                label="Numune Ağırlığı (kg)"
                                type="number"
                                value={inspectionFormData.sample_weight}
                                onChange={(e) => setInspectionFormData({ ...inspectionFormData, sample_weight: e.target.value })}
                                sx={{ mb: 3 }}
                            />

                            <Divider sx={{ my: 2 }} />
                            <Typography variant="subtitle2" sx={{ mb: 2 }}>Fire Ölçümleri</Typography>

                            {inspectionFormData.items.map((item, index) => (
                                <Box key={index} sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                                    <FormControl sx={{ minWidth: 200 }}>
                                        <InputLabel>Fire Tipi</InputLabel>
                                        <Select
                                            value={item.ullage_type_id || ''}
                                            label="Fire Tipi"
                                            onChange={(e) => handleUllageChange(index, 'ullage_type_id', e.target.value as number)}
                                        >
                                            {ullageTypes.map((t) => (
                                                <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
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
                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Hesaplama Sonucu</Typography>
                                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 2 }}>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">Fire Oranı</Typography>
                                            <Typography variant="h6">%{result.ullage_percentage.toFixed(2)}</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">Net Ağırlık</Typography>
                                            <Typography variant="h6">
                                                {result.net_weight.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {selectedItem.unit_of_measure}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">Toplam Tutar</Typography>
                                            <Typography variant="h6" sx={{ color: '#10b981' }}>
                                                {result.total_cost.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">Efektif Birim Fiyat</Typography>
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
                    <Button onClick={handleCloseInspectionDialog}>İptal</Button>
                    <Button variant="contained" onClick={handleInspectionSubmit} disabled={!result}>
                        Kaydet
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
