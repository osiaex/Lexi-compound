// MongoDbProvider.ts

import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

class MongoDbProvider {
    constructor() {
        console.log('Create MongoDbProvider');
    }

    private initializeConnection() {
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
                
                // 监听连接事件
                mongoose.connection.on('error', (error) => {
                    console.error('❌ MongoDB connection error:', error);
                });
                
                mongoose.connection.on('disconnected', () => {
                    console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
                });
                
                mongoose.connection.on('reconnected', () => {
                    console.log('✅ MongoDB reconnected successfully');
                });
                
            } catch (error) {
                console.error(`❌ MongoDB connection attempt ${retryCount + 1} failed:`, error.message);
                
                if (retryCount < maxRetries) {
                    console.log(`⏳ Retrying connection in ${retryDelay / 1000} seconds...`);
                    setTimeout(() => connectWithRetry(retryCount + 1), retryDelay);
                } else {
                    console.error('💥 Failed to connect to MongoDB after maximum retries');
                    throw new Error('Failed to connect to MongoDB after maximum retries');
                }
            }
        };
        
        connectWithRetry();
    }

    public initialize() {
        this.initializeConnection();
    }

    public getModel<T>(modelName: string, schema: mongoose.Schema<T>): mongoose.Model<T> {
        if (mongoose.models[modelName]) {
            return mongoose.model<T>(modelName);
        }
        return mongoose.model<T>(modelName, schema);
    }
}

export const mongoDbProvider = new MongoDbProvider();
