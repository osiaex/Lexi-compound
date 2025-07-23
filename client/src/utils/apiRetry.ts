import { AxiosError, AxiosResponse } from 'axios';

interface RetryOptions {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    retryCondition?: (error: AxiosError) => boolean;
    onRetry?: (attempt: number, error: AxiosError) => void;
}

const defaultRetryOptions: Required<RetryOptions> = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    retryCondition: (error: AxiosError) => {
        // 重试条件：网络错误或5xx服务器错误
        return !error.response || 
               (error.response.status >= 500 && error.response.status < 600) ||
               error.code === 'ECONNABORTED' || // 超时
               error.code === 'ENOTFOUND' ||   // DNS错误
               error.code === 'ECONNREFUSED';  // 连接被拒绝
    },
    onRetry: (attempt: number, error: AxiosError) => {
        console.warn(`API请求重试 ${attempt}/${defaultRetryOptions.maxRetries}:`, error.message);
    }
};

/**
 * 带重试机制的API请求包装器
 * @param apiCall 要执行的API调用函数
 * @param options 重试选项
 * @returns Promise<AxiosResponse>
 */
export async function withRetry<T>(
    apiCall: () => Promise<AxiosResponse<T>>,
    options: RetryOptions = {}
): Promise<AxiosResponse<T>> {
    const config = { ...defaultRetryOptions, ...options };
    let lastError: AxiosError;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
        try {
            const result = await apiCall();
            
            // 如果这不是第一次尝试，说明之前失败过，现在成功了
            if (attempt > 0) {
                console.log(`✅ API请求在第${attempt + 1}次尝试后成功`);
            }
            
            return result;
        } catch (error) {
            lastError = error as AxiosError;
            
            // 如果这是最后一次尝试，或者不满足重试条件，直接抛出错误
            if (attempt === config.maxRetries || !config.retryCondition(lastError)) {
                throw lastError;
            }
            
            // 计算延迟时间（指数退避）
            const delay = Math.min(
                config.baseDelay * Math.pow(2, attempt),
                config.maxDelay
            );
            
            // 调用重试回调
            config.onRetry(attempt + 1, lastError);
            
            // 等待后重试
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError!;
}

/**
 * 创建一个带重试机制的API调用函数
 * @param apiCall 原始API调用函数
 * @param options 重试选项
 * @returns 包装后的API调用函数
 */
export function createRetryableApi<T extends any[], R>(
    apiCall: (...args: T) => Promise<AxiosResponse<R>>,
    options: RetryOptions = {}
) {
    return async (...args: T): Promise<AxiosResponse<R>> => {
        return withRetry(() => apiCall(...args), options);
    };
}

/**
 * 批量API请求，支持并发控制和失败重试
 * @param apiCalls API调用函数数组
 * @param options 配置选项
 * @returns Promise<AxiosResponse[]>
 */
export async function batchApiCalls<T>(
    apiCalls: (() => Promise<AxiosResponse<T>>)[],
    options: {
        concurrency?: number;
        retryOptions?: RetryOptions;
        failFast?: boolean;
    } = {}
): Promise<AxiosResponse<T>[]> {
    const {
        concurrency = 3,
        retryOptions = {},
        failFast = false
    } = options;

    const results: AxiosResponse<T>[] = [];
    const errors: (Error | AxiosError)[] = [];

    // 定义批次结果的类型
    interface SuccessResult {
        success: true;
        result: AxiosResponse<T>;
        index: number;
    }
    
    interface ErrorResult {
        success: false;
        error: Error | AxiosError;
        index: number;
    }
    
    type BatchResult = SuccessResult | ErrorResult;

    // 分批处理API调用
    for (let i = 0; i < apiCalls.length; i += concurrency) {
        const batch = apiCalls.slice(i, i + concurrency);
        
        const batchPromises = batch.map(async (apiCall, index): Promise<BatchResult> => {
            try {
                const result = await withRetry(apiCall, retryOptions);
                return { success: true, result, index: i + index } as SuccessResult;
            } catch (error) {
                const errorResult: ErrorResult = { 
                    success: false, 
                    error: error as Error | AxiosError, 
                    index: i + index 
                };
                
                if (failFast) {
                    throw error;
                }
                
                return errorResult;
            }
        });

        const batchResults = await Promise.all(batchPromises);
        
        // 处理批次结果
        for (const batchResult of batchResults) {
            if (batchResult.success) {
                results[batchResult.index] = batchResult.result;
            } else {
                errors[batchResult.index] = (batchResult as ErrorResult).error;
            }
        }
    }

    // 如果有错误且不是failFast模式，记录错误但不抛出
    if (errors.length > 0 && !failFast) {
        console.warn(`批量API请求完成，${errors.length}个请求失败:`, errors.filter(Boolean));
    }

    return results.filter(Boolean); // 过滤掉undefined的结果
}

/**
 * 检查API响应是否表示临时错误（可重试）
 * @param error AxiosError对象
 * @returns boolean
 */
export function isTemporaryError(error: AxiosError): boolean {
    // 网络错误
    if (!error.response) {
        return true;
    }

    // HTTP状态码检查
    const status = error.response.status;
    const temporaryStatusCodes = [
        408, // Request Timeout
        429, // Too Many Requests
        500, // Internal Server Error
        502, // Bad Gateway
        503, // Service Unavailable
        504, // Gateway Timeout
        507, // Insufficient Storage
        509, // Bandwidth Limit Exceeded
        510  // Not Extended
    ];

    return temporaryStatusCodes.includes(status);
}

/**
 * 创建一个智能重试条件函数
 * @param customConditions 自定义重试条件
 * @returns 重试条件函数
 */
export function createRetryCondition(
    customConditions: ((error: AxiosError) => boolean)[] = []
): (error: AxiosError) => boolean {
    return (error: AxiosError) => {
        // 默认条件：临时错误
        if (isTemporaryError(error)) {
            return true;
        }

        // 检查自定义条件
        return customConditions.some(condition => condition(error));
    };
}