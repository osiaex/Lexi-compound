import { Router } from 'express';
import { pylipsController } from '../controllers/pylipsController.controller';

export const pylipsRouter = () => {
    const router = Router();
    
    // 服务管理
    router.get('/status', pylipsController.getStatus);
    router.post('/start', pylipsController.startService);
    router.post('/stop', pylipsController.stopService);
    
    // 语音控制
    router.post('/speak', pylipsController.speak);
    router.post('/speak-with-expression', pylipsController.speakWithExpression);
    router.post('/stop-speech', pylipsController.stopSpeech);
    
    // 表情控制
    router.post('/expression', pylipsController.setExpression);
    
    // 注视控制
    router.post('/look', pylipsController.look);
    
    // 配置管理
    router.post('/config', pylipsController.updateConfig);
    
    // 健康检查
    router.get('/health', pylipsController.healthCheck);

    return router;
}; 