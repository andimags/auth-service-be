import { Op } from "sequelize";
import Permission from "../database/models/Permission";
import Role from "../database/models/Role";
import { AppError } from "../middlewares/errorHandler";
import { IUser } from "../types";
import User from "../database/models/User";

// Channel based roles can only assign permissions in channel-based scope
export async function isPermissionAssignable(
    permissionIds: number | number[],
    isGlobalRole: boolean = false
): Promise<boolean> {
    // Global roles can assign any permissions
    if (isGlobalRole) {
        return true;
    }

    // Channel-based roles can only assign roles within their channel
    if (Array.isArray(permissionIds)) {
        for (const id of permissionIds) {
            const permission = await Permission.findByPk(id);

            if (permission?.scope === 'global') {
                return false;
            }
        }
    } else {
        const permission = await Permission.findByPk(permissionIds);

        if(permission?.scope == 'global'){
            return false;
        }
    }

    return true;
}

export async function findMissingPermissions(permissionIds: number | number[]): Promise<number[]> {
    // Returns array of permission IDs that don't exist
    permissionIds = Array.isArray(permissionIds) ? permissionIds : [permissionIds];
    const existingPermissions = await Permission.findAll({ where: { id: permissionIds } });
    const existingIds = existingPermissions.map((permission) => permission.id);

    return permissionIds.filter((id) => !existingIds.includes(id));
}

export async function checkPermissionLevel(
    permissionRefNames: string | string[],
    user: User,
    isGlobalRole: boolean = false,
    channelId?: number
): Promise<number | null> {
    let highestLevel: number | null = null;

    if (!isGlobalRole && !channelId) {
        throw new AppError('Channel ID parameter is required if isGlobalRole is false.');
    }

    const roles = await user.getRoles({
        where: {
            channel_id: isGlobalRole ? { [Op.eq]: null } : channelId
        }
    });

    for (const role of roles) {
        const permissions = await role.getPermissions({
            where: { ref_name: { [Op.in]: Array.isArray(permissionRefNames) ? permissionRefNames : [permissionRefNames]}}
        });

        if (permissions.length > 0) {
            const currentLevel = role.level;

            if (highestLevel === null || currentLevel > highestLevel) {
                highestLevel = currentLevel;
            }
        }
    }

    return highestLevel;
}

