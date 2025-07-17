import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

export interface WhisperConfig {
    modelSize: 'tiny' | 'small';
    language: 'zh' | 'en' | 'auto';
    temperature: number;
    maxFileSize: number; // MB
    maxDuration: number; // seconds
    enabled: boolean;
}

export interface TranscriptionResult {
    text: string;
    language: string;
    confidence: number;
    duration: number;
    segments?: Array<{
        start: number;
        end: number;
        text: string;
    }>;
}

class WhisperService {
    private readonly pythonPath: string;
    private readonly tempDir: string;
    private readonly modelCache: Map<string, boolean> = new Map();

    constructor() {
        // 根据操作系统设置 Python 路径
        this.pythonPath = process.platform === 'win32' 
            ? path.join(process.cwd(), 'whisper_env', 'Scripts', 'python.exe')
            : path.join(process.cwd(), 'whisper_env', 'bin', 'python');
        
        this.tempDir = path.join(process.cwd(), 'temp', 'audio');
        this.ensureTempDir();
    }

    private ensureTempDir(): void {
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    /**
     * 检查模型是否已下载
     */
    public async checkModelAvailability(modelSize: 'tiny' | 'small'): Promise<boolean> {
        if (this.modelCache.has(modelSize)) {
            return this.modelCache.get(modelSize)!;
        }

        return new Promise((resolve) => {
            const checkScript = `
import whisper
import sys
try:
    model = whisper.load_model('${modelSize}')
    print('MODEL_AVAILABLE')
    sys.exit(0)
except Exception as e:
    print(f'MODEL_ERROR: {e}')
    sys.exit(1)
`;

            const pythonProcess = spawn(this.pythonPath, ['-c', checkScript]);
            let output = '';

            pythonProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            pythonProcess.on('close', (code) => {
                const available = code === 0 && output.includes('MODEL_AVAILABLE');
                this.modelCache.set(modelSize, available);
                resolve(available);
            });

            pythonProcess.on('error', () => {
                this.modelCache.set(modelSize, false);
                resolve(false);
            });
        });
    }

    /**
     * 转录音频文件
     */
    public async transcribeAudio(
        audioFilePath: string,
        config: WhisperConfig
    ): Promise<TranscriptionResult> {
        // 验证文件存在
        if (!fs.existsSync(audioFilePath)) {
            throw new Error('Audio file not found');
        }

        // 检查模型可用性
        const modelAvailable = await this.checkModelAvailability(config.modelSize);
        if (!modelAvailable) {
            throw new Error(`Whisper model '${config.modelSize}' is not available`);
        }

        // 验证文件大小
        const stats = fs.statSync(audioFilePath);
        const fileSizeMB = stats.size / (1024 * 1024);
        if (fileSizeMB > config.maxFileSize) {
            throw new Error(`File size ${fileSizeMB.toFixed(2)}MB exceeds limit ${config.maxFileSize}MB`);
        }

        return this.runWhisperTranscription(audioFilePath, config);
    }

    private async runWhisperTranscription(
        audioFilePath: string,
        config: WhisperConfig
    ): Promise<TranscriptionResult> {
        return new Promise((resolve, reject) => {
            const transcriptionScript = `
import whisper
import json
import sys
import time
import signal
import os

# 设置信号处理器，确保进程能被正确终止
def signal_handler(signum, frame):
    sys.exit(1)

signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler)

try:
    start_time = time.time()
    
    # 加载模型
    model = whisper.load_model('${config.modelSize}')
    
    # 转录音频
    result = model.transcribe(
        '${audioFilePath.replace(/\\/g, '\\\\')}',
        language='${config.language === 'auto' ? 'None' : config.language}',
        temperature=${config.temperature},
        verbose=False
    )
    
    end_time = time.time()
    duration = end_time - start_time
    
    # 构建结果
    transcription_result = {
        'text': result['text'].strip(),
        'language': result['language'],
        'confidence': 0.95,  # Whisper 不直接提供置信度，使用估计值
        'duration': duration,
        'segments': []
    }
    
    # 添加分段信息
    if 'segments' in result:
        for segment in result['segments']:
            transcription_result['segments'].append({
                'start': segment['start'],
                'end': segment['end'],
                'text': segment['text'].strip()
            })
    
    print(json.dumps(transcription_result))
    sys.exit(0)
    
except Exception as e:
    error_result = {
        'error': str(e),
        'type': type(e).__name__
    }
    print(json.dumps(error_result))
    sys.exit(1)
`;

            const pythonProcess = spawn(this.pythonPath, ['-c', transcriptionScript], {
                stdio: ['pipe', 'pipe', 'pipe'],
                detached: false // 确保子进程不会脱离父进程
            });
            
            let output = '';
            let errorOutput = '';
            let processKilled = false;

            // 设置进程超时
            const timeout = setTimeout(() => {
                if (!processKilled) {
                    processKilled = true;
                    pythonProcess.kill('SIGTERM');
                    // 如果SIGTERM无效，使用SIGKILL
                    setTimeout(() => {
                        if (!pythonProcess.killed) {
                            pythonProcess.kill('SIGKILL');
                        }
                    }, 5000);
                    reject(new Error('Transcription timeout'));
                }
            }, 60000); // 60秒超时

            pythonProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            pythonProcess.on('close', (code, signal) => {
                clearTimeout(timeout);
                if (processKilled) {
                    return; // 已经处理过超时
                }
                
                if (code === 0) {
                    try {
                        const result = JSON.parse(output.trim());
                        resolve(result);
                    } catch (parseError) {
                        reject(new Error(`Failed to parse transcription result: ${parseError.message}`));
                    }
                } else {
                    try {
                        const errorResult = JSON.parse(output.trim());
                        reject(new Error(`Transcription failed: ${errorResult.error}`));
                    } catch {
                        reject(new Error(`Transcription failed: ${errorOutput || 'Unknown error'}`));
                    }
                }
            });

            pythonProcess.on('error', (error) => {
                clearTimeout(timeout);
                if (!processKilled) {
                    reject(new Error(`Failed to start Python process: ${error.message}`));
                }
            });

            // 确保进程在Node.js退出时被清理
            process.on('exit', () => {
                if (!pythonProcess.killed) {
                    pythonProcess.kill('SIGKILL');
                }
            });
        });
    }

    /**
     * 清理临时文件
     */
    public async cleanupTempFile(filePath: string): Promise<void> {
        try {
            if (fs.existsSync(filePath)) {
                await unlink(filePath);
            }
        } catch (error) {
            console.warn(`Failed to cleanup temp file ${filePath}:`, error instanceof Error ? error.message : error);
        }
    }

    /**
     * 获取系统信息
     */
    public async getSystemInfo(): Promise<{
        pythonAvailable: boolean;
        modelsAvailable: { tiny: boolean; small: boolean };
        tempDirWritable: boolean;
    }> {
        const [tinyAvailable, smallAvailable] = await Promise.all([
            this.checkModelAvailability('tiny'),
            this.checkModelAvailability('small')
        ]);

        return {
            pythonAvailable: fs.existsSync(this.pythonPath),
            modelsAvailable: {
                tiny: tinyAvailable,
                small: smallAvailable
            },
            tempDirWritable: this.checkTempDirWritable()
        };
    }

    private checkTempDirWritable(): boolean {
        try {
            const testFile = path.join(this.tempDir, 'test.txt');
            fs.writeFileSync(testFile, 'test');
            fs.unlinkSync(testFile);
            return true;
        } catch {
            return false;
        }
    }
}

export const whisperService = new WhisperService(); 