import { Router } from 'express';
import { sadTalkerController } from '../controllers/sadtalkerController.controller';
import { authenticateToken, requireAdmin } from '../utils/authMiddleware';

export const sadTalkerRouter = () => {
    const router = Router();

    // 公开路由 - 不需要权限验证
    router.get('/health', sadTalkerController.healthCheck);
    router.get('/edgetts-health', sadTalkerController.checkEdgeTtsHealth);
    router.get('/default-avatar', sadTalkerController.getDefaultAvatar);

    // 管理员专用路由 - 需要管理员权限
    router.post('/upload-default-avatar', authenticateToken, requireAdmin, sadTalkerController.uploadDefaultAvatar);
    router.delete('/delete-default-avatar', authenticateToken, requireAdmin, sadTalkerController.deleteDefaultAvatar);

    // 移除的路由：
    // - POST /upload-avatar (用户头像上传)
    // - GET /user-avatar/:conversationId (获取用户头像)

    return router;
}; 