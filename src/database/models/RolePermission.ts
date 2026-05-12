import {
    BeforeCreate,
    Column,
    CreatedAt,
    ForeignKey,
    Model,
    Table
} from 'sequelize-typescript';

import Permission from './Permission';
import Role from './Role';
import { AppError } from '../../middlewares/errorHandler';

@Table({
    tableName: 'role_permission',
    updatedAt: false
})
export default class RolePermission extends Model {
    @ForeignKey(() => Role)
    @Column
    role_id: number;

    @ForeignKey(() => Permission)
    @Column
    permission_id: number;

    @CreatedAt
    created_at: Date;

    @BeforeCreate
    static async preventPermissionAssignmentToSuperadminRole(userRole: RolePermission) {
        const role = await Role.findByPk(userRole.role_id);

        if (role?.is_superadmin) {
            throw new AppError('Cannot assign permissions to a superadmin role as it already has full access by default', 403);
        }
    }
}
