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
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
} from '@mui/icons-material';
import { getPartners, createPartner, updatePartner, deletePartner } from '../services/api';
import type { Partner } from '../types';

export default function Partners() {
    const [partners, setPartners] = useState<Partner[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        type: 'supplier' as 'customer' | 'supplier' | 'bank',
        phone: '',
        email: '',
        address: '',
    });

    useEffect(() => {
        loadPartners();
    }, []);

    const loadPartners = async () => {
        try {
            const data = await getPartners();
            setPartners(data);
        } catch (error) {
            console.error('Failed to load partners:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (partner?: Partner) => {
        if (partner) {
            setEditingPartner(partner);
            setFormData({
                name: partner.name,
                type: partner.type,
                phone: partner.phone || '',
                email: partner.email || '',
                address: partner.address || '',
            });
        } else {
            setEditingPartner(null);
            setFormData({ name: '', type: 'supplier', phone: '', email: '', address: '' });
        }
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setEditingPartner(null);
    };

    const handleSubmit = async () => {
        try {
            if (editingPartner) {
                await updatePartner(editingPartner.id, formData);
            } else {
                await createPartner(formData);
            }
            handleCloseDialog();
            loadPartners();
        } catch (error) {
            console.error('Failed to save partner:', error);
        }
    };

    const handleDelete = async (id: number) => {
        if (confirm('Bu partneri silmek istediğinizden emin misiniz?')) {
            try {
                await deletePartner(id);
                loadPartners();
            } catch (error) {
                console.error('Failed to delete partner:', error);
            }
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'customer': return 'Müşteri';
            case 'supplier': return 'Tedarikçi';
            case 'bank': return 'Banka';
            default: return type;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'customer': return 'info';
            case 'supplier': return 'warning';
            case 'bank': return 'success';
            default: return 'default';
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
                    Partnerler
                </Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
                    Yeni Partner
                </Button>
            </Box>

            <Card>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Ad</TableCell>
                                <TableCell>Tip</TableCell>
                                <TableCell>Telefon</TableCell>
                                <TableCell>E-posta</TableCell>
                                <TableCell align="right">Bakiye (₺)</TableCell>
                                <TableCell align="right">İşlemler</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {partners.map((partner) => (
                                <TableRow key={partner.id} hover>
                                    <TableCell>{partner.name}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={getTypeLabel(partner.type)}
                                            size="small"
                                            color={getTypeColor(partner.type) as 'info' | 'warning' | 'success' | 'default'}
                                        />
                                    </TableCell>
                                    <TableCell>{partner.phone || '-'}</TableCell>
                                    <TableCell>{partner.email || '-'}</TableCell>
                                    <TableCell align="right">
                                        <Typography
                                            sx={{
                                                color: parseFloat(String(partner.balance)) > 0 ? '#10b981' : parseFloat(String(partner.balance)) < 0 ? '#ef4444' : 'inherit',
                                                fontWeight: 500,
                                            }}
                                        >
                                            {parseFloat(String(partner.balance)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton size="small" onClick={() => handleOpenDialog(partner)}>
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton size="small" onClick={() => handleDelete(partner.id)} color="error">
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {partners.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                        Henüz partner eklenmemiş
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>{editingPartner ? 'Partner Düzenle' : 'Yeni Partner'}</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            fullWidth
                            label="Ad"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                        <FormControl fullWidth>
                            <InputLabel>Tip</InputLabel>
                            <Select
                                value={formData.type}
                                label="Tip"
                                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'customer' | 'supplier' | 'bank' })}
                            >
                                <MenuItem value="supplier">Tedarikçi</MenuItem>
                                <MenuItem value="customer">Müşteri</MenuItem>
                                <MenuItem value="bank">Banka</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            fullWidth
                            label="Telefon"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                        <TextField
                            fullWidth
                            label="E-posta"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                        <TextField
                            fullWidth
                            label="Adres"
                            multiline
                            rows={2}
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={handleCloseDialog}>İptal</Button>
                    <Button variant="contained" onClick={handleSubmit}>
                        {editingPartner ? 'Güncelle' : 'Kaydet'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
