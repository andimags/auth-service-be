import {
    AllowNull,
    AutoIncrement,
    Column,
    CreatedAt,
    DataType,
    DefaultScope,
    DeletedAt,
    Model,
    PrimaryKey,
    Scopes,
    Table,
    UpdatedAt,
    BelongsToMany,
    Default,
    BeforeUpdate,
    BeforeCreate,
    BeforeDestroy
} from 'sequelize-typescript';
import Channel from './Channel';
import { BelongsToManyGetAssociationsMixin } from 'sequelize';
import Role from './Role';
import RolePermission from './RolePermission';
import { PermissionAccessLevelType, PermissionScopeType } from '../../constants/enums';
import { AppError } from '../../middlewares/errorHandler';

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
    tableName: 'permissions'
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
