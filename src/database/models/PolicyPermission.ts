import {
    BelongsTo,
    Column,
    CreatedAt,
    ForeignKey,
    Model,
    Table
} from 'sequelize-typescript';

import Permission from './Permission';
import Policy from './Policy';

@Table({
    tableName: 'policy_permission',
    updatedAt: false
})
export default class PolicyPermission extends Model {
    @ForeignKey(() => Policy)
    @Column
        policy_id: number;
    @BelongsTo(() => Policy, {
        onDelete: 'CASCADE'
    })
        policy: Policy;

    @ForeignKey(() => Permission)
    @Column
        permission_id: number;
    @BelongsTo(() => Permission, {
        onDelete: 'CASCADE'
    })
        permission: Permission;

    @CreatedAt
        created_at: Date;
}
