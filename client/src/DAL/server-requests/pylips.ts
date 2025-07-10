import { ApiPaths } from '../constants';
import axiosInstance from './AxiosInstance';

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

/**
 * 检查PyLips服务健康状态
 */
export const checkPyLipsHealth = async (): Promise<PyLipsResponse> => {
    try {
        const response = await axiosInstance.get('/pylips/health');
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * 获取PyLips服务状态
 */
export const getPyLipsStatus = async (): Promise<PyLipsStatus> => {
    try {
        const response = await axiosInstance.get('/pylips/status');
        return response.data.data;
    } catch (error) {
        throw error;
    }
};

/**
 * 启动PyLips服务
 */
export const startPyLipsService = async (config?: PyLipsConfig): Promise<PyLipsResponse> => {
    try {
        const response = await axiosInstance.post('/pylips/start', config || {});
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * 停止PyLips服务
 */
export const stopPyLipsService = async (): Promise<PyLipsResponse> => {
    try {
        const response = await axiosInstance.post('/pylips/stop');
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * 播放语音
 */
export const speakText = async (text: string, wait: boolean = false): Promise<PyLipsResponse> => {
    try {
        const response = await axiosInstance.post('/pylips/speak', { text, wait });
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * 智能语音播放（带表情）
 */
export const speakWithExpression = async (text: string, wait: boolean = false): Promise<PyLipsResponse> => {
    try {
        const response = await axiosInstance.post('/pylips/speak-with-expression', { text, wait });
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * 停止语音播放
 */
export const stopSpeech = async (): Promise<PyLipsResponse> => {
    try {
        const response = await axiosInstance.post('/pylips/stop-speech');
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * 设置面部表情
 */
export const setExpression = async (
    expression: 'happy' | 'sad' | 'surprised' | 'angry' | 'neutral',
    duration: number = 1000
): Promise<PyLipsResponse> => {
    try {
        const response = await axiosInstance.post('/pylips/expression', { expression, duration });
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * 控制注视方向
 */
export const lookAt = async (
    x: number, 
    y: number, 
    z: number, 
    duration: number = 1000
): Promise<PyLipsResponse> => {
    try {
        const response = await axiosInstance.post('/pylips/look', { x, y, z, duration });
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * 更新PyLips配置
 */
export const updatePyLipsConfig = async (config: PyLipsConfig): Promise<PyLipsResponse> => {
    try {
        const response = await axiosInstance.post('/pylips/config', config);
        return response.data;
    } catch (error) {
        throw error;
    }
}; 