import { Column, ForeignKey, Model, Table, CreatedAt, UpdatedAt } from 'sequelize-typescript';

import Role from './Role';
import User from './User';

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
}
