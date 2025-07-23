import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface EdgeTTSOptions {
    voice?: string;
    rate?: string;
    pitch?: string;
    volume?: string;
}

class EdgeTTSService {
    private tempDir = path.join(process.cwd(), 'temp');
    
    // 支持的中文语音列表
    private readonly supportedVoices = {
        'zh-CN-XiaoxiaoNeural': '晓晓 - 温柔女声',
        'zh-CN-YunxiNeural': '云希 - 成熟男声',
        'zh-CN-YunyangNeural': '云扬 - 年轻男声',
        'zh-CN-XiaoyiNeural': '晓伊 - 甜美女声',
        'zh-CN-YunjianNeural': '云健 - 磁性男声',
        'zh-CN-XiaozhenNeural': '晓甄 - 优雅女声',
        'en-US-AriaNeural': 'Aria - 英语女声',
        'en-US-DavisNeural': 'Davis - 英语男声',
    };

    constructor() {
        this.ensureTempDir();
    }

    private ensureTempDir(): void {
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    /**
     * 检查 EdgeTTS 是否可用
     */
    async checkAvailability(): Promise<boolean> {
        try {
            // 检查是否安装了 edge-tts
            await execAsync('python -m edge_tts --help');
            return true;
        } catch (error) {
            console.log('EdgeTTS Python package not found, trying to install...');
            try {
                // 尝试安装 edge-tts Python 包
                await execAsync('pip install edge-tts');
                return true;
            } catch (installError) {
                console.error('Failed to install edge-tts:', installError);
                return false;
            }
        }
    }

    /**
     * 文本转语音
     */
    async generateSpeech(
        text: string, 
        options: EdgeTTSOptions = {}
    ): Promise<Buffer> {
        const {
            voice = 'zh-CN-XiaoxiaoNeural',
            rate = '+0%',
            pitch = '+0Hz',
            volume = '+0%'
        } = options;

        const timestamp = Date.now();
        const outputFile = path.join(this.tempDir, `speech_${timestamp}.wav`);

        try {
            // 清理文本，移除特殊字符
            const cleanText = this.cleanText(text);
            
            // 构建 edge-tts 命令
            const command = [
                'python',
                '-m',
                'edge_tts',
                '--voice',
                voice,
                '--rate',
                rate,
                '--pitch',
                pitch,
                '--volume',
                volume,
                '--text',
                `"${cleanText}"`,
                '--write-media',
                `"${outputFile}"`
            ].join(' ');

            console.log('EdgeTTS command:', command);

            // 执行命令
            await execAsync(command, { timeout: 30000 });

            // 检查文件是否生成
            if (!fs.existsSync(outputFile)) {
                throw new Error('Failed to generate audio file');
            }

            // 读取生成的音频文件
            const audioBuffer = fs.readFileSync(outputFile);

            // 清理临时文件
            this.cleanupFile(outputFile);

            return audioBuffer;

        } catch (error) {
            console.error('EdgeTTS generation failed:', error);
            // 清理可能的残余文件
            this.cleanupFile(outputFile);
            throw new Error(`EdgeTTS failed: ${error.message}`);
        }
    }

    /**
     * 清理文本，移除可能导致命令行问题的字符
     */
    private cleanText(text: string): string {
        return text
            .replace(/"/g, "'")  // 替换双引号为单引号
            .replace(/\n/g, ' ') // 替换换行为空格
            .replace(/\r/g, '')  // 移除回车符
            .trim();
    }

    /**
     * 清理临时文件
     */
    private cleanupFile(filePath: string): void {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (error) {
            console.warn('Failed to cleanup temp file:', filePath, error);
        }
    }

    /**
     * 获取支持的语音列表
     */
    getSupportedVoices(): Record<string, string> {
        return this.supportedVoices;
    }

    /**
     * 获取可用语音列表（从 EdgeTTS 实时获取）
     */
    async getAvailableVoices(): Promise<any[]> {
        try {
            const { stdout } = await execAsync('python -m edge_tts --list-voices');
            const voices = JSON.parse(stdout);
            return voices.filter((voice: any) => 
                voice.Locale.startsWith('zh-CN') || voice.Locale.startsWith('en-US')
            );
        } catch (error) {
            console.error('Failed to get available voices:', error);
            return [];
        }
    }

    /**
     * 清理所有临时文件
     */
    cleanup(): void {
        try {
            const files = fs.readdirSync(this.tempDir);
            files.forEach(file => {
                if (file.startsWith('speech_') && file.endsWith('.wav')) {
                    const filePath = path.join(this.tempDir, file);
                    this.cleanupFile(filePath);
                }
            });
        } catch (error) {
            console.warn('Failed to cleanup temp directory:', error);
        }
    }
}

export default new EdgeTTSService(); 