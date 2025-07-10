import { Request, Response } from 'express';
import { pylipsService } from '../services/pylips.service';
import { requestHandler } from '../utils/requestHandler';

class PyLipsController {
    
    /**
     * 获取PyLips服务状态
     */
    getStatus = requestHandler(async (req: Request, res: Response) => {
        const status = await pylipsService.getStatus();
        
        if (status) {
            res.status(200).json({
                success: true,
                data: status
            });
        } else {
            res.status(503).json({
                success: false,
                message: 'PyLips服务不可用'
            });
        }
    });

    /**
     * 启动PyLips服务
     */
    startService = requestHandler(async (req: Request, res: Response) => {
        const { voice_id, tts_method } = req.body;
        
        const result = await pylipsService.startService({
            voice_id,
            tts_method
        });
        
        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(500).json(result);
        }
    });

    /**
     * 停止PyLips服务
     */
    stopService = requestHandler(async (req: Request, res: Response) => {
        const result = await pylipsService.stopService();
        
        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(500).json(result);
        }
    });

    /**
     * 语音播放
     */
    speak = requestHandler(async (req: Request, res: Response) => {
        const { text, wait } = req.body;
        
        if (!text) {
            res.status(400).json({
                success: false,
                message: '缺少text参数'
            });
            return;
        }
        
        const result = await pylipsService.speak(text, wait || false);
        
        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(500).json(result);
        }
    });

    /**
     * 智能语音播放（带表情）
     */
    speakWithExpression = requestHandler(async (req: Request, res: Response) => {
        const { text, wait } = req.body;
        
        if (!text) {
            res.status(400).json({
                success: false,
                message: '缺少text参数'
            });
            return;
        }
        
        const result = await pylipsService.speakWithExpression(text, wait || false);
        
        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(500).json(result);
        }
    });

    /**
     * 停止语音
     */
    stopSpeech = requestHandler(async (req: Request, res: Response) => {
        const result = await pylipsService.stopSpeech();
        
        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(500).json(result);
        }
    });

    /**
     * 设置面部表情
     */
    setExpression = requestHandler(async (req: Request, res: Response) => {
        const { expression, duration } = req.body;
        
        if (!expression) {
            res.status(400).json({
                success: false,
                message: '缺少expression参数'
            });
            return;
        }
        
        const validExpressions = ['happy', 'sad', 'surprised', 'angry', 'neutral'];
        if (!validExpressions.includes(expression)) {
            res.status(400).json({
                success: false,
                message: `无效的表情，支持的表情: ${validExpressions.join(', ')}`
            });
            return;
        }
        
        const result = await pylipsService.setExpression(expression, duration || 1000);
        
        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(500).json(result);
        }
    });

    /**
     * 控制注视方向
     */
    look = requestHandler(async (req: Request, res: Response) => {
        const { x, y, z, duration } = req.body;
        
        if (x === undefined || y === undefined || z === undefined) {
            res.status(400).json({
                success: false,
                message: '缺少x, y, z参数'
            });
            return;
        }
        
        const result = await pylipsService.look(x, y, z, duration || 1000);
        
        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(500).json(result);
        }
    });

    /**
     * 更新配置
     */
    updateConfig = requestHandler(async (req: Request, res: Response) => {
        const { voice_id, tts_method } = req.body;
        
        const result = await pylipsService.updateConfig({
            voice_id,
            tts_method
        });
        
        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(500).json(result);
        }
    });

    /**
     * 健康检查
     */
    healthCheck = requestHandler(async (req: Request, res: Response) => {
        const isAvailable = await pylipsService.isServiceAvailable();
        
        res.status(200).json({
            success: true,
            message: 'PyLips控制器正常运行',
            pylips_service_available: isAvailable
        });
    });
}

export const pylipsController = new PyLipsController(); 