import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
    IconButton, 
    Dialog, 
    DialogTitle, 
    DialogContent, 
    DialogActions, 
    Button, 
    Typography,
    Box,
    CircularProgress,
    Tooltip
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import VoiceRecorder from './VoiceRecorder';
import VoiceErrorBoundary from './VoiceErrorBoundary';
import { useSnackbar, SnackbarStatus } from '@contexts/SnackbarProvider';

interface VoiceInputButtonProps {
    onTranscriptionComplete: (text: string) => void;
    disabled?: boolean;
    experimentId: string;
}

const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
    onTranscriptionComplete,
    disabled = false,
    experimentId
}) => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [transcriptionResult, setTranscriptionResult] = useState<string>('');
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const { openSnackbar } = useSnackbar();
    
    // 添加组件挂载状态跟踪
    const isMountedRef = useRef(true);
    
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const handleOpenDialog = useCallback(() => {
        if (!isMountedRef.current) return;
        setIsDialogOpen(true);
        setTranscriptionResult('');
        setAudioBlob(null);
    }, []);

    const handleCloseDialog = useCallback(() => {
        if (!isMountedRef.current) return;
        // 确保所有状态都被重置
        setIsDialogOpen(false);
        setTranscriptionResult('');
        setAudioBlob(null);
        setIsTranscribing(false);
    }, []);

    const handleRecordingComplete = useCallback(async (blob: Blob, duration: number) => {
        if (!isMountedRef.current) return;
        
        setAudioBlob(blob);
        setIsTranscribing(true);

        // 创建AbortController用于取消请求
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => {
            abortController.abort();
        }, 120000); // 2分钟超时

        try {
            const formData = new FormData();
            formData.append('audio', blob, 'recording.webm');

            const response = await fetch(`${process.env.REACT_APP_API_URL}/whisper/transcribe/${experimentId}`, {
                method: 'POST',
                credentials: 'include',
                body: formData,
                signal: abortController.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            if (result.success) {
                if (isMountedRef.current) {
                    setTranscriptionResult(result.data.text);
                    openSnackbar('语音转录完成', SnackbarStatus.SUCCESS);
                }
            } else {
                throw new Error(result.message || '转录失败');
            }
        } catch (error) {
            clearTimeout(timeoutId);
            console.error('Transcription error:', error);
            
            let errorMessage = '转录失败';
            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    errorMessage = '转录超时，请重试';
                } else {
                    errorMessage = `转录失败: ${error.message}`;
                }
            }
            
            if (isMountedRef.current) {
                openSnackbar(errorMessage, SnackbarStatus.ERROR);
            }
        } finally {
            if (isMountedRef.current) {
                setIsTranscribing(false);
            }
        }
    }, [experimentId, openSnackbar]);

    const handleUseTranscription = useCallback(() => {
        if (!isMountedRef.current) return;
        if (transcriptionResult.trim()) {
            onTranscriptionComplete(transcriptionResult);
            handleCloseDialog();
        }
    }, [transcriptionResult, onTranscriptionComplete, handleCloseDialog]);

    const handleRetry = useCallback(() => {
        if (!isMountedRef.current) return;
        setTranscriptionResult('');
        setAudioBlob(null);
        setIsTranscribing(false);
    }, []);

    return (
        <>
            <Tooltip title="语音输入">
                <IconButton
                    color="primary"
                    onClick={handleOpenDialog}
                    disabled={disabled}
                    size="medium"
                >
                    <MicIcon />
                </IconButton>
            </Tooltip>

            <Dialog
                open={isDialogOpen}
                onClose={handleCloseDialog}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    style: {
                        minHeight: '400px',
                    },
                }}
            >
                <DialogTitle>
                    <Box display="flex" alignItems="center" gap={1}>
                        <MicIcon color="primary" />
                        <Typography variant="h6">语音输入</Typography>
                    </Box>
                </DialogTitle>

                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2}>
                        <VoiceErrorBoundary onRetry={handleRetry}>
                            <VoiceRecorder
                                onRecordingComplete={handleRecordingComplete}
                                disabled={isTranscribing}
                                maxDuration={300} // 5分钟
                            />
                        </VoiceErrorBoundary>

                        {isTranscribing && (
                            <Box display="flex" alignItems="center" gap={2} justifyContent="center">
                                <CircularProgress size={24} />
                                <Typography variant="body2" color="text.secondary">
                                    正在转录语音...
                                </Typography>
                            </Box>
                        )}

                        {transcriptionResult && (
                            <Box>
                                <Typography variant="subtitle2" gutterBottom>
                                    转录结果：
                                </Typography>
                                <Box
                                    sx={{
                                        p: 2,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 1,
                                        backgroundColor: 'background.paper',
                                        minHeight: '80px',
                                        maxHeight: '200px',
                                        overflow: 'auto',
                                    }}
                                >
                                    <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                                        {transcriptionResult}
                                    </Typography>
                                </Box>
                            </Box>
                        )}

                        {!transcriptionResult && !isTranscribing && audioBlob && (
                            <Box display="flex" justifyContent="center">
                                <Typography variant="body2" color="text.secondary">
                                    录音完成，正在准备转录...
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </DialogContent>

                <DialogActions>
                    <Button onClick={handleCloseDialog} color="secondary">
                        取消
                    </Button>
                    
                    {transcriptionResult && (
                        <Button onClick={handleRetry} color="primary" variant="outlined">
                            重新录制
                        </Button>
                    )}
                    
                    <Button
                        onClick={handleUseTranscription}
                        color="primary"
                        variant="contained"
                        disabled={!transcriptionResult || isTranscribing}
                    >
                        使用此文本
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default VoiceInputButton; 