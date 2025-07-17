import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';

interface VoiceErrorBoundaryState {
    hasError: boolean;
    error?: Error;
}

interface VoiceErrorBoundaryProps {
    children: React.ReactNode;
    onRetry?: () => void;
}

class VoiceErrorBoundary extends React.Component<VoiceErrorBoundaryProps, VoiceErrorBoundaryState> {
    constructor(props: VoiceErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): VoiceErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Voice component error:', error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: undefined });
        this.props.onRetry?.();
    };

    render() {
        if (this.state.hasError) {
            return (
                <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    gap={2}
                    p={3}
                    bgcolor="background.paper"
                    borderRadius={2}
                    border="1px solid"
                    borderColor="error.main"
                >
                    <ErrorIcon color="error" sx={{ fontSize: 48 }} />
                    <Typography variant="h6" color="error">
                        语音功能发生错误
                    </Typography>
                    <Typography variant="body2" color="text.secondary" textAlign="center">
                        {this.state.error?.message || '未知错误'}
                    </Typography>
                    <Button
                        variant="outlined"
                        color="primary"
                        onClick={this.handleRetry}
                    >
                        重试
                    </Button>
                </Box>
            );
        }

        return this.props.children;
    }
}

export default VoiceErrorBoundary; 