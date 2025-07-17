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

const WhisperPanel: React.FC = () => {
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
                openSnackbar('系统信息已刷新', SnackbarStatus.SUCCESS);
            }
        } catch (error) {
            console.error('Failed to fetch system info:', error);
            openSnackbar('获取系统信息失败', SnackbarStatus.ERROR);
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
                            系统状态
                        </Typography>
                        <Button
                            startIcon={<RefreshIcon />}
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            size="small"
                        >
                            {isRefreshing ? <CircularProgress size={16} /> : '刷新'}
                        </Button>
                    </Box>

                    {allSystemsReady ? (
                        <Alert severity="success" sx={{ mb: 2 }}>
                            <AlertTitle>系统就绪</AlertTitle>
                            Whisper 语音识别系统已准备就绪，可以正常使用。
                        </Alert>
                    ) : (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            <AlertTitle>系统未就绪</AlertTitle>
                            请检查以下问题并完成相应配置。
                        </Alert>
                    )}

                    <List>
                        <ListItem>
                            <ListItemIcon>
                                {getStatusIcon(systemInfo.pythonAvailable)}
                            </ListItemIcon>
                            <ListItemText
                                primary="Python 环境"
                                secondary={systemInfo.pythonAvailable ? 
                                    'Python 虚拟环境已配置' : 
                                    'Python 虚拟环境未找到或配置错误'
                                }
                            />
                            <Chip
                                label={systemInfo.pythonAvailable ? '可用' : '不可用'}
                                color={getStatusColor(systemInfo.pythonAvailable)}
                                size="small"
                            />
                        </ListItem>

                        <ListItem>
                            <ListItemIcon>
                                {getStatusIcon(systemInfo.tempDirWritable)}
                            </ListItemIcon>
                            <ListItemText
                                primary="临时目录"
                                secondary={systemInfo.tempDirWritable ? 
                                    '临时文件目录可写' : 
                                    '临时文件目录不可写，请检查权限'
                                }
                            />
                            <Chip
                                label={systemInfo.tempDirWritable ? '可用' : '不可用'}
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
                                primary="Tiny 模型"
                                secondary={systemInfo.modelsAvailable.tiny ? 
                                    'Whisper Tiny 模型已下载 (~39MB)' : 
                                    'Whisper Tiny 模型未下载'
                                }
                            />
                            <Chip
                                label={systemInfo.modelsAvailable.tiny ? '已下载' : '未下载'}
                                color={getStatusColor(systemInfo.modelsAvailable.tiny)}
                                size="small"
                            />
                        </ListItem>

                        <ListItem>
                            <ListItemIcon>
                                {getStatusIcon(systemInfo.modelsAvailable.small)}
                            </ListItemIcon>
                            <ListItemText
                                primary="Small 模型"
                                secondary={systemInfo.modelsAvailable.small ? 
                                    'Whisper Small 模型已下载 (~244MB)' : 
                                    'Whisper Small 模型未下载'
                                }
                            />
                            <Chip
                                label={systemInfo.modelsAvailable.small ? '已下载' : '未下载'}
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
                        模型信息
                    </Typography>
                    
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                            <Box p={2} border={1} borderColor="divider" borderRadius={1}>
                                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                    Tiny 模型
                                </Typography>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    文件大小: ~39MB
                                </Typography>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    处理速度: 非常快
                                </Typography>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    准确率: 一般
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    适用场景: 快速转录、实时处理
                                </Typography>
                            </Box>
                        </Grid>
                        
                        <Grid item xs={12} md={6}>
                            <Box p={2} border={1} borderColor="divider" borderRadius={1}>
                                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                    Small 模型
                                </Typography>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    文件大小: ~244MB
                                </Typography>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    处理速度: 较快
                                </Typography>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    准确率: 较高
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    适用场景: 平衡速度和准确率
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
                        安装说明
                    </Typography>
                    
                    <Alert severity="info" sx={{ mb: 2 }}>
                        <AlertTitle>需要手动配置</AlertTitle>
                        请按照以下步骤完成 Whisper 环境配置：
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
                Whisper 语音识别配置
            </Typography>
            
            <Typography variant="body1" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
                管理 Whisper 语音转文字功能的系统配置和模型状态。
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