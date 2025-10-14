import { Op } from "sequelize";

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

interface SearchOptions {
  searchTerm?: string;
  stringFields?: string[];
  enumFilter?: EnumFilter[];
  dateRangeFilter?: DateRangeFilter[];
  baseWhere?: Record<string, any>; // 👈 allow external filters like { channel_id: 1 }
}

interface SortOptions {
  field?: string;
  desc?: boolean;
}

export default async function paginate(
  instance: any,
  _page: number = 0,
  _limit: number = 10,
  searchOptions: SearchOptions = {},
  sortOptions: SortOptions = {},
  include?: any[]
) {
  let page = _page < 0 ? 0 : _page;
  const size = _limit;

  const { stringFields, searchTerm, enumFilter, baseWhere = {} } = searchOptions;

  // --- Build filters ---
  const filters: any[] = [];

  // Search term filter
  if (Array.isArray(stringFields) && stringFields.length > 0 && searchTerm) {
    filters.push({
      [Op.or]: stringFields.map((field) => ({
        [field]: { [Op.iLike]: `%${searchTerm}%` },
      })),
    });
  }

  // Enum filter
  if (Array.isArray(enumFilter) && enumFilter.length > 0) {
    filters.push(
      ...enumFilter
        .filter((filter) => filter.allowedValues.includes(filter.value))
        .map((filter) => ({
          [filter.field]: { [Op.in]: filter.value.split(",") },
        }))
    );
  }

  // Merge where clause
  const where: any = { ...baseWhere };
  if (filters.length > 0) {
    where[Op.and] = filters;
  }

  // Count first
  const rowCount = await instance.count({ where });
  const totalPages = Math.ceil(rowCount / size);
  if (page + 1 > totalPages) {
    page = Math.max(totalPages - 1, 0);
  }

  // Sorting
  let order: any;
  const allowedFields = Object.keys(instance.rawAttributes);
  if (sortOptions.field && allowedFields.includes(sortOptions.field)) {
    order = [[sortOptions.field, sortOptions?.desc ? "DESC" : "ASC"]];
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
