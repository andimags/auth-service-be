import { BelongsToManyGetAssociationsMixin } from 'sequelize';
import {
    AllowNull,
    AutoIncrement,
    BeforeCreate,
    BeforeDestroy,
    BeforeUpdate,
    BelongsToMany,
    Column,
    CreatedAt,
    DataType,
    Default,
    DefaultScope,
    DeletedAt,
    Model,
    PrimaryKey,
    Scopes,
    Table,
    UpdatedAt
} from 'sequelize-typescript';
import {
    PermissionAccessLevelType,
    PermissionScopeType
} from '../../constants/enums';
import { AppError } from '../../middlewares/errorHandler';
import Channel from './Channel';
import Role from './Role';
import RolePermission from './RolePermission';

@DefaultScope(() => ({
    attributes: {
        exclude: ['admin_password']
    }
}))
@Scopes(() => ({
    withChannel: {
        include: [
            {
                model: Channel,
                attributes: {
                    exclude: ['created_at', 'updated_at', 'deleted_at']
                }
            }
        ]
    }
}))
@Table({
    tableName: 'permissions',
    indexes: [
        {
            name: 'unique_ref_name_scope', // optional name
            unique: true,
            fields: ['ref_name', 'scope']
        }
    ]
})
export default class Permission extends Model {
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
    @Column(DataType.STRING)
    ref_name: string;

    @AllowNull(false)
    @Column(DataType.STRING)
    module: string;

    @AllowNull(false)
    @Default('channel')
    @Column(DataType.ENUM(...Object.values(PermissionScopeType)))
    scope: string;

    @AllowNull(false)
    @Column(DataType.ENUM(...Object.values(PermissionAccessLevelType)))
    access_level: string;

    @Column(DataType.INTEGER)
    sequence: number;

    @CreatedAt
    created_at: Date;

    @UpdatedAt
    updated_at: Date;

    @DeletedAt
    deleted_at: Date;

    @BelongsToMany(() => Role, () => RolePermission)
    roles: Role[];

    declare getRoles: BelongsToManyGetAssociationsMixin<Role>;

    @BeforeUpdate
    static preventGlobalScopeSoftDeletion(permission: Permission) {
        if (permission.scope === 'global' && permission.changed('deleted_at')) {
            throw new AppError(
                'Global scope permissions cannot be deleted',
                403
            );
        }
    }

    @BeforeUpdate
    @BeforeCreate
    static preventGlobalScopeModification(permission: Permission) {
        if (permission.scope === 'global') {
            throw new AppError(
                'Global scope permissions must be seeded. You cannot create or update a permission to have a global scope',
                403
            );
        }
    }

    @BeforeDestroy
    static preventGlobalScopeDeletion(permission: Permission) {
        if (permission.scope === 'global') {
            throw new AppError(
                'Global scope permissions cannot be deleted',
                403
            );
        }
    }
}
