import {
    BelongsTo,
    Column,
    CreatedAt,
    ForeignKey,
    Model,
    Table
} from 'sequelize-typescript';

import Policy from './Policy';
import Role from './Role';

@Table({
    tableName: 'role_policy',
    updatedAt: false
})
export default class RolePolicy extends Model {
    @ForeignKey(() => Policy)
    @Column
        policy_id: number;
    @BelongsTo(() => Policy, {
        onDelete: 'CASCADE'
    })
        policy: Policy;

    @ForeignKey(() => Role)
    @Column
        role_id: number;
    @BelongsTo(() => Role, {
        onDelete: 'CASCADE'
    })
        role: Role;

    @CreatedAt
        created_at: Date;
}
