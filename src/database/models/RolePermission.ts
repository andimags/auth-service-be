import { Column, ForeignKey, Model, Table, CreatedAt } from 'sequelize-typescript';

import Role from './Role';
import Permission from './Permission';

@Table({
    tableName: 'role_permission'
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
