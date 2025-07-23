import React, { useState } from 'react';
import {
    Alert,
    AlertTitle,
    Box,
    Button,
    Collapse,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    Typography,
    CircularProgress
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    BugReport as BugReportIcon,
    Home as HomeIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from '../../contexts/SnackbarProvider';

interface ErrorRecoveryProps {
    error?: Error | string;
    onRetry?: () => void | Promise<void>;
    onReset?: () => void;
    showDetails?: boolean;
    severity?: 'error' | 'warning' | 'info';
    title?: string;
    message?: string;
    retryText?: string;
    resetText?: string;
    showHomeButton?: boolean;
    showReportButton?: boolean;
}

const ErrorRecovery: React.FC<ErrorRecoveryProps> = ({
    error,
    onRetry,
    onReset,
    showDetails = true,
    severity = 'error',
    title,
    message,
    retryText = '重试',
    resetText = '重置',
    showHomeButton = true,
    showReportButton = false
}) => {
    const [isRetrying, setIsRetrying] = useState(false);
    const [showErrorDetails, setShowErrorDetails] = useState(false);
    const [showReportDialog, setShowReportDialog] = useState(false);
    const navigate = useNavigate();
    const { openSnackbar } = useSnackbar();

    const errorMessage = error instanceof Error ? error.message : error || '发生了未知错误';
    const errorStack = error instanceof Error ? error.stack : undefined;

    const handleRetry = async () => {
        if (!onRetry) return;
        
        setIsRetrying(true);
        try {
            await onRetry();
            openSnackbar('操作重试成功', 'success');
        } catch (retryError) {
            console.error('重试失败:', retryError);
            openSnackbar('重试失败，请稍后再试', 'error');
        } finally {
            setIsRetrying(false);
        }
    };

    const handleReset = () => {
        if (onReset) {
            onReset();
        } else {
            // 默认重置行为：刷新页面
            window.location.reload();
        }
    };

    const handleGoHome = () => {
        navigate('/');
    };

    const handleReportError = () => {
        setShowReportDialog(true);
    };

    const handleSendReport = () => {
        // 这里可以集成错误报告服务
        console.log('发送错误报告:', {
            error: errorMessage,
            stack: errorStack,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            url: window.location.href
        });
        
        openSnackbar('错误报告已发送，感谢您的反馈', 'success');
        setShowReportDialog(false);
    };

    const getErrorTitle = () => {
        if (title) return title;
        
        switch (severity) {
            case 'warning':
                return '注意';
            case 'info':
                return '提示';
            default:
                return '出现错误';
        }
    };

    const getErrorMessage = () => {
        if (message) return message;
        
        switch (severity) {
            case 'warning':
                return '系统检测到一些问题，可能影响正常使用。';
            case 'info':
                return '系统状态信息。';
            default:
                return '系统遇到了一些问题，请尝试以下解决方案。';
        }
    };

    return (
        <>
            <Alert 
                severity={severity}
                sx={{ mb: 2 }}
                action={
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        {onRetry && (
                            <Button
                                color="inherit"
                                size="small"
                                onClick={handleRetry}
                                disabled={isRetrying}
                                startIcon={isRetrying ? <CircularProgress size={16} /> : <RefreshIcon />}
                            >
                                {retryText}
                            </Button>
                        )}
                        {showDetails && (
                            <IconButton
                                color="inherit"
                                size="small"
                                onClick={() => setShowErrorDetails(!showErrorDetails)}
                            >
                                {showErrorDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            </IconButton>
                        )}
                    </Box>
                }
            >
                <AlertTitle>{getErrorTitle()}</AlertTitle>
                {getErrorMessage()}
                {errorMessage && (
                    <Typography variant="body2" sx={{ mt: 1, fontFamily: 'monospace' }}>
                        {errorMessage}
                    </Typography>
                )}
            </Alert>

            {showDetails && (
                <Collapse in={showErrorDetails}>
                    <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="subtitle2" gutterBottom>
                            错误详情:
                        </Typography>
                        <Typography 
                            variant="body2" 
                            component="pre" 
                            sx={{ 
                                fontFamily: 'monospace',
                                fontSize: '0.75rem',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                maxHeight: 200,
                                overflow: 'auto',
                                bgcolor: 'white',
                                p: 1,
                                border: '1px solid',
                                borderColor: 'grey.300',
                                borderRadius: 1
                            }}
                        >
                            {errorStack || errorMessage || '无详细信息'}
                        </Typography>
                        
                        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {onReset && (
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={handleReset}
                                    startIcon={<RefreshIcon />}
                                >
                                    {resetText}
                                </Button>
                            )}
                            
                            {showHomeButton && (
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={handleGoHome}
                                    startIcon={<HomeIcon />}
                                >
                                    返回首页
                                </Button>
                            )}
                            
                            {showReportButton && (
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={handleReportError}
                                    startIcon={<BugReportIcon />}
                                >
                                    报告问题
                                </Button>
                            )}
                        </Box>
                    </Box>
                </Collapse>
            )}

            {/* 错误报告对话框 */}
            <Dialog open={showReportDialog} onClose={() => setShowReportDialog(false)}>
                <DialogTitle>报告错误</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        您即将发送错误报告给开发团队。报告将包含错误信息、浏览器信息和当前页面URL，
                        不会包含任何个人敏感信息。
                    </DialogContentText>
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="subtitle2" gutterBottom>
                            将要发送的信息:
                        </Typography>
                        <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                            {JSON.stringify({
                                error: errorMessage,
                                timestamp: new Date().toISOString(),
                                url: window.location.href,
                                userAgent: navigator.userAgent.substring(0, 100) + '...'
                            }, null, 2)}
                        </Typography>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowReportDialog(false)}>取消</Button>
                    <Button onClick={handleSendReport} variant="contained">发送报告</Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default ErrorRecovery;