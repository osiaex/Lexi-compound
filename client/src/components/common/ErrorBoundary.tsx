import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Container } from '@mui/material';
import ErrorRecovery from './ErrorRecovery';

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

    private handleReset = () => {
        this.setState({ hasError: false, error: undefined });
    };

    public render() {
        if (this.state.hasError) {
            return (
                <Container maxWidth="md" sx={{ py: 4 }}>
                    <Box 
                        sx={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            minHeight: '50vh'
                        }}
                    >
                        <ErrorRecovery
                            error={this.state.error}
                            title="页面出现错误"
                            message="抱歉，页面遇到了一些问题。请尝试以下解决方案，如果问题持续存在，请联系技术支持。"
                            onRetry={() => window.location.reload()}
                            onReset={this.handleReset}
                            retryText="刷新页面"
                            resetText="重置状态"
                            showReportButton={true}
                            showDetails={true}
                        />
                    </Box>
                </Container>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;