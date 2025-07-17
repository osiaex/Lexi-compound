import axiosInstance from './AxiosInstance';

export interface WhisperConfig {
    enabled: boolean;
    modelSize: 'tiny' | 'small';
    language: 'zh' | 'en' | 'auto';
    temperature: number;
    maxFileSize: number;
    maxDuration: number;
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
    audioInfo?: {
        duration: number;
        format: string;
        sampleRate: number;
        channels: number;
        bitRate: number;
        size: number;
    };
}

export interface WhisperSystemInfo {
    pythonAvailable: boolean;
    modelsAvailable: {
        tiny: boolean;
        small: boolean;
    };
    tempDirWritable: boolean;
}

/**
 * 获取实验的 Whisper 配置
 */
export const getWhisperConfig = async (experimentId: string): Promise<WhisperConfig> => {
    const response = await axiosInstance.get(`/whisper/config/${experimentId}`);
    return response.data.data;
};

/**
 * 更新实验的 Whisper 配置（仅管理员）
 */
export const updateWhisperConfig = async (
    experimentId: string,
    config: WhisperConfig
): Promise<void> => {
    await axiosInstance.put(`/whisper/config/${experimentId}`, {
        whisperSettings: config
    });
};

/**
 * 转录音频文件
 */
export const transcribeAudio = async (
    experimentId: string,
    audioFile: File
): Promise<TranscriptionResult> => {
    const formData = new FormData();
    formData.append('audio', audioFile);

    const response = await axiosInstance.post(`/whisper/transcribe/${experimentId}`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });

    return response.data.data;
};

/**
 * 获取系统信息（仅管理员）
 */
export const getWhisperSystemInfo = async (): Promise<WhisperSystemInfo> => {
    const response = await axiosInstance.get('/whisper/system-info');
    return response.data.data;
};

/**
 * 测试音频文件（仅管理员）
 */
export const testAudioFile = async (audioFile: File): Promise<{
    audioInfo: {
        duration: number;
        format: string;
        sampleRate: number;
        channels: number;
        bitRate: number;
        size: number;
    };
    qualityCheck: {
        isValid: boolean;
        issues: string[];
        recommendations: string[];
    };
}> => {
    const formData = new FormData();
    formData.append('audio', audioFile);

    const response = await axiosInstance.post('/whisper/test-audio', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });

    return response.data.data;
}; 