import { Router } from 'express';
import { sadTalkerController } from '../controllers/sadtalkerController.controller';

export const sadTalkerRouter = () => {
    const router = Router();
    
    router.post('/upload-avatar', sadTalkerController.uploadAvatar);
    router.post('/upload-default-avatar', sadTalkerController.uploadDefaultAvatar);
    router.delete('/delete-default-avatar', sadTalkerController.deleteDefaultAvatar);
    router.get('/user-avatar/:conversationId', sadTalkerController.getUserAvatar);
    router.get('/health', sadTalkerController.healthCheck);
    router.get('/edgetts-health', sadTalkerController.checkEdgeTtsHealth);
    router.get('/default-avatar', sadTalkerController.getDefaultAvatar);
    
    return router;
}; 