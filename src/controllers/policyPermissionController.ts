import { NextFunction, Request, Response } from 'express';
import Policy from '../database/models/Policy';
import { AppError } from '../middlewares/errorHandler';
import { findMissingPermissions, findSystemPermissions } from '../services/permissionService';
import Permission from '../database/models/Permission';
import { HttpStatus } from '../constants/httpStatus';
import { getScopeType } from '../utils/getScopeType';

const getPolicyPermissions = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const targetPolicy = await Policy.findByPk(req.params.policy_id);
        if (!targetPolicy) throw new AppError('Policy not found', HttpStatus.NOT_FOUND);

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
        if (!targetPolicy) throw new AppError('Policy not found', HttpStatus.NOT_FOUND);

        const missingPermissions = await findMissingPermissions(
            req.body.permission_ref_names
        );

        if (missingPermissions.length > 0)
            throw new AppError(
                `Permission ref names ${missingPermissions} do not exist`,
                HttpStatus.NOT_FOUND
            );

        if (!req.isGlobalScope) {
            const globalPermissions = await findSystemPermissions(req.body.policy_ref_names);

            if (globalPermissions.length > 0) {
                throw new AppError(
                    'Global permissions cannot be assigned using a channel-scoped API key',
                    HttpStatus.FORBIDDEN
                );
            }
        }

        if(!req.authorizedUser?.isSuperadmin() && !req.authorizedUser?.isRootSuperadmin){
            const authUserMissingPermissions = await req.authorizedUser?.getMissingPermissions(
                missingPermissions,
                getScopeType(req.isGlobalScope),
                req.isGlobalScope ? undefined : req.channel?.id,
            );    

            if(authUserMissingPermissions && authUserMissingPermissions?.length > 0){
                throw new AppError(
                    `Permission ref names ${authUserMissingPermissions} are not assignable by the auth user`,
                    HttpStatus.NOT_FOUND
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
        if (!targetPolicy) throw new AppError('Policy not found', HttpStatus.NOT_FOUND);

        const missingPermissions = await findMissingPermissions(
            req.body.permission_ref_names
        );

        if (missingPermissions.length > 0)
            throw new AppError(
                `Permission ref names ${missingPermissions} do not exist`,
                HttpStatus.NOT_FOUND
            );

        const requestedRefNames: string[] = Array.isArray(req.body.permission_ref_names)
            ? req.body.permission_ref_names
            : [req.body.permission_ref_names];

        if (!req.isGlobalScope) {
        // Permissions currently attached to the policy, before any changes
            const currentPermissions = await targetPolicy.getPermissions();
            const currentGlobalRefNames = currentPermissions
                .filter((p) => p.is_system) // adjust to match findSystemPermissions' definition
                .map((p) => p.ref_name);

            // New global permissions being introduced -> not allowed
            const requestedGlobalPermissions = await findSystemPermissions(requestedRefNames);
            const newGlobalPermissions = requestedGlobalPermissions.filter(
                (refName) => !currentGlobalRefNames.includes(refName)
            );
            if (newGlobalPermissions.length > 0) {
                throw new AppError(
                    'Global permissions cannot be updated using a channel-scoped API key',
                    HttpStatus.FORBIDDEN
                );
            }

            // Existing global permissions being dropped (omitted from the request) -> not allowed
            const removedGlobalPermissions = currentGlobalRefNames.filter(
                (refName) => !requestedRefNames.includes(refName)
            );
            if (removedGlobalPermissions.length > 0) {
                throw new AppError(
                    `Global permissions ${removedGlobalPermissions} cannot be removed using a channel-scoped API key`,
                    HttpStatus.FORBIDDEN
                );
            }
        }

        if (!req.authorizedUser?.isSuperadmin() && !req.authorizedUser?.isRootSuperadmin) {
            const authUserMissingPermissions = await req.authorizedUser?.getMissingPermissions(
                requestedRefNames,
                getScopeType(req.isGlobalScope),
                req.isGlobalScope ? undefined : req.channel?.id,
            );

            if (authUserMissingPermissions && authUserMissingPermissions?.length > 0) {
                throw new AppError(
                    `Permission ref names ${authUserMissingPermissions} are not assignable by the auth user`,
                    HttpStatus.NOT_FOUND
                );
            }
        }

        const permissions = await Permission.findAll({
            where: { ref_name: requestedRefNames },
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
        if (!targetPolicy) throw new AppError('Policy not found', HttpStatus.NOT_FOUND);

        const missingPermissions = await findMissingPermissions(
            req.body.permission_ids
        );

        if (missingPermissions.length > 0)
            throw new AppError(
                `Permission ref names ${missingPermissions} do not exist`,
                HttpStatus.NOT_FOUND
            );

        if(!req.authorizedUser?.isSuperadmin() && !req.authorizedUser?.isRootSuperadmin){
            const authUserMissingPermissions = await req.authorizedUser?.getMissingPermissions(
                missingPermissions,
                getScopeType(req.isGlobalScope),
                req.isGlobalScope ? undefined : req.channel?.id,
            );    

            if(authUserMissingPermissions && authUserMissingPermissions?.length > 0){
                throw new AppError(
                    `Permission ref names ${authUserMissingPermissions} are not assignable by the auth user`,
                    HttpStatus.NOT_FOUND
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
