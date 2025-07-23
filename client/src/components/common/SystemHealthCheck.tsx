import React, { useState, useEffect, useCallback } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    LinearProgress,
    Alert,
    Chip,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Divider,
    IconButton,
    Collapse
} from '@mui/material';
import {
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    Warning as WarningIcon,
    Refresh as RefreshIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    NetworkCheck as NetworkCheckIcon,
    Storage as StorageIcon,
    Api as ApiIcon,
    Psychology as PsychologyIcon
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarProvider';
import useErrorHandler from '../../hooks/useErrorHandler';
import networkMonitor, { NetworkStatus } from '../../utils/networkMonitor';
import { withRetry } from '../../utils/apiRetry';
import { PyLipsResponse } from '../../DAL/server-requests/pylips';
import axios from 'axios';
import axiosInstance from '../../DAL/server-requests/AxiosInstance';

interface HealthCheckResult {
    name: string;
    status: 'healthy' | 'unhealthy' | 'warning' | 'checking';
    message: string;
    responseTime?: number;
    lastCheck: Date;
    details?: string;
    icon: React.ReactNode;
    suggestions?: string[];
}

interface SystemHealthCheckProps {
    open: boolean;
    onClose: () => void;
    autoCheck?: boolean;
}

const SystemHealthCheck: React.FC<SystemHealthCheckProps> = ({
    open,
    onClose,
    autoCheck = true
}) => {
    const [healthResults, setHealthResults] = useState<HealthCheckResult[]>([]);
    const [isChecking, setIsChecking] = useState(false);
    const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
        isOnline: true,
        connectionSpeed: 'fast',
        lastChecked: new Date()
    });
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
    const { openSnackbar } = useSnackbar();
    const { handleAsyncError } = useErrorHandler();

    // 初始化健康检查项目
    const initializeHealthChecks = useCallback((): HealthCheckResult[] => {
        return [
            {
                name: '网络连接',
                status: 'checking',
                message: '检查中...',
                lastCheck: new Date(),
                icon: <NetworkCheckIcon />,
                suggestions: [
                    '检查网络连接',
                    '尝试刷新页面',
                    '检查防火墙设置'
                ]
            },
            {
                name: '后端API',
                status: 'checking',
                message: '检查中...',
                lastCheck: new Date(),
                icon: <ApiIcon />,
                suggestions: [
                    '检查服务器状态',
                    '验证API端点',
                    '检查身份验证'
                ]
            },
            {
                name: 'PyLips服务',
                status: 'checking',
                message: '检查中...',
                lastCheck: new Date(),
                icon: <PsychologyIcon />,
                suggestions: [
                    '重启PyLips服务',
                    '检查Python环境',
                    '验证Socket.IO连接'
                ]
            },
            {
                name: '数据库连接',
                status: 'checking',
                message: '检查中...',
                lastCheck: new Date(),
                icon: <StorageIcon />,
                suggestions: [
                    '检查数据库服务',
                    '验证连接字符串',
                    '检查网络连接'
                ]
            }
        ];
    }, []);

    // 监听网络状态
    useEffect(() => {
        const removeListener = networkMonitor.addListener(setNetworkStatus);
        return removeListener;
    }, []);

    // 检查网络连接
    const checkNetworkHealth = useCallback(async (): Promise<HealthCheckResult> => {
        const startTime = Date.now();
        
        try {
            if (!networkStatus.isOnline) {
                return {
                    name: '网络连接',
                    status: 'unhealthy',
                    message: '网络连接已断开',
                    lastCheck: new Date(),
                    icon: <NetworkCheckIcon />,
                    suggestions: [
                        '检查网络连接',
                        '重新连接WiFi',
                        '检查网络设置'
                    ]
                };
            }

            const responseTime = networkStatus.rtt || 0;
            const speed = networkStatus.connectionSpeed;
            
            let status: 'healthy' | 'warning' = 'healthy';
            let message = `网络连接正常 (${speed})`;
            
            if (speed === 'slow') {
                status = 'warning';
                message = `网络连接较慢 (${responseTime}ms)`;
            }

            return {
                name: '网络连接',
                status,
                message,
                responseTime,
                lastCheck: new Date(),
                icon: <NetworkCheckIcon />,
                suggestions: speed === 'slow' ? [
                    '检查网络带宽',
                    '关闭其他网络应用',
                    '尝试更换网络'
                ] : []
            };
        } catch (error) {
            return {
                name: '网络连接',
                status: 'unhealthy',
                message: '网络检查失败',
                lastCheck: new Date(),
                icon: <NetworkCheckIcon />,
                details: error && typeof error === 'object' && 'message' in error ? error.message : '未知错误',
                suggestions: [
                    '检查网络连接',
                    '重启网络适配器',
                    '联系网络管理员'
                ]
            };
        }
    }, [networkStatus]);

    // 检查后端API
    const checkBackendHealth = useCallback(async (): Promise<HealthCheckResult> => {
        const startTime = Date.now();
        
        try {
            const response = await withRetry(
                () => axios.get('/api/health'),
                { maxRetries: 1, baseDelay: 1000 }
            );
            
            const responseTime = Date.now() - startTime;
            
            return {
                name: '后端API',
                status: 'healthy',
                message: `API服务正常 (${responseTime}ms)`,
                responseTime,
                lastCheck: new Date(),
                icon: <ApiIcon />
            };
        } catch (error) {
            const responseTime = Date.now() - startTime;
            
            return {
                name: '后端API',
                status: 'unhealthy',
                message: 'API服务不可用',
                responseTime,
                lastCheck: new Date(),
                icon: <ApiIcon />,
                details: error && typeof error === 'object' && 'message' in error ? error.message : '未知错误',
                suggestions: [
                    '检查服务器状态',
                    '验证API端点配置',
                    '检查服务器日志'
                ]
            };
        }
    }, []);

    // 检查PyLips服务
    const checkPyLipsServiceHealth = useCallback(async (): Promise<HealthCheckResult> => {
        const startTime = Date.now();
        
        try {
            const response = await withRetry(
                () => axiosInstance.get('/pylips/health'),
                { maxRetries: 1, baseDelay: 1000 }
            );
            const pylipsData = response.data as PyLipsResponse;
            
            const responseTime = Date.now() - startTime;
            
            return {
                name: 'PyLips服务',
                status: 'healthy',
                message: `PyLips服务正常 (${responseTime}ms)`,
                responseTime,
                lastCheck: new Date(),
                icon: <PsychologyIcon />
            };
        } catch (error) {
            const responseTime = Date.now() - startTime;
            
            return {
                name: 'PyLips服务',
                status: 'unhealthy',
                message: 'PyLips服务不可用',
                responseTime,
                lastCheck: new Date(),
                icon: <PsychologyIcon />,
                details: error && typeof error === 'object' && 'message' in error ? error.message : '未知错误',
                suggestions: [
                    '重启PyLips服务',
                    '检查Python环境',
                    '验证服务配置'
                ]
            };
        }
    }, []);

    // 检查数据库连接
    const checkDatabaseHealth = useCallback(async (): Promise<HealthCheckResult> => {
        const startTime = Date.now();
        
        try {
            const response = await withRetry(
                () => axios.get('/api/health/database'),
                { maxRetries: 1, baseDelay: 1000 }
            );
            
            const responseTime = Date.now() - startTime;
            const isConnected = response.data?.connected;
            
            return {
                name: '数据库连接',
                status: isConnected ? 'healthy' : 'unhealthy',
                message: isConnected ? `数据库连接正常 (${responseTime}ms)` : '数据库连接失败',
                responseTime,
                lastCheck: new Date(),
                icon: <StorageIcon />,
                suggestions: !isConnected ? [
                    '检查数据库服务状态',
                    '验证连接配置',
                    '检查网络连接'
                ] : []
            };
        } catch (error) {
            const responseTime = Date.now() - startTime;
            
            return {
                name: '数据库连接',
                status: 'unhealthy',
                message: '数据库检查失败',
                responseTime,
                lastCheck: new Date(),
                icon: <StorageIcon />,
                details: error && typeof error === 'object' && 'message' in error ? error.message : '未知错误',
                suggestions: [
                    '检查数据库服务',
                    '验证连接字符串',
                    '检查防火墙设置'
                ]
            };
        }
    }, []);

    // 执行完整的健康检查
    const performHealthCheck = useCallback(async () => {
        setIsChecking(true);
        setHealthResults(initializeHealthChecks());
        
        try {
            const checks = [
                checkNetworkHealth(),
                checkBackendHealth(),
                checkPyLipsServiceHealth(),
                checkDatabaseHealth()
            ];
            
            const results = await Promise.allSettled(checks);
            
            const healthResults = results.map((result, index) => {
                if (result.status === 'fulfilled') {
                    return result.value;
                } else {
                    const checkNames = ['网络连接', '后端API', 'PyLips服务', '数据库连接'];
                    const icons = [<NetworkCheckIcon key="network" />, <ApiIcon key="api" />, <PsychologyIcon key="pylips" />, <StorageIcon key="storage" />];
                    
                    return {
                        name: checkNames[index],
                        status: 'unhealthy' as const,
                        message: '检查失败',
                        lastCheck: new Date(),
                        icon: icons[index],
                        details: result.reason?.message || '未知错误',
                        suggestions: ['重试检查', '检查服务状态']
                    };
                }
            });
            
            setHealthResults(healthResults);
            
            // 统计结果
            const unhealthyCount = healthResults.filter(r => r.status === 'unhealthy').length;
            const warningCount = healthResults.filter(r => r.status === 'warning').length;
            
            if (unhealthyCount > 0) {
                openSnackbar(`发现 ${unhealthyCount} 个服务异常`, 'error');
            } else if (warningCount > 0) {
                openSnackbar(`发现 ${warningCount} 个服务警告`, 'warning');
            } else {
                openSnackbar('所有服务运行正常', 'success');
            }
            
        } catch (error) {
            handleAsyncError(async () => { throw error; });
        } finally {
            setIsChecking(false);
        }
    }, [checkNetworkHealth, checkBackendHealth, checkPyLipsServiceHealth, checkDatabaseHealth, initializeHealthChecks, openSnackbar, handleAsyncError]);

    // 自动检查
    useEffect(() => {
        if (open && autoCheck && healthResults.length === 0) {
            performHealthCheck();
        }
    }, [open, autoCheck, healthResults.length, performHealthCheck]);

    // 切换展开状态
    const toggleExpanded = (name: string) => {
        const newExpanded = new Set(expandedItems);
        if (newExpanded.has(name)) {
            newExpanded.delete(name);
        } else {
            newExpanded.add(name);
        }
        setExpandedItems(newExpanded);
    };

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

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Typography variant="h6">系统健康检查</Typography>
                    <IconButton onClick={performHealthCheck} disabled={isChecking}>
                        <RefreshIcon />
                    </IconButton>
                </Box>
            </DialogTitle>
            
            <DialogContent>
                {isChecking && (
                    <Box mb={2}>
                        <Typography variant="body2" gutterBottom>
                            正在检查系统状态...
                        </Typography>
                        <LinearProgress />
                    </Box>
                )}
                
                <List>
                    {healthResults.map((result, index) => (
                        <React.Fragment key={result.name}>
                            <ListItem>
                                <ListItemIcon>
                                    {result.icon}
                                </ListItemIcon>
                                <ListItemText
                                    primary={
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <Typography variant="subtitle1">
                                                {result.name}
                                            </Typography>
                                            <Chip
                                                size="small"
                                                label={result.status === 'checking' ? '检查中' : result.status === 'healthy' ? '正常' : result.status === 'warning' ? '警告' : '异常'}
                                                color={getStatusColor(result.status) as any}
                                                variant="outlined"
                                            />
                                            {result.responseTime && (
                                                <Typography variant="caption" color="text.secondary">
                                                    {result.responseTime}ms
                                                </Typography>
                                            )}
                                        </Box>
                                    }
                                    secondary={
                                        <Box>
                                            <Typography variant="body2">
                                                {result.message}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                最后检查: {result.lastCheck.toLocaleTimeString()}
                                            </Typography>
                                        </Box>
                                    }
                                />
                                {(result.details || result.suggestions) && (
                                    <IconButton
                                        onClick={() => toggleExpanded(result.name)}
                                        size="small"
                                    >
                                        {expandedItems.has(result.name) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                    </IconButton>
                                )}
                            </ListItem>
                            
                            {(result.details || result.suggestions) && (
                                <Collapse in={expandedItems.has(result.name)}>
                                    <Box pl={4} pr={2} pb={2}>
                                        {result.details && (
                                            <Alert severity="info" sx={{ mb: 1 }}>
                                                <Typography variant="body2">
                                                    <strong>详细信息:</strong> {result.details}
                                                </Typography>
                                            </Alert>
                                        )}
                                        
                                        {result.suggestions && result.suggestions.length > 0 && (
                                            <Alert severity="info">
                                                <Typography variant="body2" gutterBottom>
                                                    <strong>建议解决方案:</strong>
                                                </Typography>
                                                <ul style={{ margin: 0, paddingLeft: 20 }}>
                                                    {result.suggestions.map((suggestion, idx) => (
                                                        <li key={idx}>
                                                            <Typography variant="body2">
                                                                {suggestion}
                                                            </Typography>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </Alert>
                                        )}
                                    </Box>
                                </Collapse>
                            )}
                            
                            {index < healthResults.length - 1 && <Divider />}
                        </React.Fragment>
                    ))}
                </List>
                
                {healthResults.length === 0 && !isChecking && (
                    <Box textAlign="center" py={4}>
                        <Typography variant="body1" color="text.secondary">
                            点击刷新按钮开始健康检查
                        </Typography>
                    </Box>
                )}
            </DialogContent>
            
            <DialogActions>
                <Button onClick={onClose}>关闭</Button>
                <Button 
                    onClick={performHealthCheck} 
                    variant="contained" 
                    disabled={isChecking}
                    startIcon={<RefreshIcon />}
                >
                    重新检查
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default SystemHealthCheck;