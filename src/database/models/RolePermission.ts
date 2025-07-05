import {
    Column,
    CreatedAt,
    ForeignKey,
    Model,
    Table
} from 'sequelize-typescript';

import Permission from './Permission';
import Role from './Role';

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
}
