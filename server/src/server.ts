import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { mongoDbProvider } from './mongoDBProvider';
import { agentsRouter } from './routers/agentsRouter.router';
import { conversationsRouter } from './routers/conversationsRouter.router';
import { dataAggregationRouter } from './routers/dataAggregationRouter.router';
import { experimentsRouter } from './routers/experimentsRouter.router';
import { formsRouter } from './routers/formsRouter';
import { usersRouter } from './routers/usersRouter.router';
import { pylipsRouter } from './routers/pylipsRouter.router';
import { whisperRouter } from './routers/whisperRouter.router';
import { usersService } from './services/users.service';

dotenv.config();

const createAdminUser = async (username: string, password: string) => {
    if (!username || !password) {
        console.warn('Username and password are required');
        process.exit(1);
    }

    try {
        // 等待数据库连接
        await mongoDbProvider.initialize();
        const isConnected = await mongoDbProvider.waitForConnection(15000);
        
        if (!isConnected) {
            console.error('Failed to connect to database for user creation');
            process.exit(1);
        }
        
        await usersService.createAdminUser(username, password);
        console.log('Admin user created successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error creating admin user:', error);
        process.exit(1);
    }
};

const setupServer = async () => {
    const app = express();
    app.use(bodyParser.json());
    const corsOptions = {
        origin: process.env.FRONTEND_URL,
        credentials: true,
    };
    app.use(cors(corsOptions));
    app.use(cookieParser());

    const PORT = process.env.PORT || 5000;
    
    // 健康检查端点，包含数据库状态
    app.use('/health', (req, res) => {
        const dbStatus = mongoDbProvider.isConnectionReady() ? 'connected' : 'disconnected';
        res.status(200).json({ 
            status: 'OK', 
            database: dbStatus,
            timestamp: new Date().toISOString()
        });
    });
    
    app.use('/conversations', conversationsRouter());
    app.use('/experiments', experimentsRouter());
    app.use('/users', usersRouter());
    app.use('/agents', agentsRouter());
    app.use('/dataAggregation', dataAggregationRouter());
    app.use('/forms', formsRouter());
    app.use('/pylips', pylipsRouter());
    app.use('/whisper', whisperRouter());

    app.listen(PORT, () => {
        console.log(`Server started on http://localhost:${PORT}`);
        console.log(`Database status: ${mongoDbProvider.isConnectionReady() ? 'Connected' : 'Disconnected'}`);
    });
    
    // 初始化数据库连接（非阻塞）
    mongoDbProvider.initialize().catch(error => {
        console.error('Database initialization failed:', error);
    });
};

if (process.argv[2] === 'create-user') {
    const [, , , username, password] = process.argv;
    createAdminUser(username, password);
} else {
    setupServer().catch(error => {
        console.error('Failed to start server:', error);
        process.exit(1);
    });
}
