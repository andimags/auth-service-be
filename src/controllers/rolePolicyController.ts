import { NextFunction, Request, Response } from 'express';
import Role from '../database/models/Role';
import { AppError } from '../middlewares/errorHandler';
import { findMissingPolicies } from '../services/policyService';
import Policy from '../database/models/Policy';

const getRolePolicies = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const targetRole = await Role.findByPk(req.params.role_id);
        if (!targetRole) throw new AppError('Role not found', 404);

        if (!req.isGlobalScope && targetRole?.channel_id != req.channel?.id) {
            throw new AppError(
                "Unauthorized to view this role's permissions",
                403
            );
        }

        const policies = await targetRole.getPolicies();

        res.json(policies);
    } catch (error: unknown) {
        next(error);
    }
};

// Assign one or more permissions to a role
const addRolePolicies = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const targetRole = await Role.findByPk(req.params.role_id);
        if (!targetRole) throw new AppError('Role not found', 404);

        if (!req.isGlobalScope && targetRole?.channel_id != req.channel?.id) {
            throw new AppError(
                'Unauthorized to add policies to this role',
                403
            );
        }

        const missingPolicies = await findMissingPolicies(
            req.body.policy_ref_names
        );
        if (missingPolicies.length > 0)
            throw new AppError(
                `Policy ref names ${missingPolicies} do not exist`,
                404
            );

        if(!req.authorizedUser?.isSuperadmin() && !req.authorizedUser?.isRootSuperadmin){
            const authUserMissingPolicies = await req.authorizedUser?.getMissingPolicies(
                missingPolicies,
                req.isGlobalScope ? 'global' : 'channel',
                req.isGlobalScope ? undefined : req.channel?.id,
            )    

            if(authUserMissingPolicies && authUserMissingPolicies?.length > 0){
                throw new AppError(
                    `Policy ref names ${authUserMissingPolicies} are not assignable by the auth user`,
                    404
                );
            }
        }
        
        const policies = await Policy.findAll({
            where: {
                ref_name: Array.isArray(req.body.policy_ref_names) ? req.body.policy_ref_names : [req.body.policy_ref_names]
            },
        });

        await targetRole.addPolicies(policies);

        res.json(policies);
    } catch (error: unknown) {
        next(error);
    }
};

// Replace all permissions of a role
const replaceRolePolicies = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const targetRole = await Role.findByPk(req.params.role_id);
        if (!targetRole) throw new AppError('Role not found', 404);

        if (!req.isGlobalScope && targetRole?.channel_id != req.channel?.id) {
            throw new AppError(
                'Unauthorized to replace permissions to this role',
                403
            );
        }

        const missingPolicies = await findMissingPolicies(
            req.body.policy_ref_names
        );
        if (missingPolicies.length > 0)
            throw new AppError(
                `Policy ref names ${missingPolicies} do not exist`,
                404
            );

        if(!req.authorizedUser?.isSuperadmin() && !req.authorizedUser?.isRootSuperadmin){
            const authUserMissingPolicies = await req.authorizedUser?.getMissingPolicies(
                missingPolicies,
                req.isGlobalScope ? 'global' : 'channel',
                req.isGlobalScope ? undefined : req.channel?.id,
            )    

            if(authUserMissingPolicies && authUserMissingPolicies?.length > 0){
                throw new AppError(
                    `Policy ref names ${authUserMissingPolicies} are not assignable by the auth user`,
                    404
                );
            }
        }

        const policies = await Policy.findAll({
            where: {
                ref_name: Array.isArray(req.body.policy_ref_names) ? req.body.policy_ref_names : [req.body.policy_ref_names]
            },
        });

        await targetRole.setPolicies(policies);

        res.json(policies);
    } catch (error: unknown) {
        next(error);
    }
};

// Remove a specific permission from a role
const destroyRolePolicies = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const targetRole = await Role.findByPk(req.params.role_id);
        if (!targetRole) throw new AppError('Role not found', 404);

        if (!req.isGlobalScope && targetRole?.channel_id != req.channel?.id) {
            throw new AppError(
                'Unauthorized to delete permissions to this role',
                403
            );
        }

        const missingPolicies = await findMissingPolicies(
            req.body.policy_ref_names
        );

        if (missingPolicies.length > 0)
            throw new AppError(
                `Policy ref names ${missingPolicies} do not exist`,
                404
            );
        
        if(!req.authorizedUser?.isSuperadmin() && !req.authorizedUser?.isRootSuperadmin){
            const authUserMissingPolicies = await req.authorizedUser?.getMissingPolicies(
                missingPolicies,
                req.isGlobalScope ? 'global' : 'channel',
                req.isGlobalScope ? undefined : req.channel?.id,
            )    

            if(authUserMissingPolicies && authUserMissingPolicies?.length > 0){
                throw new AppError(
                    `Policy ref names ${authUserMissingPolicies} are not assignable by the auth user`,
                    404
                );
            }
        }

        const policies = await Policy.findAll({
            where: {
                ref_name: Array.isArray(req.body.policy_ref_names) ? req.body.policy_ref_names : [req.body.policy_ref_names]
            },
        });

        await targetRole.removePolicies(policies);

        res.json({
            message: 'Role policy successfully deleted'
        });
    } catch (error: unknown) {
        next(error);
    }
};

export default {
    getRolePolicies,
    addRolePolicies,
    replaceRolePolicies,
    destroyRolePolicies
};
