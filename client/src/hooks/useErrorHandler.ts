import { useCallback } from 'react';
import { AxiosError } from 'axios';
import { useSnackbar } from '../contexts/SnackbarProvider';
import { useNavigate } from 'react-router-dom';

interface ErrorHandlerOptions {
    showSnackbar?: boolean;
    redirectOnAuth?: boolean;
    logError?: boolean;
    customMessage?: string;
}

interface ErrorInfo {
    message: string;
    code?: string | number;
    status?: number;
    isNetworkError: boolean;
    isAuthError: boolean;
    isServerError: boolean;
    isClientError: boolean;
    originalError: Error;
}

const useErrorHandler = () => {
    const { openSnackbar } = useSnackbar();
    const navigate = useNavigate();

    const parseError = useCallback((error: unknown): ErrorInfo => {
        let message = '发生了未知错误';
        let code: string | number | undefined;
        let status: number | undefined;
        let isNetworkError = false;
        let isAuthError = false;
        let isServerError = false;
        let isClientError = false;
        let originalError: Error;

        if (error instanceof AxiosError) {
            originalError = error;
            status = error.response?.status;
            code = error.code;

            // 网络错误
            if (!error.response) {
                isNetworkError = true;
                if (error.code === 'ECONNABORTED') {
                    message = '请求超时，请检查网络连接';
                } else if (error.code === 'ENOTFOUND') {
                    message = '无法连接到服务器，请检查网络设置';
                } else if (error.code === 'ECONNREFUSED') {
                    message = '服务器拒绝连接，请稍后重试';
                } else {
                    message = '网络连接失败，请检查网络状态';
                }
            } else {
                // HTTP错误
                status = error.response.status;
                
                if (status >= 400 && status < 500) {
                    isClientError = true;
                    
                    switch (status) {
                        case 400:
                            message = '请求参数错误';
                            break;
                        case 401:
                            isAuthError = true;
                            message = '身份验证失败，请重新登录';
                            break;
                        case 403:
                            isAuthError = true;
                            message = '权限不足，无法访问此资源';
                            break;
                        case 404:
                            message = '请求的资源不存在';
                            break;
                        case 409:
                            message = '数据冲突，请刷新后重试';
                            break;
                        case 422:
                            message = '数据验证失败';
                            break;
                        case 429:
                            message = '请求过于频繁，请稍后重试';
                            break;
                        default:
                            message = `客户端错误 (${status})`;
                    }
                } else if (status >= 500) {
                    isServerError = true;
                    
                    switch (status) {
                        case 500:
                            message = '服务器内部错误';
                            break;
                        case 502:
                            message = '网关错误，服务暂时不可用';
                            break;
                        case 503:
                            message = '服务暂时不可用，请稍后重试';
                            break;
                        case 504:
                            message = '网关超时，请稍后重试';
                            break;
                        default:
                            message = `服务器错误 (${status})`;
                    }
                }

                // 尝试从响应中获取更详细的错误信息
                const responseData = error.response.data;
                if (responseData) {
                    if (typeof responseData === 'string') {
                        message = responseData;
                    } else if (responseData.message) {
                        message = responseData.message;
                    } else if (responseData.error) {
                        message = responseData.error;
                    }
                }
            }
        } else if (error instanceof Error) {
            originalError = error;
            message = error.message;
            
            // 检查是否是特定类型的错误
            if (error.name === 'ChunkLoadError' || message.includes('Loading chunk')) {
                message = '页面资源加载失败，请刷新页面重试';
            } else if (error.name === 'TypeError' && message.includes('fetch')) {
                isNetworkError = true;
                message = '网络请求失败，请检查网络连接';
            }
        } else if (typeof error === 'string') {
            originalError = new Error(error);
            message = error;
        } else {
            originalError = new Error('Unknown error');
            message = '发生了未知错误';
        }

        return {
            message,
            code,
            status,
            isNetworkError,
            isAuthError,
            isServerError,
            isClientError,
            originalError
        };
    }, []);

    const handleError = useCallback((error: unknown, options: ErrorHandlerOptions = {}) => {
        const {
            showSnackbar = true,
            redirectOnAuth = true,
            logError = true,
            customMessage
        } = options;

        const errorInfo = parseError(error);

        // 记录错误
        if (logError) {
            console.error('Error handled:', {
                ...errorInfo,
                timestamp: new Date().toISOString(),
                url: window.location.href
            });
        }

        // 显示错误消息
        if (showSnackbar) {
            const message = customMessage || errorInfo.message;
            
            if (errorInfo.isAuthError) {
                openSnackbar(message, 'error');
            } else if (errorInfo.isNetworkError) {
                openSnackbar(message, 'warning');
            } else if (errorInfo.isServerError) {
                openSnackbar(message, 'error');
            } else {
                openSnackbar(message, 'error');
            }
        }

        // 处理认证错误
        if (errorInfo.isAuthError && redirectOnAuth) {
            // 延迟跳转，让用户看到错误消息
            setTimeout(() => {
                if (errorInfo.status === 401) {
                    navigate('/login');
                } else if (errorInfo.status === 403) {
                    navigate('/unauthorized');
                }
            }, 2000);
        }

        return errorInfo;
    }, [parseError, openSnackbar, navigate]);

    const createErrorHandler = useCallback((options: ErrorHandlerOptions = {}) => {
        return (error: unknown) => handleError(error, options);
    }, [handleError]);

    const handleAsyncError = useCallback(async <T>(
        asyncFn: () => Promise<T>,
        options: ErrorHandlerOptions = {}
    ): Promise<T | null> => {
        try {
            return await asyncFn();
        } catch (error) {
            handleError(error, options);
            return null;
        }
    }, [handleError]);

    const withErrorHandling = useCallback(<T extends any[], R>(
        fn: (...args: T) => Promise<R>,
        options: ErrorHandlerOptions = {}
    ) => {
        return async (...args: T): Promise<R | null> => {
            try {
                return await fn(...args);
            } catch (error) {
                handleError(error, options);
                return null;
            }
        };
    }, [handleError]);

    return {
        handleError,
        parseError,
        createErrorHandler,
        handleAsyncError,
        withErrorHandling
    };
};

export default useErrorHandler;
export type { ErrorInfo, ErrorHandlerOptions };