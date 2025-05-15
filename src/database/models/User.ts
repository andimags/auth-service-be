import { BelongsToGetAssociationMixin, BelongsToSetAssociationMixin, HasManyAddAssociationsMixin } from 'sequelize';
import {
    AllowNull,
    AutoIncrement,
    BelongsToMany,
    Column,
    CreatedAt,
    DataType,
    Default,
    DeletedAt,
    Model,
    PrimaryKey,
    Table,
    UpdatedAt
} from 'sequelize-typescript';
import Role from './Role';
import UserRole from './UserRole';

enum statusType {
    active = 'active',
    inactive = 'inactive'
}

@Table({
    tableName: 'users'
})
export default class User extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id: number;

    @AllowNull(false)
    @Column(DataType.STRING)
    username: string;

    @AllowNull(false)
    @Column(DataType.STRING)
    email: string;

    @AllowNull(false)
    @Column(DataType.STRING)
    first_name: string;

    @AllowNull(false)
    @Column(DataType.STRING)
    last_name: string;

    @AllowNull(false)
    @Default('active')
    @Column(DataType.ENUM(...Object.values(statusType)))
    status: string;

    @AllowNull(false)
    @Column(DataType.STRING)
    password: string;

    @CreatedAt
    created_at: Date;

    @UpdatedAt
    updated_at: Date;

    @DeletedAt
    deleted_at: Date;

    @BelongsToMany(() => Role, () => UserRole)
    roles: Role[];

    declare getRoles: BelongsToGetAssociationMixin<Role>;
    declare setRoles: BelongsToSetAssociationMixin<Role, number>;
    declare addRoles: HasManyAddAssociationsMixin<Role, number>;
}
