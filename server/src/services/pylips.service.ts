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
    wait?: boolean;
}

class PyLipsService {
    private baseUrl: string;
    private isConnected: boolean = false;
    private healthCheckInterval: NodeJS.Timeout | null = null;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;

    constructor() {
        this.baseUrl = process.env.PYLIPS_SERVICE_URL || 'http://localhost:3001';
        console.log('PyLips服务初始化，服务地址:', this.baseUrl);
        
        // 启动健康检查
        this.startHealthCheck();
    }

    /**
     * 启动定期健康检查
     */
    private startHealthCheck(): void {
        // 每30秒检查一次服务状态
        this.healthCheckInterval = setInterval(async () => {
            const wasConnected = this.isConnected;
            const isNowConnected = await this.isServiceAvailable();
            
            if (wasConnected && !isNowConnected) {
                console.warn('⚠️ PyLips服务连接丢失，开始重连...');
                this.attemptReconnect();
            } else if (!wasConnected && isNowConnected) {
                console.log('✅ PyLips服务重新连接成功');
                this.reconnectAttempts = 0;
            }
        }, 30000);
    }

    /**
     * 尝试重新连接
     */
    private async attemptReconnect(): Promise<void> {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ PyLips服务重连次数已达上限，停止重连');
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        
        console.log(`🔄 第${this.reconnectAttempts}次重连PyLips服务，${delay/1000}秒后重试...`);
        
        setTimeout(async () => {
            const isConnected = await this.isServiceAvailable();
            if (!isConnected && this.reconnectAttempts < this.maxReconnectAttempts) {
                this.attemptReconnect();
            }
        }, delay);
    }

    /**
     * 停止健康检查
     */
    public stopHealthCheck(): void {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
    }

    /**
     * 检查PyLips服务是否可用
     */
    async isServiceAvailable(): Promise<boolean> {
        try {
            const response = await axios.get(`${this.baseUrl}/health`, { 
                timeout: 3000,
                validateStatus: (status) => status === 200
            });
            this.isConnected = response.status === 200;
            if (this.isConnected) {
                console.log('✅ PyLips服务连接正常');
            }
            return this.isConnected;
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                console.warn('⚠️ PyLips服务未启动或无法连接');
            } else if (error.code === 'ETIMEDOUT') {
                console.warn('⚠️ PyLips服务响应超时');
            } else {
                console.warn('⚠️ PyLips服务不可用:', error.message);
            }
            this.isConnected = false;
            return false;
        }
    }

    /**
     * 启动PyLips服务
     */
    async startService(config?: PyLipsConfig): Promise<PyLipsResponse> {
        try {
            if (!(await this.isServiceAvailable())) {
                console.warn('⚠️ PyLips服务不可用，跳过启动');
                return {
                    success: false,
                    message: 'PyLips服务不可用，无法启动'
                };
            }

            const payload = {
                voice_id: config?.voice_id || 'default',
                tts_method: config?.tts_method || 'system',
                ...config
            };

            console.log('🚀 正在启动PyLips服务...');
            const response: AxiosResponse<PyLipsResponse> = await axios.post(
                `${this.baseUrl}/start`,
                payload,
                { 
                    timeout: 15000,
                    validateStatus: (status) => status >= 200 && status < 300
                }
            );
            
            if (response.data.success) {
                this.isConnected = true;
                console.log('✅ PyLips服务启动成功');
            } else {
                console.warn('⚠️ PyLips服务启动返回失败状态:', response.data.message);
            }
            
            return response.data;
        } catch (error) {
            let errorMessage = '启动PyLips服务失败';
            
            if (error.code === 'ETIMEDOUT') {
                errorMessage = 'PyLips服务启动超时';
                console.error('❌ PyLips服务启动超时');
            } else if (error.response) {
                errorMessage = `PyLips服务启动失败: ${error.response.status} ${error.response.data?.message || error.response.statusText}`;
                console.error('❌ PyLips服务启动失败:', error.response.status, error.response.data);
            } else {
                errorMessage = `启动PyLips服务时发生网络错误: ${error.message}`;
                console.error('❌ 启动PyLips服务时发生网络错误:', error.message);
            }
            
            this.isConnected = false;
            return {
                success: false,
                message: errorMessage
            };
        }
    }

    /**
     * 停止PyLips服务
     */
    async stopService(): Promise<PyLipsResponse> {
        try {
            console.log('🛑 正在停止PyLips服务...');
            const response: AxiosResponse<PyLipsResponse> = await axios.post(
                `${this.baseUrl}/stop`,
                {},
                { 
                    timeout: 10000,
                    validateStatus: (status) => status >= 200 && status < 300
                }
            );
            
            this.isConnected = false;
            
            if (response.data.success) {
                console.log('✅ PyLips服务停止成功');
            } else {
                console.warn('⚠️ PyLips服务停止返回失败状态:', response.data.message);
            }
            
            return response.data;
        } catch (error) {
            let errorMessage = '停止PyLips服务失败';
            
            if (error.code === 'ETIMEDOUT') {
                errorMessage = 'PyLips服务停止超时';
                console.error('❌ PyLips服务停止超时');
            } else if (error.response) {
                errorMessage = `PyLips服务停止失败: ${error.response.status} ${error.response.data?.message || error.response.statusText}`;
                console.error('❌ PyLips服务停止失败:', error.response.status, error.response.data);
            } else if (error.code === 'ECONNREFUSED') {
                errorMessage = 'PyLips服务连接被拒绝，可能已经停止';
                console.warn('⚠️ PyLips服务连接被拒绝，可能已经停止');
            } else {
                errorMessage = `停止PyLips服务网络错误: ${error.message}`;
                console.error('❌ 停止PyLips服务网络错误:', error.message);
            }
            
            this.isConnected = false;
            return {
                success: false,
                message: errorMessage
            };
        }
    }

    /**
     * 语音合成
     */
    async speak(text: string, config?: Partial<PyLipsConfig>): Promise<PyLipsResponse> {
        try {
            // 检查文本是否为空
            if (!text || text.trim().length === 0) {
                return {
                    success: false,
                    message: '文本内容不能为空'
                };
            }

            // 检查服务可用性
            if (!this.isConnected && !(await this.isServiceAvailable())) {
                console.warn('⚠️ PyLips服务不可用，语音合成将被跳过');
                return {
                    success: false,
                    message: 'PyLips服务不可用，语音功能暂时无法使用'
                };
            }

            const payload = { 
                text: text.trim(), 
                ...config 
            };

            console.log('🎤 正在进行语音合成...');
            const response: AxiosResponse<PyLipsResponse> = await axios.post(
                `${this.baseUrl}/speak`,
                payload,
                { 
                    timeout: 30000,
                    validateStatus: (status) => status >= 200 && status < 300
                }
            );
            
            if (response.data.success) {
                console.log('✅ 语音合成完成');
            } else {
                console.warn('⚠️ 语音合成返回失败状态:', response.data.message);
            }
            
            return response.data;
        } catch (error) {
            let errorMessage = '语音合成失败';
            
            if (error.code === 'ETIMEDOUT') {
                errorMessage = '语音合成超时';
                console.error('❌ 语音合成超时');
            } else if (error.response) {
                errorMessage = `语音合成失败: ${error.response.status} ${error.response.data?.message || error.response.statusText}`;
                console.error('❌ 语音合成失败:', error.response.status, error.response.data);
            } else if (error.code === 'ECONNREFUSED') {
                errorMessage = 'PyLips服务连接被拒绝，请检查服务是否正常运行';
                console.error('❌ PyLips服务连接被拒绝');
                this.isConnected = false;
            } else {
                errorMessage = `语音合成网络错误: ${error.message}`;
                console.error('❌ 语音合成网络错误:', error.message);
            }
            
            return {
                success: false,
                message: errorMessage
            };
        }
    }

    /**
     * 设置面部表情
     */
    async setExpression(expression: 'happy' | 'sad' | 'surprised' | 'angry' | 'neutral', duration: number = 1000): Promise<PyLipsResponse> {
        try {
            // 检查服务可用性
            if (!this.isConnected && !(await this.isServiceAvailable())) {
                console.warn('⚠️ PyLips服务不可用，表情设置将被跳过');
                return {
                    success: false,
                    message: 'PyLips服务不可用，表情功能暂时无法使用'
                };
            }

            console.log('😊 正在设置表情:', expression);
            const response: AxiosResponse<PyLipsResponse> = await axios.post(
                `${this.baseUrl}/expression`,
                {
                    expression,
                    duration
                },
                { 
                    timeout: 10000,
                    validateStatus: (status) => status >= 200 && status < 300
                }
            );
            
            if (response.data.success) {
                console.log('✅ 表情设置完成');
            } else {
                console.warn('⚠️ 表情设置返回失败状态:', response.data.message);
            }
            
            return response.data;
        } catch (error) {
            let errorMessage = '设置表情失败';
            
            if (error.code === 'ETIMEDOUT') {
                errorMessage = '设置表情超时';
                console.error('❌ 设置表情超时');
            } else if (error.response) {
                errorMessage = `设置表情失败: ${error.response.status} ${error.response.data?.message || error.response.statusText}`;
                console.error('❌ 设置表情失败:', error.response.status, error.response.data);
            } else if (error.code === 'ECONNREFUSED') {
                errorMessage = 'PyLips服务连接被拒绝';
                console.error('❌ PyLips服务连接被拒绝');
                this.isConnected = false;
            } else {
                errorMessage = `设置表情网络错误: ${error.message}`;
                console.error('❌ 设置表情网络错误:', error.message);
            }
            
            return {
                success: false,
                message: errorMessage
            };
        }
    }

    /**
     * 控制注视方向
     */
    async look(x: number, y: number, z: number, duration: number = 1000): Promise<PyLipsResponse> {
        try {
            // 检查服务可用性
            if (!this.isConnected && !(await this.isServiceAvailable())) {
                console.warn('⚠️ PyLips服务不可用，注视控制将被跳过');
                return {
                    success: false,
                    message: 'PyLips服务不可用，注视功能暂时无法使用'
                };
            }

            console.log('👀 正在控制注视方向:', { x, y, z, duration });
            const response: AxiosResponse<PyLipsResponse> = await axios.post(
                `${this.baseUrl}/look`,
                {
                    x, y, z, duration
                },
                { 
                    timeout: 10000,
                    validateStatus: (status) => status >= 200 && status < 300
                }
            );
            
            if (response.data.success) {
                console.log('✅ 注视控制完成');
            } else {
                console.warn('⚠️ 注视控制返回失败状态:', response.data.message);
            }
            
            return response.data;
        } catch (error) {
            let errorMessage = '控制注视失败';
            
            if (error.code === 'ETIMEDOUT') {
                errorMessage = '控制注视超时';
                console.error('❌ 控制注视超时');
            } else if (error.response) {
                errorMessage = `控制注视失败: ${error.response.status} ${error.response.data?.message || error.response.statusText}`;
                console.error('❌ 控制注视失败:', error.response.status, error.response.data);
            } else if (error.code === 'ECONNREFUSED') {
                errorMessage = 'PyLips服务连接被拒绝';
                console.error('❌ PyLips服务连接被拒绝');
                this.isConnected = false;
            } else {
                errorMessage = `控制注视网络错误: ${error.message}`;
                console.error('❌ 控制注视网络错误:', error.message);
            }
            
            return {
                success: false,
                message: errorMessage
            };
        }
    }

    /**
     * 停止当前语音
     */
    async stopSpeech(): Promise<PyLipsResponse> {
        try {
            // 检查服务可用性
            if (!this.isConnected && !(await this.isServiceAvailable())) {
                console.warn('⚠️ PyLips服务不可用，停止语音将被跳过');
                return {
                    success: false,
                    message: 'PyLips服务不可用，停止语音功能暂时无法使用'
                };
            }

            console.log('🛑 正在停止语音播放...');
            const response: AxiosResponse<PyLipsResponse> = await axios.post(
                `${this.baseUrl}/stop-speech`,
                {},
                { 
                    timeout: 5000,
                    validateStatus: (status) => status >= 200 && status < 300
                }
            );
            
            if (response.data.success) {
                console.log('✅ 语音停止完成');
            } else {
                console.warn('⚠️ 停止语音返回失败状态:', response.data.message);
            }
            
            return response.data;
        } catch (error) {
            let errorMessage = '停止语音失败';
            
            if (error.code === 'ETIMEDOUT') {
                errorMessage = '停止语音超时';
                console.error('❌ 停止语音超时');
            } else if (error.response) {
                errorMessage = `停止语音失败: ${error.response.status} ${error.response.data?.message || error.response.statusText}`;
                console.error('❌ 停止语音失败:', error.response.status, error.response.data);
            } else if (error.code === 'ECONNREFUSED') {
                errorMessage = 'PyLips服务连接被拒绝';
                console.error('❌ PyLips服务连接被拒绝');
                this.isConnected = false;
            } else {
                errorMessage = `停止语音网络错误: ${error.message}`;
                console.error('❌ 停止语音网络错误:', error.message);
            }
            
            return {
                success: false,
                message: errorMessage
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
     * 获取可用语音包列表
     */
    async getVoices(ttsMethod: 'system' | 'polly' = 'system'): Promise<string[]> {
        try {
            // 检查服务可用性
            if (!this.isConnected && !(await this.isServiceAvailable())) {
                console.warn('⚠️ PyLips服务不可用，语音列表查询将被跳过');
                return [];
            }

            console.log(`🎤 正在获取${ttsMethod}语音包列表...`);
            const response: AxiosResponse<{success: boolean, voices: string[], tts_method: string}> = await axios.get(
                `${this.baseUrl}/voices`,
                { 
                    params: { tts_method: ttsMethod },
                    timeout: 10000,
                    validateStatus: (status) => status >= 200 && status < 300
                }
            );
            
            if (response.data.success) {
                console.log(`✅ ${ttsMethod}语音包列表获取成功，共${response.data.voices.length}个语音`);
                return response.data.voices;
            } else {
                console.warn('⚠️ 语音包列表获取返回失败状态');
                return [];
            }
        } catch (error) {
            if (error.code === 'ETIMEDOUT') {
                console.error('❌ 语音包列表查询超时');
            } else if (error.response) {
                console.error('❌ 语音包列表查询失败:', error.response.status, error.response.data);
            } else if (error.code === 'ECONNREFUSED') {
                console.warn('⚠️ PyLips服务连接被拒绝，服务可能未启动');
            } else {
                console.error('❌ 语音包列表查询出现未知错误:', error.message);
            }
            return [];
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
            const result = await this.speak(text, { wait });
            
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

    /**
     * 设置面孔外观
     */
    async setAppearance(appearanceConfig: any): Promise<PyLipsResponse> {
        try {
            if (!(await this.isServiceAvailable())) {
                console.warn('⚠️ PyLips服务不可用，外观设置将被跳过');
                return {
                    success: false,
                    message: 'PyLips服务不可用，外观功能暂时无法使用'
                };
            }

            console.log('🎨 正在设置面孔外观:', appearanceConfig);
            const response: AxiosResponse<PyLipsResponse> = await axios.post(
                `${this.baseUrl}/appearance`,
                appearanceConfig,
                { 
                    timeout: 10000,
                    validateStatus: (status) => status >= 200 && status < 300
                }
            );
            
            if (response.data.success) {
                console.log('✅ 面孔外观设置完成');
            } else {
                console.warn('⚠️ 面孔外观设置返回失败状态:', response.data.message);
            }
            
            return response.data;
        } catch (error) {
            let errorMessage = '设置面孔外观失败';
            
            if (error.code === 'ETIMEDOUT') {
                errorMessage = '设置面孔外观超时';
                console.error('❌ 设置面孔外观超时');
            } else if (error.response) {
                errorMessage = `设置面孔外观失败: ${error.response.status} ${error.response.data?.message || error.response.statusText}`;
                console.error('❌ 设置面孔外观失败:', error.response.status, error.response.data);
            } else if (error.code === 'ECONNREFUSED') {
                errorMessage = 'PyLips服务连接被拒绝';
                console.error('❌ PyLips服务连接被拒绝');
                this.isConnected = false;
            } else {
                errorMessage = `设置面孔外观网络错误: ${error.message}`;
                console.error('❌ 设置面孔外观网络错误:', error.message);
            }
            
            return {
                success: false,
                message: errorMessage
            };
        }
    }
}

export const pylipsService = new PyLipsService();