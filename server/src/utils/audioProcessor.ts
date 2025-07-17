import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { randomUUID } from 'crypto';

const unlink = promisify(fs.unlink);

interface MulterFile {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    destination: string;
    filename: string;
    path: string;
    buffer: Buffer;
}

export interface AudioInfo {
    duration: number;
    format: string;
    sampleRate: number;
    channels: number;
    bitRate: number;
    size: number;
}

export interface AudioProcessingOptions {
    targetSampleRate?: number;
    targetChannels?: number;
    targetFormat?: string;
    maxDuration?: number;
    normalize?: boolean;
}

export class AudioProcessor {
    private static readonly SUPPORTED_FORMATS = [
        'mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'wma', 'webm'
    ];

    private static readonly DEFAULT_OPTIONS: AudioProcessingOptions = {
        targetSampleRate: 16000,
        targetChannels: 1,
        targetFormat: 'wav',
        maxDuration: 300, // 5 minutes
        normalize: true
    };

    /**
     * 验证音频文件格式
     */
    public static validateAudioFile(file: MulterFile): {
        isValid: boolean;
        error?: string;
    } {
        // 检查文件扩展名
        const ext = path.extname(file.originalname).toLowerCase().slice(1);
        if (!this.SUPPORTED_FORMATS.includes(ext)) {
            return {
                isValid: false,
                error: `Unsupported audio format: ${ext}. Supported formats: ${this.SUPPORTED_FORMATS.join(', ')}`
            };
        }

        // 检查 MIME 类型
        if (!file.mimetype.startsWith('audio/') && !file.mimetype.startsWith('video/webm')) {
            return {
                isValid: false,
                error: 'File is not an audio file'
            };
        }

        // 检查文件大小 (50MB limit)
        const maxSize = 50 * 1024 * 1024;
        if (file.size > maxSize) {
            return {
                isValid: false,
                error: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds limit ${maxSize / 1024 / 1024}MB`
            };
        }

        // 检查文件是否为空
        if (file.size === 0) {
            return {
                isValid: false,
                error: 'Audio file is empty'
            };
        }

        return { isValid: true };
    }

    /**
     * 获取音频文件信息
     */
    public static getAudioInfo(filePath: string): Promise<AudioInfo> {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(filePath, (err, metadata) => {
                if (err) {
                    reject(new Error(`Failed to get audio info: ${err.message}`));
                    return;
                }

                const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');
                if (!audioStream) {
                    reject(new Error('No audio stream found in file'));
                    return;
                }

                const info: AudioInfo = {
                    duration: metadata.format.duration || 0,
                    format: metadata.format.format_name || 'unknown',
                    sampleRate: audioStream.sample_rate || 0,
                    channels: audioStream.channels || 0,
                    bitRate: parseInt(audioStream.bit_rate || '0'),
                    size: parseInt(String(metadata.format.size || '0'))
                };

                resolve(info);
            });
        });
    }

    /**
     * 处理音频文件
     */
    public static async processAudioFile(
        inputPath: string,
        outputPath: string,
        options: AudioProcessingOptions = {}
    ): Promise<AudioInfo> {
        const opts = { ...this.DEFAULT_OPTIONS, ...options };

        // 获取原始音频信息
        const originalInfo = await this.getAudioInfo(inputPath);

        // 验证时长
        if (opts.maxDuration && originalInfo.duration > opts.maxDuration) {
            throw new Error(`Audio duration ${originalInfo.duration.toFixed(2)}s exceeds limit ${opts.maxDuration}s`);
        }

        return new Promise((resolve, reject) => {
            let command = ffmpeg(inputPath)
                .audioFrequency(opts.targetSampleRate!)
                .audioChannels(opts.targetChannels!)
                .format(opts.targetFormat!);

            // 音频标准化
            if (opts.normalize) {
                command = command.audioFilters('loudnorm');
            }

            // 降噪处理
            command = command.audioFilters('highpass=f=80,lowpass=f=8000');

            // 设置处理超时
            const timeoutId = setTimeout(() => {
                command.kill('SIGKILL');
                reject(new Error('Audio processing timeout'));
            }, 300000); // 5分钟超时

            command
                .on('start', (commandLine) => {
                    console.log('Audio processing started:', commandLine);
                })
                .on('progress', (progress) => {
                    console.log('Processing progress:', progress.percent + '%');
                })
                .on('end', async () => {
                    clearTimeout(timeoutId);
                    try {
                        const processedInfo = await this.getAudioInfo(outputPath);
                        resolve(processedInfo);
                    } catch (error) {
                        reject(new Error(`Failed to get processed audio info: ${error.message}`));
                    }
                })
                .on('error', (err) => {
                    clearTimeout(timeoutId);
                    reject(new Error(`Audio processing failed: ${err.message}`));
                })
                .save(outputPath);
        });
    }

    /**
     * 快速转换为 Whisper 兼容格式
     */
    public static async convertForWhisper(
        inputPath: string,
        outputPath: string
    ): Promise<AudioInfo> {
        return this.processAudioFile(inputPath, outputPath, {
            targetSampleRate: 16000,
            targetChannels: 1,
            targetFormat: 'wav',
            normalize: true
        });
    }

    /**
     * 生成临时文件路径
     */
    public static generateTempPath(originalName: string, suffix: string = ''): string {
        const tempDir = path.join(process.cwd(), 'temp', 'audio');
        
        // 确保目录存在
        if (!fs.existsSync(tempDir)) {
            try {
                fs.mkdirSync(tempDir, { recursive: true });
            } catch (error) {
                throw new Error(`Failed to create temp directory: ${error.message}`);
            }
        }

        // 检查磁盘空间（简单检查）
        try {
            const stats = fs.statSync(tempDir);
            // 如果无法获取统计信息，可能是权限问题
            if (!stats.isDirectory()) {
                throw new Error('Temp path is not a directory');
            }
        } catch (error) {
            throw new Error(`Temp directory access error: ${error.message}`);
        }

        // 使用 UUID 确保唯一性，避免高并发冲突
        const uuid = randomUUID();
        const timestamp = Date.now();
        const ext = path.extname(originalName);
        const baseName = path.basename(originalName, ext);
        
        const filePath = path.join(tempDir, `${baseName}_${timestamp}_${uuid}${suffix}${ext}`);
        
        // 检查路径长度（Windows限制）
        if (filePath.length > 260) {
            throw new Error('File path too long');
        }
        
        return filePath;
    }

    /**
     * 清理临时文件
     */
    public static async cleanupFiles(filePaths: string[]): Promise<void> {
        const cleanupPromises = filePaths.map(async (filePath) => {
            try {
                if (fs.existsSync(filePath)) {
                    await unlink(filePath);
                    console.log(`Cleaned up temp file: ${filePath}`);
                }
            } catch (error) {
                console.warn(`Failed to cleanup file ${filePath}:`, error);
            }
        });

        await Promise.all(cleanupPromises);
    }

    /**
     * 验证音频质量
     */
    public static async validateAudioQuality(filePath: string): Promise<{
        isValid: boolean;
        issues: string[];
        recommendations: string[];
    }> {
        const info = await this.getAudioInfo(filePath);
        const issues: string[] = [];
        const recommendations: string[] = [];

        // 检查采样率
        if (info.sampleRate < 8000) {
            issues.push(`Low sample rate: ${info.sampleRate}Hz`);
            recommendations.push('Use audio with at least 16kHz sample rate for better transcription quality');
        }

        // 检查声道数
        if (info.channels > 2) {
            issues.push(`Too many channels: ${info.channels}`);
            recommendations.push('Convert to mono or stereo for better processing');
        }

        // 检查时长
        if (info.duration < 1) {
            issues.push(`Audio too short: ${info.duration.toFixed(2)}s`);
            recommendations.push('Use audio longer than 1 second for reliable transcription');
        }

        if (info.duration > 300) {
            issues.push(`Audio too long: ${info.duration.toFixed(2)}s`);
            recommendations.push('Split long audio files into smaller chunks');
        }

        // 检查比特率
        if (info.bitRate < 32000) {
            issues.push(`Low bit rate: ${info.bitRate}bps`);
            recommendations.push('Use higher quality audio for better transcription accuracy');
        }

        return {
            isValid: issues.length === 0,
            issues,
            recommendations
        };
    }
}

export default AudioProcessor; 