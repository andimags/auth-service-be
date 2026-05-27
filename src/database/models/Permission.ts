import { BelongsToManyGetAssociationsMixin, InferAttributes, InferCreationAttributes } from 'sequelize';
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
    Unique,
    UpdatedAt
} from 'sequelize-typescript';
import {
    PermissionAccessLevelType
} from '../../constants/enums';
import { AppError } from '../../middlewares/errorHandler';
import Channel from './Channel';
import Policy from './Policy';
import PolicyPermission from './PolicyPermission';

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
    @Unique
    @Column(DataType.STRING)
    ref_name: string;

    @AllowNull(false)
    @Column(DataType.STRING)
    module: string;

    @AllowNull(false)
    @Column(DataType.ENUM(...Object.values(PermissionAccessLevelType)))
    access_level: string;

    @AllowNull(false)
    @Default(false)
    @Column(DataType.BOOLEAN)
    is_system: boolean;

    @CreatedAt
    created_at: Date;

    @UpdatedAt
    updated_at: Date;

    @DeletedAt
    deleted_at: Date;

    // Associatons
    @BelongsToMany(() => Policy, () => PolicyPermission)
    roles: Policy[];

    // Mixins
    declare getPolicies: BelongsToManyGetAssociationsMixin<Policy>;

    @BeforeUpdate
    static preventSystemPermissionSoftDeletion(permission: Permission) {
        if (permission.is_system && permission.changed('deleted_at')) {
            throw new AppError(
                'System permissions cannot be deleted',
                403
            );
        }
    }

    @BeforeUpdate
    @BeforeCreate
    static preventSystemPermissionModification(permission: Permission) {
        if (permission.is_system) {
            throw new AppError(
                'System permissions must be seeded and cannot be modified',
                403
            );
        }
    }

    @BeforeDestroy
    static preventSystemPermissionDeletion(permission: Permission) {
        if (permission.is_system) {
            throw new AppError(
                'System permissions cannot be deleted',
                403
            );
        }
    }
}

export type IPermission = InferAttributes<Permission>;
export type IPermissionCreation = InferCreationAttributes<Permission>;