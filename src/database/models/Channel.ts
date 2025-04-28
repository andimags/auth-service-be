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

@DefaultScope(() => ({
    attributes: {
        exclude: ['admin_password']
    }
}))

@Table
export default class Channel extends Model {
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
    admin_username: string;

    @AllowNull(false)
    @Column(DataType.STRING)
    admin_password: string;

    @AllowNull(false)
    @Column(DataType.STRING)
    admin_email: string;

    @CreatedAt
    created_at: Date;

    @UpdatedAt
    updated_at: Date;

    @DeletedAt
    deleted_at: Date;
}
