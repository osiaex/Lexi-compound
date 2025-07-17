import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Switch,
    FormControlLabel,
    Button,
    Alert,
    Divider,
    Chip,
    CircularProgress,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { useSnackbar, SnackbarStatus } from '@contexts/SnackbarProvider';
import { getWhisperConfig, updateWhisperConfig, WhisperConfig } from '../../../../DAL/server-requests/whisper';
import { getExperiments } from '../../../../DAL/server-requests/experiments';

interface Experiment {
    _id: string;
    title: string;
    isActive: boolean;
}

const WhisperExperimentConfig: React.FC = () => {
    const [experiments, setExperiments] = useState<Experiment[]>([]);
    const [selectedExperiment, setSelectedExperiment] = useState<string>('');
    const [config, setConfig] = useState<WhisperConfig | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { openSnackbar } = useSnackbar();

    // 获取实验列表
    useEffect(() => {
        const fetchExperiments = async () => {
            try {
                const response = await getExperiments('1', '100'); // 获取前100个实验
                setExperiments(response || []);
            } catch (error) {
                console.error('Failed to fetch experiments:', error);
                openSnackbar('获取实验列表失败', SnackbarStatus.ERROR);
            }
        };

        fetchExperiments();
    }, [openSnackbar]);

    // 获取选中实验的配置
    useEffect(() => {
        if (selectedExperiment) {
            const fetchConfig = async () => {
                setIsLoading(true);
                try {
                    const experimentConfig = await getWhisperConfig(selectedExperiment);
                    setConfig(experimentConfig);
                } catch (error) {
                    console.error('Failed to fetch config:', error);
                    // 如果配置不存在，使用默认配置
                    setConfig({
                        enabled: false,
                        modelSize: 'tiny',
                        language: 'auto',
                        temperature: 0.0,
                        maxFileSize: 50,
                        maxDuration: 300,
                    });
                }
                setIsLoading(false);
            };

            fetchConfig();
        }
    }, [selectedExperiment]);

    const handleConfigChange = (field: keyof WhisperConfig, value: any) => {
        setConfig(prev => prev ? { ...prev, [field]: value } : null);
    };

    const handleSave = async () => {
        if (!selectedExperiment || !config) return;

        setIsSaving(true);
        try {
            await updateWhisperConfig(selectedExperiment, config);
            openSnackbar('配置保存成功', SnackbarStatus.SUCCESS);
        } catch (error) {
            console.error('Failed to save config:', error);
            openSnackbar('配置保存失败', SnackbarStatus.ERROR);
        }
        setIsSaving(false);
    };

    return (
        <Card sx={{ mb: 3 }}>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    实验配置管理
                </Typography>
                
                <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
                    为特定实验配置 Whisper 语音识别功能
                </Typography>

                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>选择实验</InputLabel>
                            <Select
                                value={selectedExperiment}
                                onChange={(e) => setSelectedExperiment(e.target.value)}
                                label="选择实验"
                            >
                                {experiments.map((exp) => (
                                    <MenuItem key={exp._id} value={exp._id}>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            {exp.title}
                                            {exp.isActive && <Chip label="激活" size="small" color="success" />}
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    {selectedExperiment && (
                        <>
                            <Grid item xs={12}>
                                <Divider />
                            </Grid>

                            {isLoading ? (
                                <Grid item xs={12} display="flex" justifyContent="center">
                                    <CircularProgress />
                                </Grid>
                            ) : config ? (
                                <>
                                    <Grid item xs={12}>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={config.enabled}
                                                    onChange={(e) => handleConfigChange('enabled', e.target.checked)}
                                                />
                                            }
                                            label="启用 Whisper 语音识别"
                                        />
                                    </Grid>

                                    {config.enabled && (
                                        <>
                                            <Grid item xs={12} md={4}>
                                                <FormControl fullWidth>
                                                    <InputLabel>模型大小</InputLabel>
                                                    <Select
                                                        value={config.modelSize}
                                                        onChange={(e) => handleConfigChange('modelSize', e.target.value)}
                                                        label="模型大小"
                                                    >
                                                        <MenuItem value="tiny">Tiny (快速)</MenuItem>
                                                        <MenuItem value="small">Small (准确)</MenuItem>
                                                    </Select>
                                                </FormControl>
                                            </Grid>

                                            <Grid item xs={12} md={4}>
                                                <FormControl fullWidth>
                                                    <InputLabel>语言</InputLabel>
                                                    <Select
                                                        value={config.language}
                                                        onChange={(e) => handleConfigChange('language', e.target.value)}
                                                        label="语言"
                                                    >
                                                        <MenuItem value="auto">自动检测</MenuItem>
                                                        <MenuItem value="zh">中文</MenuItem>
                                                        <MenuItem value="en">英文</MenuItem>
                                                    </Select>
                                                </FormControl>
                                            </Grid>

                                            <Grid item xs={12} md={4}>
                                                <TextField
                                                    fullWidth
                                                    label="温度参数"
                                                    type="number"
                                                    value={config.temperature}
                                                    onChange={(e) => handleConfigChange('temperature', parseFloat(e.target.value))}
                                                    inputProps={{ min: 0, max: 1, step: 0.1 }}
                                                    helperText="0-1之间，值越低结果越稳定"
                                                />
                                            </Grid>

                                            <Grid item xs={12} md={6}>
                                                <TextField
                                                    fullWidth
                                                    label="最大文件大小 (MB)"
                                                    type="number"
                                                    value={config.maxFileSize}
                                                    onChange={(e) => handleConfigChange('maxFileSize', parseInt(e.target.value))}
                                                    inputProps={{ min: 1, max: 100 }}
                                                />
                                            </Grid>

                                            <Grid item xs={12} md={6}>
                                                <TextField
                                                    fullWidth
                                                    label="最大录音时长 (秒)"
                                                    type="number"
                                                    value={config.maxDuration}
                                                    onChange={(e) => handleConfigChange('maxDuration', parseInt(e.target.value))}
                                                    inputProps={{ min: 1, max: 600 }}
                                                />
                                            </Grid>
                                        </>
                                    )}

                                    <Grid item xs={12}>
                                        <Button
                                            variant="contained"
                                            startIcon={isSaving ? <CircularProgress size={20} /> : <SaveIcon />}
                                            onClick={handleSave}
                                            disabled={isSaving}
                                        >
                                            {isSaving ? '保存中...' : '保存配置'}
                                        </Button>
                                    </Grid>
                                </>
                            ) : (
                                <Grid item xs={12}>
                                    <Alert severity="info">
                                        正在加载配置...
                                    </Alert>
                                </Grid>
                            )}
                        </>
                    )}
                </Grid>
            </CardContent>
        </Card>
    );
};

export default WhisperExperimentConfig; 