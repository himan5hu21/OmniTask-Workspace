// src/repositories/base.repository.ts
import { prisma } from '@/lib/database'; // Tamaru prisma client import karo

export class BaseRepository {
  private modelName: string;

  // Constructor ma model nu naam aapsu (e.g., 'user', 'event')
  constructor(modelName: string) {
    this.modelName = modelName;
  }

  // Transaction client ke default prisma client mela vva mate
  private getClient(tx?: any) {
    return tx ? tx[this.modelName] : (prisma as any)[this.modelName];
  }

  // 1. CREATE
  async create(data: any, options: { include?: any; select?: any } = {}, tx?: any) {
    return this.getClient(tx).create({
      data,
      ...options,
    });

  }

  // 2. GET BY ID
  async getById(id: string | number, options: { include?: any; select?: any } = {}, tx?: any) {
    return this.getClient(tx).findUnique({
      where: { id },
      ...options,
    });
  }

  // 3. GET ALL (Without Pagination)
  async getAll(options: { where?: any; include?: any; select?: any; orderBy?: any } = {}, tx?: any) {
    return this.getClient(tx).findMany(options);
  }

  // 4. GET PAGINATION DATA (With Search & Filters)
  async getPaginated(
    params: {
      page?: number;
      limit?: number;
      where?: any;
      search?: string;
      searchFields?: string[];
      include?: any;
      select?: any;
      orderBy?: any;
    },
    tx?: any
  ) {
    const {
      page = 1,
      limit = 10,
      where = {},
      search,
      searchFields = [],
      include,
      select,
      orderBy,
    } = params;

    const skip = (page - 1) * limit;
    const queryWhere: any = { ...where };

    // Search logic (ILike search for given fields)
    if (search && searchFields.length > 0) {
      const searchCondition = {
        OR: searchFields.map((field) => ({
          [field]: { contains: search, mode: 'insensitive' },
        })),
      };

      // Existing 'AND' hoy to aema append karo, nahitar navo array banavo
      queryWhere.AND = queryWhere.AND 
        ? [...queryWhere.AND, searchCondition] 
        : [searchCondition];
    }

    const client = this.getClient(tx);

    // Run data fetching and counting in parallel
    const [data, total] = await Promise.all([
      client.findMany({
        where: queryWhere,
        skip,
        take: limit,
        include,
        select, // Prisma throws error if you use BOTH include and select, user should pass only one!
        orderBy,
      }),
      client.count({ where: queryWhere }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // 5. UPDATE (Single ID or Array of IDs)
  async update(idOrIds: string | number | (string | number)[], data: any, tx?: any) {
    const client = this.getClient(tx);

    if (Array.isArray(idOrIds)) {
      // Bulk Update
      return client.updateMany({
        where: { id: { in: idOrIds } },
        data,
      });
    } else {
      // Single Update
      return client.update({
        where: { id: idOrIds },
        data,
      });
    }
  }

  // 6. DELETE (Single ID or Array of IDs)
  async delete(idOrIds: string | number | (string | number)[], tx?: any) {
    const client = this.getClient(tx);

    if (Array.isArray(idOrIds)) {
      // Bulk Delete
      return client.deleteMany({
        where: { id: { in: idOrIds } },
      });
    } else {
      // Single Delete
      return client.delete({
        where: { id: idOrIds },
      });
    }
  }

  // 7. GET ONE (By any field like email, slug, etc.)
  async findOne(where: any, options: { include?: any; select?: any; orderBy?: any } = {}, tx?: any) {
    return this.getClient(tx).findFirst({
      where,
      ...options,
    });
  }
}