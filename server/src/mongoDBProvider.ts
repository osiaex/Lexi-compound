// MongoDbProvider.ts

import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

class MongoDbProvider {
    private isConnected: boolean = false;
    private connectionPromise: Promise<void> | null = null;
    
    constructor() {
        console.log('Create MongoDbProvider');
    }

    private async initializeConnection(): Promise<void> {
        console.log('Connecting to MongoDB...');
        
        // 验证必需的环境变量
        const requiredEnvVars = ['MONGODB_URL', 'MONGODB_DB_NAME', 'MONGODB_USER', 'MONGODB_PASSWORD'];
        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
        
        if (missingVars.length > 0) {
            console.error('Missing required environment variables:', missingVars.join(', '));
            throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
        }
        
        const connectWithRetry = async (retryCount = 0) => {
            const maxRetries = 5;
            const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 30000); // 指数退避，最大30秒
            
            try {
                await mongoose.connect(`${process.env.MONGODB_URL}/${process.env.MONGODB_DB_NAME}`, {
                    ssl: true,
                    auth: {
                        username: process.env.MONGODB_USER,
                        password: process.env.MONGODB_PASSWORD,
                    },
                    retryWrites: true,
                    w: 'majority',
                    serverSelectionTimeoutMS: 10000, // 10秒超时
                    socketTimeoutMS: 45000, // 45秒socket超时
                    maxPoolSize: 10, // 连接池大小
                });
                
                console.log('✅ Successfully connected to MongoDB');
                this.isConnected = true;
                
                // 监听连接事件
                mongoose.connection.on('error', (error) => {
                    console.error('❌ MongoDB connection error:', error);
                    this.isConnected = false;
                    // 如果是网络错误，尝试重连
                    if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
                        console.log('🔄 Network error detected, will attempt reconnection...');
                    }
                });
                
                mongoose.connection.on('disconnected', () => {
                    console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
                    this.isConnected = false;
                });
                
                mongoose.connection.on('reconnected', () => {
                    console.log('✅ MongoDB reconnected successfully');
                    this.isConnected = true;
                });
                
                mongoose.connection.on('connecting', () => {
                    console.log('🔄 MongoDB connecting...');
                });
                
                mongoose.connection.on('close', () => {
                    console.warn('⚠️ MongoDB connection closed');
                    this.isConnected = false;
                });
                
            } catch (error) {
                console.error(`❌ MongoDB connection attempt ${retryCount + 1} failed:`, error.message);
                
                if (retryCount < maxRetries) {
                    console.log(`⏳ Retrying connection in ${retryDelay / 1000} seconds...`);
                    setTimeout(() => connectWithRetry(retryCount + 1), retryDelay);
                } else {
                    console.error('💥 Failed to connect to MongoDB after maximum retries');
                    console.error('⚠️ Application will continue without database connection');
                    this.isConnected = false;
                    // 不抛出错误，允许应用程序继续运行
                }
            }
        };
        
        await connectWithRetry();
    }

    public initialize() {
        if (!this.connectionPromise) {
            this.connectionPromise = this.initializeConnection();
        }
        return this.connectionPromise;
    }
    
    public isConnectionReady(): boolean {
        return this.isConnected && mongoose.connection.readyState === 1;
    }
    
    public async waitForConnection(timeoutMs: number = 10000): Promise<boolean> {
        const startTime = Date.now();
        
        while (!this.isConnectionReady() && (Date.now() - startTime) < timeoutMs) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        return this.isConnectionReady();
    }

    public getModel<T>(modelName: string, schema: mongoose.Schema<T>): mongoose.Model<T> {
        if (!this.isConnectionReady()) {
            console.warn(`⚠️ Attempting to get model '${modelName}' without active database connection`);
        }
        
        if (mongoose.models[modelName]) {
            return mongoose.model<T>(modelName);
        }
        return mongoose.model<T>(modelName, schema);
    }
}

export const mongoDbProvider = new MongoDbProvider();
