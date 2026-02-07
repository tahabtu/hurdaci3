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
    Typography,
    CircularProgress,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
} from '@mui/icons-material';
import { getUllageTypes, createUllageType, updateUllageType, deleteUllageType } from '../services/api';
import type { UllageType } from '../types';

export default function UllageTypes() {
    const [ullageTypes, setUllageTypes] = useState<UllageType[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingType, setEditingType] = useState<UllageType | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
    });

    useEffect(() => {
        loadUllageTypes();
    }, []);

    const loadUllageTypes = async () => {
        try {
            const data = await getUllageTypes();
            setUllageTypes(data);
        } catch (error) {
            console.error('Failed to load ullage types:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (ullageType?: UllageType) => {
        if (ullageType) {
            setEditingType(ullageType);
            setFormData({
                name: ullageType.name,
                description: ullageType.description || '',
            });
        } else {
            setEditingType(null);
            setFormData({ name: '', description: '' });
        }
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setEditingType(null);
    };

    const handleSubmit = async () => {
        try {
            if (editingType) {
                await updateUllageType(editingType.id, formData);
            } else {
                await createUllageType(formData);
            }
            handleCloseDialog();
            loadUllageTypes();
        } catch (error) {
            console.error('Failed to save ullage type:', error);
        }
    };

    const handleDelete = async (id: number) => {
        if (confirm('Bu fire tipini silmek istediğinizden emin misiniz?')) {
            try {
                await deleteUllageType(id);
                loadUllageTypes();
            } catch (error) {
                console.error('Failed to delete ullage type:', error);
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
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    Fire Tipleri
                </Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
                    Yeni Fire Tipi
                </Button>
            </Box>

            <Card>
                <TableContainer>
                    <Table>
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
                                        <IconButton size="small" onClick={() => handleOpenDialog(type)}>
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton size="small" onClick={() => handleDelete(type.id)} color="error">
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
            </Card>

            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>{editingType ? 'Fire Tipi Düzenle' : 'Yeni Fire Tipi'}</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            fullWidth
                            label="Ad"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                        <TextField
                            fullWidth
                            label="Açıklama"
                            multiline
                            rows={2}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={handleCloseDialog}>İptal</Button>
                    <Button variant="contained" onClick={handleSubmit}>
                        {editingType ? 'Güncelle' : 'Kaydet'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
