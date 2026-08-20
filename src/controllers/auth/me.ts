import { NextFunction, Request, Response } from 'express';
import Permission from '../../database/models/Permission';
import Role from '../../database/models/Role';
import User from '../../database/models/User';

/**
 * GET /api/auth/me — the current caller's identity plus the roles (with nested
 * permissions) they hold for the active channel scope, or global roles
 * (`channel_id IS NULL`) when the api-key is "global".
 */
export const me = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
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
                    attributes: [], // don't return any user fields
                    where: { id: req.authorizedUser?.id }, // filter roles for this user
                    through: { attributes: [] } // hide User → Role join table
                }
            ]
        });

        res.json({
            channel: req.channel ?? null,
            user: {
                ...req.authorizedUser?.toJSON(),
                roles
            }
        });
    } catch (error: unknown) {
        next(error);
    }
};
