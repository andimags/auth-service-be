import { Attributes, Includeable, Model, ModelStatic, Op, Order, WhereOptions } from 'sequelize';

interface DateRangeFilter {
  field: string;
  startDate: string;
  endDate: string;
}

interface EnumFilter {
  field: string;
  value: string;
  allowedValues: string[];
}

interface SearchOptions<M extends Model> {
  searchTerm?: string;
  stringFields?: string[];
  enumFilter?: EnumFilter[];
  dateRangeFilter?: DateRangeFilter[];
  baseWhere?: WhereOptions<Attributes<M>>; // allow external filters like { channel_id: 1 }
}

interface SortOptions {
  field?: string;
  desc?: boolean;
}

interface PaginatedResult<M extends Model> {
  count: number;
  rows: M[];
  totalPages: number;
  currentPage: number;
}

export default async function paginate<M extends Model>(
    instance: ModelStatic<M>,
    _page: number = 0,
    _limit: number = 10,
    searchOptions: SearchOptions<M> = {},
    sortOptions: SortOptions = {},
    include?: Includeable[]
): Promise<PaginatedResult<M>> {
    let page = _page < 0 ? 0 : _page;
    const size = _limit;

    const { stringFields, searchTerm, enumFilter, baseWhere = {} } = searchOptions;

    // --- Build filters ---
    const filters: WhereOptions<Attributes<M>>[] = [];

    // Search term filter
    if (Array.isArray(stringFields) && stringFields.length > 0 && searchTerm) {
        filters.push({
            [Op.or]: stringFields.map((field) => ({
                [field]: { [Op.iLike]: `%${searchTerm}%` },
            })),
        } as WhereOptions<Attributes<M>>);
    }

    // Enum filter
    if (Array.isArray(enumFilter) && enumFilter.length > 0) {
        filters.push(
            ...enumFilter
                .filter((filter) => filter.allowedValues.includes(filter.value))
                .map((filter) => ({
                    [filter.field]: { [Op.in]: filter.value.split(',') },
                } as WhereOptions<Attributes<M>>))
        );
    }

    // Merge where clause
    const where: WhereOptions<Attributes<M>> = filters.length > 0
        ? { ...baseWhere, [Op.and]: filters }
        : { ...baseWhere };

    // Count first
    const rowCount = await instance.count({ where });
    const totalPages = Math.ceil(rowCount / size);
    if (page + 1 > totalPages) {
        page = Math.max(totalPages - 1, 0);
    }

    // Sorting
    let order: Order | undefined;
    const allowedFields = Object.keys(instance.rawAttributes);
    if (sortOptions.field && allowedFields.includes(sortOptions.field)) {
        order = [[sortOptions.field, sortOptions?.desc ? 'DESC' : 'ASC']];
    }

    // Query
    const { count, rows } = await instance.findAndCountAll({
        limit: size,
        offset: page * size,
        where,
        order,
        include,
    });

    return {
        count,
        rows,
        totalPages,
        currentPage: page + 1,
    };
}
