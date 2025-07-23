import OpenAI from 'openai';

class TTSService {
    private openaiClient: OpenAI;
    
    constructor() {
        const { OPENAI_API_KEY } = process.env;
        if (!OPENAI_API_KEY) {
            console.warn('OPENAI_API_KEY not found, TTS service will not work');
            return;
        }
        
        this.openaiClient = new OpenAI({
            apiKey: OPENAI_API_KEY
        });
    }

    // 使用 OpenAI TTS 将文本转换为语音
    textToSpeech = async (text: string, voice: string = 'alloy'): Promise<string> => {
        if (!this.openaiClient) {
            throw new Error('TTS service not initialized - missing OpenAI API key');
        }

        try {
            console.log('Generating speech for text:', text.substring(0, 100) + '...');
            
            const response = await this.openaiClient.audio.speech.create({
                model: 'tts-1',
                input: text,
                voice: voice as any, // OpenAI支持的声音类型
                response_format: 'mp3'
            });
            
            // 将响应转换为Buffer，然后转为base64
            const buffer = Buffer.from(await response.arrayBuffer());
            return buffer.toString('base64');
            
        } catch (error) {
            console.error('TTS generation failed:', error);
            throw new Error(`Failed to generate speech: ${error.message}`);
        }
    };
    
    // 检查TTS服务是否可用
    isAvailable = (): boolean => {
        return !!this.openaiClient;
    };
    
    // 获取可用的声音选项
    getAvailableVoices = (): string[] => {
        return ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
    };
}

export const ttsService = new TTSService(); 