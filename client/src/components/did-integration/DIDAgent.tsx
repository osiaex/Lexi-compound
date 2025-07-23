import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, IconButton, Paper, useMediaQuery, useTheme } from '@mui/material';
import { Close as CloseIcon, SmartToy as BotIcon } from '@mui/icons-material';

interface DIDAgentProps {
    isVisible: boolean;
    onClose: () => void;
    clientKey?: string;
    agentId?: string;
}

const DIDAgent: React.FC<DIDAgentProps> = ({ 
    isVisible, 
    onClose, 
    clientKey = "Z29vZ2xlLW9hdXRoMnwxMDIzNzM5NjQ2MTg1MjgyNDg3MTY6WXp3TzJJemlndDhQTURhSmVyWEg5",
    agentId = "v2_agt_TfdU0tzh"
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const agentContainerRef = useRef<HTMLDivElement>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const scriptRef = useRef<HTMLScriptElement | null>(null);

    useEffect(() => {
        if (isVisible && !isLoaded) {
            loadDIDAgent();
        }
        
        return () => {
            // 清理脚本
            if (scriptRef.current) {
                document.head.removeChild(scriptRef.current);
                scriptRef.current = null;
            }
        };
    }, [isVisible]);

    const loadDIDAgent = () => {
        if (isLoaded || scriptRef.current) return;

        const script = document.createElement('script');
        script.type = 'module';
        script.src = 'https://agent.d-id.com/v2/index.js';
        script.setAttribute('data-mode', 'full');
        script.setAttribute('data-client-key', clientKey);
        script.setAttribute('data-agent-id', agentId);
        script.setAttribute('data-name', 'did-agent');
        script.setAttribute('data-monitor', 'true');
        script.setAttribute('data-target-id', 'did-agent-container');

        script.onload = () => {
            setIsLoaded(true);
            console.log('D-ID Agent SDK loaded successfully');
        };

        script.onerror = () => {
            console.error('Failed to load D-ID Agent SDK');
        };

        document.head.appendChild(script);
        scriptRef.current = script;
    };

    if (!isVisible) {
        return null;
    }

    return (
        <Paper
            elevation={3}
            sx={{
                position: 'fixed',
                top: isMobile ? 0 : 'auto',
                bottom: isMobile ? 0 : 20,
                left: isMobile ? 0 : 'auto',
                right: isMobile ? 0 : 20,
                width: isMobile ? '100vw' : 400,
                height: isMobile ? '100vh' : 600,
                borderRadius: isMobile ? 0 : 2,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 1000,
                backgroundColor: '#fff',
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    backgroundColor: '#f5f5f5',
                    borderBottom: '1px solid #e0e0e0',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BotIcon color="primary" />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        AI Avatar
                    </Typography>
                </Box>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </Box>

            {/* D-ID Agent Container */}
            <Box
                ref={agentContainerRef}
                id="did-agent-container"
                sx={{
                    flex: 1,
                    position: 'relative',
                    backgroundColor: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                {!isLoaded && (
                    <Typography 
                        variant="body2" 
                        sx={{ 
                            color: '#fff',
                            textAlign: 'center',
                            padding: 2 
                        }}
                    >
                        Loading AI Avatar...
                    </Typography>
                )}
            </Box>
        </Paper>
    );
};

export default DIDAgent; 