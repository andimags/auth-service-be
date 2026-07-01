import { NextFunction, Request, Response } from 'express';
import Policy from '../database/models/Policy';
import { AppError } from '../middlewares/errorHandler';
import { findMissingPermissions } from '../services/permissionService';
import Permission from '../database/models/Permission';

const getPolicyPermissions = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const targetPolicy = await Policy.findByPk(req.params.policy_id);
        if (!targetPolicy) throw new AppError('Policy not found', 404);

        const permissions = await targetPolicy.getPermissions();

        res.json(permissions);
    } catch (error: unknown) {
        next(error);
    }
};

// Assign one or more permissions to a role
const addPolicyPermissions = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const targetPolicy = await Policy.findByPk(req.params.policy_id);
        if (!targetPolicy) throw new AppError('Policy not found', 404);

        const missingPermissions = await findMissingPermissions(
            req.body.permission_ref_names
        );

        if (missingPermissions.length > 0)
            throw new AppError(
                `Permission ref names ${missingPermissions} do not exist`,
                404
            );

        if(!req.authorizedUser?.isSuperadmin() && !req.authorizedUser?.isRootSuperadmin){
            const authUserMissingPermissions = await req.authorizedUser?.getMissingPermissions(
                missingPermissions,
                req.isGlobalScope ? 'global' : 'channel',
                req.isGlobalScope ? undefined : req.channel?.id,
            )    

            if(authUserMissingPermissions && authUserMissingPermissions?.length > 0){
                throw new AppError(
                    `Permission ref names ${authUserMissingPermissions} are not assignable by the auth user`,
                    404
                );
            }
        }

        const permissions = await Permission.findAll({
            where: {
                ref_name: Array.isArray(req.body.permission_ref_names) ? req.body.permission_ref_names : [req.body.permission_ref_names]
            },
        });

        await targetPolicy.addPermissions(permissions);

        res.json(permissions);
    } catch (error: unknown) {
        next(error);
    }
};

// Replace all permissions of a role
const replacePolicyPermissions = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const targetPolicy = await Policy.findByPk(req.params.policy_id);
        if (!targetPolicy) throw new AppError('Policy not found', 404);

        const missingPermissions = await findMissingPermissions(
            req.body.permission_ref_names
        );

        if (missingPermissions.length > 0)
            throw new AppError(
                `Permission ref names ${missingPermissions} do not exist`,
                404
            );

        if(!req.authorizedUser?.isSuperadmin() && !req.authorizedUser?.isRootSuperadmin){
            const authUserMissingPermissions = await req.authorizedUser?.getMissingPermissions(
                missingPermissions,
                req.isGlobalScope ? 'global' : 'channel',
                req.isGlobalScope ? undefined : req.channel?.id,
            )    

            if(authUserMissingPermissions && authUserMissingPermissions?.length > 0){
                throw new AppError(
                    `Permission ref names ${authUserMissingPermissions} are not assignable by the auth user`,
                    404
                );
            }
        }

        const permissions = await Permission.findAll({
            where: {
                ref_name: Array.isArray(req.body.permission_ref_names) ? req.body.permission_ref_names : [req.body.permission_ref_names]
            },
        });

        await targetPolicy.setPermissions(permissions);

        res.json(permissions);
    } catch (error: unknown) {
        next(error);
    }
};

// Remove a specific permission from a role
const destroyPolicyPermissions = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const targetPolicy = await Policy.findByPk(req.params.policy_id);
        if (!targetPolicy) throw new AppError('Policy not found', 404);

        const missingPermissions = await findMissingPermissions(
            req.body.permission_ids
        );

        if (missingPermissions.length > 0)
            throw new AppError(
                `Permission ref names ${missingPermissions} do not exist`,
                404
            );

                if(!req.authorizedUser?.isSuperadmin() && !req.authorizedUser?.isRootSuperadmin){
            const authUserMissingPermissions = await req.authorizedUser?.getMissingPermissions(
                missingPermissions,
                req.isGlobalScope ? 'global' : 'channel',
                req.isGlobalScope ? undefined : req.channel?.id,
            )    

            if(authUserMissingPermissions && authUserMissingPermissions?.length > 0){
                throw new AppError(
                    `Permission ref names ${authUserMissingPermissions} are not assignable by the auth user`,
                    404
                );
            }
        }

        const permissions = await Permission.findAll({
            where: {
                ref_name: Array.isArray(req.body.permission_ref_names) ? req.body.permission_ref_names : [req.body.permission_ref_names]
            },
        });

        await targetPolicy.removePermissions(permissions);

        res.json({
            message: 'Policy permission successfully deleted'
        });
    } catch (error: unknown) {
        next(error);
    }
};

export default {
    getPolicyPermissions,
    addPolicyPermissions,
    replacePolicyPermissions,
    destroyPolicyPermissions
};
