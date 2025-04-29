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
    Table,
    UpdatedAt
} from 'sequelize-typescript';

enum scopeType {
    read = 'read',
    write = 'write',
    admin = 'admin'
}

@DefaultScope(() => ({
    attributes: {
        exclude: ['admin_password']
    }
}))

@Table
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
    @Column(DataType.ENUM(...Object.values(scopeType)))
    scope: string;

    @AllowNull(false)
    @Column(DataType.INTEGER)
    sequence: number;

    @CreatedAt
    created_at: Date;

    @UpdatedAt
    updated_at: Date;

    @DeletedAt
    deleted_at: Date;
}
