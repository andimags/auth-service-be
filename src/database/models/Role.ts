import {
    AllowNull,
    AutoIncrement,
    BeforeUpdate,
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
    Unique
} from 'sequelize-typescript';

import {
    BelongsToManyAddAssociationMixin,
    BelongsToManyAddAssociationsMixin,
    BelongsToManyGetAssociationsMixin,
    BelongsToManyRemoveAssociationMixin,
    BelongsToManyRemoveAssociationsMixin,
    BelongsToManySetAssociationsMixin,
    InferAttributes,
    InferCreationAttributes
} from 'sequelize';
import { RoleScopeType } from '../../constants/enums';
import Channel from './Channel';
import Policy from './Policy';
import RolePolicy from './RolePolicy';
import User from './User';
import UserRole from './UserRole';

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

    @AllowNull(false)
    @Unique
    @Column(DataType.STRING)
    ref_name: string;

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
        onDelete: 'CASCADE',
    })
    channel: Channel;

    @BelongsToMany(() => User, () => UserRole)
    users: User[];

    @BelongsToMany(() => Policy, () => RolePolicy)
    policies: Policy[];

    // Mixins
    declare getPolicies: BelongsToManyGetAssociationsMixin<Policy>;

    declare setPolicies: BelongsToManySetAssociationsMixin<Policy, number>;

    declare addPolicies: BelongsToManyAddAssociationsMixin<Policy, number>;
    declare addPolicy: BelongsToManyAddAssociationMixin<Policy, number>;

    declare removePolicies: BelongsToManyRemoveAssociationsMixin<Policy, number>;
    declare removePolicy: BelongsToManyRemoveAssociationMixin<Policy, number>;

    @BeforeUpdate
    static preventChannelIdUpdate(instance: Role) {
        if (instance.changed('channel_id')) {
            throw new Error('channel_id cannot be modified once set.');
        }
    }
}

export type IRole = InferAttributes<Role>;
export type IRoleCreation = InferCreationAttributes<Role>;