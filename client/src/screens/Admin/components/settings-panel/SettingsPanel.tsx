import { Box, Typography, Card, CardContent, Button, Alert } from '@mui/material';
import { useState } from 'react';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import DeleteIcon from '@mui/icons-material/Delete';
import React from 'react'; // Added missing import for React.useEffect

export const SettingsPanel = ({}) => {
    const [sadTalkerHealth, setSadTalkerHealth] = useState<boolean | null>(null);
    const [edgeTtsHealth, setEdgeTtsHealth] = useState<boolean | null>(null);
    const [isCheckingHealth, setIsCheckingHealth] = useState(false);
    
    // 默认头像管理状态
    const [defaultAvatar, setDefaultAvatar] = useState<string | null>(null);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [avatarError, setAvatarError] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const checkSadTalkerHealth = async () => {
        setIsCheckingHealth(true);
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/sadtalker/health`, {
                credentials: 'include'
            });
            const data = await response.json();
            setSadTalkerHealth(data.healthy);
        } catch (error) {
            console.error('Health check failed:', error);
            setSadTalkerHealth(false);
        } finally {
            setIsCheckingHealth(false);
        }
    };

    const checkEdgeTtsHealth = async () => {
        setIsCheckingHealth(true);
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/sadtalker/edgetts-health`, {
                credentials: 'include'
            });
            const data = await response.json();
            setEdgeTtsHealth(data.healthy);
        } catch (error) {
            console.error('EdgeTTS health check failed:', error);
            setEdgeTtsHealth(false);
        } finally {
            setIsCheckingHealth(false);
        }
    };

    // 默认头像管理函数
    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        setAvatarError(null);
        
        if (file) {
            // 验证文件类型
            if (!file.type.startsWith('image/')) {
                setAvatarError('请选择图片文件（JPG、PNG、GIF等）');
                return;
            }
            
            // 验证文件大小 (最大5MB)
            if (file.size > 5 * 1024 * 1024) {
                setAvatarError('文件大小不能超过5MB');
                return;
            }
            
            setSelectedFile(file);
            
            // 创建预览
            const reader = new FileReader();
            reader.onload = (e) => {
                setPreviewUrl(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const uploadDefaultAvatar = async () => {
        if (!selectedFile) return;
        
        setIsUploadingAvatar(true);
        setAvatarError(null);
        
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const base64 = e.target?.result as string;
                const avatarBase64 = base64.split(',')[1];
                
                try {
                    const response = await fetch(`${process.env.REACT_APP_API_URL}/sadtalker/upload-default-avatar`, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                        },
                        credentials: 'include',
                        body: JSON.stringify({ avatarBase64 })
                    });
                    
                    if (response.ok) {
                        const result = await response.json();
                        setDefaultAvatar(result.avatarUrl);
                        setSelectedFile(null);
                        setPreviewUrl(null);
                        alert('默认头像上传成功！');
                        // 重新加载当前头像
                        loadCurrentDefaultAvatar();
                    } else {
                        const errorData = await response.json();
                        setAvatarError(errorData.message || `上传失败 (${response.status})`);
                    }
                } catch (error) {
                    console.error('Upload error:', error);
                    setAvatarError('网络连接错误，请检查服务器是否运行');
                }
                
                setIsUploadingAvatar(false);
            };
            reader.readAsDataURL(selectedFile);
        } catch (error) {
            setAvatarError('文件处理失败，请重试');
            setIsUploadingAvatar(false);
        }
    };

    const deleteDefaultAvatar = async () => {
        if (!confirm('确定要删除默认头像吗？')) return;
        
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/sadtalker/delete-default-avatar`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            if (response.ok) {
                setDefaultAvatar(null);
                alert('默认头像已删除！');
            } else {
                setAvatarError('删除失败');
            }
        } catch (error) {
            setAvatarError('网络错误');
        }
    };

    const loadCurrentDefaultAvatar = async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/sadtalker/default-avatar`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                setDefaultAvatar(data.avatarUrl);
            }
        } catch (error) {
            console.error('Failed to load default avatar:', error);
        }
    };

    // 组件加载时获取当前默认头像
    React.useEffect(() => {
        loadCurrentDefaultAvatar();
    }, []);

    return (
        <Box
            style={{ maxWidth: 'lg', width: '100%', padding: '2%', height: '90vh', overflow: 'auto' }}
        >
            <Typography variant="h4" gutterBottom>
                System Settings
            </Typography>
            
            {/* SadTalker Health Check */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        SadTalker Service Status
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Check if SadTalker video generation service is running properly.
                    </Typography>
                    
                    {sadTalkerHealth !== null && (
                        <Alert 
                            severity={sadTalkerHealth ? 'success' : 'error'} 
                            sx={{ mb: 2 }}
                        >
                            SadTalker service is {sadTalkerHealth ? 'healthy and running' : 'not available'}
                        </Alert>
                    )}
                    
                    <Button
                        variant="outlined"
                        startIcon={<HealthAndSafetyIcon />}
                        onClick={checkSadTalkerHealth}
                        disabled={isCheckingHealth}
                    >
                        {isCheckingHealth ? 'Checking...' : 'Check Service Health'}
                    </Button>
                </CardContent>
            </Card>

            {/* EdgeTTS Service Status */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        EdgeTTS Service Status
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Check if EdgeTTS (Microsoft Text-to-Speech) service is available for free speech synthesis.
                    </Typography>
                    
                    {edgeTtsHealth !== null && (
                        <Alert 
                            severity={edgeTtsHealth ? 'success' : 'warning'} 
                            sx={{ mb: 2 }}
                        >
                            EdgeTTS service is {edgeTtsHealth ? 'available and ready' : 'not installed (will auto-install on first use)'}
                        </Alert>
                    )}
                    
                    <Button
                        variant="outlined"
                        startIcon={<HealthAndSafetyIcon />}
                        onClick={checkEdgeTtsHealth}
                        disabled={isCheckingHealth}
                        sx={{ mr: 1 }}
                    >
                        {isCheckingHealth ? 'Checking...' : 'Check EdgeTTS Health'}
                    </Button>
                </CardContent>
            </Card>

            {/* Default Avatar Management */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Default Avatar Management
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Manage the default avatar used for SadTalker when users don't upload custom avatars.
                    </Typography>
                    
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                        id="avatar-upload-input"
                        disabled={isUploadingAvatar}
                    />

                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <label htmlFor="avatar-upload-input">
                            <Button
                                variant="outlined"
                                startIcon={<CloudUploadIcon />}
                                component="span"
                                disabled={isUploadingAvatar}
                            >
                                选择头像文件
                            </Button>
                        </label>
                        
                        {selectedFile && (
                            <Button
                                variant="contained"
                                onClick={uploadDefaultAvatar}
                                disabled={isUploadingAvatar}
                                startIcon={<CloudUploadIcon />}
                            >
                                {isUploadingAvatar ? '上传中...' : '上传头像'}
                            </Button>
                        )}
                    </Box>

                    {previewUrl && (
                        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
                            <Typography variant="body2" sx={{ mr: 1 }}>Preview:</Typography>
                            <img src={previewUrl} alt="Preview" style={{ maxWidth: '100px', maxHeight: '100px' }} />
                        </Box>
                    )}

                    {defaultAvatar && (
                        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
                            <Typography variant="body2" sx={{ mr: 1 }}>Current Default Avatar:</Typography>
                            <img src={defaultAvatar} alt="Current Default Avatar" style={{ maxWidth: '100px', maxHeight: '100px' }} />
                            <Button
                                variant="outlined"
                                startIcon={<DeleteIcon />}
                                onClick={deleteDefaultAvatar}
                                sx={{ ml: 1 }}
                            >
                                Delete
                            </Button>
                        </Box>
                    )}

                    {avatarError && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            {avatarError}
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {/* System Information */}
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        System Information
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        • SadTalker Integration: Enabled<br/>
                        • TTS Services: OpenAI + EdgeTTS<br/>
                        • EdgeTTS: Free Microsoft TTS<br/>
                        • Video Generation: Available<br/>
                        • Custom Avatars: Supported
                    </Typography>
                </CardContent>
            </Card>
        </Box>
    );
};
