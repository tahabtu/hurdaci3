import React, { useState, useEffect } from 'react';
import {
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    CircularProgress,
} from '@mui/material';
import {
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    Inventory as InventoryIcon,
    People as PeopleIcon,
    ShoppingCart as ShoppingCartIcon,
    PointOfSale as PointOfSaleIcon,
} from '@mui/icons-material';
import { getPartners, getMaterials, getReceivingTransactions, getSellingTransactions, getStock } from '../services/api';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
}

function StatCard({ title, value, icon, color }: StatCardProps) {
    return (
        <Card sx={{ height: '100%', borderLeft: `4px solid ${color}` }}>
            <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <Box>
                        <Typography variant="body2" sx={{ color: '#64748b', mb: 1, fontWeight: 500 }}>
                            {title}
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b' }}>
                            {value}
                        </Typography>
                    </Box>
                    <Box
                        sx={{
                            width: 48,
                            height: 48,
                            borderRadius: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: `${color}15`,
                        }}
                    >
                        {React.cloneElement(icon as React.ReactElement, { sx: { fontSize: 24, color: color } })}
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
}

export default function Dashboard() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        partners: 0,
        materials: 0,
        pendingReceiving: 0,
        totalReceiving: 0,
        totalSales: 0,
        stockItems: 0,
        awaitingApproval: 0,
    });

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const [partners, materials, receiving, selling, stock] = await Promise.all([
                getPartners(),
                getMaterials(),
                getReceivingTransactions(),
                getSellingTransactions(),
                getStock(),
            ]);

            setStats({
                partners: partners.length,
                materials: materials.length,
                pendingReceiving: receiving.filter((r) => r.status === 'pending').length,
                awaitingApproval: receiving.filter((r) => r.status === 'inspected').length,
                totalReceiving: receiving.length,
                totalSales: selling.length,
                stockItems: stock.filter((s) => parseFloat(String(s.total_quantity)) > 0).length,
            });
        } catch (error) {
            console.error('Failed to load stats:', error);
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
            <Typography variant="h4" sx={{ mb: 4, fontWeight: 700 }}>
                Dashboard
            </Typography>

            <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard
                        title="Partnerler"
                        value={stats.partners}
                        icon={<PeopleIcon sx={{ fontSize: 28, color: 'white' }} />}
                        color="#0d9488"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard
                        title="Malzemeler"
                        value={stats.materials}
                        icon={<InventoryIcon sx={{ fontSize: 28, color: 'white' }} />}
                        color="#2563eb"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard
                        title="Stokta Ürün"
                        value={stats.stockItems}
                        icon={<TrendingUpIcon sx={{ fontSize: 28, color: 'white' }} />}
                        color="#22c55e"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard
                        title="Bekleyen Alımlar"
                        value={stats.pendingReceiving}
                        icon={<ShoppingCartIcon sx={{ fontSize: 28, color: 'white' }} />}
                        color="#f59e0b"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard
                        title="Onay Bekleyen"
                        value={stats.awaitingApproval}
                        icon={<TrendingDownIcon sx={{ fontSize: 28, color: 'white' }} />}
                        color="#3b82f6"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard
                        title="Toplam Satış"
                        value={stats.totalSales}
                        icon={<PointOfSaleIcon sx={{ fontSize: 28, color: 'white' }} />}
                        color="#0ea5e9"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard
                        title="Toplam Alış"
                        value={stats.totalReceiving}
                        icon={<ShoppingCartIcon sx={{ fontSize: 28, color: 'white' }} />}
                        color="#14b8a6"
                    />
                </Grid>
            </Grid>
        </Box>
    );
}
