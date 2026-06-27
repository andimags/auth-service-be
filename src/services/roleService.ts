import Role from "../database/models/Role";

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