import React from 'react';
import {
    Box,
    Container,
    Typography,
    Paper,
    Breadcrumbs,
    Link
} from '@mui/material';
import {
    Home as HomeIcon,
    Settings as SettingsIcon
} from '@mui/icons-material';
import SystemDashboard from '../../components/common/SystemDashboard';
import { Pages } from '../../app/App';

const SystemManagement: React.FC = () => {
    return (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            {/* 面包屑导航 */}
            <Breadcrumbs sx={{ mb: 3 }}>
                <Link 
                    color="inherit" 
                    href={Pages.PROJECT_OVERVIEW}
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                >
                    <HomeIcon fontSize="small" />
                    项目概览
                </Link>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.primary' }}>
                    <SettingsIcon fontSize="small" />
                    系统管理
                </Box>
            </Breadcrumbs>
            
            {/* 页面标题 */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h4" gutterBottom>
                    系统管理
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    监控和管理Lexi系统的各个组件，包括网络连接、API服务、AI处理服务和数据库状态。
                </Typography>
            </Paper>
            
            {/* 系统仪表板 */}
            <SystemDashboard />
        </Container>
    );
};

export default SystemManagement;