import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { usersService } from '../services/users.service';

interface AuthRequest extends Request {
    user?: any;
}

// 验证用户是否已登录
export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: 'Access token required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        const user = await usersService.getUserById(decoded.id);
        
        if (!user) {
            return res.status(401).json({ message: 'Invalid token' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({ message: 'Invalid token' });
    }
};

// 验证用户是否为管理员
export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        if (!req.user.isAdmin) {
            return res.status(403).json({ message: 'Admin access required' });
        }

        next();
    } catch (error) {
        console.error('Admin middleware error:', error);
        return res.status(500).json({ message: 'Authorization check failed' });
    }
}; 