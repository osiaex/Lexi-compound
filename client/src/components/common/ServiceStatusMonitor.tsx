import React, { useState, useEffect } from 'react';
import {
    Box,
    Chip,
    Collapse,
    IconButton,
    Paper,
    Typography,
    Tooltip,
    Alert
} from '@mui/material';
import {
    ExpandMore,
    ExpandLess,
    CheckCircle,
    Error as ErrorIcon,
    Warning,
    Info
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarProvider';
import networkMonitor, { NetworkStatus } from '../../utils/networkMonitor';
import { withRetry } from '../../utils/apiRetry';
import axiosInstance from '../../DAL/server-requests/AxiosInstance';

interface ServiceStatus {
    name: string;
    status: 'online' | 'offline' | 'warning' | 'unknown';
    lastCheck: Date;
    responseTime?: number;
    error?: string;
}

const ServiceStatusMonitor: React.FC = () => {
    const [expanded, setExpanded] = useState(false);
    const [services, setServices] = useState<ServiceStatus[]>([
        { name: 'Backend API', status: 'unknown', lastCheck: new Date() },
        { name: 'PyLips Service', status: 'unknown', lastCheck: new Date() },
        { name: 'Database', status: 'unknown', lastCheck: new Date() }
    ]);
    const [isVisible, setIsVisible] = useState(false);
    const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
        isOnline: true,
        connectionSpeed: 'fast',
        lastChecked: new Date()
    });
    const { openSnackbar } = useSnackbar();

    useEffect(() => {
        // 监听网络状态变化
        const removeNetworkListener = networkMonitor.addListener((status) => {
            setNetworkStatus(status);
            
            // 根据网络状态显示通知
            if (!status.isOnline) {
                setIsVisible(true);
                openSnackbar('网络连接已断开', 'error');
            } else if (status.connectionSpeed === 'slow') {
                setIsVisible(true);
                openSnackbar('网络连接较慢', 'warning');
            }
        });
        
        // 定期检查服务状态
        const interval = setInterval(checkAllServices, 60000); // 每分钟检查一次
        
        // 初始检查
        checkAllServices();

        return () => {
            clearInterval(interval);
            removeNetworkListener();
        };
    }, [openSnackbar]);

    const checkAllServices = async () => {
        // 如果网络离线，跳过检查
        if (!networkStatus.isOnline) {
            return;
        }
        
        const updatedServices = [...services];

        // 检查后端API（带重试机制）
        try {
            const startTime = Date.now();
            const response = await withRetry(
                () => axiosInstance.get('/health'),
                {
                    maxRetries: 2,
                    baseDelay: 1000,
                    onRetry: (attempt) => {
                        console.log(`重试检查后端API，第${attempt}次尝试`);
                    }
                }
            );
            const endTime = Date.now();
            
            updatedServices[0] = {
                name: 'Backend API',
                status: response.status >= 200 && response.status < 300 ? 'online' : 'offline',
                lastCheck: new Date(),
                responseTime: endTime - startTime
            };
        } catch (error) {
            updatedServices[0] = {
                name: 'Backend API',
                status: 'offline',
                lastCheck: new Date(),
                error: error && typeof error === 'object' && 'message' in error ? error.message : 'Unknown error'
            };
        }

        // 检查PyLips服务（带重试机制）
        try {
            const startTime = Date.now();
            const response = await withRetry(
                () => axiosInstance.get('/pylips/health'),
                {
                    maxRetries: 2,
                    baseDelay: 1000,
                    onRetry: (attempt) => {
                        console.log(`重试检查PyLips服务，第${attempt}次尝试`);
                    }
                }
            );
            const endTime = Date.now();
            const pylipsData = response.data;
            
            updatedServices[1] = {
                name: 'PyLips Service',
                status: pylipsData.success ? 'online' : 'warning',
                lastCheck: new Date(),
                responseTime: endTime - startTime
            };
        } catch (error) {
            updatedServices[1] = {
                name: 'PyLips Service',
                status: 'offline',
                lastCheck: new Date(),
                error: error && typeof error === 'object' && 'message' in error ? error.message : 'Unknown error'
            };
        }

        // 数据库状态通过后端API健康检查获取（带重试机制）
        if (updatedServices[0].status === 'online') {
            try {
                const response = await withRetry(
                    () => axiosInstance.get('/api/health'),
                    {
                        maxRetries: 2,
                        baseDelay: 1000,
                        onRetry: (attempt) => {
                            console.log(`重试检查数据库，第${attempt}次尝试`);
                        }
                    }
                );
                const data = response.data;
                
                updatedServices[2] = {
                    name: 'Database',
                    status: data.database === 'connected' ? 'online' : 'offline',
                    lastCheck: new Date()
                };
            } catch (error) {
                updatedServices[2] = {
                    name: 'Database',
                    status: 'unknown',
                    lastCheck: new Date(),
                    error: 'Cannot determine database status'
                };
            }
        }

        setServices(updatedServices);
        
        // 检查是否有服务不健康
        const hasUnhealthyServices = updatedServices.some(service => service.status === 'offline');
        if (hasUnhealthyServices) {
            setIsVisible(true);
            
            const unhealthyServices = updatedServices
                .filter(service => service.status === 'offline')
                .map(service => service.name)
                .join(', ');
                
            openSnackbar(`服务状态异常: ${unhealthyServices}`, 'error');
        }
    };

    const getStatusIcon = (status: ServiceStatus['status']) => {
        switch (status) {
            case 'online':
                return <CheckCircle sx={{ color: 'success.main' }} />;
            case 'offline':
                return <ErrorIcon sx={{ color: 'error.main' }} />;
            case 'warning':
                return <Warning sx={{ color: 'warning.main' }} />;
            default:
                return <Info sx={{ color: 'info.main' }} />;
        }
    };

    const getStatusColor = (status: ServiceStatus['status']) => {
        switch (status) {
            case 'online':
                return 'success';
            case 'offline':
                return 'error';
            case 'warning':
                return 'warning';
            default:
                return 'default';
        }
    };

    const overallStatus = services.every(s => s.status === 'online') ? 'online' :
                         services.some(s => s.status === 'offline') ? 'offline' : 'warning';

    return (
        <Paper 
            elevation={1} 
            sx={{ 
                position: 'fixed', 
                bottom: 16, 
                right: 16, 
                zIndex: 1000,
                minWidth: 200,
                maxWidth: 400
            }}
        >
            <Box 
                sx={{ 
                    p: 1, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    cursor: 'pointer'
                }}
                onClick={() => setExpanded(!expanded)}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getStatusIcon(overallStatus)}
                    <Typography variant="body2" fontWeight="medium">
                        系统状态
                    </Typography>
                    <Chip 
                        label={overallStatus === 'online' ? '正常' : overallStatus === 'offline' ? '异常' : '警告'}
                        size="small"
                        color={getStatusColor(overallStatus) as any}
                        variant="outlined"
                    />
                </Box>
                <IconButton size="small">
                    {expanded ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
            </Box>
            
            <Collapse in={expanded}>
                <Box sx={{ p: 2, pt: 0 }}>
                    {!networkStatus.isOnline && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            网络连接已断开
                        </Alert>
                    )}
                    
                    {networkStatus.connectionSpeed === 'slow' && networkStatus.isOnline && (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            网络连接较慢 {networkStatus.rtt && `(${networkStatus.rtt}ms)`}
                        </Alert>
                    )}
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        网络状态: {networkStatus.isOnline ? '在线' : '离线'} | 
                        连接速度: {networkStatus.connectionSpeed === 'fast' ? '快速' : networkStatus.connectionSpeed === 'slow' ? '慢速' : '离线'}
                        {networkStatus.rtt && ` | 延迟: ${networkStatus.rtt}ms`} | 
                        最后检查: {networkStatus.lastChecked.toLocaleTimeString()}
                    </Typography>
                    
                    {services.map((service, index) => (
                        <Box key={index} sx={{ mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {getStatusIcon(service.status)}
                                <Typography variant="body2">
                                    {service.name}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {service.responseTime && (
                                    <Typography variant="caption" color="text.secondary">
                                        {service.responseTime}ms
                                    </Typography>
                                )}
                                <Tooltip title={`最后检查: ${service.lastCheck.toLocaleTimeString()}`}>
                                    <Chip 
                                        label={service.status === 'online' ? '在线' : 
                                               service.status === 'offline' ? '离线' : 
                                               service.status === 'warning' ? '警告' : '未知'}
                                        size="small"
                                        color={getStatusColor(service.status) as any}
                                        variant="outlined"
                                    />
                                </Tooltip>
                            </Box>
                        </Box>
                    ))}
                    
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        最后更新: {new Date().toLocaleTimeString()}
                    </Typography>
                </Box>
            </Collapse>
        </Paper>
    );
};

export default ServiceStatusMonitor;