import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button } from '@mui/material';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        // 忽略 ResizeObserver 错误，这些是无害的
        if (error.message?.includes('ResizeObserver loop completed with undelivered notifications')) {
            return { hasError: false };
        }
        
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // 忽略 ResizeObserver 错误
        if (error.message?.includes('ResizeObserver loop completed with undelivered notifications')) {
            return;
        }
        
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    private handleReload = () => {
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                    minHeight="200px"
                    padding={3}
                >
                    <Typography variant="h6" color="error" gutterBottom>
                        出现了一个错误
                    </Typography>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                        请尝试刷新页面，如果问题持续存在，请联系管理员。
                    </Typography>
                    <Button 
                        variant="contained" 
                        color="primary" 
                        onClick={this.handleReload}
                        sx={{ mt: 2 }}
                    >
                        刷新页面
                    </Button>
                </Box>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary; 