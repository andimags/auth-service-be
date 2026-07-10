import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { ACCESS_TOKEN_TTL, REFRESH_TOKEN_TTL, REFRESH_TOKEN_TTL_MS } from '../constants/auth';
import RefreshToken from '../database/models/RefreshToken';
import User from '../database/models/User';
import sequelize from '../database/sequelize';
import { AppError } from '../middlewares/errorHandler';
import { IDecodedToken } from '../types';

interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

export async function verifyCredentials(email: string, password: string): Promise<User> {
    const user = await User.findOne({
        attributes: { include: ['password'] },
        where: { email }
    });
    if (!user) throw new AppError('User not found', 401);

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) throw new AppError('Invalid email or password', 401);

    return user;
}

export async function issueTokens(userId: number): Promise<TokenPair> {
    const jti = uuidv4();

    const accessToken = jwt.sign(
        { id: userId },
        process.env.ACCESS_SECRET!,
        { expiresIn: ACCESS_TOKEN_TTL }
    );

    const refreshToken = jwt.sign(
        { id: userId, jti },
        process.env.REFRESH_SECRET!,
        { expiresIn: REFRESH_TOKEN_TTL }
    );

    await RefreshToken.create({
        user_id: userId,
        jti,
        expires_at: new Date(Date.now() + REFRESH_TOKEN_TTL_MS)
    });

    return { accessToken, refreshToken };
}

export function assertRefreshSecretConfigured(message: string): void {
    if (!process.env.REFRESH_SECRET) throw new AppError(message, 403);
}

export function decodeRefreshToken(rawToken: string): IDecodedToken {
    try {
        return jwt.verify(rawToken, process.env.REFRESH_SECRET!) as IDecodedToken;
    } catch {
        throw new AppError('Invalid token', 401);
    }
}

export async function rotateTokens(
    userId: number,
    oldJti: string | undefined,
    channelId: number | undefined
): Promise<TokenPair> {
    const jti = uuidv4();

    const accessToken = jwt.sign(
        { id: userId, channel_id: channelId },
        process.env.ACCESS_SECRET!,
        { expiresIn: ACCESS_TOKEN_TTL }
    );

    const refreshToken = jwt.sign(
        { id: userId, jti },
        process.env.REFRESH_SECRET!,
        { expiresIn: REFRESH_TOKEN_TTL }
    );

    await sequelize.transaction(async (t) => {
        const destroyedCount = await RefreshToken.destroy({
            where: { jti: oldJti },
            transaction: t
        });

        // If 0 rows were deleted, another refresh request likely won the race and
        // rotated/deleted this token already. In that case, abort instead of issuing
        // another refresh token (prevents token "explosion").
        if (destroyedCount === 0) {
            throw new AppError('Invalid token', 403);
        }

        await RefreshToken.create({
            user_id: userId,
            jti,
            expires_at: new Date(Date.now() + REFRESH_TOKEN_TTL_MS)
        }, { transaction: t });
    });

    return { accessToken, refreshToken };
}

export async function revokeRefreshToken(jti: string | undefined): Promise<number> {
    return RefreshToken.destroy({ where: { jti } });
}

export async function getAuthResponsePayload(
    user: User,
    isGlobalScope: boolean,
    channelId?: number
) {
    const { password, ...userWithoutPassword } = user.toJSON();

    const permissions = await user.getPermissionRefNames(
        isGlobalScope ? 'global' : 'channel',
        isGlobalScope ? undefined : channelId
    );

    return { user: userWithoutPassword, permissions };
}
