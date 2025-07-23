import React, { useRef, useEffect, useState } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';

interface TalkingVideoPlayerProps {
    videoBase64: string;
    autoPlay?: boolean;
    onVideoEnd?: () => void;
}

const TalkingVideoPlayer: React.FC<TalkingVideoPlayerProps> = ({
    videoBase64,
    autoPlay = false,
    onVideoEnd
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    useEffect(() => {
        console.log('TalkingVideoPlayer: videoBase64 length:', videoBase64?.length);
        if (!videoBase64) {
            setError('视频数据为空');
            setIsLoading(false);
            return;
        }
        
        if (videoRef.current && autoPlay && !isLoading) {
            videoRef.current.play().catch(err => {
                console.error('Auto play failed:', err);
                setError('自动播放失败');
            });
            setIsPlaying(true);
        }
    }, [videoBase64, autoPlay, isLoading]);
    
    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play().catch(err => {
                    console.error('Play failed:', err);
                    setError('播放失败');
                });
            }
            setIsPlaying(!isPlaying);
        }
    };
    
    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };
    
    const handleLoadedData = () => {
        setIsLoading(false);
        setError(null);
    };
    
    const handleError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
        console.error('Video error:', e);
        setError('视频加载失败');
        setIsLoading(false);
    };
    
    if (!videoBase64) {
        return (
            <Box sx={{ 
                width: '200px', 
                height: '200px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                backgroundColor: '#f5f5f5',
                border: '1px solid #e0e0e0',
                borderRadius: '12px'
            }}>
                <Typography variant="body2" color="text.secondary">
                    无视频数据
                </Typography>
            </Box>
        );
    }
    
    return (
        <Box 
            sx={{
                position: 'relative',
                width: '200px',
                height: '200px',
                borderRadius: '12px',
                overflow: 'hidden',
                marginBottom: '8px',
                backgroundColor: '#f5f5f5',
                border: '1px solid #e0e0e0'
            }}
        >
            {isLoading && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        color: '#666',
                        fontSize: '14px'
                    }}
                >
                    加载视频中...
                </Box>
            )}
            
            {error && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        color: '#f44336',
                        fontSize: '14px',
                        textAlign: 'center'
                    }}
                >
                    {error}
                </Box>
            )}
            
            <video
                ref={videoRef}
                src={`data:video/mp4;base64,${videoBase64}`}
                width="100%"
                height="100%"
                onEnded={() => {
                    setIsPlaying(false);
                    onVideoEnd?.();
                }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onLoadedData={handleLoadedData}
                onError={handleError}
                style={{ 
                    objectFit: 'cover',
                    display: (isLoading || error) ? 'none' : 'block'
                }}
                muted={isMuted}
                playsInline
            />
            
            {!isLoading && !error && (
                <>
                    <Box
                        sx={{
                            position: 'absolute',
                            bottom: '8px',
                            left: '8px',
                            right: '8px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}
                    >
                        <IconButton
                            onClick={togglePlay}
                            size="small"
                            sx={{
                                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                color: 'white',
                                '&:hover': {
                                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                }
                            }}
                        >
                            {isPlaying ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
                        </IconButton>
                        
                        <IconButton
                            onClick={toggleMute}
                            size="small"
                            sx={{
                                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                color: 'white',
                                '&:hover': {
                                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                }
                            }}
                        >
                            {isMuted ? <VolumeOffIcon fontSize="small" /> : <VolumeUpIcon fontSize="small" />}
                        </IconButton>
                    </Box>
                </>
            )}
        </Box>
    );
};

export default TalkingVideoPlayer; 