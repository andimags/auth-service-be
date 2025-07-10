export default async function paginate(
    instance: any,
    _page: number = 0,
    _limit: number = 10,
    search: { where?: any; include?: any } = {}
){
    let page = _page < 0 ? 0 : _page;
    const size = _limit;
    const rowCount = await instance.count({ where: search.where, include: search.include });
    const totalPages = Math.ceil(rowCount / size); // Use Math.ceil to round up

    if(page + 1 > totalPages){
        page = totalPages - 1
    }

    const { count, rows } = await instance.findAndCountAll({
        limit: size,
            offset: page * size,
            where: search.where,
            include: search.include,
        });
        

    return {
        count,
        rows,
        totalPages: totalPages,
        currentPage: page + 1
    }
}