import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { usersService } from '../services/users.service';

interface CustomJwtPayload extends JwtPayload {
    id: string;
}

interface AuthenticatedRequest extends Request {
    user?: any;
    userId?: string;
}

export const authenticateToken = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        // 从cookie中获取token
        const token = req.cookies?.token;
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        // 验证token
        if (!process.env.JWT_SECRET_KEY) {
            console.error('JWT_SECRET_KEY environment variable is not set');
            return res.status(500).json({
                success: false,
                message: 'Server configuration error.'
            });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY) as CustomJwtPayload;
        
        if (!decoded || !decoded.id) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token.'
            });
        }

        // 获取用户信息
        try {
            const { user, newToken } = await usersService.getActiveUser(token);
            req.user = user;
            req.userId = user._id.toString();
            
            // 更新token
            res.cookie('token', newToken, {
                httpOnly: true,
                sameSite: 'none',
                secure: process.env.NODE_ENV === 'production'
            });
            
            next();
        } catch (userError) {
            return res.status(401).json({
                success: false,
                message: 'User not found or token expired.'
            });
        }
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(401).json({
            success: false,
            message: 'Invalid token.'
        });
    }
};
