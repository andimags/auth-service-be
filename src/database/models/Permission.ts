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
    PermissionAccessLevelType
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

    // Associations
    @BelongsToMany(() => Policy, () => PolicyPermission)
        policies: Policy[];

    // Mixins
    declare getPolicies: BelongsToManyGetAssociationsMixin<Policy>;

    @BeforeCreate
    @BeforeUpdate
    static preventSystemPermissionMutation(permission: Permission) {
        if (permission.is_system) {
            throw new AppError(
                'System permissions must be seeded and cannot be created or modified manually',
                403
            );
        }
    }

    @BeforeUpdate
    static preventSystemPermissionSoftDelete(permission: Permission) {
        if (
            (permission.is_system) &&
            permission.changed('deleted_at')
        ) {
            throw new AppError(
                'System permissions cannot be deleted',
                403
            );
        }
    }

    @BeforeDestroy
    static preventSystemPermissionHardDelete(permission: Permission) {
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