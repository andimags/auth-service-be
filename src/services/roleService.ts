import Role from "../database/models/Role";

export async function findMissingRoles(
    roleIds: number | number[] | string | string[]
): Promise<(string | number)[]> {
    const idsToCheck = Array.isArray(roleIds) ? roleIds : [roleIds];

    const existingRoles = await Role.findAll({
        where: {
            id: idsToCheck
        },
        attributes: ['id']
    });

    const existingRoleIds = new Set(existingRoles.map((role) => role.id));
    return idsToCheck.filter((id) => !existingRoleIds.has(Number(id)));
}

export async function findRolesNotInChannel(
    roleIds: number | number[],
    channelId: number
): Promise<number[]> {
    const idsToCheck = Array.isArray(roleIds) ? roleIds : [roleIds];
    const rolesInChannel = await Role.findAll({
        where: {
            id: idsToCheck,
            channel_id: channelId
        },
        attributes: ['id']
    });
    const rolesInChannelIds = new Set(rolesInChannel.map((role) => role.id));
    return idsToCheck.filter((id) => !rolesInChannelIds.has(id));
}