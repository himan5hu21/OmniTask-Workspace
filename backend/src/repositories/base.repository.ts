// src/repositories/base.repository.ts
import { prisma } from '@/lib/database';

export class BaseRepository {
  private modelName: string;
  private hasSoftDelete: boolean;

  // Added hasSoftDelete flag (defaults to true for core models)
  constructor(modelName: string, hasSoftDelete: boolean = true) {
    this.modelName = modelName;
    this.hasSoftDelete = hasSoftDelete;
  }

  // Transaction client ke default prisma client mela vva mate
  private getClient(tx?: any) {
    return tx ? tx[this.modelName] : (prisma as any)[this.modelName];
  }

  // 1. CREATE
  async create(data: any, options: { include?: any; select?: any } = {}, tx?: any) {
    return this.getClient(tx).create({ data, ...options });
  }

  // 2. GET BY ID
  async getById(id: string | number, options: { include?: any; select?: any } = {}, tx?: any) {
    const where: any = { id };
    if (this.hasSoftDelete) where.deleted_at = null; // Only apply if true
    
    return this.getClient(tx).findFirst({
      where,
      ...options,
    });
  }

  // 3. GET ALL
  async getAll(options: { where?: any; include?: any; select?: any; orderBy?: any } = {}, tx?: any) {
    const where: any = { ...options.where };
    if (this.hasSoftDelete) where.deleted_at = null; // Only apply if true

    return this.getClient(tx).findMany({ ...options, where });
  }

  // 4. GET PAGINATION DATA
  async getPaginated(params: any, tx?: any) {
    const { page = 1, limit = 10, where = {}, search, searchFields = [], include, select, orderBy } = params;
    const skip = (page - 1) * limit;
    
    const queryWhere: any = { ...where };
    if (this.hasSoftDelete) queryWhere.deleted_at = null; // Only apply if true

    if (search && searchFields.length > 0) {
      const searchCondition = {
        OR: searchFields.map((field: string) => ({
          [field]: { contains: search, mode: 'insensitive' },
        })),
      };
      queryWhere.AND = queryWhere.AND ? [...queryWhere.AND, searchCondition] : [searchCondition];
    }

    const client = this.getClient(tx);

    // Run data fetching and counting in parallel
    const [data, total] = await Promise.all([
      client.findMany({ where: queryWhere, skip, take: limit, include, select, orderBy }),
      client.count({ where: queryWhere }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  // 5. UPDATE
  async update(idOrIds: string | number | (string | number)[], data: any, tx?: any) {
    const client = this.getClient(tx);
    const where: any = Array.isArray(idOrIds) ? { id: { in: idOrIds } } : { id: idOrIds };
    
    if (this.hasSoftDelete) where.deleted_at = null;

    if (Array.isArray(idOrIds)) {
      return client.updateMany({ where, data });
    } else {
      return client.update({ where, data });
    }
  }

  // 6. SOFT DELETE
  async delete(idOrIds: string | number | (string | number)[], tx?: any) {
    const client = this.getClient(tx);
    
    // If the model doesn't support soft delete, fall back to hard delete automatically!
    if (!this.hasSoftDelete) {
      return this.hardDelete(idOrIds, tx);
    }

    const now = new Date();
    if (Array.isArray(idOrIds)) {
      return client.updateMany({ where: { id: { in: idOrIds } }, data: { deleted_at: now } });
    } else {
      return client.update({ where: { id: idOrIds }, data: { deleted_at: now } });
    }
  }

  // 7. GET ONE
  async findOne(where: any, options: { include?: any; select?: any; orderBy?: any } = {}, tx?: any) {
    const queryWhere = { ...where };
    if (this.hasSoftDelete) queryWhere.deleted_at = null;

    return this.getClient(tx).findFirst({ where: queryWhere, ...options });
  }

  // 8. HARD DELETE
  async hardDelete(idOrIds: string | number | (string | number)[], tx?: any) {
    const client = this.getClient(tx);
    if (Array.isArray(idOrIds)) {
      return client.deleteMany({ where: { id: { in: idOrIds } } });
    } else {
      return client.delete({ where: { id: idOrIds } });
    }
  }
}