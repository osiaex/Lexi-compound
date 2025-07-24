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
    CircularProgress
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import VoiceRecorder from './VoiceRecorder';
import VoiceErrorBoundary from './VoiceErrorBoundary';
import { useSnackbar, SnackbarStatus } from '@contexts/SnackbarProvider';

interface VoiceInputButtonProps {
    onTranscriptionComplete: (text: string) => void;
    disabled?: boolean;
    experimentId: string;
    voiceInputMode?: 'dialog' | 'direct';
}

const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
    onTranscriptionComplete,
    disabled = false,
    experimentId,
    voiceInputMode = 'dialog'
}) => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [transcriptionResult, setTranscriptionResult] = useState<string>('');
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [isDirectRecording, setIsDirectRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
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
                    if (voiceInputMode === 'direct') {
                        // 直接模式：自动使用转录结果
                        onTranscriptionComplete(result.data.text);
                        openSnackbar('语音转录完成并已发送', SnackbarStatus.SUCCESS);
                    } else {
                        // 对话框模式：显示转录结果
                        openSnackbar('语音转录完成', SnackbarStatus.SUCCESS);
                    }
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
                if (voiceInputMode === 'direct') {
                    setIsDirectRecording(false);
                }
            }
        }
    }, [experimentId, openSnackbar, voiceInputMode, onTranscriptionComplete]);

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

    // 直接录音模式的开始录音
    const startDirectRecording = useCallback(async () => {
        if (!isMountedRef.current) return;
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks: Blob[] = [];

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunks.push(event.data);
                }
            };

            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                if (blob.size > 0) {
                    handleRecordingComplete(blob, 0);
                }
                // 停止所有音频轨道
                stream.getTracks().forEach(track => track.stop());
            };

            recorder.start();
            setMediaRecorder(recorder);
            setIsDirectRecording(true);
        } catch (error) {
            console.error('Failed to start recording:', error);
            openSnackbar('无法访问麦克风，请检查权限设置', SnackbarStatus.ERROR);
        }
    }, [handleRecordingComplete, openSnackbar]);

    // 直接录音模式的停止录音
    const stopDirectRecording = useCallback(() => {
        if (!isMountedRef.current) return;
        
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            setMediaRecorder(null);
        }
    }, [mediaRecorder]);

    // 处理按钮点击
    const handleButtonClick = useCallback(() => {
        if (!isMountedRef.current) return;
        
        if (voiceInputMode === 'direct') {
            if (isDirectRecording) {
                stopDirectRecording();
            } else {
                startDirectRecording();
            }
        } else {
            handleOpenDialog();
        }
    }, [voiceInputMode, isDirectRecording, stopDirectRecording, startDirectRecording, handleOpenDialog]);

    return (
        <>
            <IconButton
                color={isDirectRecording ? 'secondary' : 'primary'}
                onClick={handleButtonClick}
                disabled={disabled || isTranscribing}
                size="medium"
            >
                {isTranscribing ? (
                    <CircularProgress size={24} />
                ) : (
                    <MicIcon />
                )}
            </IconButton>

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