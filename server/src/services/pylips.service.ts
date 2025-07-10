/**
 * PyLips服务接口 - 与Python微服务通信
 */

import axios, { AxiosResponse } from 'axios';

export interface PyLipsResponse {
    success: boolean;
    message: string;
    [key: string]: any;
}

export interface PyLipsStatus {
    face_server_running: boolean;
    face_initialized: boolean;
    current_voice_id?: string;
    tts_method: string;
}

export interface PyLipsConfig {
    voice_id?: string;
    tts_method?: 'system' | 'polly';
}

class PyLipsService {
    private readonly baseUrl: string;
    private isConnected: boolean = false;

    constructor() {
        this.baseUrl = process.env.PYLIPS_SERVICE_URL || 'http://localhost:3001';
    }

    /**
     * 检查PyLips服务是否可用
     */
    async isServiceAvailable(): Promise<boolean> {
        try {
            const response = await axios.get(`${this.baseUrl}/health`, { timeout: 5000 });
            this.isConnected = response.status === 200;
            return this.isConnected;
        } catch (error) {
            console.warn('PyLips服务不可用:', error.message);
            this.isConnected = false;
            return false;
        }
    }

    /**
     * 启动PyLips服务
     */
    async startService(config?: PyLipsConfig): Promise<PyLipsResponse> {
        try {
            const response: AxiosResponse<PyLipsResponse> = await axios.post(
                `${this.baseUrl}/start`,
                config || {},
                { timeout: 15000 }
            );
            
            if (response.data.success) {
                this.isConnected = true;
                console.log('PyLips服务启动成功');
            }
            
            return response.data;
        } catch (error) {
            console.error('启动PyLips服务失败:', error.message);
            return {
                success: false,
                message: `启动PyLips服务失败: ${error.message}`
            };
        }
    }

    /**
     * 停止PyLips服务
     */
    async stopService(): Promise<PyLipsResponse> {
        try {
            const response: AxiosResponse<PyLipsResponse> = await axios.post(`${this.baseUrl}/stop`);
            this.isConnected = false;
            return response.data;
        } catch (error) {
            console.error('停止PyLips服务失败:', error.message);
            return {
                success: false,
                message: `停止PyLips服务失败: ${error.message}`
            };
        }
    }

    /**
     * 让AI说话
     */
    async speak(text: string, wait: boolean = false): Promise<PyLipsResponse> {
        if (!this.isConnected) {
            const available = await this.isServiceAvailable();
            if (!available) {
                return {
                    success: false,
                    message: 'PyLips服务不可用'
                };
            }
        }

        try {
            const response: AxiosResponse<PyLipsResponse> = await axios.post(`${this.baseUrl}/speak`, {
                text,
                wait
            });
            
            return response.data;
        } catch (error) {
            console.error('PyLips语音播放失败:', error.message);
            return {
                success: false,
                message: `语音播放失败: ${error.message}`
            };
        }
    }

    /**
     * 设置面部表情
     */
    async setExpression(expression: 'happy' | 'sad' | 'surprised' | 'angry' | 'neutral', duration: number = 1000): Promise<PyLipsResponse> {
        if (!this.isConnected) {
            return {
                success: false,
                message: 'PyLips服务不可用'
            };
        }

        try {
            const response: AxiosResponse<PyLipsResponse> = await axios.post(`${this.baseUrl}/expression`, {
                expression,
                duration
            });
            
            return response.data;
        } catch (error) {
            console.error('设置表情失败:', error.message);
            return {
                success: false,
                message: `设置表情失败: ${error.message}`
            };
        }
    }

    /**
     * 控制注视方向
     */
    async look(x: number, y: number, z: number, duration: number = 1000): Promise<PyLipsResponse> {
        if (!this.isConnected) {
            return {
                success: false,
                message: 'PyLips服务不可用'
            };
        }

        try {
            const response: AxiosResponse<PyLipsResponse> = await axios.post(`${this.baseUrl}/look`, {
                x, y, z, duration
            });
            
            return response.data;
        } catch (error) {
            console.error('控制注视失败:', error.message);
            return {
                success: false,
                message: `控制注视失败: ${error.message}`
            };
        }
    }

    /**
     * 停止当前语音
     */
    async stopSpeech(): Promise<PyLipsResponse> {
        if (!this.isConnected) {
            return {
                success: false,
                message: 'PyLips服务不可用'
            };
        }

        try {
            const response: AxiosResponse<PyLipsResponse> = await axios.post(`${this.baseUrl}/stop-speech`);
            return response.data;
        } catch (error) {
            console.error('停止语音失败:', error.message);
            return {
                success: false,
                message: `停止语音失败: ${error.message}`
            };
        }
    }

    /**
     * 更新配置
     */
    async updateConfig(config: PyLipsConfig): Promise<PyLipsResponse> {
        try {
            const response: AxiosResponse<PyLipsResponse> = await axios.post(`${this.baseUrl}/config`, config);
            return response.data;
        } catch (error) {
            console.error('更新配置失败:', error.message);
            return {
                success: false,
                message: `更新配置失败: ${error.message}`
            };
        }
    }

    /**
     * 获取服务状态
     */
    async getStatus(): Promise<PyLipsStatus | null> {
        try {
            const response: AxiosResponse<PyLipsStatus> = await axios.get(`${this.baseUrl}/status`);
            return response.data;
        } catch (error) {
            console.error('获取状态失败:', error.message);
            return null;
        }
    }

    /**
     * 智能表情选择 - 基于文本内容选择合适的表情
     */
    getExpressionFromText(text: string): 'happy' | 'sad' | 'surprised' | 'angry' | 'neutral' {
        const lowerText = text.toLowerCase();
        
        // 高兴表情关键词
        if (lowerText.includes('happy') || lowerText.includes('good') || lowerText.includes('great') || 
            lowerText.includes('wonderful') || lowerText.includes('excellent') || 
            lowerText.includes('😊') || lowerText.includes('😄') || lowerText.includes('😃') ||
            lowerText.includes('哈哈') || lowerText.includes('开心') || lowerText.includes('高兴') ||
            lowerText.includes('太好了') || lowerText.includes('棒') || lowerText.includes('赞')) {
            return 'happy';
        }
        
        // 悲伤表情关键词
        if (lowerText.includes('sad') || lowerText.includes('sorry') || lowerText.includes('bad') ||
            lowerText.includes('terrible') || lowerText.includes('awful') ||
            lowerText.includes('😢') || lowerText.includes('😭') || lowerText.includes('😔') ||
            lowerText.includes('难过') || lowerText.includes('伤心') || lowerText.includes('抱歉') ||
            lowerText.includes('不好') || lowerText.includes('糟糕')) {
            return 'sad';
        }
        
        // 惊讶表情关键词
        if (lowerText.includes('wow') || lowerText.includes('amazing') || lowerText.includes('incredible') ||
            lowerText.includes('unbelievable') || lowerText.includes('!') ||
            lowerText.includes('😲') || lowerText.includes('😮') || lowerText.includes('😯') ||
            lowerText.includes('哇') || lowerText.includes('天哪') || lowerText.includes('不敢相信') ||
            lowerText.includes('惊人') || lowerText.includes('太') && lowerText.includes('了')) {
            return 'surprised';
        }
        
        // 愤怒表情关键词
        if (lowerText.includes('angry') || lowerText.includes('mad') || lowerText.includes('annoyed') ||
            lowerText.includes('frustrated') || lowerText.includes('hate') ||
            lowerText.includes('😠') || lowerText.includes('😡') || lowerText.includes('🤬') ||
            lowerText.includes('生气') || lowerText.includes('愤怒') || lowerText.includes('恼火') ||
            lowerText.includes('讨厌') || lowerText.includes('烦')) {
            return 'angry';
        }
        
        // 默认中性表情
        return 'neutral';
    }

    /**
     * 智能语音播放 - 结合表情和语音
     */
    async speakWithExpression(text: string, wait: boolean = false): Promise<PyLipsResponse> {
        // 选择合适的表情
        const expression = this.getExpressionFromText(text);
        
        try {
            // 先设置表情
            if (expression !== 'neutral') {
                await this.setExpression(expression, 500);
                // 等待一下让表情显示
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            // 然后播放语音
            const result = await this.speak(text, wait);
            
            // 语音结束后回到中性表情
            if (expression !== 'neutral' && !wait) {
                setTimeout(async () => {
                    await this.setExpression('neutral', 1000);
                }, 3000); // 3秒后回到中性
            }
            
            return result;
        } catch (error) {
            return {
                success: false,
                message: `智能语音播放失败: ${error.message}`
            };
        }
    }
}

export const pylipsService = new PyLipsService(); 