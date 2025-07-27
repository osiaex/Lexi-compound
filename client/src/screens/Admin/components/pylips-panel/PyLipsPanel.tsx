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
    FormControlLabel,
    Switch,
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
import { useLanguage } from '@contexts/LanguageContext';
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
    getPyLipsVoices,
    setAppearance,
    type PyLipsStatus,
    type PyLipsConfig,
    type VoiceInfo,
    type AppearanceConfig
} from '@DAL/server-requests/pylips';

const PyLipsPanel: React.FC = () => {
    const { t } = useLanguage();
    const [status, setStatus] = useState<PyLipsStatus | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [testText, setTestText] = useState(t('pylips.defaultTestText'));
    const [config, setConfig] = useState<PyLipsConfig>({
        voice_id: undefined,
        tts_method: 'system'
    });
    const [showConfigDialog, setShowConfigDialog] = useState(false);
    const [isServiceHealthy, setIsServiceHealthy] = useState(false);
    const [availableVoices, setAvailableVoices] = useState<VoiceInfo[]>([]);
    const [useManualVoiceId, setUseManualVoiceId] = useState(false);
    const [showAppearanceDialog, setShowAppearanceDialog] = useState(false);
    const [appearanceConfig, setAppearanceConfig] = useState({
        // 面孔外观参数
        background_color: '#D7E4F5',
        eyeball_color: '#ffffff',
        iris_color: '#800080',
        eye_size: 150,
        eye_height: 80,
        eye_separation: 400,
        iris_size: 80,
        pupil_scale: 0.7,
        mouth_color: '#2c241b',
        mouth_width: 450,
        mouth_height: 20,
        mouth_thickness: 18,
        brow_color: '#2c241b',
        brow_width: 130,
        brow_height: 210,
        brow_thickness: 18,
        // 窗口和显示参数
        window_width: 400,
        window_height: 600,
        border_radius: 12,
        shadow_intensity: 0.1,
        // 眼睑和鼻子参数
        eyelid_color: '#D7E4F5',
        nose_color: '#ff99cc',
        nose_width: 0,
        nose_height: 0,
        nose_vertical_position: 10,
        // 瞳孔和眼睛光泽
        eye_shine: 50,
        pupil_color: '#000000'
    });

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
            setError(t('pylips.errors.getStatusFailed'));
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
                setError(result.message || t('pylips.errors.startServiceFailed'));
            }
        } catch (err) {
            setError(t('pylips.errors.startServiceFailed') + ': ' + err.message);
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
                setError(result.message || t('pylips.errors.stopServiceFailed'));
            }
        } catch (err) {
            setError(t('pylips.errors.stopServiceFailed') + ': ' + err.message);
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
                setError(result.message || t('pylips.errors.speechTestFailed'));
            }
        } catch (err) {
            setError(t('pylips.errors.speechTestFailed') + ': ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStopSpeech = async () => {
        try {
            await stopSpeech();
        } catch (err) {
            setError(t('pylips.errors.stopSpeechFailed') + ': ' + err.message);
        }
    };

    const handleTestExpression = async (expression: string) => {
        try {
            const result = await setExpression(expression as any);
            if (!result.success) {
                setError(result.message || t('pylips.errors.expressionTestFailed'));
            }
        } catch (err) {
            setError(t('pylips.errors.expressionTestFailed') + ': ' + err.message);
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
                setError(result.message || t('pylips.errors.lookTestFailed'));
            }
        } catch (err) {
            setError(t('pylips.errors.lookTestFailed') + ': ' + err.message);
        }
    };

    const loadVoices = async (ttsMethod?: string) => {
          try {
              const method = ttsMethod || config.tts_method || 'system';
              const validMethod = (method === 'polly' ? 'polly' : 'system') as 'system' | 'polly';
              const result = await getPyLipsVoices(validMethod);
              if (result.success && result.voices) {
                  setAvailableVoices(result.voices);
              } else {
                  setAvailableVoices([]);
              }
          } catch (err) {
              console.error('Failed to load voices:', err);
              setAvailableVoices([]);
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
                setError(result.message || t('pylips.errors.updateConfigFailed'));
            }
        } catch (err) {
            setError(t('pylips.errors.updateConfigFailed') + ': ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfigDialogOpen = () => {
        setShowConfigDialog(true);
        loadVoices();
    };

    const handleAppearanceDialogOpen = () => {
        setShowAppearanceDialog(true);
    };

    const handleUpdateAppearance = async () => {
        setIsLoading(true);
        try {
            // 分离面孔参数和窗口参数
            const {
                window_width,
                window_height,
                border_radius,
                shadow_intensity,
                ...faceParams
            } = appearanceConfig;
            
            // 更新面孔外观
            const result = await setAppearance(faceParams);
            if (result.success) {
                // 更新窗口样式（通过事件或localStorage）
                const windowConfig = {
                    window_width,
                    window_height,
                    border_radius,
                    shadow_intensity
                };
                localStorage.setItem('pylips_window_config', JSON.stringify(windowConfig));
                
                // 触发窗口更新事件
                window.dispatchEvent(new CustomEvent('pylips-window-config-updated', {
                    detail: windowConfig
                }));
                
                setShowAppearanceDialog(false);
            } else {
                setError(result.message || t('pylips.errors.updateAppearanceFailed'));
            }
        } catch (err) {
            setError(t('pylips.errors.updateAppearanceFailed') + ': ' + err.message);
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
        if (!isServiceHealthy) return t('pylips.status.unavailable');
        if (status?.face_server_running && status?.face_initialized) return t('pylips.status.running');
        if (status?.face_server_running) return t('pylips.status.starting');
        return t('pylips.status.stopped');
    };

    return (
        <Box p={3}>
            <Typography variant="h4" gutterBottom>
                {t('pylips.title')}
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
                        <Typography variant="h6">{t('pylips.serviceStatus')}</Typography>
                        <Button
                            startIcon={<Refresh />}
                            onClick={refreshStatus}
                            disabled={isLoading}
                        >
                            {t('pylips.refresh')}
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
                                {t('pylips.ttsMethod')}: {status?.tts_method || 'N/A'}
                            </Typography>
                        </Grid>
                        <Grid item>
                            <Typography variant="body2" color="textSecondary">
                                {t('pylips.voiceId')}: {status?.current_voice_id || t('pylips.default')}
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
                                    {t('pylips.startService')}
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
                                    {t('pylips.stopService')}
                                </Button>
                            </Grid>
                            <Grid item>
                                <Button
                                    variant="outlined"
                                    startIcon={<Settings />}
                                    onClick={handleConfigDialogOpen}
                                    disabled={isLoading}
                                >
                                    {t('pylips.config')}
                                </Button>
                            </Grid>
                            <Grid item>
                                <Button
                                    variant="outlined"
                                    startIcon={<Face />}
                                    onClick={handleAppearanceDialogOpen}
                                    disabled={isLoading || !status?.face_initialized}
                                >
                                    {t('pylips.appearance')}
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
                        {t('pylips.speechTest')}
                    </Typography>
                    
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={8}>
                            <TextField
                                fullWidth
                                label={t('pylips.testText')}
                                value={testText}
                                onChange={(e) => setTestText(e.target.value)}
                                placeholder={t('pylips.testTextPlaceholder')}
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
                                    {t('pylips.playSpeech')}
                                </Button>
                                <Button
                                    variant="outlined"
                                    startIcon={<Stop />}
                                    onClick={handleStopSpeech}
                                    disabled={isLoading || !status?.face_initialized}
                                    fullWidth
                                >
                                    {t('pylips.stopSpeech')}
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
                        {t('pylips.expressionAndLookTest')}
                    </Typography>
                    
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" gutterBottom>
                                {t('pylips.expressionTest')}
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
                                        {t(`pylips.expressions.${expr}`)}
                                    </Button>
                                ))}
                            </Box>
                        </Grid>
                        
                        <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" gutterBottom>
                                {t('pylips.lookDirectionTest')}
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
                                        {t(`pylips.directions.${dir}`)}
                                    </Button>
                                ))}
                            </Box>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* 配置对话框 */}
            <Dialog open={showConfigDialog} onClose={() => setShowConfigDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{t('pylips.configTitle')}</DialogTitle>
                <DialogContent>
                    <Box mt={2}>
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <FormControl fullWidth>
                                    <InputLabel>{t('pylips.ttsMethod')}</InputLabel>
                                    <Select
                                         value={config.tts_method}
                                         label={t('pylips.ttsMethod')}
                                         onChange={(e) => {
                                             const newMethod = e.target.value as any;
                                             setConfig({...config, tts_method: newMethod, voice_id: undefined});
                                             loadVoices(newMethod);
                                         }}
                                     >
                                        <MenuItem value="system">{t('pylips.systemTts')}</MenuItem>
                            <MenuItem value="polly">{t('pylips.amazonPolly')}</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={useManualVoiceId}
                                            onChange={(e) => {
                                                setUseManualVoiceId(e.target.checked);
                                                if (!e.target.checked) {
                                                    setConfig({...config, voice_id: undefined});
                                                }
                                            }}
                                        />
                                    }
                                    label={t('pylips.useManualVoiceId')}
                                />
                            </Grid>
                            {useManualVoiceId ? (
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label={t('pylips.voiceId')}
                                        value={config.voice_id || ''}
                                        onChange={(e) => setConfig({...config, voice_id: e.target.value || undefined})}
                                        placeholder={t('pylips.voiceIdPlaceholder')}
                                        helperText={t('pylips.voiceIdHelper')}
                                    />
                                </Grid>
                            ) : (
                                <Grid item xs={12}>
                                    <FormControl fullWidth>
                                        <InputLabel>{t('pylips.selectVoice')}</InputLabel>
                                        <Select
                                            value={config.voice_id || ''}
                                            label={t('pylips.selectVoice')}
                                            onChange={(e) => setConfig({...config, voice_id: e.target.value || undefined})}
                                        >
                                            <MenuItem value="">{t('pylips.defaultVoice')}</MenuItem>
                                            {availableVoices.map((voice) => (
                                                <MenuItem key={voice.id} value={voice.id}>
                                                    {voice.name} ({voice.id})
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                            )}
                        </Grid>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowConfigDialog(false)}>
                        {t('common.cancel')}
                    </Button>
                    <Button onClick={handleUpdateConfig} variant="contained" disabled={isLoading}>
                        {isLoading ? <CircularProgress size={20} /> : t('pylips.applyConfig')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* 外观设置对话框 */}
            <Dialog open={showAppearanceDialog} onClose={() => setShowAppearanceDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>{t('pylips.appearanceTitle')}</DialogTitle>
                <DialogContent>
                    <Box mt={2}>
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <Typography variant="h6" gutterBottom>
                                    颜色设置
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={12}>
                                        <Box display="flex" alignItems="center" gap={2}>
                                            <Typography variant="body2" sx={{ minWidth: 100 }}>
                                                背景颜色
                                            </Typography>
                                            <TextField
                                                type="color"
                                                value={appearanceConfig.background_color}
                                                onChange={(e) => setAppearanceConfig({
                                                    ...appearanceConfig,
                                                    background_color: e.target.value
                                                })}
                                                sx={{ width: 60 }}
                                            />
                                            <Typography variant="body2" color="textSecondary">
                                                {appearanceConfig.background_color}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Box display="flex" alignItems="center" gap={2}>
                                            <Typography variant="body2" sx={{ minWidth: 100 }}>
                                                眼球颜色
                                            </Typography>
                                            <TextField
                                                type="color"
                                                value={appearanceConfig.eyeball_color}
                                                onChange={(e) => setAppearanceConfig({
                                                    ...appearanceConfig,
                                                    eyeball_color: e.target.value
                                                })}
                                                sx={{ width: 60 }}
                                            />
                                            <Typography variant="body2" color="textSecondary">
                                                {appearanceConfig.eyeball_color}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Box display="flex" alignItems="center" gap={2}>
                                            <Typography variant="body2" sx={{ minWidth: 100 }}>
                                                虹膜颜色
                                            </Typography>
                                            <TextField
                                                type="color"
                                                value={appearanceConfig.iris_color}
                                                onChange={(e) => setAppearanceConfig({
                                                    ...appearanceConfig,
                                                    iris_color: e.target.value
                                                })}
                                                sx={{ width: 60 }}
                                            />
                                            <Typography variant="body2" color="textSecondary">
                                                {appearanceConfig.iris_color}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Box display="flex" alignItems="center" gap={2}>
                                            <Typography variant="body2" sx={{ minWidth: 100 }}>
                                                嘴巴颜色
                                            </Typography>
                                            <TextField
                                                type="color"
                                                value={appearanceConfig.mouth_color}
                                                onChange={(e) => setAppearanceConfig({
                                                    ...appearanceConfig,
                                                    mouth_color: e.target.value
                                                })}
                                                sx={{ width: 60 }}
                                            />
                                            <Typography variant="body2" color="textSecondary">
                                                {appearanceConfig.mouth_color}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Box display="flex" alignItems="center" gap={2}>
                                            <Typography variant="body2" sx={{ minWidth: 100 }}>
                                                眉毛颜色
                                            </Typography>
                                            <TextField
                                                type="color"
                                                value={appearanceConfig.brow_color}
                                                onChange={(e) => setAppearanceConfig({
                                                    ...appearanceConfig,
                                                    brow_color: e.target.value
                                                })}
                                                sx={{ width: 60 }}
                                            />
                                            <Typography variant="body2" color="textSecondary">
                                                {appearanceConfig.brow_color}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                </Grid>
                            </Grid>
                            
                            <Grid item xs={12} md={6}>
                                <Typography variant="h6" gutterBottom>
                                    尺寸设置
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={12}>
                                        <Typography variant="body2" gutterBottom>
                                            眼睛大小: {appearanceConfig.eye_size}
                                        </Typography>
                                        <Box px={2}>
                                            <input
                                                type="range"
                                                min="50"
                                                max="300"
                                                step="10"
                                                value={appearanceConfig.eye_size}
                                                onChange={(e) => setAppearanceConfig({
                                                    ...appearanceConfig,
                                                    eye_size: parseInt(e.target.value)
                                                })}
                                                style={{ width: '100%' }}
                                            />
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Typography variant="body2" gutterBottom>
                                            虹膜大小: {appearanceConfig.iris_size}
                                        </Typography>
                                        <Box px={2}>
                                            <input
                                                type="range"
                                                min="30"
                                                max="150"
                                                step="5"
                                                value={appearanceConfig.iris_size}
                                                onChange={(e) => setAppearanceConfig({
                                                    ...appearanceConfig,
                                                    iris_size: parseInt(e.target.value)
                                                })}
                                                style={{ width: '100%' }}
                                            />
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Typography variant="body2" gutterBottom>
                                            嘴巴宽度: {appearanceConfig.mouth_width}
                                        </Typography>
                                        <Box px={2}>
                                            <input
                                                type="range"
                                                min="200"
                                                max="600"
                                                step="10"
                                                value={appearanceConfig.mouth_width}
                                                onChange={(e) => setAppearanceConfig({
                                                    ...appearanceConfig,
                                                    mouth_width: parseInt(e.target.value)
                                                })}
                                                style={{ width: '100%' }}
                                            />
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Typography variant="body2" gutterBottom>
                                            眉毛宽度: {appearanceConfig.brow_width}
                                        </Typography>
                                        <Box px={2}>
                                            <input
                                                type="range"
                                                min="50"
                                                max="200"
                                                step="5"
                                                value={appearanceConfig.brow_width}
                                                onChange={(e) => setAppearanceConfig({
                                                    ...appearanceConfig,
                                                    brow_width: parseInt(e.target.value)
                                                })}
                                                style={{ width: '100%' }}
                                            />
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Typography variant="body2" gutterBottom>
                                            眉毛高度: {appearanceConfig.brow_height}
                                        </Typography>
                                        <Box px={2}>
                                            <input
                                                type="range"
                                                min="100"
                                                max="300"
                                                step="10"
                                                value={appearanceConfig.brow_height}
                                                onChange={(e) => setAppearanceConfig({
                                                    ...appearanceConfig,
                                                    brow_height: parseInt(e.target.value)
                                                })}
                                                style={{ width: '100%' }}
                                            />
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Typography variant="body2" gutterBottom>
                                            鼻子宽度: {appearanceConfig.nose_width}
                                        </Typography>
                                        <Box px={2}>
                                            <input
                                                type="range"
                                                min="20"
                                                max="80"
                                                step="2"
                                                value={appearanceConfig.nose_width}
                                                onChange={(e) => setAppearanceConfig({
                                                    ...appearanceConfig,
                                                    nose_width: parseInt(e.target.value)
                                                })}
                                                style={{ width: '100%' }}
                                            />
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Typography variant="body2" gutterBottom>
                                            鼻子高度: {appearanceConfig.nose_height}
                                        </Typography>
                                        <Box px={2}>
                                            <input
                                                type="range"
                                                min="30"
                                                max="100"
                                                step="2"
                                                value={appearanceConfig.nose_height}
                                                onChange={(e) => setAppearanceConfig({
                                                    ...appearanceConfig,
                                                    nose_height: parseInt(e.target.value)
                                                })}
                                                style={{ width: '100%' }}
                                            />
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Typography variant="body2" gutterBottom>
                                            鼻子垂直位置: {appearanceConfig.nose_vertical_position}
                                        </Typography>
                                        <Box px={2}>
                                            <input
                                                type="range"
                                                min="0"
                                                max="900"
                                                step="5"
                                                value={appearanceConfig.nose_vertical_position}
                                                onChange={(e) => setAppearanceConfig({
                                                    ...appearanceConfig,
                                                    nose_vertical_position: parseInt(e.target.value)
                                                })}
                                                style={{ width: '100%' }}
                                            />
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Typography variant="body2" gutterBottom>
                                            眼睛光泽: {appearanceConfig.eye_shine}
                                        </Typography>
                                        <Box px={2}>
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                step="5"
                                                value={appearanceConfig.eye_shine}
                                                onChange={(e) => setAppearanceConfig({
                                                    ...appearanceConfig,
                                                    eye_shine: parseInt(e.target.value)
                                                })}
                                                style={{ width: '100%' }}
                                            />
                                        </Box>
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Grid>
                        
                        {/* 新增颜色设置 */}
                        <Grid container spacing={3} sx={{ mt: 2 }}>
                            <Grid item xs={12} md={6}>
                                <Typography variant="h6" gutterBottom>
                                    额外颜色设置
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={12}>
                                        <Box display="flex" alignItems="center" gap={2}>
                                            <Typography variant="body2" sx={{ minWidth: 100 }}>
                                                眼睑颜色
                                            </Typography>
                                            <TextField
                                                type="color"
                                                value={appearanceConfig.eyelid_color}
                                                onChange={(e) => setAppearanceConfig({
                                                    ...appearanceConfig,
                                                    eyelid_color: e.target.value
                                                })}
                                                sx={{ width: 60 }}
                                            />
                                            <Typography variant="body2" color="textSecondary">
                                                {appearanceConfig.eyelid_color}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Box display="flex" alignItems="center" gap={2}>
                                            <Typography variant="body2" sx={{ minWidth: 100 }}>
                                                鼻子颜色
                                            </Typography>
                                            <TextField
                                                type="color"
                                                value={appearanceConfig.nose_color}
                                                onChange={(e) => setAppearanceConfig({
                                                    ...appearanceConfig,
                                                    nose_color: e.target.value
                                                })}
                                                sx={{ width: 60 }}
                                            />
                                            <Typography variant="body2" color="textSecondary">
                                                {appearanceConfig.nose_color}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Box display="flex" alignItems="center" gap={2}>
                                            <Typography variant="body2" sx={{ minWidth: 100 }}>
                                                瞳孔颜色
                                            </Typography>
                                            <TextField
                                                type="color"
                                                value={appearanceConfig.pupil_color}
                                                onChange={(e) => setAppearanceConfig({
                                                    ...appearanceConfig,
                                                    pupil_color: e.target.value
                                                })}
                                                sx={{ width: 60 }}
                                            />
                                            <Typography variant="body2" color="textSecondary">
                                                {appearanceConfig.pupil_color}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                </Grid>
                            </Grid>
                            
                            <Grid item xs={12} md={6}>
                                <Typography variant="h6" gutterBottom>
                                    窗口设置
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={12}>
                                        <Typography variant="body2" gutterBottom>
                                            窗口宽度: {appearanceConfig.window_width}px
                                        </Typography>
                                        <Box px={2}>
                                            <input
                                                type="range"
                                                min="400"
                                                max="1200"
                                                step="20"
                                                value={appearanceConfig.window_width}
                                                onChange={(e) => setAppearanceConfig({
                                                    ...appearanceConfig,
                                                    window_width: parseInt(e.target.value)
                                                })}
                                                style={{ width: '100%' }}
                                            />
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Typography variant="body2" gutterBottom>
                                            窗口高度: {appearanceConfig.window_height}px
                                        </Typography>
                                        <Box px={2}>
                                            <input
                                                type="range"
                                                min="300"
                                                max="900"
                                                step="20"
                                                value={appearanceConfig.window_height}
                                                onChange={(e) => setAppearanceConfig({
                                                    ...appearanceConfig,
                                                    window_height: parseInt(e.target.value)
                                                })}
                                                style={{ width: '100%' }}
                                            />
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Typography variant="body2" gutterBottom>
                                            边框圆角: {appearanceConfig.border_radius}px
                                        </Typography>
                                        <Box px={2}>
                                            <input
                                                type="range"
                                                min="0"
                                                max="50"
                                                step="2"
                                                value={appearanceConfig.border_radius}
                                                onChange={(e) => setAppearanceConfig({
                                                    ...appearanceConfig,
                                                    border_radius: parseInt(e.target.value)
                                                })}
                                                style={{ width: '100%' }}
                                            />
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Typography variant="body2" gutterBottom>
                                            阴影强度: {appearanceConfig.shadow_intensity}
                                        </Typography>
                                        <Box px={2}>
                                            <input
                                                type="range"
                                                min="0"
                                                max="10"
                                                step="1"
                                                value={appearanceConfig.shadow_intensity}
                                                onChange={(e) => setAppearanceConfig({
                                                    ...appearanceConfig,
                                                    shadow_intensity: parseInt(e.target.value)
                                                })}
                                                style={{ width: '100%' }}
                                            />
                                        </Box>
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Grid>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowAppearanceDialog(false)}>
                        {t('common.cancel')}
                    </Button>
                    <Button onClick={handleUpdateAppearance} variant="contained" disabled={isLoading}>
                        {isLoading ? <CircularProgress size={20} /> : t('pylips.applyAppearance')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default PyLipsPanel;