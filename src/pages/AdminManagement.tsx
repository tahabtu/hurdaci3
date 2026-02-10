import { useState, useEffect } from 'react';
import {
    Box,
    Tabs,
    Tab,
    Card,
    Typography,
    Button,
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
    Alert,
    Grid,
    Paper,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Business as BusinessIcon,
    People as PeopleIcon,
    BarChart as StatsIcon,
} from '@mui/icons-material';
import {
    getTenants,
    createTenant,
    updateTenant,
    deleteTenant,
    getAdminUsers,
    createAdminUser,
    updateAdminUser,
    deleteAdminUser,
    getAdminStats,
    Tenant,
    AdminUser,
    AdminStats,
} from '../services/api';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div hidden={value !== index} {...other}>
            {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
        </div>
    );
}

export default function AdminManagement() {
    const [tabValue, setTabValue] = useState(0);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [_loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Tenant dialog
    const [tenantDialogOpen, setTenantDialogOpen] = useState(false);
    const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
    const [tenantName, setTenantName] = useState('');

    // User dialog
    const [userDialogOpen, setUserDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
    const [userForm, setUserForm] = useState({
        tenant_id: '' as number | '',
        username: '',
        password: '',
        name: '',
        role: 'user' as 'superuser' | 'admin' | 'user',
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [tenantsData, usersData, statsData] = await Promise.all([
                getTenants(),
                getAdminUsers(),
                getAdminStats(),
            ]);
            setTenants(tenantsData);
            setUsers(usersData);
            setStats(statsData);
            setError('');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Veriler alınırken hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Tenant handlers
    const handleOpenTenantDialog = (tenant?: Tenant) => {
        if (tenant) {
            setEditingTenant(tenant);
            setTenantName(tenant.name);
        } else {
            setEditingTenant(null);
            setTenantName('');
        }
        setTenantDialogOpen(true);
    };

    const handleCloseTenantDialog = () => {
        setTenantDialogOpen(false);
        setEditingTenant(null);
        setTenantName('');
    };

    const handleSaveTenant = async () => {
        try {
            if (editingTenant) {
                await updateTenant(editingTenant.id, tenantName);
            } else {
                await createTenant(tenantName);
            }
            handleCloseTenantDialog();
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Tenant kaydedilemedi');
        }
    };

    const handleDeleteTenant = async (id: number) => {
        if (!confirm('Bu tenant\'ı silmek istediğinizden emin misiniz?')) return;
        try {
            await deleteTenant(id);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Tenant silinemedi');
        }
    };

    // User handlers
    const handleOpenUserDialog = (user?: AdminUser) => {
        if (user) {
            setEditingUser(user);
            setUserForm({
                tenant_id: user.tenant_id || '',
                username: user.username,
                password: '',
                name: user.name,
                role: user.role,
            });
        } else {
            setEditingUser(null);
            setUserForm({
                tenant_id: '',
                username: '',
                password: '',
                name: '',
                role: 'user',
            });
        }
        setUserDialogOpen(true);
    };

    const handleCloseUserDialog = () => {
        setUserDialogOpen(false);
        setEditingUser(null);
    };

    const handleSaveUser = async () => {
        try {
            const data = {
                tenant_id: userForm.tenant_id || undefined,
                username: userForm.username,
                password: userForm.password || undefined,
                name: userForm.name,
                role: userForm.role,
            };

            if (editingUser) {
                await updateAdminUser(editingUser.id, data as any);
            } else {
                if (!userForm.password) {
                    setError('Yeni kullanıcı için şifre gerekli');
                    return;
                }
                await createAdminUser(data as any);
            }
            handleCloseUserDialog();
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Kullanıcı kaydedilemedi');
        }
    };

    const handleDeleteUser = async (id: number) => {
        if (!confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) return;
        try {
            await deleteAdminUser(id);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Kullanıcı silinemedi');
        }
    };

    const getRoleChip = (role: string) => {
        const colors: Record<string, 'error' | 'warning' | 'default'> = {
            superuser: 'error',
            admin: 'warning',
            user: 'default',
        };
        const labels: Record<string, string> = {
            superuser: 'Süper Kullanıcı',
            admin: 'Yönetici',
            user: 'Kullanıcı',
        };
        return <Chip size="small" label={labels[role]} color={colors[role]} />;
    };

    return (
        <Box>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
                Yönetim Paneli
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            <Card>
                <Tabs
                    value={tabValue}
                    onChange={(_, v) => setTabValue(v)}
                    sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
                >
                    <Tab icon={<StatsIcon />} iconPosition="start" label="İstatistikler" />
                    <Tab icon={<BusinessIcon />} iconPosition="start" label="Tenantlar" />
                    <Tab icon={<PeopleIcon />} iconPosition="start" label="Kullanıcılar" />
                </Tabs>

                {/* Stats Tab */}
                <TabPanel value={tabValue} index={0}>
                    <Box sx={{ px: 3 }}>
                        <Grid container spacing={3}>
                            {stats && (
                                <>
                                    <Grid item xs={12} sm={6} md={4}>
                                        <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#f0fdf4' }}>
                                            <Typography variant="h3" color="primary">{stats.tenants}</Typography>
                                            <Typography color="textSecondary">Tenant</Typography>
                                        </Paper>
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={4}>
                                        <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#eff6ff' }}>
                                            <Typography variant="h3" color="primary">{stats.users}</Typography>
                                            <Typography color="textSecondary">Kullanıcı</Typography>
                                        </Paper>
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={4}>
                                        <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#fef3c7' }}>
                                            <Typography variant="h3" color="primary">{stats.partners}</Typography>
                                            <Typography color="textSecondary">Partner</Typography>
                                        </Paper>
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={4}>
                                        <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#fce7f3' }}>
                                            <Typography variant="h3" color="primary">{stats.materials}</Typography>
                                            <Typography color="textSecondary">Malzeme</Typography>
                                        </Paper>
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={4}>
                                        <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#e0e7ff' }}>
                                            <Typography variant="h3" color="primary">{stats.receiving_transactions}</Typography>
                                            <Typography color="textSecondary">Alım İşlemi</Typography>
                                        </Paper>
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={4}>
                                        <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#dcfce7' }}>
                                            <Typography variant="h3" color="primary">{stats.selling_transactions}</Typography>
                                            <Typography color="textSecondary">Satış İşlemi</Typography>
                                        </Paper>
                                    </Grid>
                                </>
                            )}
                        </Grid>
                    </Box>
                </TabPanel>

                {/* Tenants Tab */}
                <TabPanel value={tabValue} index={1}>
                    <Box sx={{ px: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => handleOpenTenantDialog()}
                            >
                                Yeni Tenant
                            </Button>
                        </Box>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>ID</TableCell>
                                        <TableCell>Ad</TableCell>
                                        <TableCell>Kullanıcı Sayısı</TableCell>
                                        <TableCell>Oluşturma Tarihi</TableCell>
                                        <TableCell align="right">İşlemler</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {tenants.map((tenant) => (
                                        <TableRow key={tenant.id}>
                                            <TableCell>{tenant.id}</TableCell>
                                            <TableCell>{tenant.name}</TableCell>
                                            <TableCell>{tenant.user_count || 0}</TableCell>
                                            <TableCell>
                                                {new Date(tenant.created_at).toLocaleDateString('tr-TR')}
                                            </TableCell>
                                            <TableCell align="right">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleOpenTenantDialog(tenant)}
                                                >
                                                    <EditIcon />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => handleDeleteTenant(tenant.id)}
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                </TabPanel>

                {/* Users Tab */}
                <TabPanel value={tabValue} index={2}>
                    <Box sx={{ px: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => handleOpenUserDialog()}
                            >
                                Yeni Kullanıcı
                            </Button>
                        </Box>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>ID</TableCell>
                                        <TableCell>Kullanıcı Adı</TableCell>
                                        <TableCell>İsim</TableCell>
                                        <TableCell>Rol</TableCell>
                                        <TableCell>Tenant</TableCell>
                                        <TableCell align="right">İşlemler</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {users.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell>{user.id}</TableCell>
                                            <TableCell>{user.username}</TableCell>
                                            <TableCell>{user.name}</TableCell>
                                            <TableCell>{getRoleChip(user.role)}</TableCell>
                                            <TableCell>{user.tenant_name || '-'}</TableCell>
                                            <TableCell align="right">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleOpenUserDialog(user)}
                                                >
                                                    <EditIcon />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => handleDeleteUser(user.id)}
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                </TabPanel>
            </Card>

            {/* Tenant Dialog */}
            <Dialog open={tenantDialogOpen} onClose={handleCloseTenantDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editingTenant ? 'Tenant Düzenle' : 'Yeni Tenant'}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Tenant Adı"
                        fullWidth
                        value={tenantName}
                        onChange={(e) => setTenantName(e.target.value)}
                        sx={{ mt: 2 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseTenantDialog}>İptal</Button>
                    <Button onClick={handleSaveTenant} variant="contained">
                        Kaydet
                    </Button>
                </DialogActions>
            </Dialog>

            {/* User Dialog */}
            <Dialog open={userDialogOpen} onClose={handleCloseUserDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editingUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Kullanıcı Adı"
                        fullWidth
                        value={userForm.username}
                        onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                        sx={{ mt: 2 }}
                    />
                    <TextField
                        margin="dense"
                        label={editingUser ? 'Yeni Şifre (boş bırakılabilir)' : 'Şifre'}
                        type="password"
                        fullWidth
                        value={userForm.password}
                        onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    />
                    <TextField
                        margin="dense"
                        label="İsim"
                        fullWidth
                        value={userForm.name}
                        onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                    />
                    <FormControl fullWidth margin="dense">
                        <InputLabel>Rol</InputLabel>
                        <Select
                            value={userForm.role}
                            label="Rol"
                            onChange={(e) => setUserForm({ ...userForm, role: e.target.value as any })}
                        >
                            <MenuItem value="user">Kullanıcı</MenuItem>
                            <MenuItem value="admin">Yönetici</MenuItem>
                            <MenuItem value="superuser">Süper Kullanıcı</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl fullWidth margin="dense">
                        <InputLabel>Tenant</InputLabel>
                        <Select
                            value={userForm.tenant_id}
                            label="Tenant"
                            onChange={(e) => setUserForm({ ...userForm, tenant_id: e.target.value as number | '' })}
                        >
                            <MenuItem value="">Seçiniz</MenuItem>
                            {tenants.map((t) => (
                                <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseUserDialog}>İptal</Button>
                    <Button onClick={handleSaveUser} variant="contained">
                        Kaydet
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
