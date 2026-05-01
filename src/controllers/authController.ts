import bcrypt from 'bcrypt';
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import User from '../database/models/User';
import { AppError } from '../middlewares/errorHandler';
import { IDecodedToken } from '../types';
import Role from '../database/models/Role';
import Permission from '../database/models/Permission';
import RefreshToken from '../database/models/RefreshToken';
import sequelize from '../database/sequelize';

const generateToken = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        // Credentials checking
        const user = await User.findOne({
            attributes: { include: ['password'] },
            where: {
                email: req.body.email
            }
        });
        if (!user) throw new AppError('User not found', 401);

        const match = await bcrypt.compare(req.body.password, user.password);
        if (!match) throw new AppError('Invalid email or password', 401);

        // Generating of refresh and access tokens
        const jti = uuidv4();

        const accessToken = jwt.sign(
            { id: user.id },
            process.env.ACCESS_SECRET!,
            { expiresIn: '2m' }
        );

        const refreshToken = jwt.sign(
            { id: user.id, jti },
            process.env.REFRESH_SECRET!,
            { expiresIn: '7d' }
        );

        await RefreshToken.create({
            user_id: user.id,
            jti,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        })

        const plainUser = user.toJSON();
        const { password, ...userWithoutPassword } = plainUser;

        res.json({
            user: userWithoutPassword,
            tokens:{
                access:{
                    value: accessToken,
                    expires_at: Date.now() + 120 * 1000 // 2m
                },
                refresh:{
                    value: refreshToken,
                    expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7d
                }
            }
        });
    } catch (error: unknown) {
        next(error);
    }
};

const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const oldRefreshToken = req.body['refresh_token'];
        if (!oldRefreshToken) throw new AppError('Refresh token not found', 403);
        if (!process.env.REFRESH_SECRET) throw new AppError('Refresh token not found', 403);

        let decoded: IDecodedToken;

        try{
            decoded = jwt.verify(oldRefreshToken, process.env.REFRESH_SECRET) as IDecodedToken;
        }
        catch{
            throw new AppError("Invalid token", 401);
        }

        const user = await User.findByPk(decoded.id);
        if (!user) throw new AppError('User not found', 404);

        // Generate new tokens
        const jti = uuidv4();

        const newAccessToken = jwt.sign(
            { id: user.id, channel_id: decoded.channel_id },
            process.env.ACCESS_SECRET!,
            { expiresIn: '2m' }
        );

        const newRefreshToken = jwt.sign(
            { id: user.id, jti },
            process.env.REFRESH_SECRET,
            { expiresIn: '7d' }
        );

        await sequelize.transaction(async (t) => {
            const destroyedCount = await RefreshToken.destroy({
                where: { jti: decoded.jti },
                transaction: t
            });

            // If 0 rows were deleted, another refresh request likely won the race and
            // rotated/deleted this token already. In that case, abort instead of issuing
            // another refresh token (prevents token "explosion").
            if (destroyedCount === 0) {
                throw new AppError("Invalid token", 403);
            }

            await RefreshToken.create({
                user_id: user.id,
                jti,
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }, { transaction: t });
        });

        const plainUser = user.toJSON();
        const { password, ...userWithoutPassword } = plainUser;

        res.json({
            user: userWithoutPassword,
            tokens:{
                access:{
                    value: newAccessToken,
                    expires_at: Date.now() + 120 * 1000 // 2m
                },
                refresh:{
                    value: newRefreshToken,
                    expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7d
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

const destroyToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const oldRefreshToken = req.body['refresh_token'];
        console.log(oldRefreshToken);
        if (!oldRefreshToken) throw new AppError('Refresh token not found', 403);
        if (!process.env.REFRESH_SECRET) throw new AppError('Refresh token not found', 403);

        let decoded: IDecodedToken | null;

        try{
            decoded = jwt.verify(oldRefreshToken, process.env.REFRESH_SECRET) as IDecodedToken;
        }
        catch{
            throw new AppError("Invalid token", 401);
        }

        console.log('decoded.jti', decoded.jti);

        const deletedCount = await RefreshToken.destroy({
            where: {
                jti: decoded.jti
            }
        });

        console.log('destroyToken deletedCount', deletedCount);

        res.json({
            message: "Logout successful",
            deleted_refresh_token_rows: deletedCount,
            decoded_jti: decoded.jti
        });
    } catch (error) {
        next(error);
    }
};

const verifyToken = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> => {
    try {
        const token = req.header('Authorization')?.split(' ')[1];
        if (!token) throw new AppError('Token not found', 404);

        const decoded = jwt.verify(token, process.env.ACCESS_SECRET!);

        res.json({
            decoded: decoded
        });
    } catch (error: unknown) {
        next(error);
    }
};

const me = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> => {
    try {
        const roles = await Role.findAll({
            attributes: ['id', 'ref_name', 'scope', 'level', 'channel_id'],
            where: {
                channel_id: req.channel?.id ? req.channel.id : null
            },
            include: [
                {
                    model: Permission,
                    attributes: ['id', 'ref_name', 'scope'],
                    through: { attributes: [] } // hide Role → Permission join table
                },
                {
                    model: User,
                    attributes: [], // don’t return any user fields
                    where: { id: req.authorizedUser?.id }, // filter roles for this user
                    through: { attributes: [] } // hide User → Role join table
                }
            ]
        });

        res.json({
            channel: req.channel ?? null,
            user: {
                ...req.authorizedUser.toJSON(),
                roles
            },
        });
    } catch (error: unknown) {
        next(error);
    }
};

const hasAnyPermission = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> => {
    try {
        const token = req.header('Authorization')?.split(' ')[1];
        if (!token) throw new AppError('Token not found', 404);

        const decoded = jwt.verify(
            token,
            process.env.ACCESS_SECRET!
        ) as IDecodedToken;
        const hasPermissions = await (
            req.authorizedUser as User
        ).hasAnyPermission(
            req.body.permission_ref_names,
            req.body.permission_scope,
            decoded.channel_id ?? null
        );

        console.log('hasPermissions', hasPermissions);

        if (hasPermissions) {
            res.json({
                status: 1
            });
        } else {
            throw new AppError('Unauthorized', 403);
        }
    } catch (error: unknown) {
        next(error);
    }
};

export default {
    generateToken,
    refreshToken,
    destroyToken,
    verifyToken,
    me,
    hasAnyPermission
};
