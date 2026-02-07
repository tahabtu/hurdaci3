import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import {
    Box,
    Drawer,
    AppBar,
    Toolbar,
    List,
    Typography,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    IconButton,
    Avatar,
    Tooltip,
    Collapse,
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    People as PeopleIcon,
    Inventory as InventoryIcon,
    ShoppingCart as ShoppingCartIcon,
    PointOfSale as PointOfSaleIcon,
    Science as ScienceIcon,
    AccountBalance as AccountBalanceIcon,
    Warehouse as WarehouseIcon,
    Logout as LogoutIcon,
    Category as CategoryIcon,
    History as HistoryIcon,
    ExpandLess,
    ExpandMore,
    Whatshot as FireIcon,
} from '@mui/icons-material';
import type { User } from './types';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Partners from './pages/Partners';
import Materials from './pages/Materials';
import UllageTypes from './pages/UllageTypes';
import Receiving from './pages/Receiving';
import Inspections from './pages/Inspections';
import FireHistory from './pages/FireHistory';
import Selling from './pages/Selling';
import Stock from './pages/Stock';
import MoneyHistory from './pages/MoneyHistory';

const drawerWidth = 260;

const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Partnerler', icon: <PeopleIcon />, path: '/partners' },
    { text: 'Malzemeler', icon: <InventoryIcon />, path: '/materials' },
    { text: 'Alım İşlemleri', icon: <ShoppingCartIcon />, path: '/receiving' },
    // Fire is handled separately as a submenu
    { text: 'Satış İşlemleri', icon: <PointOfSaleIcon />, path: '/selling' },
    { text: 'Stok', icon: <WarehouseIcon />, path: '/stock' },
    { text: 'Kasa Hareketleri', icon: <AccountBalanceIcon />, path: '/money' },
];

const fireSubItems = [
    { text: 'Fire Analizi', icon: <ScienceIcon />, path: '/fire-analysis' },
    { text: 'Fire Geçmişi', icon: <HistoryIcon />, path: '/fire-history' },
    { text: 'Fire Tipleri', icon: <CategoryIcon />, path: '/fire-types' },
];

function App() {
    const [user, setUser] = useState<User | null>(null);
    const [fireMenuOpen, setFireMenuOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Auto-expand Fire menu if on a fire route
    useEffect(() => {
        if (location.pathname.startsWith('/fire')) {
            setFireMenuOpen(true);
        }
    }, [location.pathname]);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    const handleLogin = (userData: User) => {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        navigate('/');
    };

    const handleLogout = async () => {
        try {
            const { logout } = await import('./services/api');
            await logout();
        } catch (error) {
            console.error('Logout error:', error);
        }
        setUser(null);
        navigate('/login');
    };

    if (!user) {
        return <Login onLogin={handleLogin} />;
    }

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            <AppBar
                position="fixed"
                sx={{
                    width: `calc(100% - ${drawerWidth}px)`,
                    ml: `${drawerWidth}px`,
                    background: '#ffffff',
                    borderBottom: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                }}
            >
                <Toolbar>
                    <Typography variant="h6" noWrap sx={{ flexGrow: 1, fontWeight: 600, color: '#1e293b' }}>
                        {menuItems.find((item) => item.path === location.pathname)?.text ||
                            fireSubItems.find((item) => item.path === location.pathname)?.text ||
                            'Hurdacı'}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>
                            {user.name}
                        </Typography>
                        <Tooltip title="Çıkış Yap">
                            <IconButton onClick={handleLogout} sx={{ color: '#64748b' }}>
                                <LogoutIcon />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Toolbar>
            </AppBar>

            <Drawer
                sx={{
                    width: drawerWidth,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: drawerWidth,
                        boxSizing: 'border-box',
                        background: '#ffffff',
                        borderRight: '1px solid #e2e8f0',
                    },
                }}
                variant="permanent"
                anchor="left"
            >
                <Box
                    sx={{
                        p: 3,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        borderBottom: '1px solid #e2e8f0',
                    }}
                >
                    <Avatar
                        sx={{
                            width: 48,
                            height: 48,
                            background: 'linear-gradient(135deg, #0d9488 0%, #2563eb 100%)',
                            fontSize: '1.5rem',
                            fontWeight: 600,
                        }}
                    >
                        ♻
                    </Avatar>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '-0.5px', color: '#1e293b' }}>
                            Hurdacı
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                            Geri Dönüşüm Yönetimi
                        </Typography>
                    </Box>
                </Box>

                <List sx={{ px: 2, py: 2 }}>
                    {menuItems.map((item) => (
                        <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                            <ListItemButton
                                onClick={() => navigate(item.path)}
                                selected={location.pathname === item.path}
                                sx={{
                                    borderRadius: 2,
                                    '&.Mui-selected': {
                                        background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%)',
                                        '&:hover': {
                                            background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.15) 0%, rgba(37, 99, 235, 0.15) 100%)',
                                        },
                                    },
                                    '&:hover': {
                                        background: '#f0fdf4',
                                    },
                                }}
                            >
                                <ListItemIcon
                                    sx={{
                                        color: location.pathname === item.path ? '#0d9488' : '#64748b',
                                        minWidth: 40,
                                    }}
                                >
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.text}
                                    primaryTypographyProps={{
                                        fontSize: '0.9rem',
                                        fontWeight: location.pathname === item.path ? 600 : 400,
                                        color: location.pathname === item.path ? '#0d9488' : '#1e293b',
                                    }}
                                />
                            </ListItemButton>
                        </ListItem>
                    )).reduce((acc: React.ReactNode[], menuItem, index) => {
                        acc.push(menuItem);
                        // Insert Fire submenu after "Alım İşlemleri" (index 3)
                        if (index === 3) {
                            const isFireActive = location.pathname.startsWith('/fire');
                            acc.push(
                                <ListItem key="fire-header" disablePadding sx={{ mb: 0.5 }}>
                                    <ListItemButton
                                        onClick={() => setFireMenuOpen(!fireMenuOpen)}
                                        sx={{
                                            borderRadius: 2,
                                            '&:hover': {
                                                background: '#f0fdf4',
                                            },
                                            ...(isFireActive && {
                                                background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.05) 0%, rgba(37, 99, 235, 0.05) 100%)',
                                            }),
                                        }}
                                    >
                                        <ListItemIcon
                                            sx={{
                                                color: isFireActive ? '#0d9488' : '#64748b',
                                                minWidth: 40,
                                            }}
                                        >
                                            <FireIcon />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary="Fire"
                                            primaryTypographyProps={{
                                                fontSize: '0.9rem',
                                                fontWeight: isFireActive ? 600 : 400,
                                                color: isFireActive ? '#0d9488' : '#1e293b',
                                            }}
                                        />
                                        {fireMenuOpen ? <ExpandLess sx={{ color: '#64748b' }} /> : <ExpandMore sx={{ color: '#64748b' }} />}
                                    </ListItemButton>
                                </ListItem>
                            );
                            acc.push(
                                <Collapse key="fire-collapse" in={fireMenuOpen} timeout="auto" unmountOnExit>
                                    <List component="div" disablePadding>
                                        {fireSubItems.map((subItem) => (
                                            <ListItem key={subItem.text} disablePadding sx={{ mb: 0.5 }}>
                                                <ListItemButton
                                                    onClick={() => navigate(subItem.path)}
                                                    selected={location.pathname === subItem.path}
                                                    sx={{
                                                        pl: 4,
                                                        borderRadius: 2,
                                                        '&.Mui-selected': {
                                                            background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%)',
                                                            '&:hover': {
                                                                background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.15) 0%, rgba(37, 99, 235, 0.15) 100%)',
                                                            },
                                                        },
                                                        '&:hover': {
                                                            background: '#f0fdf4',
                                                        },
                                                    }}
                                                >
                                                    <ListItemIcon
                                                        sx={{
                                                            color: location.pathname === subItem.path ? '#0d9488' : '#64748b',
                                                            minWidth: 40,
                                                        }}
                                                    >
                                                        {subItem.icon}
                                                    </ListItemIcon>
                                                    <ListItemText
                                                        primary={subItem.text}
                                                        primaryTypographyProps={{
                                                            fontSize: '0.85rem',
                                                            fontWeight: location.pathname === subItem.path ? 600 : 400,
                                                            color: location.pathname === subItem.path ? '#0d9488' : '#1e293b',
                                                        }}
                                                    />
                                                </ListItemButton>
                                            </ListItem>
                                        ))}
                                    </List>
                                </Collapse>
                            );
                        }
                        return acc;
                    }, [])}
                </List>
            </Drawer>

            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 3,
                    mt: 8,
                    minHeight: 'calc(100vh - 64px)',
                }}
            >
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/partners" element={<Partners />} />
                    <Route path="/materials" element={<Materials />} />
                    <Route path="/receiving" element={<Receiving />} />
                    <Route path="/fire-types" element={<UllageTypes />} />
                    <Route path="/fire-analysis" element={<Inspections />} />
                    <Route path="/fire-history" element={<FireHistory />} />
                    <Route path="/selling" element={<Selling />} />
                    <Route path="/stock" element={<Stock />} />
                    <Route path="/money" element={<MoneyHistory />} />
                    <Route path="/login" element={<Navigate to="/" replace />} />
                </Routes>
            </Box>
        </Box>
    );
}

export default App;
