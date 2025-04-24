import {
    AllowNull,
    AutoIncrement,
    Column,
    CreatedAt,
    DataType,
    DeletedAt,
    Model,
    PrimaryKey,
    Table,
    UpdatedAt
} from 'sequelize-typescript';

@Table
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
    @Column(DataType.STRING)
    ref_name: string;

    @CreatedAt
    created_at: Date;

    @UpdatedAt
    updated_at: Date;

    @DeletedAt
    deleted_at: Date;
}
