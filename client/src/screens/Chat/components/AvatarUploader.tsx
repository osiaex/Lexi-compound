import React, { useState } from 'react';
import { 
    Box, 
    Button, 
    Dialog, 
    DialogTitle, 
    DialogContent,
    DialogActions,
    Typography,
    Alert,
    CircularProgress
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

interface AvatarUploaderProps {
    conversationId: string;
    onAvatarUploaded: (success: boolean) => void;
}

const AvatarUploader: React.FC<AvatarUploaderProps> = ({
    conversationId,
    onAvatarUploaded
}) => {
    const [open, setOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        setError(null);
        
        if (file) {
            // 验证文件类型
            if (!file.type.startsWith('image/')) {
                setError('请选择图片文件（JPG、PNG、GIF等）');
                return;
            }
            
            // 验证文件大小 (最大5MB)
            if (file.size > 5 * 1024 * 1024) {
                setError('文件大小不能超过5MB');
                return;
            }
            
            setSelectedFile(file);
            
            // 创建预览
            const reader = new FileReader();
            reader.onload = (e) => {
                setPreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleUpload = async () => {
        if (!selectedFile) return;
        
        setUploading(true);
        setError(null);
        
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const base64 = e.target?.result as string;
                const avatarBase64 = base64.split(',')[1]; // 移除data:image/...;base64,前缀
                
                try {
                    // 调用API上传头像
                    const response = await fetch(`${process.env.REACT_APP_API_URL}/sadtalker/upload-avatar`, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                        },
                        credentials: 'include',
                        body: JSON.stringify({ conversationId, avatarBase64 })
                    });
                    
                    if (response.ok) {
                        onAvatarUploaded(true);
                        setOpen(false);
                        resetForm();
                    } else {
                        const errorData = await response.json();
                        setError(errorData.message || 'Upload failed');
                        onAvatarUploaded(false);
                    }
                } catch (error) {
                    console.error('Upload error:', error);
                    setError('网络连接错误，请检查服务器是否运行');
                    onAvatarUploaded(false);
                }
                
                setUploading(false);
            };
            reader.readAsDataURL(selectedFile);
        } catch (error) {
            setError('文件处理失败，请重试');
            onAvatarUploaded(false);
            setUploading(false);
        }
    };
    
    const resetForm = () => {
        setSelectedFile(null);
        setPreview(null);
        setError(null);
        setUploading(false);
    };
    
    const handleClose = () => {
        setOpen(false);
        resetForm();
    };
    
    return (
        <>
            <Button
                startIcon={<CloudUploadIcon />}
                onClick={() => setOpen(true)}
                variant="outlined"
                size="small"
                sx={{
                    fontSize: '0.75rem',
                    padding: '4px 8px',
                    minWidth: 'auto'
                }}
            >
                Upload Avatar
            </Button>
            
            <Dialog 
                open={open} 
                onClose={handleClose}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Upload Custom Avatar</DialogTitle>
                <DialogContent>
                    <Box sx={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: 2, 
                        minWidth: 300,
                        alignItems: 'center'
                    }}>
                        <Typography variant="body2" color="text.secondary" textAlign="center">
                            Upload a clear photo of a face for the best results. 
                            The image will be used to create talking videos for AI responses.
                        </Typography>
                        
                        {error && (
                            <Alert severity="error" sx={{ width: '100%' }}>
                                {error}
                            </Alert>
                        )}
                        
                        {preview && (
                            <Box sx={{
                                width: 200,
                                height: 200,
                                border: '2px dashed #ccc',
                                borderRadius: 2,
                                overflow: 'hidden',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <img 
                                    src={preview} 
                                    alt="Avatar preview" 
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '100%',
                                        objectFit: 'cover'
                                    }}
                                />
                            </Box>
                        )}
                        
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            style={{ 
                                margin: '16px 0',
                                width: '100%'
                            }}
                            disabled={uploading}
                        />
                        
                        <Typography variant="caption" color="text.secondary">
                            支持格式：JPG、PNG、GIF（最大5MB）
                        </Typography>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button 
                        onClick={handleClose} 
                        disabled={uploading}
                    >
                        取消
                    </Button>
                    <Button 
                        onClick={handleUpload}
                        variant="contained"
                        disabled={!selectedFile || uploading}
                        startIcon={uploading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
                    >
                        {uploading ? '上传中...' : '上传头像'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default AvatarUploader; 