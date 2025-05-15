import {
    AllowNull,
    AutoIncrement,
    BelongsTo,
    BelongsToMany,
    Column,
    CreatedAt,
    DataType,
    DeletedAt,
    ForeignKey,
    Model,
    PrimaryKey,
    Table,
    UpdatedAt
} from 'sequelize-typescript';

import Channel from './Channel';
import Permission from './Permission';
import RolePermission from './RolePermission';
import User from './User';
import UserRole from './UserRole';

@Table({
    tableName: 'roles'
})
export default class Role extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id: number;

    @AllowNull(false)
    @Column(DataType.STRING)
    name: string;

    @Column(DataType.STRING)
    description: string;

    @Column(DataType.STRING)
    ref_name: string;

    @Column(DataType.INTEGER)
    level: number;

    @ForeignKey(() => Channel)
    @Column
    channel_id: number;

    @CreatedAt
    created_at: Date;

    @UpdatedAt
    updated_at: Date;

    @DeletedAt
    deleted_at: Date;

    // Associations
    @BelongsTo(() => Channel, {
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
        // set hooks to true if you have model-level hooks (like beforeDestroy, afterUpdate, etc.)
        // hooks: true
    })
    channel: Channel;

    @BelongsToMany(() => User, () => UserRole)
    users: User[];

    @BelongsToMany(() => Permission, () => RolePermission)
    permissions: Permission[];
}
