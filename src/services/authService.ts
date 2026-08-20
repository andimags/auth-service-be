import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import {
    ACCESS_TOKEN_TTL,
    ACCESS_TOKEN_TTL_MS,
    REFRESH_TOKEN_TTL,
    REFRESH_TOKEN_TTL_MS
} from '../constants/auth';
import RefreshToken from '../database/models/RefreshToken';
import User from '../database/models/User';
import sequelize from '../database/sequelize';
import { AppError } from '../middlewares/errorHandler';
import { IDecodedToken } from '../types';
import { HttpStatus } from '../constants/httpStatus';
import { getScopeType } from '../utils/getScopeType';

interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

// A pre-computed bcrypt hash of a throwaway value. When the email doesn't exist
// we still run one bcrypt.compare against this so the response time for
// "unknown email" matches "wrong password", closing a timing side-channel.
const DUMMY_PASSWORD_HASH = '$2b$10$CwTycUXWue0Thq9StjUM0uJ8Dvize3nP1JLbT7xk1U5g8xL8bF3vG';

// Single generic message for every credential failure so an attacker can't tell
// "email not registered" apart from "wrong password" (user enumeration).
const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';

export async function verifyCredentials(email: string, password: string): Promise<User> {
    const user = await User.findOne({
        attributes: { include: ['password'] },
        where: { email }
    });

    // Always run a bcrypt compare — against the real hash if the user exists,
    // otherwise against a dummy — so both branches take comparable time.
    const passwordMatches = await bcrypt.compare(password, user?.password ?? DUMMY_PASSWORD_HASH);

    if (!user || !passwordMatches) {
        throw new AppError(INVALID_CREDENTIALS_MESSAGE, HttpStatus.UNAUTHORIZED);
    }

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

export function assertRefreshSecretConfigured(): void {
    // A missing REFRESH_SECRET is a server misconfiguration, not a client error,
    // so surface it as 500 with a single consistent message (both refresh-token
    // and destroy-token used to throw 403 with different, misleading messages).
    if (!process.env.REFRESH_SECRET) {
        throw new AppError('Server configuration error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
}

export function decodeRefreshToken(rawToken: string): IDecodedToken {
    try {
        return jwt.verify(rawToken, process.env.REFRESH_SECRET!) as IDecodedToken;
    } catch {
        throw new AppError('Invalid token', HttpStatus.UNAUTHORIZED);
    }
}

export async function rotateTokens(
    userId: number,
    oldJti: string | undefined
): Promise<TokenPair> {
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

    await sequelize.transaction(async (t) => {
        const destroyedCount = await RefreshToken.destroy({
            where: { jti: oldJti },
            transaction: t
        });

        // If 0 rows were deleted, another refresh request likely won the race and
        // rotated/deleted this token already. In that case, abort instead of issuing
        // another refresh token (prevents token "explosion").
        if (destroyedCount === 0) {
            throw new AppError('Invalid token', HttpStatus.FORBIDDEN);
        }

        await RefreshToken.create({
            user_id: userId,
            jti,
            expires_at: new Date(Date.now() + REFRESH_TOKEN_TTL_MS)
        }, { transaction: t });
    });

    return { accessToken, refreshToken };
}

export function revokeRefreshToken(jti: string | undefined): Promise<number> {
    return RefreshToken.destroy({ where: { jti } });
}

interface AuthResponsePayload {
    user: Omit<ReturnType<User['toJSON']>, 'password'>;
    permissions: string[];
}

export async function getAuthResponsePayload(
    user: User,
    isGlobalScope: boolean,
    channelId?: number
): Promise<AuthResponsePayload> {
    const { password: _password, ...userWithoutPassword } = user.toJSON();

    const permissions = await user.getPermissionRefNames(
        getScopeType(isGlobalScope),
        isGlobalScope ? undefined : channelId
    );

    return { user: userWithoutPassword, permissions };
}

/**
 * Shapes the response body shared by generate-token and refresh-token so the two
 * controllers don't each hand-build the identical `{ user, permissions, tokens }`
 * structure. `expires_at` values are absolute Unix epoch milliseconds.
 */
export function buildTokenResponse(
    userPayload: AuthResponsePayload['user'],
    permissions: string[],
    tokens: TokenPair
) {
    const now = Date.now();

    return {
        user: userPayload,
        permissions,
        tokens: {
            access: {
                value: tokens.accessToken,
                expires_at: now + ACCESS_TOKEN_TTL_MS
            },
            refresh: {
                value: tokens.refreshToken,
                expires_at: now + REFRESH_TOKEN_TTL_MS
            }
        }
    };
}
