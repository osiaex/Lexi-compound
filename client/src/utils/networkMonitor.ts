interface NetworkStatus {
    isOnline: boolean;
    connectionSpeed: 'fast' | 'slow' | 'offline';
    lastChecked: Date;
    rtt?: number; // Round Trip Time in milliseconds
}

type NetworkStatusListener = (status: NetworkStatus) => void;

class NetworkMonitor {
    private status: NetworkStatus;
    private listeners: NetworkStatusListener[] = [];
    private pingInterval: NodeJS.Timeout | null = null;
    private isInitialized = false;
    private readonly PING_INTERVAL = 30000; // 30 seconds
    private readonly PING_TIMEOUT = 5000; // 5 seconds

    constructor() {
        this.status = {
            isOnline: navigator.onLine,
            connectionSpeed: 'fast',
            lastChecked: new Date()
        };
    }

    public initialize(): void {
        if (this.isInitialized) return;
        
        this.setupEventListeners();
        this.startPingTest();
        this.isInitialized = true;
    }

    private setupEventListeners(): void {
        window.addEventListener('online', this.handleOnline.bind(this));
        window.addEventListener('offline', this.handleOffline.bind(this));
    }

    private removeEventListeners(): void {
        window.removeEventListener('online', this.handleOnline.bind(this));
        window.removeEventListener('offline', this.handleOffline.bind(this));
    }

    private handleOnline(): void {
        this.updateStatus({
            isOnline: true,
            connectionSpeed: 'fast',
            lastChecked: new Date()
        });
        
        this.startPingTest();
    }

    private handleOffline(): void {
        this.updateStatus({
            isOnline: false,
            connectionSpeed: 'offline',
            lastChecked: new Date()
        });
        
        this.stopPingTest();
    }

    private startPingTest(): void {
        if (this.pingInterval) return;
        
        this.pingInterval = setInterval(() => {
            this.checkConnectionSpeed();
        }, this.PING_INTERVAL);
        
        // 立即执行一次检测
        this.checkConnectionSpeed();
    }

    private stopPingTest(): void {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    private async checkConnectionSpeed(): Promise<void> {
        if (!this.status.isOnline) return;

        try {
            const startTime = Date.now();
            const response = await fetch('/api/ping', {
                method: 'HEAD',
                cache: 'no-cache',
                signal: AbortSignal.timeout(this.PING_TIMEOUT)
            });
            
            const endTime = Date.now();
            const rtt = endTime - startTime;
            const previousSpeed = this.status.connectionSpeed;
            const newSpeed = rtt > 3000 ? 'slow' : 'fast';
            
            this.updateStatus({
                ...this.status,
                connectionSpeed: newSpeed,
                lastChecked: new Date(),
                rtt
            });
            
        } catch (error) {
            console.warn('Network ping failed:', error);
            // 保持当前状态，可能是临时问题
        }
    }

    private updateStatus(newStatus: NetworkStatus): void {
        const oldStatus = { ...this.status };
        this.status = newStatus;
        
        // 通知所有监听器
        this.listeners.forEach(listener => {
            try {
                listener(this.status);
            } catch (error) {
                console.error('Error in network status listener:', error);
            }
        });
    }

    public addListener(listener: NetworkStatusListener): () => void {
        this.listeners.push(listener);
        
        // 立即调用一次监听器，提供当前状态
        listener(this.status);
        
        // 返回移除监听器的函数
        return () => {
            const index = this.listeners.indexOf(listener);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }

    public removeListener(listener: NetworkStatusListener): void {
        const index = this.listeners.indexOf(listener);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }

    public getStatus(): NetworkStatus {
        return { ...this.status };
    }

    public destroy(): void {
        this.removeEventListeners();
        this.stopPingTest();
        this.listeners = [];
        this.isInitialized = false;
    }
}

// 创建全局网络监控实例
const networkMonitor = new NetworkMonitor();

// 在应用启动时初始化
if (typeof window !== 'undefined') {
    networkMonitor.initialize();
}

export default networkMonitor;
export { NetworkMonitor };
export type { NetworkStatus, NetworkStatusListener };