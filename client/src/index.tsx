import { ThemeProvider } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import store from './DAL/redux/store';
import theme from './Theme';
import App from './app/App';
import { SnackbarProvider } from './contexts/SnackbarProvider';
import ErrorBoundary from './components/common/ErrorBoundary';
import './index.css';

// 抑制 ResizeObserver 错误 - 这是开发环境中的无害警告
const originalError = console.error;
console.error = (...args) => {
    if (args[0]?.includes?.('ResizeObserver loop completed with undelivered notifications')) {
        return;
    }
    originalError(...args);
};

// 全局错误处理器
window.addEventListener('error', (event) => {
    if (event.message.includes('ResizeObserver loop completed with undelivered notifications')) {
        event.preventDefault();
        return;
    }
});

// 处理未捕获的Promise拒绝
window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.message?.includes('ResizeObserver loop completed with undelivered notifications')) {
        event.preventDefault();
        return;
    }
});

// 抑制ResizeObserver错误的更完善方法
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// 如果ResizeObserver可用，包装它以防止错误
if (typeof ResizeObserver !== 'undefined') {
    const OriginalResizeObserver = window.ResizeObserver;
    window.ResizeObserver = class extends OriginalResizeObserver {
        constructor(callback) {
            const debouncedCallback = debounce(callback, 10);
            super(debouncedCallback);
        }
    };
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <ErrorBoundary>
        <ThemeProvider theme={theme}>
            <Provider store={store}>
                <SnackbarProvider>
                    <CssBaseline />
                    <App />
                </SnackbarProvider>
            </Provider>
        </ThemeProvider>
    </ErrorBoundary>,
);
