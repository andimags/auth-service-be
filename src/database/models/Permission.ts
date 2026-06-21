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
    DeletedAt,
    Model,
    PrimaryKey,
    Table,
    Unique,
    UpdatedAt
} from 'sequelize-typescript';
import {
    PermissionAccessLevelType,
    PermissionNamespaceType
} from '../../constants/enums';
import { AppError } from '../../middlewares/errorHandler';
import Policy from './Policy';
import PolicyPermission from './PolicyPermission';

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
    @Unique('unique_ref_name_namespace')
    @Column(DataType.STRING)
    ref_name: string;

    @AllowNull(false)
    @Column(DataType.STRING)
    module: string;

    @AllowNull(false)
    @Column(DataType.ENUM(...Object.values(PermissionAccessLevelType)))
    access_level: string;

    @AllowNull(false)
    @Default('app')
    @Unique('unique_ref_name_namespace')
    @Column(DataType.ENUM(...Object.values(PermissionNamespaceType)))
    namespace: string;

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

    @BeforeCreate
    @BeforeUpdate
    static preventCoreOrSystemPermissionMutation(permission: Permission) {
        if (permission.is_system || permission.namespace === 'auth') {
            throw new AppError(
                'Auth-core or system permissions must be seeded and cannot be created or modified manually',
                403
            );
        }
    }

    @BeforeUpdate
    static preventCoreOrSystemPermissionSoftDelete(permission: Permission) {
        if (
            (permission.is_system || permission.namespace === 'auth') &&
            permission.changed('deleted_at')
        ) {
            throw new AppError(
                'Auth-core or system permissions cannot be deleted',
                403
            );
        }
    }

    @BeforeDestroy
    static preventCoreOrSystemPermissionHardDelete(permission: Permission) {
        if (permission.is_system || permission.namespace === 'auth') {
            throw new AppError(
                'Auth-core or system permissions cannot be deleted',
                403
            );
        }
    }
}

export type IPermission = InferAttributes<Permission>;
export type IPermissionCreation = InferCreationAttributes<Permission>;