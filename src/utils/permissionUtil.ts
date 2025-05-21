import Permission from "../database/models/Permission";
import { throwError } from "../middlewares/errorHandler";

export async function isPermissionOnGlobalRole(permissionRefName:string): Promise<any> {
    let isGlobal = false;

    const permission = await Permission.findOne({
        where: {
            ref_name: permissionRefName
        }
    });

    const roles = await permission?.getRoles();

    if (!roles) return throwError('Permission is not attached to any role', 404);

    for (const role of roles) {
        if (role.channel_id == null) {
            isGlobal = true;
            break;
        }
    }

    return isGlobal;
}
