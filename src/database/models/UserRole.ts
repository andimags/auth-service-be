import {
    Column,
    ForeignKey,
    Model,
    Table,
    CreatedAt,
    BelongsTo
} from 'sequelize-typescript';

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
    @BelongsTo(() => User, {
        onDelete: 'CASCADE'
    })
        user: User;

    @ForeignKey(() => Role)
    @Column
        role_id: number;
    @BelongsTo(() => Role, {
        onDelete: 'CASCADE'
    })
        role: Role;

    @CreatedAt
        created_at: Date;
}