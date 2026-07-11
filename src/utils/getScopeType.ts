import { PermissionScopeType } from '../constants/enums';
import { RoleScopeFilter } from '../types';

export function getScopeType(isGlobalScope: boolean | undefined): RoleScopeFilter {
    return isGlobalScope ? PermissionScopeType.global : PermissionScopeType.channel;
}
