export interface IRole {
    id: number;
    name: string;
    description: string;
    ref_name: string;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}
