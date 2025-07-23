import React, { useState, useRef, useEffect } from 'react';
import { Box, IconButton, Typography, CircularProgress } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import DeleteIcon from '@mui/icons-material/Delete';
import { styled } from '@mui/material/styles';
import { SnackbarStatus, useSnackbar } from '@contexts/SnackbarProvider';

const RecorderContainer = styled(Box)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: theme.spacing(2),
    border: `2px solid ${theme.palette.primary.main}`,
    borderRadius: theme.spacing(2),
    backgroundColor: theme.palette.background.paper,
    margin: theme.spacing(1),
}));

const ControlsContainer = styled(Box)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    marginTop: theme.spacing(1),
}));

const WaveformContainer = styled(Box)(({ theme }) => ({
    width: '100%',
    height: '60px',
    backgroundColor: theme.palette.grey[100],
    borderRadius: theme.spacing(1),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: theme.spacing(1, 0),
}));

interface VoiceRecorderProps {
    onRecordingComplete: (audioBlob: Blob, duration: number) => void;
    onRecordingStart?: () => void;
    onRecordingStop?: () => void;
    maxDuration?: number; // 最大录音时长（秒）
    disabled?: boolean;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
    onRecordingComplete,
    onRecordingStart,
    onRecordingStop,
    maxDuration = 300, // 默认5分钟
    disabled = false,
}) => {
    const { openSnackbar } = useSnackbar();
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [duration, setDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioLevels, setAudioLevels] = useState<number[]>([]);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationRef = useRef<number | null>(null);

    useEffect(() => {
        return () => {
            // 清理资源
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            // 清理 URL 对象
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
            }
        };
    }, [audioUrl]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100,
                } 
            });
            
            streamRef.current = stream;
            
            // 设置音频分析
            audioContextRef.current = new AudioContext();
            analyserRef.current = audioContextRef.current.createAnalyser();
            const source = audioContextRef.current.createMediaStreamSource(stream);
            source.connect(analyserRef.current);
            
            analyserRef.current.fftSize = 256;
            const bufferLength = analyserRef.current.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            
            const updateAudioLevels = () => {
                if (analyserRef.current && isRecording) {
                    analyserRef.current.getByteFrequencyData(dataArray);
                    const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
                    setAudioLevels(prev => [...prev.slice(-19), average]); // 保持20个数据点
                    animationRef.current = requestAnimationFrame(updateAudioLevels);
                }
            };
            
            // 检查浏览器支持的音频格式
            const supportedMimeTypes = [
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/mp4',
                'audio/ogg'
            ];
            
            const mimeType = supportedMimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || 'audio/webm';
            
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: mimeType
            });
            
            const chunks: Blob[] = [];
            
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunks.push(event.data);
                }
            };
            
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: mimeType });
                
                // 检查blob数据完整性
                if (blob.size === 0) {
                    console.error('Recording failed: empty audio blob');
                    openSnackbar('录音失败：音频数据为空，请重试', SnackbarStatus.ERROR);
                    return;
                }
                
                if (blob.size < 1000) { // 小于1KB可能是无效录音
                    console.warn('Recording may be invalid: very small audio blob');
                    openSnackbar('录音时间很短，音频质量可能不佳', SnackbarStatus.WARNING);
                }
                
                setAudioBlob(blob);
                setAudioUrl(URL.createObjectURL(blob));
                setDuration(recordingTime);
                onRecordingComplete(blob, recordingTime);
                
                // 停止音频分析
                if (animationRef.current) {
                    cancelAnimationFrame(animationRef.current);
                }
            };
            
            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            setAudioLevels([]);
            
            // 开始计时
            intervalRef.current = setInterval(() => {
                setRecordingTime(prev => {
                    const newTime = prev + 1;
                    if (newTime >= maxDuration) {
                        stopRecording();
                    }
                    return newTime;
                });
            }, 1000);
            
            updateAudioLevels();
            onRecordingStart?.();
            
        } catch (error) {
            console.error('Error starting recording:', error);
            let errorMessage = '无法访问麦克风';
            
            if (error instanceof Error) {
                if (error.name === 'NotAllowedError') {
                    errorMessage = '麦克风权限被拒绝，请在浏览器设置中允许访问麦克风';
                } else if (error.name === 'NotFoundError') {
                    errorMessage = '未找到麦克风设备，请检查设备连接';
                } else if (error.name === 'NotReadableError') {
                    errorMessage = '麦克风设备被其他应用占用，请关闭其他应用后重试';
                }
            }
            
            openSnackbar(errorMessage, SnackbarStatus.ERROR);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            // 立即设置状态防止重复调用
            setIsRecording(false);
            setIsPaused(false);
            
            try {
                // 检查MediaRecorder状态，只有在recording状态才能停止
                if (mediaRecorderRef.current.state === 'recording') {
                    mediaRecorderRef.current.stop();
                }
            } catch (error) {
                console.warn('Error stopping media recorder:', error);
            }
            
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => {
                    try {
                        if (track.readyState === 'live') {
                            track.stop();
                        }
                    } catch (error) {
                        console.warn('Error stopping track:', error);
                    }
                });
                streamRef.current = null;
            }
            
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            
            if (audioContextRef.current) {
                // 检查AudioContext状态
                if (audioContextRef.current.state !== 'closed') {
                    audioContextRef.current.close().catch(console.warn);
                }
                audioContextRef.current = null;
            }
            
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
                animationRef.current = null;
            }
            
            onRecordingStop?.();
        }
    };

    const playAudio = () => {
        if (audioRef.current && audioUrl) {
            audioRef.current.play();
            setIsPlaying(true);
        }
    };

    const pauseAudio = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            setIsPlaying(false);
        }
    };

    const deleteRecording = () => {
        // 清理 URL 对象以防止内存泄漏
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
        }
        
        setAudioBlob(null);
        setAudioUrl(null);
        setDuration(0);
        setRecordingTime(0);
        setAudioLevels([]);
        setIsPlaying(false);
        
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    };

    const formatTime = React.useCallback((seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, []);

    const renderWaveform = () => {
        if (isRecording && audioLevels.length > 0) {
            return (
                <Box display="flex" alignItems="center" height="100%" gap={0.5}>
                    {audioLevels.map((level, index) => (
                        <Box
                            key={index}
                            sx={{
                                width: 4,
                                height: `${Math.max(level / 4, 8)}px`,
                                backgroundColor: 'primary.main',
                                borderRadius: 1,
                                opacity: 0.8,
                            }}
                        />
                    ))}
                </Box>
            );
        }
        
        if (audioBlob) {
            return (
                <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2" color="text.secondary">
                        录音完成 ({formatTime(duration)})
                    </Typography>
                </Box>
            );
        }
        
        return (
            <Typography variant="body2" color="text.secondary">
                点击麦克风开始录音
            </Typography>
        );
    };

    return (
        <RecorderContainer>
            <WaveformContainer>
                {renderWaveform()}
            </WaveformContainer>
            
            <ControlsContainer>
                {!isRecording && !audioBlob && (
                    <IconButton
                        color="primary"
                        onClick={startRecording}
                        disabled={disabled}
                        size="large"
                    >
                        <MicIcon />
                    </IconButton>
                )}
                
                {isRecording && (
                    <>
                        <IconButton
                            color="secondary"
                            onClick={stopRecording}
                            size="large"
                        >
                            <StopIcon />
                        </IconButton>
                        <Typography variant="body2" color="primary">
                            {formatTime(recordingTime)} / {formatTime(maxDuration)}
                        </Typography>
                    </>
                )}
                
                {audioBlob && (
                    <>
                        <IconButton
                            color="primary"
                            onClick={isPlaying ? pauseAudio : playAudio}
                            size="large"
                        >
                            {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                        </IconButton>
                        
                        <IconButton
                            color="secondary"
                            onClick={deleteRecording}
                            size="small"
                        >
                            <DeleteIcon />
                        </IconButton>
                        
                        <IconButton
                            color="primary"
                            onClick={startRecording}
                            size="small"
                            title="重新录制"
                        >
                            <MicIcon />
                        </IconButton>
                    </>
                )}
            </ControlsContainer>
            
            {audioUrl && (
                <audio
                    ref={audioRef}
                    src={audioUrl}
                    onEnded={() => setIsPlaying(false)}
                    style={{ display: 'none' }}
                />
            )}
        </RecorderContainer>
    );
};

export default VoiceRecorder;