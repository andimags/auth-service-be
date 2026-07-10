import { WhereOptions } from "sequelize";
import Role from "../database/models/Role";
import User from "../database/models/User";
import { RoleScopeFilter } from "../types";

export async function findMissingRoles(
    roleRefNames: string | string[]
): Promise<string[]> {
    const refNamesToCheck = Array.isArray(roleRefNames) ? roleRefNames : [roleRefNames];

    const existingRoles = await Role.findAll({
        where: {
            ref_name: refNamesToCheck
        },
        attributes: ['ref_name']
    });

    const existingRoleRefNames = new Set(existingRoles.map((role) => role.ref_name));
    return refNamesToCheck.filter((refName) => !existingRoleRefNames.has(refName));
}

export async function findRolesNotInChannel(
    roleRefNames: string | string[],
    channelId: number
): Promise<string[]> {
    const refNamesToCheck = Array.isArray(roleRefNames) ? roleRefNames : [roleRefNames];
    const rolesInChannel = await Role.findAll({
        where: {
            ref_name: refNamesToCheck,
            channel_id: channelId
        },
        attributes: ['ref_name']
    });
    const rolesInChannelRefNames = new Set(rolesInChannel.map((role) => role.ref_name));
    return refNamesToCheck.filter((refName) => !rolesInChannelRefNames.has(refName));
}

export async function getUserRoles(
    user: User,
    roleScope: RoleScopeFilter,
    channelId?: number
): Promise<Role[]> {
    return user.getRoles({
        where: roleScope === 'channel' ? { channel_id: channelId } : undefined
    });
}

export const getMissingUserRoles = async (
    user: User,
    permissionRefNames: string | string[],
    roleScope: RoleScopeFilter,
    channelId?: number
): Promise<string[]> => {
    const requestedRefNames = Array.isArray(permissionRefNames)
        ? permissionRefNames
        : [permissionRefNames];

    const userRoles = await getUserRoles(
        user,
        roleScope,
        channelId
    );

    const userRoleRefNames = new Set(
        userRoles.map(r => r.ref_name)
    );

    return requestedRefNames.filter(
        refName => !userRoleRefNames.has(refName)
    );
};