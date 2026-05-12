import {
    Column,
    ForeignKey,
    Model,
    Table,
    CreatedAt,
    BeforeCreate
} from 'sequelize-typescript';

import Role from './Role';
import User from './User';
import { AppError } from '../../middlewares/errorHandler';

@Table({
    tableName: 'user_role',
    updatedAt: false
})
export default class UserRole extends Model {
    @ForeignKey(() => User)
    @Column
    user_id: number;

    @ForeignKey(() => Role)
    @Column
    role_id: number;

    @CreatedAt
    created_at: Date;

    @BeforeCreate
    static async preventRoleAssignmentToSuperadminUser(userRole: UserRole) {
        const user = await User.findByPk(userRole.user_id);

        if (user?.is_superadmin) {
            throw new AppError('Cannot assign roles to a superadmin user as they already have full access by default', 403);
        }
    }
}
