import {
    AfterCreate,
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
    Scopes,
    Table,
    UpdatedAt,
    BeforeUpdate
} from 'sequelize-typescript';

import {
    BelongsToManyGetAssociationsMixin,
    BelongsToSetAssociationMixin,
    HasManyAddAssociationsMixin
} from 'sequelize';
import Channel from './Channel';
import Permission from './Permission';
import RolePermission from './RolePermission';
import User from './User';
import UserRole from './UserRole';
import { RoleScopeType } from '../../constants/enums';

@Scopes(() => ({
  // includes
    withChannel: {
        include: [Channel]
    }
}))

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

    @AllowNull(false)
    @Column(DataType.INTEGER)
    level: number;

    @ForeignKey(() => Channel)
    @Column
    channel_id: number;

    @AllowNull(false)
    @Column(DataType.ENUM(...Object.values(RoleScopeType)))
    scope: string;

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

    // Mixins
    declare getPermissions: BelongsToManyGetAssociationsMixin<Permission>;
    declare setPermissions: BelongsToSetAssociationMixin<Permission, number>;
    declare addPermissions: HasManyAddAssociationsMixin<Permission, number>;

    // Hooks
    @AfterCreate
    static async assignToSuperadminUser(role: Role) {
        const user = await User.findOne({ where: { username: 'superadmin' } });

        await user?.addRoles([role]);
    }

    @BeforeUpdate
    static preventChannelIdUpdate(instance: Role) {
        if (instance.changed('channel_id')) {
        throw new Error("channel_id cannot be modified once set.");
        }
    }

}
