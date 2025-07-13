import { Op } from 'sequelize';
import { UserStatusType } from '../constants/enums';

// not working yet
interface DateRangeFilter {
    field: string;
    startDate: string;
    endDate: string;
}

interface EnumFilter {
    field: string,
    value: string
}

interface SearchOptions {
    searchTerm?: string;
    stringFields?: string[];
    enumFilter?: EnumFilter[];
    dateRangeFilter?: DateRangeFilter[];
}

interface SortOptions {
    field?: string,
    desc?: boolean
}

export default async function paginate(
    instance: any,
    _page: number = 0,
    _limit: number = 10,
    searchOptions: SearchOptions = {},
    sortOptions: SortOptions = {}
) {
    let where: any = {};
    let filters: any[] = [];
    let page = _page < 0 ? 0 : _page;
    const size = _limit;
    const { stringFields, searchTerm, enumFilter } = searchOptions;

    if (Array.isArray(stringFields) && stringFields.length > 0 && searchTerm) {
        filters.push({
            [Op.or]: stringFields.map((field) => ({
                [field]: {
                    [Op.iLike]: `%${searchTerm}%`,
                },
            })),
        });
    }

    if (Array.isArray(enumFilter) && enumFilter.length > 0) {
        const userStatusValues: string[] = Object.values(UserStatusType);

        filters.push(
        ...enumFilter
            .filter((filter) => userStatusValues.includes(filter.value))
            .map((filter) => {
                const {field, value} = filter;

                return {
                    [field]: {
                        [Op.in]: value?.split(',')
                    }
                }
            })
        )
    }

    if (filters.length > 0) {
        where[Op.and] = filters;
    }

    const rowCount = await instance.count({ where });

    const totalPages = Math.ceil(rowCount / size);
    if (page + 1 > totalPages) {
        page = Math.max(totalPages - 1, 0);
    }

    let order: any;
    const allowedFields = Object.keys(instance.rawAttributes); // ['id', 'name', ...]

    if (sortOptions.field && allowedFields.includes(sortOptions.field)) {
        order = [[sortOptions.field, sortOptions?.desc ? 'DESC' : 'ASC']];
    }

    const { count, rows } = await instance.findAndCountAll({
        limit: size,
        offset: page * size,
        where,
        order,
    });

    return {
        count,
        rows,
        totalPages,
        currentPage: page + 1
    };
}
