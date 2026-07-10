import { BelongsToManyAddAssociationMixin, BelongsToManyAddAssociationsMixin, BelongsToManyGetAssociationsMixin, BelongsToManyRemoveAssociationMixin, BelongsToManyRemoveAssociationsMixin, BelongsToManySetAssociationsMixin, InferAttributes, InferCreationAttributes } from 'sequelize';
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
import Permission from './Permission';
import PolicyPermission from './PolicyPermission';
import Role from './Role';
import RolePolicy from './RolePolicy';
import { AppError } from '../../middlewares/errorHandler';
import { HttpStatus } from '../../constants/httpStatus';

@Table({
    tableName: 'policies',
})
export default class Policy extends Model {
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
    @BelongsToMany(() => Permission, () => PolicyPermission)
        permissions: Permission[];

    @BelongsToMany(() => Role, () => RolePolicy)
        roles: Role[];

    // Mixins
    declare getPermissions: BelongsToManyGetAssociationsMixin<Permission>;

    declare setPermissions: BelongsToManySetAssociationsMixin<
        Permission,
        number
    >;

    declare addPermissions: BelongsToManyAddAssociationsMixin<
        Permission,
        number
    >;
    declare addPermission: BelongsToManyAddAssociationMixin<Permission, number>;

    declare removePermissions: BelongsToManyRemoveAssociationsMixin<
        Permission,
        number
    >;
    declare removePermission: BelongsToManyRemoveAssociationMixin<
        Permission,
        number
    >;

    @BeforeCreate
    @BeforeUpdate
    static preventSystemPolicyMutation(policy: Policy) {
        if (policy.is_system) {
            throw new AppError(
                'System policies must be seeded and cannot be created or modified manually',
                HttpStatus.FORBIDDEN
            );
        }
    }

    @BeforeUpdate
    static preventSystemPolicySoftDelete(policy: Policy) {
        if (
            (policy.is_system) &&
            policy.changed('deleted_at')
        ) {
            throw new AppError(
                'System policies cannot be deleted',
                HttpStatus.FORBIDDEN
            );
        }
    }

    @BeforeDestroy
    static preventSystemPolicyHardDelete(policy: Policy) {
        if (policy.is_system) {
            throw new AppError(
                'System policies cannot be deleted',
                HttpStatus.FORBIDDEN
            );
        }
    } 
}

export type IPolicy = InferAttributes<Policy>;
export type IPolicyCreation = InferCreationAttributes<Policy>;