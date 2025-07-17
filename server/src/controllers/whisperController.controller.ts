import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { randomUUID } from 'crypto';
import { whisperService, WhisperConfig } from '../services/whisper.service';
import { AudioProcessor } from '../utils/audioProcessor';
import { requestHandler } from '../utils/requestHandler';
import { experimentsService } from '../services/experiments.service';

// 配置 multer 用于文件上传
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'temp', 'uploads');
        
        // 确保目录存在
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // 使用 UUID 确保文件名唯一性
        const uuid = randomUUID();
        const timestamp = Date.now();
        cb(null, `${file.fieldname}-${timestamp}-${uuid}${path.extname(file.originalname)}`);
    }
});

const fileFilter = (req: any, file: any, cb: any) => {
    const validation = AudioProcessor.validateAudioFile(file);
    if (validation.isValid) {
        cb(null, true);
    } else {
        cb(new Error(validation.error), false);
    }
};

export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
        files: 1
    }
});

class WhisperController {
    /**
     * 转录音频文件
     */
    transcribeAudio = requestHandler(
        async (req: Request, res: Response) => {
            const { experimentId } = req.params;
            const file = req.file;
            
            if (!file) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'No audio file provided' 
                });
            }

            // 验证实验是否存在且启用了 Whisper
            const experiment = await experimentsService.getExperiment(experimentId);
            if (!experiment) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Experiment not found' 
                });
            }

            const whisperConfig = experiment.whisperSettings || this.getDefaultConfig();
            if (!whisperConfig.enabled) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Whisper is not enabled for this experiment' 
                });
            }

            let processedAudioPath: string | null = null;
            const tempFiles: string[] = [file.path];

            try {
                // 验证音频质量
                const qualityCheck = await AudioProcessor.validateAudioQuality(file.path);
                if (!qualityCheck.isValid) {
                    return res.status(400).json({
                        success: false,
                        message: 'Audio quality issues detected',
                        issues: qualityCheck.issues,
                        recommendations: qualityCheck.recommendations
                    });
                }

                // 处理音频文件
                processedAudioPath = AudioProcessor.generateTempPath(file.originalname, '_processed');
                tempFiles.push(processedAudioPath);

                await AudioProcessor.convertForWhisper(file.path, processedAudioPath);

                // 执行转录
                const transcriptionResult = await whisperService.transcribeAudio(
                    processedAudioPath,
                    whisperConfig
                );

                res.json({
                    success: true,
                    data: {
                        text: transcriptionResult.text,
                        language: transcriptionResult.language,
                        confidence: transcriptionResult.confidence,
                        duration: transcriptionResult.duration,
                        segments: transcriptionResult.segments,
                        audioInfo: await AudioProcessor.getAudioInfo(processedAudioPath)
                    }
                });

            } catch (error) {
                console.error('Transcription error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Transcription failed',
                    error: error.message
                });
            } finally {
                // 确保清理临时文件，即使在错误情况下
                try {
                    await AudioProcessor.cleanupFiles(tempFiles);
                } catch (cleanupError) {
                    console.error('Failed to cleanup temp files:', cleanupError);
                }
            }
        }
    );

    /**
     * 获取实验的 Whisper 配置
     */
    getExperimentConfig = requestHandler(
        async (req: Request, res: Response) => {
            const { experimentId } = req.params;
            
            const experiment = await experimentsService.getExperiment(experimentId);
            if (!experiment) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Experiment not found' 
                });
            }

            const whisperConfig = experiment.whisperSettings || this.getDefaultConfig();
            
            res.json({
                success: true,
                data: whisperConfig
            });
        },
        (req, res, error) => {
            res.status(500).json({
                success: false,
                message: 'Failed to get Whisper configuration',
                error: error.message
            });
        }
    );

    /**
     * 更新实验的 Whisper 配置（仅管理员）
     */
    updateExperimentConfig = requestHandler(
        async (req: Request, res: Response) => {
            const { experimentId } = req.params;
            const { whisperSettings } = req.body;
            
            // 验证配置
            const validationResult = this.validateWhisperConfig(whisperSettings);
            if (!validationResult.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid Whisper configuration',
                    errors: validationResult.errors
                });
            }

            // 获取现有实验配置
            const experiment = await experimentsService.getExperiment(experimentId);
            if (!experiment) {
                return res.status(404).json({
                    success: false,
                    message: 'Experiment not found'
                });
            }

            // 更新实验配置
            experiment.whisperSettings = whisperSettings;
            await experimentsService.updateExperiment(experiment);

            res.json({
                success: true,
                message: 'Whisper configuration updated successfully',
                data: whisperSettings
            });
        }
    );

    /**
     * 获取系统信息
     */
    getSystemInfo = requestHandler(
        async (req: Request, res: Response) => {
            const systemInfo = await whisperService.getSystemInfo();
            
            res.json({
                success: true,
                data: systemInfo
            });
        }
    );

    /**
     * 测试音频文件
     */
    testAudioFile = requestHandler(
        async (req: Request, res: Response) => {
            const file = req.file;
            
            if (!file) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'No audio file provided' 
                });
            }

            try {
                const [audioInfo, qualityCheck] = await Promise.all([
                    AudioProcessor.getAudioInfo(file.path),
                    AudioProcessor.validateAudioQuality(file.path)
                ]);

                res.json({
                    success: true,
                    data: {
                        audioInfo,
                        qualityCheck
                    }
                });

            } catch (error) {
                res.status(500).json({
                    success: false,
                    message: 'Failed to analyze audio file',
                    error: error.message
                });
            } finally {
                // 清理上传的文件
                AudioProcessor.cleanupFiles([file.path]).catch(console.error);
            }
        },
        (req, res, error) => {
            res.status(500).json({
                success: false,
                message: 'Audio test failed',
                error: error.message
            });
        }
    );

    /**
     * 获取默认配置
     */
    private getDefaultConfig(): WhisperConfig {
        return {
            modelSize: 'tiny',
            language: 'auto',
            temperature: 0.0,
            maxFileSize: 50,
            maxDuration: 300,
            enabled: false
        };
    }

    /**
     * 验证 Whisper 配置
     */
    private validateWhisperConfig(config: any): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!config) {
            errors.push('Configuration is required');
            return { isValid: false, errors };
        }

        if (!['tiny', 'small'].includes(config.modelSize)) {
            errors.push('Model size must be "tiny" or "small"');
        }

        if (!['zh', 'en', 'auto'].includes(config.language)) {
            errors.push('Language must be "zh", "en", or "auto"');
        }

        if (typeof config.temperature !== 'number' || config.temperature < 0 || config.temperature > 1) {
            errors.push('Temperature must be a number between 0 and 1');
        }

        if (typeof config.maxFileSize !== 'number' || config.maxFileSize <= 0 || config.maxFileSize > 100) {
            errors.push('Max file size must be a number between 1 and 100 MB');
        }

        if (typeof config.maxDuration !== 'number' || config.maxDuration <= 0 || config.maxDuration > 600) {
            errors.push('Max duration must be a number between 1 and 600 seconds');
        }

        if (typeof config.enabled !== 'boolean') {
            errors.push('Enabled must be a boolean value');
        }

        return { isValid: errors.length === 0, errors };
    }

    updateWhisperSettings = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { experimentId } = req.params;
            const  whisperSettings  = req.body;

            if (!experimentId || !whisperSettings) {
                return res.status(400).json({ success: false, message: 'Missing experimentId or whisperSettings' });
            }

            // Fetch the existing experiment
            const experiment = await experimentsService.getExperiment(experimentId);
            if (!experiment) {
                return res.status(404).json({ success: false, message: 'Experiment not found' });
            }

            // Update the whisper settings
            experiment.whisperSettings = whisperSettings;

            // Save the updated experiment
            await experimentsService.updateExperiment(experiment);

            res.status(200).json({
                success: true,
                message: 'Whisper settings updated successfully',
                data: whisperSettings,
            });
        } catch (error) {
            next(error);
        }
    };
}

export const whisperController = new WhisperController(); 