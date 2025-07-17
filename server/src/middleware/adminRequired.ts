import { Request, Response, NextFunction } from 'express';

interface AuthenticatedRequest extends Request {
    user?: any;
    userId?: string;
}

export const adminRequired = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        // 检查用户是否存在（应该通过authenticateToken中间件设置）
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.'
            });
        }

        // 检查用户是否是管理员
        if (!req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Admin privileges required.'
            });
        }

        next();
    } catch (error) {
        console.error('Admin check error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error.'
        });
    }
};
