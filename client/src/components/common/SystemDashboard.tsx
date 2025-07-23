import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Chip,
    IconButton,
    Tooltip,
    LinearProgress,
    Alert,
    Button,
    Fade,
    Paper
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    NetworkCheck as NetworkCheckIcon,
    Api as ApiIcon,
    Psychology as PsychologyIcon,
    Storage as StorageIcon,
    Refresh as RefreshIcon,
    Settings as SettingsIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    Warning as WarningIcon,
    Speed as SpeedIcon,
    Timeline as TimelineIcon
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarProvider';
import networkMonitor, { NetworkStatus } from '../../utils/networkMonitor';
import SystemHealthCheck from './SystemHealthCheck';
import { withRetry } from '../../utils/apiRetry';
import axios from 'axios';
import axiosInstance from '../../DAL/server-requests/AxiosInstance';

interface ServiceStatus {
    name: string;
    status: 'healthy' | 'unhealthy' | 'warning' | 'checking';
    responseTime?: number;
    lastCheck: Date;
    icon: React.ReactNode;
    description: string;
}

interface SystemMetrics {
    totalServices: number;
    healthyServices: number;
    unhealthyServices: number;
    warningServices: number;
    averageResponseTime: number;
    uptime: string;
}

const SystemDashboard: React.FC = () => {
    const [services, setServices] = useState<ServiceStatus[]>([]);
    const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
        isOnline: true,
        connectionSpeed: 'fast',
        lastChecked: new Date()
    });
    const [metrics, setMetrics] = useState<SystemMetrics>({
        totalServices: 0,
        healthyServices: 0,
        unhealthyServices: 0,
        warningServices: 0,
        averageResponseTime: 0,
        uptime: '0分钟'
    });
    const [isChecking, setIsChecking] = useState(false);
    const [healthCheckOpen, setHealthCheckOpen] = useState(false);
    const [startTime] = useState(new Date());
    const { openSnackbar } = useSnackbar();

    // 监听网络状态
    useEffect(() => {
        const removeListener = networkMonitor.addListener(setNetworkStatus);
        return removeListener;
    }, []);

    // 计算运行时间
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const diff = now.getTime() - startTime.getTime();
            const minutes = Math.floor(diff / 60000);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            
            let uptime = '';
            if (days > 0) {
                uptime = `${days}天 ${hours % 24}小时`;
            } else if (hours > 0) {
                uptime = `${hours}小时 ${minutes % 60}分钟`;
            } else {
                uptime = `${minutes}分钟`;
            }
            
            setMetrics(prev => ({ ...prev, uptime }));
        }, 60000); // 每分钟更新一次
        
        return () => clearInterval(interval);
    }, [startTime]);

    // 初始化服务状态
    const initializeServices = (): ServiceStatus[] => {
        return [
            {
                name: '网络连接',
                status: 'checking',
                lastCheck: new Date(),
                icon: <NetworkCheckIcon />,
                description: '监控网络连接状态和速度'
            },
            {
                name: '后端API',
                status: 'checking',
                lastCheck: new Date(),
                icon: <ApiIcon />,
                description: '后端服务API健康状态'
            },
            {
                name: 'PyLips服务',
                status: 'checking',
                lastCheck: new Date(),
                icon: <PsychologyIcon />,
                description: 'AI语音处理服务状态'
            },
            {
                name: '数据库',
                status: 'checking',
                lastCheck: new Date(),
                icon: <StorageIcon />,
                description: '数据库连接和响应状态'
            }
        ];
    };

    // 检查单个服务状态
    const checkServiceStatus = async (serviceName: string): Promise<ServiceStatus> => {
        const startTime = Date.now();
        const baseService = initializeServices().find(s => s.name === serviceName)!;
        
        try {
            let responseTime: number;
            let status: 'healthy' | 'unhealthy' | 'warning';
            
            switch (serviceName) {
                case '网络连接':
                    if (!networkStatus.isOnline) {
                        status = 'unhealthy';
                    } else if (networkStatus.connectionSpeed === 'slow') {
                        status = 'warning';
                    } else {
                        status = 'healthy';
                    }
                    responseTime = networkStatus.rtt || 0;
                    break;
                    
                case '后端API':
                    await withRetry(
                        () => axios.get('/api/health'),
                        { maxRetries: 1, baseDelay: 1000 }
                    );
                    responseTime = Date.now() - startTime;
                    status = responseTime > 3000 ? 'warning' : 'healthy';
                    break;
                    
                case 'PyLips服务':
                    await withRetry(
                        () => axiosInstance.get('/pylips/health'),
                        { maxRetries: 1, baseDelay: 1000 }
                    );
                    responseTime = Date.now() - startTime;
                    status = responseTime > 5000 ? 'warning' : 'healthy';
                    break;
                    
                case '数据库':
                    const dbResponse = await withRetry(
                        () => axios.get('/api/health/database'),
                        { maxRetries: 1, baseDelay: 1000 }
                    );
                    responseTime = Date.now() - startTime;
                    status = dbResponse.data?.connected ? 
                        (responseTime > 2000 ? 'warning' : 'healthy') : 'unhealthy';
                    break;
                    
                default:
                    throw new Error(`未知服务: ${serviceName}`);
            }
            
            return {
                ...baseService,
                status,
                responseTime,
                lastCheck: new Date()
            };
            
        } catch (error) {
            return {
                ...baseService,
                status: 'unhealthy',
                responseTime: Date.now() - startTime,
                lastCheck: new Date()
            };
        }
    };

    // 检查所有服务状态
    const checkAllServices = async () => {
        setIsChecking(true);
        setServices(initializeServices());
        
        try {
            const serviceNames = ['网络连接', '后端API', 'PyLips服务', '数据库'];
            const checks = serviceNames.map(name => checkServiceStatus(name));
            
            const results = await Promise.allSettled(checks);
            const serviceStatuses = results.map((result, index) => {
                if (result.status === 'fulfilled') {
                    return result.value;
                } else {
                    const baseService = initializeServices()[index];
                    return {
                        ...baseService,
                        status: 'unhealthy' as const,
                        lastCheck: new Date()
                    };
                }
            });
            
            setServices(serviceStatuses);
            updateMetrics(serviceStatuses);
            
        } catch (error) {
            openSnackbar('服务状态检查失败', 'error');
        } finally {
            setIsChecking(false);
        }
    };

    // 更新系统指标
    const updateMetrics = (serviceStatuses: ServiceStatus[]) => {
        const totalServices = serviceStatuses.length;
        const healthyServices = serviceStatuses.filter(s => s.status === 'healthy').length;
        const unhealthyServices = serviceStatuses.filter(s => s.status === 'unhealthy').length;
        const warningServices = serviceStatuses.filter(s => s.status === 'warning').length;
        
        const responseTimes = serviceStatuses
            .filter(s => s.responseTime !== undefined)
            .map(s => s.responseTime!);
        const averageResponseTime = responseTimes.length > 0 ?
            Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : 0;
        
        setMetrics(prev => ({
            ...prev,
            totalServices,
            healthyServices,
            unhealthyServices,
            warningServices,
            averageResponseTime
        }));
    };

    // 初始检查
    useEffect(() => {
        checkAllServices();
        
        // 定期检查（每30秒）
        const interval = setInterval(checkAllServices, 30000);
        return () => clearInterval(interval);
    }, []);

    // 获取状态颜色
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'healthy': return 'success';
            case 'warning': return 'warning';
            case 'unhealthy': return 'error';
            default: return 'default';
        }
    };

    // 获取状态图标
    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'healthy': return <CheckCircleIcon color="success" />;
            case 'warning': return <WarningIcon color="warning" />;
            case 'unhealthy': return <ErrorIcon color="error" />;
            default: return null;
        }
    };

    // 获取整体系统状态
    const getOverallStatus = () => {
        if (metrics.unhealthyServices > 0) return 'error';
        if (metrics.warningServices > 0) return 'warning';
        return 'success';
    };

    return (
        <Box>
            {/* 系统概览卡片 */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                        <Box display="flex" alignItems="center" gap={1}>
                            <DashboardIcon color="primary" />
                            <Typography variant="h6">系统状态仪表板</Typography>
                        </Box>
                        <Box display="flex" gap={1}>
                            <Tooltip title="详细健康检查">
                                <IconButton 
                                    onClick={() => setHealthCheckOpen(true)}
                                    color="primary"
                                >
                                    <SettingsIcon />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="刷新状态">
                                <IconButton 
                                    onClick={checkAllServices} 
                                    disabled={isChecking}
                                    color="primary"
                                >
                                    <RefreshIcon />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Box>
                    
                    {isChecking && (
                        <Box mb={2}>
                            <LinearProgress />
                        </Box>
                    )}
                    
                    {/* 系统指标 */}
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={3}>
                            <Paper sx={{ p: 2, textAlign: 'center' }}>
                                <Typography variant="h4" color={getOverallStatus()}>
                                    {metrics.healthyServices}/{metrics.totalServices}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    健康服务
                                </Typography>
                            </Paper>
                        </Grid>
                        
                        <Grid item xs={12} sm={6} md={3}>
                            <Paper sx={{ p: 2, textAlign: 'center' }}>
                                <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                                    <SpeedIcon color="primary" />
                                    <Typography variant="h4">
                                        {metrics.averageResponseTime}ms
                                    </Typography>
                                </Box>
                                <Typography variant="body2" color="text.secondary">
                                    平均响应时间
                                </Typography>
                            </Paper>
                        </Grid>
                        
                        <Grid item xs={12} sm={6} md={3}>
                            <Paper sx={{ p: 2, textAlign: 'center' }}>
                                <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                                    <TimelineIcon color="primary" />
                                    <Typography variant="h6">
                                        {metrics.uptime}
                                    </Typography>
                                </Box>
                                <Typography variant="body2" color="text.secondary">
                                    运行时间
                                </Typography>
                            </Paper>
                        </Grid>
                        
                        <Grid item xs={12} sm={6} md={3}>
                            <Paper sx={{ p: 2, textAlign: 'center' }}>
                                <Typography variant="h6" color={networkStatus.isOnline ? 'success.main' : 'error.main'}>
                                    {networkStatus.connectionSpeed.toUpperCase()}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    网络状态
                                </Typography>
                            </Paper>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>
            
            {/* 服务状态卡片 */}
            <Grid container spacing={2}>
                {services.map((service, index) => (
                    <Grid item xs={12} sm={6} md={3} key={service.name}>
                        <Fade in timeout={300 + index * 100}>
                            <Card 
                                sx={{ 
                                    height: '100%',
                                    border: service.status === 'unhealthy' ? '2px solid' : '1px solid',
                                    borderColor: service.status === 'unhealthy' ? 'error.main' : 'divider'
                                }}
                            >
                                <CardContent>
                                    <Box display="flex" alignItems="center" justifyContent="between" mb={1}>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            {service.icon}
                                            <Typography variant="h6" noWrap>
                                                {service.name}
                                            </Typography>
                                        </Box>
                                        {getStatusIcon(service.status)}
                                    </Box>
                                    
                                    <Typography variant="body2" color="text.secondary" mb={2}>
                                        {service.description}
                                    </Typography>
                                    
                                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                                        <Chip
                                            size="small"
                                            label={
                                                service.status === 'checking' ? '检查中' :
                                                service.status === 'healthy' ? '正常' :
                                                service.status === 'warning' ? '警告' : '异常'
                                            }
                                            color={getStatusColor(service.status) as any}
                                            variant="outlined"
                                        />
                                        {service.responseTime !== undefined && (
                                            <Typography variant="caption" color="text.secondary">
                                                {service.responseTime}ms
                                            </Typography>
                                        )}
                                    </Box>
                                    
                                    <Typography variant="caption" color="text.secondary">
                                        最后检查: {service.lastCheck.toLocaleTimeString()}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Fade>
                    </Grid>
                ))}
            </Grid>
            
            {/* 系统警告 */}
            {metrics.unhealthyServices > 0 && (
                <Alert severity="error" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                        检测到 {metrics.unhealthyServices} 个服务异常，请检查系统状态。
                    </Typography>
                    <Button 
                        size="small" 
                        onClick={() => setHealthCheckOpen(true)}
                        sx={{ mt: 1 }}
                    >
                        查看详细信息
                    </Button>
                </Alert>
            )}
            
            {metrics.warningServices > 0 && metrics.unhealthyServices === 0 && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                        检测到 {metrics.warningServices} 个服务警告，建议关注系统性能。
                    </Typography>
                </Alert>
            )}
            
            {/* 健康检查对话框 */}
            <SystemHealthCheck 
                open={healthCheckOpen}
                onClose={() => setHealthCheckOpen(false)}
                autoCheck={true}
            />
        </Box>
    );
};

export default SystemDashboard;