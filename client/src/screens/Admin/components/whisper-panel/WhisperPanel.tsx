import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Grid,
    Chip,
    Alert,
    AlertTitle,
    Button,
    CircularProgress,
    Divider,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PythonIcon from '@mui/icons-material/Code';
import StorageIcon from '@mui/icons-material/Storage';
import MicIcon from '@mui/icons-material/Mic';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useSnackbar, SnackbarStatus } from '@contexts/SnackbarProvider';
import { getWhisperSystemInfo, WhisperSystemInfo } from '../../../../DAL/server-requests/whisper';
import WhisperExperimentConfig from './WhisperExperimentConfig';
import { useLanguage } from '@contexts/LanguageContext';

const WhisperPanel: React.FC = () => {
    const { t } = useLanguage();
    const [systemInfo, setSystemInfo] = useState<WhisperSystemInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const { openSnackbar } = useSnackbar();

    const fetchSystemInfo = async (showLoading = true) => {
        try {
            if (showLoading) setIsLoading(true);
            setIsRefreshing(true);
            
            const info = await getWhisperSystemInfo();
            setSystemInfo(info);
            
            if (!showLoading) {
                openSnackbar(t('whisper.systemInfoRefreshed'), SnackbarStatus.SUCCESS);
            }
        } catch (error) {
            console.error('Failed to fetch system info:', error);
            openSnackbar(t('whisper.failedToFetchSystemInfo'), SnackbarStatus.ERROR);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchSystemInfo();
    }, []);

    const handleRefresh = () => {
        fetchSystemInfo(false);
    };

    const getStatusColor = (status: boolean) => {
        return status ? 'success' : 'error';
    };

    const getStatusIcon = (status: boolean) => {
        return status ? <CheckCircleIcon /> : <ErrorIcon />;
    };

    const renderSystemStatus = () => {
        if (!systemInfo) return null;

        const allSystemsReady = systemInfo.pythonAvailable && 
                               systemInfo.tempDirWritable && 
                               (systemInfo.modelsAvailable.tiny || systemInfo.modelsAvailable.small);

        return (
            <Card>
                <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6" component="h2">
                            {t('whisper.systemStatus')}
                        </Typography>
                        <Button
                            startIcon={<RefreshIcon />}
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            size="small"
                        >
                            {isRefreshing ? <CircularProgress size={16} /> : t('whisper.refresh')}
                        </Button>
                    </Box>

                    {allSystemsReady ? (
                        <Alert severity="success" sx={{ mb: 2 }}>
                            <AlertTitle>{t('whisper.systemReady')}</AlertTitle>
                            {t('whisper.systemReadyDesc')}
                        </Alert>
                    ) : (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            <AlertTitle>{t('whisper.systemNotReady')}</AlertTitle>
                            {t('whisper.systemNotReadyDesc')}
                        </Alert>
                    )}

                    <List>
                        <ListItem>
                            <ListItemIcon>
                                {getStatusIcon(systemInfo.pythonAvailable)}
                            </ListItemIcon>
                            <ListItemText
                                primary={t('whisper.pythonEnvironment')}
                                secondary={systemInfo.pythonAvailable ? 
                                    t('whisper.pythonConfigured') : 
                                    t('whisper.pythonNotConfigured')
                                }
                            />
                            <Chip
                                label={systemInfo.pythonAvailable ? t('whisper.available') : t('whisper.unavailable')}
                                color={getStatusColor(systemInfo.pythonAvailable)}
                                size="small"
                            />
                        </ListItem>

                        <ListItem>
                            <ListItemIcon>
                                {getStatusIcon(systemInfo.tempDirWritable)}
                            </ListItemIcon>
                            <ListItemText
                                primary={t('whisper.tempDirectory')}
                                secondary={systemInfo.tempDirWritable ? 
                                    t('whisper.tempDirWritable') : 
                                    t('whisper.tempDirNotWritable')
                                }
                            />
                            <Chip
                                label={systemInfo.tempDirWritable ? t('whisper.available') : t('whisper.unavailable')}
                                color={getStatusColor(systemInfo.tempDirWritable)}
                                size="small"
                            />
                        </ListItem>

                        <Divider />

                        <ListItem>
                            <ListItemIcon>
                                {getStatusIcon(systemInfo.modelsAvailable.tiny)}
                            </ListItemIcon>
                            <ListItemText
                                primary={t('whisper.tinyModel')}
                                secondary={systemInfo.modelsAvailable.tiny ? 
                                    t('whisper.tinyModelDownloaded') : 
                                    t('whisper.tinyModelNotDownloaded')
                                }
                            />
                            <Chip
                                label={systemInfo.modelsAvailable.tiny ? t('whisper.downloaded') : t('whisper.notDownloaded')}
                                color={getStatusColor(systemInfo.modelsAvailable.tiny)}
                                size="small"
                            />
                        </ListItem>

                        <ListItem>
                            <ListItemIcon>
                                {getStatusIcon(systemInfo.modelsAvailable.small)}
                            </ListItemIcon>
                            <ListItemText
                                primary={t('whisper.smallModel')}
                                secondary={systemInfo.modelsAvailable.small ? 
                                    t('whisper.smallModelDownloaded') : 
                                    t('whisper.smallModelNotDownloaded')
                                }
                            />
                            <Chip
                                label={systemInfo.modelsAvailable.small ? t('whisper.downloaded') : t('whisper.notDownloaded')}
                                color={getStatusColor(systemInfo.modelsAvailable.small)}
                                size="small"
                            />
                        </ListItem>
                    </List>
                </CardContent>
            </Card>
        );
    };

    const renderModelInfo = () => {
        return (
            <Card>
                <CardContent>
                    <Typography variant="h6" component="h2" gutterBottom>
                        {t('whisper.modelInfo')}
                    </Typography>
                    
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                            <Box p={2} border={1} borderColor="divider" borderRadius={1}>
                                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                    {t('whisper.tinyModel')}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    {t('whisper.fileSize')}: ~39MB
                                </Typography>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    {t('whisper.processingSpeed')}: {t('whisper.veryFast')}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    {t('whisper.accuracy')}: {t('whisper.average')}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {t('whisper.useCase')}: {t('whisper.quickTranscription')}
                                </Typography>
                            </Box>
                        </Grid>
                        
                        <Grid item xs={12} md={6}>
                            <Box p={2} border={1} borderColor="divider" borderRadius={1}>
                                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                    {t('whisper.smallModel')}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    {t('whisper.fileSize')}: ~244MB
                                </Typography>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    {t('whisper.processingSpeed')}: {t('whisper.fast')}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    {t('whisper.accuracy')}: {t('whisper.high')}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {t('whisper.useCase')}: {t('whisper.balancedSpeedAccuracy')}
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>
        );
    };

    const renderInstallationInstructions = () => {
        if (!systemInfo) return null;

        const hasIssues = !systemInfo.pythonAvailable || 
                         !systemInfo.tempDirWritable || 
                         (!systemInfo.modelsAvailable.tiny && !systemInfo.modelsAvailable.small);

        if (!hasIssues) return null;

        return (
            <Card>
                <CardContent>
                    <Typography variant="h6" component="h2" gutterBottom>
                        {t('whisper.installationInstructions')}
                    </Typography>
                    
                    <Alert severity="info" sx={{ mb: 2 }}>
                        <AlertTitle>{t('whisper.manualConfigRequired')}</AlertTitle>
                        {t('whisper.followStepsToComplete')}
                    </Alert>

                    <Box component="pre" sx={{ 
                        backgroundColor: 'grey.100', 
                        p: 2, 
                        borderRadius: 1,
                        fontSize: '0.875rem',
                        overflow: 'auto'
                    }}>
{`# 1. 创建 Python 虚拟环境
cd Lexi/server
python -m venv whisper_env

# 2. 激活虚拟环境
# Windows:
whisper_env\\Scripts\\activate
# Linux/Mac:
source whisper_env/bin/activate

# 3. 安装依赖
pip install openai-whisper torch torchvision torchaudio

# 4. 下载模型
python -c "import whisper; whisper.load_model('tiny')"
python -c "import whisper; whisper.load_model('small')"

# 5. 安装 FFmpeg
# Windows: choco install ffmpeg
# Linux: sudo apt install ffmpeg
# Mac: brew install ffmpeg`}
                    </Box>
                </CardContent>
            </Card>
        );
    };

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: 'lg', width: '100%', padding: 3 }}>
            <Typography variant="h4" gutterBottom>
                {t('whisper.title')}
            </Typography>
            
            <Typography variant="body1" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
                {t('whisper.description')}
            </Typography>

            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <WhisperExperimentConfig />
                </Grid>
                
                <Grid item xs={12}>
                    {renderSystemStatus()}
                </Grid>
                
                <Grid item xs={12}>
                    {renderModelInfo()}
                </Grid>
                
                <Grid item xs={12}>
                    {renderInstallationInstructions()}
                </Grid>
            </Grid>
        </Box>
    );
};

export default WhisperPanel;