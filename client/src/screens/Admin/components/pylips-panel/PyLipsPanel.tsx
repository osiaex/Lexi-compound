import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Grid,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
    Divider,
} from '@mui/material';
import {
    PlayArrow,
    Stop,
    VolumeUp,
    Settings,
    Refresh,
    Face,
    Mood,
    RemoveRedEye,
} from '@mui/icons-material';
import { 
    checkPyLipsHealth,
    getPyLipsStatus,
    startPyLipsService,
    stopPyLipsService,
    speakText,
    speakWithExpression,
    stopSpeech,
    setExpression,
    lookAt,
    updatePyLipsConfig,
    type PyLipsStatus,
    type PyLipsConfig 
} from '@DAL/server-requests/pylips';

const PyLipsPanel: React.FC = () => {
    const [status, setStatus] = useState<PyLipsStatus | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [testText, setTestText] = useState('你好，我是LEXI数字人！');
    const [config, setConfig] = useState<PyLipsConfig>({
        voice_id: undefined,
        tts_method: 'system'
    });
    const [showConfigDialog, setShowConfigDialog] = useState(false);
    const [isServiceHealthy, setIsServiceHealthy] = useState(false);

    useEffect(() => {
        refreshStatus();
        // 设置定期检查状态
        const interval = setInterval(refreshStatus, 10000); // 每10秒检查一次
        return () => clearInterval(interval);
    }, []);

    const refreshStatus = async () => {
        try {
            const [healthResult, statusResult] = await Promise.all([
                checkPyLipsHealth().catch(() => ({ success: false })),
                getPyLipsStatus().catch(() => null)
            ]);
            
            setIsServiceHealthy(healthResult.success);
            setStatus(statusResult);
            setError('');
        } catch (err) {
            console.error('获取状态失败:', err);
            setError('无法获取服务状态');
            setIsServiceHealthy(false);
            setStatus(null);
        }
    };

    const handleStartService = async () => {
        setIsLoading(true);
        setError('');
        
        try {
            const result = await startPyLipsService(config);
            if (result.success) {
                await refreshStatus();
            } else {
                setError(result.message || '启动服务失败');
            }
        } catch (err) {
            setError('启动服务失败: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStopService = async () => {
        setIsLoading(true);
        setError('');
        
        try {
            const result = await stopPyLipsService();
            if (result.success) {
                await refreshStatus();
            } else {
                setError(result.message || '停止服务失败');
            }
        } catch (err) {
            setError('停止服务失败: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTestSpeak = async () => {
        if (!testText.trim()) return;
        
        setIsLoading(true);
        try {
            const result = await speakWithExpression(testText);
            if (!result.success) {
                setError(result.message || '语音测试失败');
            }
        } catch (err) {
            setError('语音测试失败: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStopSpeech = async () => {
        try {
            await stopSpeech();
        } catch (err) {
            setError('停止语音失败: ' + err.message);
        }
    };

    const handleTestExpression = async (expression: string) => {
        try {
            const result = await setExpression(expression as any);
            if (!result.success) {
                setError(result.message || '表情测试失败');
            }
        } catch (err) {
            setError('表情测试失败: ' + err.message);
        }
    };

    const handleTestLook = async (direction: string) => {
        try {
            let x = 0, y = 0, z = 1000;
            switch (direction) {
                case 'left': x = -500; break;
                case 'right': x = 500; break;
                case 'up': y = 300; break;
                case 'down': y = -300; break;
                default: x = 0; y = 0; z = 1000; break;
            }
            
            const result = await lookAt(x, y, z);
            if (!result.success) {
                setError(result.message || '注视测试失败');
            }
        } catch (err) {
            setError('注视测试失败: ' + err.message);
        }
    };

    const handleUpdateConfig = async () => {
        setIsLoading(true);
        try {
            const result = await updatePyLipsConfig(config);
            if (result.success) {
                setShowConfigDialog(false);
                await refreshStatus();
            } else {
                setError(result.message || '更新配置失败');
            }
        } catch (err) {
            setError('更新配置失败: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusColor = () => {
        if (!isServiceHealthy) return 'error';
        if (status?.face_server_running && status?.face_initialized) return 'success';
        if (status?.face_server_running) return 'warning';
        return 'default';
    };

    const getStatusText = () => {
        if (!isServiceHealthy) return '服务不可用';
        if (status?.face_server_running && status?.face_initialized) return '运行中';
        if (status?.face_server_running) return '启动中';
        return '已停止';
    };

    return (
        <Box p={3}>
            <Typography variant="h4" gutterBottom>
                PyLips 数字人控制面板
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            {/* 服务状态卡片 */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6">服务状态</Typography>
                        <Button
                            startIcon={<Refresh />}
                            onClick={refreshStatus}
                            disabled={isLoading}
                        >
                            刷新
                        </Button>
                    </Box>

                    <Grid container spacing={2} alignItems="center">
                        <Grid item>
                            <Chip
                                label={getStatusText()}
                                color={getStatusColor()}
                                icon={<Face />}
                            />
                        </Grid>
                        <Grid item>
                            <Typography variant="body2" color="textSecondary">
                                TTS方法: {status?.tts_method || 'N/A'}
                            </Typography>
                        </Grid>
                        <Grid item>
                            <Typography variant="body2" color="textSecondary">
                                语音ID: {status?.current_voice_id || '默认'}
                            </Typography>
                        </Grid>
                    </Grid>

                    <Box mt={2}>
                        <Grid container spacing={2}>
                            <Grid item>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    startIcon={<PlayArrow />}
                                    onClick={handleStartService}
                                    disabled={isLoading || (status?.face_server_running && status?.face_initialized)}
                                >
                                    启动服务
                                </Button>
                            </Grid>
                            <Grid item>
                                <Button
                                    variant="outlined"
                                    color="secondary"
                                    startIcon={<Stop />}
                                    onClick={handleStopService}
                                    disabled={isLoading || !status?.face_server_running}
                                >
                                    停止服务
                                </Button>
                            </Grid>
                            <Grid item>
                                <Button
                                    variant="outlined"
                                    startIcon={<Settings />}
                                    onClick={() => setShowConfigDialog(true)}
                                    disabled={isLoading}
                                >
                                    配置
                                </Button>
                            </Grid>
                        </Grid>
                    </Box>
                </CardContent>
            </Card>

            {/* 语音测试卡片 */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        语音测试
                    </Typography>
                    
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={8}>
                            <TextField
                                fullWidth
                                label="测试文本"
                                value={testText}
                                onChange={(e) => setTestText(e.target.value)}
                                placeholder="输入要测试的语音文本..."
                                multiline
                                rows={2}
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Box display="flex" gap={1} flexDirection="column">
                                <Button
                                    variant="contained"
                                    startIcon={<VolumeUp />}
                                    onClick={handleTestSpeak}
                                    disabled={isLoading || !status?.face_initialized || !testText.trim()}
                                    fullWidth
                                >
                                    播放语音
                                </Button>
                                <Button
                                    variant="outlined"
                                    startIcon={<Stop />}
                                    onClick={handleStopSpeech}
                                    disabled={isLoading || !status?.face_initialized}
                                    fullWidth
                                >
                                    停止语音
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* 表情和注视测试卡片 */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        表情和注视测试
                    </Typography>
                    
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" gutterBottom>
                                表情测试
                            </Typography>
                            <Box display="flex" gap={1} flexWrap="wrap">
                                {['happy', 'sad', 'surprised', 'angry', 'neutral'].map((expr) => (
                                    <Button
                                        key={expr}
                                        variant="outlined"
                                        size="small"
                                        startIcon={<Mood />}
                                        onClick={() => handleTestExpression(expr)}
                                        disabled={isLoading || !status?.face_initialized}
                                    >
                                        {expr === 'happy' ? '开心' :
                                         expr === 'sad' ? '悲伤' :
                                         expr === 'surprised' ? '惊讶' :
                                         expr === 'angry' ? '愤怒' : '中性'}
                                    </Button>
                                ))}
                            </Box>
                        </Grid>
                        
                        <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" gutterBottom>
                                注视方向测试
                            </Typography>
                            <Box display="flex" gap={1} flexWrap="wrap">
                                {['center', 'left', 'right', 'up', 'down'].map((dir) => (
                                    <Button
                                        key={dir}
                                        variant="outlined"
                                        size="small"
                                        startIcon={<RemoveRedEye />}
                                        onClick={() => handleTestLook(dir)}
                                        disabled={isLoading || !status?.face_initialized}
                                    >
                                        {dir === 'center' ? '中央' :
                                         dir === 'left' ? '左' :
                                         dir === 'right' ? '右' :
                                         dir === 'up' ? '上' : '下'}
                                    </Button>
                                ))}
                            </Box>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* 配置对话框 */}
            <Dialog open={showConfigDialog} onClose={() => setShowConfigDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>PyLips 配置</DialogTitle>
                <DialogContent>
                    <Box mt={2}>
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <FormControl fullWidth>
                                    <InputLabel>TTS方法</InputLabel>
                                    <Select
                                        value={config.tts_method}
                                        label="TTS方法"
                                        onChange={(e) => setConfig({...config, tts_method: e.target.value as any})}
                                    >
                                        <MenuItem value="system">系统TTS</MenuItem>
                                        <MenuItem value="polly">Amazon Polly</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="语音ID"
                                    value={config.voice_id || ''}
                                    onChange={(e) => setConfig({...config, voice_id: e.target.value || undefined})}
                                    placeholder="留空使用默认语音"
                                    helperText="可选：指定特定的语音ID"
                                />
                            </Grid>
                        </Grid>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowConfigDialog(false)}>
                        取消
                    </Button>
                    <Button onClick={handleUpdateConfig} variant="contained" disabled={isLoading}>
                        {isLoading ? <CircularProgress size={20} /> : '应用配置'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default PyLipsPanel; 