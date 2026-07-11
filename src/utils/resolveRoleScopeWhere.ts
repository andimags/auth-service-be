import { WhereOptions } from 'sequelize';
import { AppError } from '../middlewares/errorHandler';
import { HttpStatus } from '../constants/httpStatus';
import { RoleScopeFilter } from '../types';

/**
 * Builds the Sequelize `where` clause used to filter a user's Roles when walking
 * User -> Role -> Policy[ -> Permission] (see permissionService.getUserPermissions
 * and policyService.getUserPolicies, which were previously two copies of this same
 * validation + filter-building logic). `'*'` matches roles of any scope; `'global'`/
 * `'channel'` filter to that scope, and `'channel'` additionally requires and filters
 * by channelId.
 */
export function resolveRoleScopeWhere(
    roleScope: RoleScopeFilter,
    channelId?: number
): WhereOptions {
    if (roleScope === 'channel' && !channelId) {
        throw new AppError('channelId is required when roleScope is channel', HttpStatus.BAD_REQUEST);
    }

    const whereOptions: WhereOptions = {};

    if (roleScope !== '*') {
        whereOptions.scope = roleScope;
    }

    if (roleScope === 'channel') {
        whereOptions.channel_id = channelId!;
    }

    return whereOptions;
}
