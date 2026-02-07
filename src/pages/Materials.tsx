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
    FormControl,
    InputLabel,
    Select,
    MenuItem,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
} from '@mui/icons-material';
import { getMaterials, createMaterial, updateMaterial, deleteMaterial } from '../services/api';
import type { Material } from '../types';

export default function Materials() {
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
    const [formData, setFormData] = useState({
        item_name: '',
        item_code: '',
        item_type: 'hammadde',
        unit_of_measure: 'kg',
        description: '',
    });

    useEffect(() => {
        loadMaterials();
    }, []);

    const loadMaterials = async () => {
        try {
            const data = await getMaterials();
            setMaterials(data);
        } catch (error) {
            console.error('Failed to load materials:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (material?: Material) => {
        if (material) {
            setEditingMaterial(material);
            setFormData({
                item_name: material.item_name,
                item_code: material.item_code || '',
                item_type: material.item_type || '',
                unit_of_measure: material.unit_of_measure,
                description: material.description || '',
            });
        } else {
            setEditingMaterial(null);
            setFormData({ item_name: '', item_code: '', item_type: 'hammadde', unit_of_measure: 'kg', description: '' });
        }
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setEditingMaterial(null);
    };

    const handleSubmit = async () => {
        try {
            if (editingMaterial) {
                await updateMaterial(editingMaterial.id, formData);
            } else {
                await createMaterial(formData);
            }
            handleCloseDialog();
            loadMaterials();
        } catch (error) {
            console.error('Failed to save material:', error);
        }
    };

    const handleDelete = async (id: number) => {
        if (confirm('Bu malzemeyi silmek istediğinizden emin misiniz?')) {
            try {
                await deleteMaterial(id);
                loadMaterials();
            } catch (error) {
                console.error('Failed to delete material:', error);
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
                    Malzemeler
                </Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
                    Yeni Malzeme
                </Button>
            </Box>

            <Card>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Ad</TableCell>
                                <TableCell>Kod</TableCell>
                                <TableCell>Tip</TableCell>
                                <TableCell>Birim</TableCell>
                                <TableCell>Açıklama</TableCell>
                                <TableCell align="right">İşlemler</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {materials.map((material) => (
                                <TableRow key={material.id} hover>
                                    <TableCell>{material.item_name}</TableCell>
                                    <TableCell>{material.item_code || '-'}</TableCell>
                                    <TableCell>{material.item_type || '-'}</TableCell>
                                    <TableCell>{material.unit_of_measure}</TableCell>
                                    <TableCell>{material.description || '-'}</TableCell>
                                    <TableCell align="right">
                                        <IconButton size="small" onClick={() => handleOpenDialog(material)}>
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton size="small" onClick={() => handleDelete(material.id)} color="error">
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {materials.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                        Henüz malzeme eklenmemiş
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>{editingMaterial ? 'Malzeme Düzenle' : 'Yeni Malzeme'}</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            fullWidth
                            label="Ad"
                            value={formData.item_name}
                            onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                        />
                        <TextField
                            fullWidth
                            label="Kod"
                            value={formData.item_code}
                            onChange={(e) => setFormData({ ...formData, item_code: e.target.value })}
                        />
                        <FormControl fullWidth>
                            <InputLabel>Tip</InputLabel>
                            <Select
                                value={formData.item_type}
                                label="Tip"
                                onChange={(e) => setFormData({ ...formData, item_type: e.target.value })}
                            >
                                <MenuItem value="hammadde">Hammadde</MenuItem>
                                <MenuItem value="ürün">Ürün</MenuItem>
                                <MenuItem value="tüketim">Tüketim</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel>Ölçü Birimi</InputLabel>
                            <Select
                                value={formData.unit_of_measure}
                                label="Ölçü Birimi"
                                onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })}
                            >
                                <MenuItem value="kg">Kilogram (kg)</MenuItem>
                                <MenuItem value="adet">Adet</MenuItem>
                                <MenuItem value="metre">Metre</MenuItem>
                                <MenuItem value="litre">Litre</MenuItem>
                            </Select>
                        </FormControl>
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
                        {editingMaterial ? 'Güncelle' : 'Kaydet'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
