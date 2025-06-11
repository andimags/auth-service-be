import Role from "../database/models/Role";

export async function isRoleAssignable(
    roleIds: number | number[],
    channelId: number | null,
    isGlobalRole: boolean = false
): Promise<boolean> {
    // Global roles can assign any roles
    if (isGlobalRole) {
        return true;
    }

    let role = null;

    // Channel-based roles can only assign roles within their channel
    if (Array.isArray(roleIds)) {
        if((roleIds.length > 1)){
            return false;
        }
        role = await Role.findByPk(roleIds[0]);
    }
    else{
        role = await Role.findByPk(roleIds);
    }
    
    return role?.channel_id === channelId;
}

export async function findMissingRoles(roleIds: number | number[]): Promise<number[]>{
     // Returns array of role IDs that don't exist
    roleIds = Array.isArray(roleIds) ? roleIds : [roleIds];
    const existingRoles = await Role.findAll({ where: { id: roleIds } });
    const existingIds = existingRoles.map(role => role.id);
    
    return roleIds.filter(id => !existingIds.includes(id));
}