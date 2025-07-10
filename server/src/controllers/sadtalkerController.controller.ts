import { Request, Response } from 'express';
import { sadTalkerService } from '../services/sadtalker.service';
import edgeTtsService from '../services/edgeTts.service';
import { requestHandler } from '../utils/requestHandler';

class SadTalkerController {
    // 移除用户头像上传功能 - 受试用户不应该能够上传头像
    // uploadAvatar 方法已删除
    
    healthCheck = requestHandler(async (req: Request, res: Response) => {
        try {
            const isHealthy = await sadTalkerService.checkServiceHealth();
            
            res.status(200).json({ 
                healthy: isHealthy,
                services: {
                    sadtalker: isHealthy,
                }
            });
        } catch (error) {
            console.error('Health check failed:', error);
            res.status(500).json({ 
                healthy: false,
                error: 'Health check failed'
            });
        }
    });
    
    getDefaultAvatar = requestHandler(async (req: Request, res: Response) => {
        try {
            const defaultAvatarData = await sadTalkerService.getDefaultAvatar();
            
            res.status(200).json({
                success: true,
                avatarUrl: defaultAvatarData?.avatarUrl || null,
                avatarBase64: defaultAvatarData?.avatarBase64 || null
            });
        } catch (error) {
            console.error('Failed to get default avatar:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get default avatar'
            });
        }
    });

    // 管理员专用：上传默认头像
    uploadDefaultAvatar = requestHandler(async (req: Request, res: Response) => {
        const { avatarBase64 } = req.body;
        
        if (!avatarBase64) {
            res.status(400).json({ message: 'Missing avatarBase64' });
            return;
        }
        
        try {
            const result = await sadTalkerService.uploadDefaultAvatar(avatarBase64);
            
            res.status(200).json({ 
                success: true,
                message: 'Default avatar uploaded successfully',
                avatarUrl: result.avatarUrl
            });
        } catch (error) {
            console.error('Default avatar upload failed:', error);
            res.status(500).json({ 
                success: false,
                message: 'Failed to upload default avatar' 
            });
        }
    });

    // 管理员专用：删除默认头像
    deleteDefaultAvatar = requestHandler(async (req: Request, res: Response) => {
        try {
            await sadTalkerService.deleteDefaultAvatar();
            
            res.status(200).json({ 
                success: true,
                message: 'Default avatar deleted successfully'
            });
        } catch (error) {
            console.error('Default avatar deletion failed:', error);
            res.status(500).json({ 
                success: false,
                message: 'Failed to delete default avatar' 
            });
        }
    });

    // 移除用户头像获取功能 - 统一使用默认头像
    // getUserAvatar 方法已删除

    checkEdgeTtsHealth = requestHandler(async (req: Request, res: Response) => {
        try {
            const isHealthy = await edgeTtsService.checkAvailability();
            res.json({ 
                healthy: isHealthy,
                message: isHealthy ? 'EdgeTTS service is available' : 'EdgeTTS service not available'
            });
        } catch (error) {
            console.error('EdgeTTS health check failed:', error);
            res.json({ 
                healthy: false, 
                message: 'EdgeTTS health check failed' 
            });
        }
    });
}

export const sadTalkerController = new SadTalkerController(); 