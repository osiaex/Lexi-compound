import { Request, Response } from 'express';
import { sadTalkerService } from '../services/sadtalker.service';
import edgeTtsService from '../services/edgeTts.service';
import { requestHandler } from '../utils/requestHandler';

class SadTalkerController {
    uploadAvatar = requestHandler(async (req: Request, res: Response) => {
        const { conversationId, avatarBase64 } = req.body;
        
        if (!conversationId || !avatarBase64) {
            res.status(400).json({ message: 'Missing conversationId or avatarBase64' });
            return;
        }
        
        try {
            // 存储用户上传的头像
            const result = await sadTalkerService.storeUserAvatar(conversationId, avatarBase64);
            
            res.status(200).json({ 
                success: true,
                message: 'Avatar uploaded successfully',
                avatarUrl: result.avatarUrl
            });
        } catch (error) {
            console.error('Avatar upload failed:', error);
            res.status(500).json({ 
                success: false,
                message: 'Failed to upload avatar' 
            });
        }
    });
    
    healthCheck = requestHandler(async (req: Request, res: Response) => {
        try {
            const isHealthy = await sadTalkerService.checkServiceHealth();
            
            res.status(200).json({ 
                healthy: isHealthy,
                services: {
                    sadtalker: isHealthy,
                    // tts: ttsService.isAvailable() // 如需要的话可以添加
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

    getUserAvatar = requestHandler(async (req: Request, res: Response) => {
        const { conversationId } = req.params;
        
        if (!conversationId) {
            res.status(400).json({ message: 'Missing conversationId' });
            return;
        }
        
        try {
            const avatarData = await sadTalkerService.getUserAvatar(conversationId);
            
            res.status(200).json({ 
                success: true,
                avatarUrl: avatarData?.avatarUrl || null,
                avatarBase64: avatarData?.avatarBase64 || null
            });
        } catch (error) {
            console.error('Get user avatar failed:', error);
            res.status(500).json({ 
                success: false,
                message: 'Failed to get user avatar' 
            });
        }
    });

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