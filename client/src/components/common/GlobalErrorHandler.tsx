import React, { useEffect } from 'react';
import useErrorHandler from '../../hooks/useErrorHandler';
import networkMonitor from '../../utils/networkMonitor';

interface GlobalErrorHandlerProps {
    children: React.ReactNode;
}

const GlobalErrorHandler: React.FC<GlobalErrorHandlerProps> = ({ children }) => {
    const { handleError } = useErrorHandler();

    useEffect(() => {
        // 处理未捕获的Promise拒绝
        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            console.error('Unhandled promise rejection:', event.reason);
            
            // 防止默认的控制台错误输出
            event.preventDefault();
            
            // 使用全局错误处理器处理错误
            handleError(event.reason, {
                showSnackbar: true,
                logError: true,
                customMessage: '应用遇到了未处理的错误'
            });
        };

        // 处理未捕获的JavaScript错误
        const handleJSError = (event: ErrorEvent) => {
            console.error('Unhandled error:', event.error);
            
            // 使用全局错误处理器处理错误
            handleError(event.error || event.message, {
                showSnackbar: true,
                logError: true,
                customMessage: '页面遇到了JavaScript错误'
            });
        };

        // 处理资源加载错误
        const handleResourceError = (event: Event) => {
            const target = event.target as HTMLElement;
            if (target) {
                console.error('Resource loading error:', target);
                
                // 检查是否是关键资源
                const isScript = target.tagName === 'SCRIPT';
                const isStylesheet = target.tagName === 'LINK' && (target as HTMLLinkElement).rel === 'stylesheet';
                
                if (isScript || isStylesheet) {
                    handleError(new Error(`资源加载失败: ${(target as any).src || (target as any).href}`), {
                        showSnackbar: true,
                        logError: true,
                        customMessage: '页面资源加载失败，请刷新页面重试'
                    });
                }
            }
        };

        // 监听网络状态变化
        const removeNetworkListener = networkMonitor.addListener((status) => {
            if (!status.isOnline) {
                // 网络断开时的处理
                console.warn('Network disconnected');
            } else {
                // 网络恢复时的处理
                console.log('Network reconnected');
            }
        });

        // 添加事件监听器
        window.addEventListener('unhandledrejection', handleUnhandledRejection);
        window.addEventListener('error', handleJSError);
        window.addEventListener('error', handleResourceError, true); // 使用捕获阶段

        // 清理函数
        return () => {
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
            window.removeEventListener('error', handleJSError);
            window.removeEventListener('error', handleResourceError, true);
            removeNetworkListener();
        };
    }, [handleError]);

    // 监听React错误边界无法捕获的错误
    useEffect(() => {
        const originalConsoleError = console.error;
        
        console.error = (...args: any[]) => {
            // 检查是否是React错误
            const errorMessage = args[0];
            if (typeof errorMessage === 'string') {
                // 过滤掉一些已知的非关键错误
                const ignoredErrors = [
                    'ResizeObserver loop limit exceeded',
                    'Non-passive event listener',
                    'Warning: '
                ];
                
                const shouldIgnore = ignoredErrors.some(ignored => 
                    errorMessage.includes(ignored)
                );
                
                if (!shouldIgnore && errorMessage.includes('Error:')) {
                    // 这可能是一个需要处理的错误
                    handleError(new Error(errorMessage), {
                        showSnackbar: false, // 避免重复显示
                        logError: false, // 已经在控制台输出了
                        customMessage: undefined
                    });
                }
            }
            
            // 调用原始的console.error
            originalConsoleError.apply(console, args);
        };

        return () => {
            console.error = originalConsoleError;
        };
    }, [handleError]);

    return <>{children}</>;
};

export default GlobalErrorHandler;