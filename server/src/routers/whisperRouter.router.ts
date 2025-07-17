import { Router } from 'express';
import { whisperController, upload } from '../controllers/whisperController.controller';
import { authenticateToken } from '../middleware/authenticateToken';
import { adminRequired } from '../middleware/adminRequired';

export const whisperRouter = (): Router => {
    const router = Router();

    // 转录音频文件
    router.post(
        '/transcribe/:experimentId',
        authenticateToken,
        upload.single('audio'),
        whisperController.transcribeAudio
    );

    // 获取实验的 Whisper 配置
    router.get(
        '/config/:experimentId',
        authenticateToken,
        whisperController.getExperimentConfig
    );

    // 更新实验的 Whisper 配置（仅管理员）
    router.put(
        '/config/:experimentId',
        authenticateToken,
        adminRequired,
        whisperController.updateExperimentConfig
    );

    // 获取系统信息（仅管理员）
    router.get(
        '/system-info',
        authenticateToken,
        adminRequired,
        whisperController.getSystemInfo
    );

    // 测试音频文件（仅管理员）
    router.post(
        '/test-audio',
        authenticateToken,
        adminRequired,
        upload.single('audio'),
        whisperController.testAudioFile
    );

    return router;
}; 