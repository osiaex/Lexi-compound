import axios from 'axios';

const axiosInstance = axios.create({
    baseURL: process.env.REACT_APP_API_URL,
    withCredentials: true,
});

// 请求拦截器
axiosInstance.interceptors.request.use(
    (config) => {
        return config;
    },
    (error) => {
        console.error('Request error:', error);
        return Promise.reject(error);
    }
);

// 响应拦截器
axiosInstance.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        console.error('Response error:', error);
        
        // 处理网络错误
        if (!error.response) {
            console.error('Network error: Unable to connect to server');
            // 可以在这里添加全局错误提示
        } else {
            // 处理HTTP错误状态码
            const { status, data } = error.response;
            console.error(`HTTP ${status}:`, data?.message || 'Unknown error');
            
            // 处理特定错误状态码
            switch (status) {
                case 401:
                    // 未授权，可能需要重新登录
                    console.warn('Unauthorized access - consider redirecting to login');
                    break;
                case 403:
                    console.warn('Forbidden access');
                    break;
                case 500:
                    console.error('Internal server error');
                    break;
                default:
                    break;
            }
        }
        
        return Promise.reject(error);
    }
);

export default axiosInstance;
