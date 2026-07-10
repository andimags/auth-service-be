import { NextFunction, Request, Response } from 'express';
import Role from '../database/models/Role';
import { AppError } from '../middlewares/errorHandler';
import { findMissingPolicies, findSystemPolicies } from '../services/policyService';
import Policy from '../database/models/Policy';
import { HttpStatus } from '../constants/httpStatus';
import { getScopeType } from '../utils/getScopeType';

const getRolePolicies = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const targetRole = await Role.findByPk(req.params.role_id);
        if (!targetRole) throw new AppError('Role not found', HttpStatus.NOT_FOUND);

        if (!req.isGlobalScope && targetRole?.channel_id != req.channel?.id) {
            throw new AppError(
                "Unauthorized to view this role's permissions",
                HttpStatus.FORBIDDEN
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
): Promise<void> => {
    try {
        const targetRole = await Role.findByPk(req.params.role_id);
        if (!targetRole) throw new AppError('Role not found', HttpStatus.NOT_FOUND);

        if (!req.isGlobalScope && targetRole?.channel_id != req.channel?.id) {
            throw new AppError(
                'Unauthorized to add policies to this role',
                HttpStatus.FORBIDDEN
            );
        }

        const missingPolicies = await findMissingPolicies(
            req.body.policy_ref_names
        );

        if (missingPolicies.length > 0)
            throw new AppError(
                `Policy ref names ${missingPolicies} do not exist`,
                HttpStatus.NOT_FOUND
            );

        if (!req.isGlobalScope) {
            const globalPolicies = await findSystemPolicies(req.body.policy_ref_names);

            if (globalPolicies.length > 0) {
                throw new AppError(
                    'Global policies cannot be assigned using a channel-scoped API key',
                    HttpStatus.FORBIDDEN
                );
            }
        }

        if(!req.authorizedUser?.isSuperadmin() && !req.authorizedUser?.isRootSuperadmin()){
            const authUserMissingPolicies = await req.authorizedUser?.getMissingPolicies(
                missingPolicies,
                getScopeType(req.isGlobalScope),
                req.isGlobalScope ? undefined : req.channel?.id,
            );    

            if(authUserMissingPolicies && authUserMissingPolicies?.length > 0){
                throw new AppError(
                    `Policy ref names ${authUserMissingPolicies} are not assignable by the auth user`,
                    HttpStatus.NOT_FOUND
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
): Promise<void> => {
    try {
        const targetRole = await Role.findByPk(req.params.role_id);
        if (!targetRole) throw new AppError('Role not found', HttpStatus.NOT_FOUND);

        if (!req.isGlobalScope && targetRole?.channel_id != req.channel?.id) {
            throw new AppError(
                'Unauthorized to replace permissions to this role',
                HttpStatus.FORBIDDEN
            );
        }

        const missingPolicies = await findMissingPolicies(
            req.body.policy_ref_names
        );
        if (missingPolicies.length > 0)
            throw new AppError(
                `Policy ref names ${missingPolicies} do not exist`,
                HttpStatus.NOT_FOUND
            );

        const requestedRefNames: string[] = Array.isArray(req.body.policy_ref_names)
            ? req.body.policy_ref_names
            : [req.body.policy_ref_names];

        if (!req.isGlobalScope) {
        // Policies currently attached to the role, before any changes
            const currentPolicies = await targetRole.getPolicies();
            const currentGlobalRefNames = currentPolicies
                .filter((p) => p.is_system) // adjust to match findSystemPolicies' definition
                .map((p) => p.ref_name);

            // New global policies being introduced -> not allowed
            const requestedGlobalPolicies = await findSystemPolicies(requestedRefNames);
            const newGlobalPolicies = requestedGlobalPolicies.filter(
                (refName) => !currentGlobalRefNames.includes(refName)
            );
            if (newGlobalPolicies.length > 0) {
                throw new AppError(
                    'Global policies cannot be updated using a channel-scoped API key',
                    HttpStatus.FORBIDDEN
                );
            }

            // Existing global policies being dropped (omitted from the request) -> not allowed
            const removedGlobalPolicies = currentGlobalRefNames.filter(
                (refName) => !requestedRefNames.includes(refName)
            );
            if (removedGlobalPolicies.length > 0) {
                throw new AppError(
                    `Global policies ${removedGlobalPolicies} cannot be removed using a channel-scoped API key`,
                    HttpStatus.FORBIDDEN
                );
            }
        }

        if (!req.authorizedUser?.isSuperadmin() && !req.authorizedUser?.isRootSuperadmin()) {
            const authUserMissingPolicies = await req.authorizedUser?.getMissingPolicies(
                requestedRefNames,
                getScopeType(req.isGlobalScope),
                req.isGlobalScope ? undefined : req.channel?.id,
            );
            if (authUserMissingPolicies && authUserMissingPolicies?.length > 0) {
                throw new AppError(
                    `Policy ref names ${authUserMissingPolicies} are not assignable by the auth user`,
                    HttpStatus.NOT_FOUND
                );
            }
        }

        const policies = await Policy.findAll({
            where: { ref_name: requestedRefNames },
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
): Promise<void> => {
    try {
        const targetRole = await Role.findByPk(req.params.role_id);
        if (!targetRole) throw new AppError('Role not found', HttpStatus.NOT_FOUND);

        if (!req.isGlobalScope && targetRole?.channel_id != req.channel?.id) {
            throw new AppError(
                'Unauthorized to delete permissions to this role',
                HttpStatus.FORBIDDEN
            );
        }

        const missingPolicies = await findMissingPolicies(
            req.body.policy_ref_names
        );

        if (missingPolicies.length > 0)
            throw new AppError(
                `Policy ref names ${missingPolicies} do not exist`,
                HttpStatus.NOT_FOUND
            );
        
        if(!req.authorizedUser?.isSuperadmin() && !req.authorizedUser?.isRootSuperadmin()){
            const authUserMissingPolicies = await req.authorizedUser?.getMissingPolicies(
                missingPolicies,
                getScopeType(req.isGlobalScope),
                req.isGlobalScope ? undefined : req.channel?.id,
            );    

            if(authUserMissingPolicies && authUserMissingPolicies?.length > 0){
                throw new AppError(
                    `Policy ref names ${authUserMissingPolicies} are not assignable by the auth user`,
                    HttpStatus.NOT_FOUND
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
