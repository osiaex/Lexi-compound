import axios, { AxiosError, AxiosRequestConfig } from 'axios';

// 扩展AxiosRequestConfig类型以包含metadata
declare module 'axios' {
    interface AxiosRequestConfig {
        metadata?: {
            startTime: Date;
        };
        __retryCount?: number;
        retryConfig?: Partial<RetryConfig>;
    }
}

// 重试配置
interface RetryConfig {
    retries: number;
    retryDelay: number;
    retryCondition?: (error: AxiosError) => boolean;
}

const defaultRetryConfig: RetryConfig = {
    retries: 3,
    retryDelay: 1000,
    retryCondition: (error: AxiosError) => {
        // 只对网络错误和5xx错误进行重试
        return !error.response || (error.response.status >= 500 && error.response.status < 600);
    }
};

const axiosInstance = axios.create({
    baseURL: process.env.REACT_APP_API_URL,
    withCredentials: true,
    timeout: 30000, // 30秒超时
});

// 重试逻辑
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const shouldRetry = (error: AxiosError, config: any): boolean => {
    const retryConfig = { ...defaultRetryConfig, ...config.retryConfig };
    const currentRetryCount = config.__retryCount || 0;
    
    return currentRetryCount < retryConfig.retries && 
           (!retryConfig.retryCondition || retryConfig.retryCondition(error));
};

// 请求拦截器
axiosInstance.interceptors.request.use(
    (config) => {
        // 添加请求时间戳用于调试
        config.metadata = { startTime: new Date() };
        return config;
    },
    (error) => {
        console.error('Request error:', error);
        return Promise.reject(error);
    }
);

// 响应拦截器 - 增强错误处理和重试机制
axiosInstance.interceptors.response.use(
    (response) => {
        // 记录请求耗时
        if (response.config.metadata?.startTime) {
            const duration = new Date().getTime() - response.config.metadata.startTime.getTime();
            console.log(`✅ API请求成功: ${response.config.method?.toUpperCase()} ${response.config.url} (${duration}ms)`);
        }
        return response;
    },
    async (error: AxiosError) => {
        const config = error.config as any;
        const duration = config?.metadata?.startTime ? new Date().getTime() - config.metadata.startTime.getTime() : 0;
        
        console.error(`❌ API请求失败: ${config?.method?.toUpperCase()} ${config?.url} (${duration}ms)`, error.message);
        
        // 检查是否应该重试
        if (shouldRetry(error, config)) {
            config.__retryCount = (config.__retryCount || 0) + 1;
            const retryConfig = { ...defaultRetryConfig, ...config.retryConfig };
            
            const delay = retryConfig.retryDelay * config.__retryCount;
            console.warn(`🔄 重试API请求 ${config.__retryCount}/${retryConfig.retries}: ${config.url} (延迟${delay}ms)`);
            
            // 等待重试延迟
            await sleep(delay);
            
            // 重置开始时间
            config.metadata = { startTime: new Date() };
            
            // 重新发送请求
            return axiosInstance(config);
        }
        
        // 添加请求持续时间和重试次数到错误对象
        (error as any).duration = duration;
        (error as any).retryCount = config?.__retryCount || 0;
        (error as any).requestUrl = config?.url;
        (error as any).requestMethod = config?.method;
        
        console.error('Response error:', error);
        
        // 处理网络错误
        if (!error.response) {
            console.error('Network error: Unable to connect to server');
            // 可以在这里添加全局错误提示
        } else {
            // 处理HTTP错误状态码
            const { status, data } = error.response;
            console.error(`HTTP ${status}:`, (data as any)?.message || 'Unknown error');
            
            // 处理特定错误状态码
            switch (status) {
                case 401:
                    // 未授权，可能需要重新登录
                    console.warn('🔐 身份验证失败，可能需要重新登录');
                    break;
                case 403:
                    console.warn('🚫 权限不足');
                    break;
                case 404:
                    console.warn('请求的资源不存在');
                    break;
                case 429:
                    console.warn('⏰ 请求频率限制');
                    break;
                case 500:
                    console.error('🔥 服务器内部错误');
                    break;
                case 502:
                case 503:
                case 504:
                    console.error('🚧 服务不可用');
                    break;
                default:
                    break;
            }
        }
        
        // 直接抛出原始AxiosError，让全局错误处理器处理
        return Promise.reject(error);
    }
);

export default axiosInstance;
