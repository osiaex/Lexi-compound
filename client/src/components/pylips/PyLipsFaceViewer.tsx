import React, { useState, useEffect, useRef } from 'react';
import { 
    Box, 
    Card, 
    CardContent, 
    Typography, 
    IconButton, 
    Collapse,
    Alert,
    CircularProgress,
    Tooltip
} from '@mui/material';
import { 
    Visibility, 
    VisibilityOff, 
    VolumeUp, 
    VolumeOff,
    Refresh
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useLanguage } from '@contexts/LanguageContext';
import { checkPyLipsHealth, startPyLipsService, stopSpeech } from '@DAL/server-requests/pylips';

const FaceContainer = styled(Box)({
    position: 'relative',
    width: '100%',
    height: '400px',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
});

const FaceFrame = styled('iframe')({
    width: '100%',
    height: '100%',
    border: 'none',
    borderRadius: '12px',
});

const ControlsOverlay = styled(Box)({
    position: 'absolute',
    top: '8px',
    right: '8px',
    background: 'rgba(255, 255, 255, 0.9)',
    borderRadius: '8px',
    padding: '4px',
    display: 'flex',
    gap: '4px',
});

const StatusBadge = styled(Box)<{ status: 'connected' | 'disconnected' | 'loading' }>(({ status }) => ({
    position: 'absolute',
    top: '8px',
    left: '8px',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 500,
    color: 'white',
    background: status === 'connected' ? '#4caf50' :
                status === 'loading' ? '#ff9800' : '#f44336'
}));

interface PyLipsFaceViewerProps {
    isVisible: boolean;
    onToggleVisibility: () => void;
    conversationId?: string;
}

const PyLipsFaceViewer: React.FC<PyLipsFaceViewerProps> = ({
    isVisible,
    onToggleVisibility,
    conversationId
}) => {
    const [faceUrl, setFaceUrl] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string>('');
    const [isMuted, setIsMuted] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const { t } = useLanguage();

    useEffect(() => {
        if (isVisible && !faceUrl) {
            initializePyLips();
        }
    }, [isVisible]);

    const initializePyLips = async () => {
        setIsLoading(true);
        setError('');
        
        try {
            // 检查PyLips服务状态
            await checkPyLipsHealth();

            // 启动PyLips服务
            const startResult = await startPyLipsService({
                voice_id: undefined, // 使用默认语音
                tts_method: 'system'
            });
            
            if (startResult.success) {
                setFaceUrl(startResult.face_url || 'http://localhost:8000/face');
                setIsConnected(true);
                
                // 等待iframe加载完成
                setTimeout(() => {
                    setIsLoading(false);
                }, 2000);
            } else {
                throw new Error(startResult.message || t('pylips.faceViewer.startFailed'));
            }
            
        } catch (err) {
            console.error('初始化PyLips失败:', err);
            setError(err.message || t('pylips.faceViewer.initFailed'));
            setIsLoading(false);
            setIsConnected(false);
        }
    };

    const handleRefresh = () => {
        setFaceUrl('');
        setIsConnected(false);
        initializePyLips();
    };

    const handleMuteToggle = async () => {
        try {
            if (isMuted) {
                // 取消静音 - 这里可以添加恢复音频的逻辑
                setIsMuted(false);
            } else {
                // 静音 - 停止当前语音
                await stopSpeech();
                setIsMuted(true);
            }
        } catch (err) {
            console.error('切换静音状态失败:', err);
        }
    };

    const getStatusText = () => {
        if (isLoading) return t('pylips.faceViewer.connecting');
        if (isConnected) return t('pylips.faceViewer.connected');
        return t('pylips.faceViewer.disconnected');
    };

    const getStatusType = (): 'connected' | 'disconnected' | 'loading' => {
        if (isLoading) return 'loading';
        if (isConnected) return 'connected';
        return 'disconnected';
    };

    return (
        <Card elevation={3} sx={{ marginBottom: 2 }}>
            <CardContent sx={{ padding: '16px !important' }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                    <Typography variant="h6" component="div" color="primary">
                        {t('pylips.faceViewer.title')}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Tooltip title={isVisible ? t('pylips.faceViewer.hideFace') : t('pylips.faceViewer.showFace')}>
                            <IconButton onClick={onToggleVisibility} size="small">
                                {isVisible ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>

                <Collapse in={isVisible}>
                    <Box>
                        {error && (
                            <Alert 
                                severity="error" 
                                sx={{ mb: 2 }}
                                action={
                                    <IconButton size="small" onClick={handleRefresh}>
                                        <Refresh />
                                    </IconButton>
                                }
                            >
                                {error}
                            </Alert>
                        )}

                        <FaceContainer>
                            <StatusBadge status={getStatusType()}>
                                {getStatusText()}
                            </StatusBadge>

                            <ControlsOverlay>
                                <Tooltip title={t('pylips.faceViewer.refreshConnection')}>
                                    <IconButton 
                                        size="small" 
                                        onClick={handleRefresh}
                                        disabled={isLoading}
                                    >
                                        <Refresh />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title={isMuted ? t('pylips.faceViewer.unmute') : t('pylips.faceViewer.mute')}>
                                    <IconButton 
                                        size="small" 
                                        onClick={handleMuteToggle}
                                        disabled={!isConnected}
                                    >
                                        {isMuted ? <VolumeOff /> : <VolumeUp />}
                                    </IconButton>
                                </Tooltip>
                            </ControlsOverlay>

                            {isLoading && (
                                <Box
                                    display="flex"
                                    justifyContent="center"
                                    alignItems="center"
                                    height="100%"
                                    flexDirection="column"
                                    gap={2}
                                >
                                    <CircularProgress size={48} />
                                    <Typography variant="body2" color="white">
                                        {t('pylips.faceViewer.initializing')}
                                    </Typography>
                                </Box>
                            )}

                            {faceUrl && !isLoading && (
                                <FaceFrame
                                    ref={iframeRef}
                                    src={faceUrl}
                                    title="PyLips数字人脸"
                                    onLoad={() => {
                                        setIsLoading(false);
                                        setIsConnected(true);
                                    }}
                                    onError={() => {
                                        setError(t('pylips.faceViewer.loadFailed'));
                                        setIsLoading(false);
                                        setIsConnected(false);
                                    }}
                                />
                            )}

                            {!faceUrl && !isLoading && !error && (
                                <Box
                                    display="flex"
                                    justifyContent="center"
                                    alignItems="center"
                                    height="100%"
                                    flexDirection="column"
                                    gap={2}
                                >
                                    <Typography variant="body1" color="white" textAlign="center">
                                        {t('pylips.faceViewer.clickToShow')}
                                    </Typography>
                                </Box>
                            )}
                        </FaceContainer>
                    </Box>
                </Collapse>
            </CardContent>
        </Card>
    );
};

export default PyLipsFaceViewer;