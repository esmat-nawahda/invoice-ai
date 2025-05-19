import { Model, Document, FilterQuery, UpdateQuery } from "mongoose";
import { NotFoundError } from "../utils/errors/AppError";

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sort?: string;
  select?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export class BaseService<T extends Document> {
  constructor(protected model: Model<T>) {}

  async findAll(filter: FilterQuery<T> = {}): Promise<T[]> {
    return this.model.find(filter);
  }

  async findAllPaginated(
    filter: FilterQuery<T> = {},
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<T>> {
    const { page = 1, limit = 10, sort = "-createdAt", select = "" } = options;

    const skip = (page - 1) * limit;

    // Parse sort string into object
    const sortObj = sort.split(",").reduce((acc: any, curr: string) => {
      const [field, order] = curr.startsWith("-")
        ? [curr.substring(1), -1]
        : [curr, 1];
      acc[field] = order;
      return acc;
    }, {});

    // Parse select string into object
    const selectObj = select
      .split(",")
      .filter(Boolean)
      .reduce((acc: any, curr: string) => {
        acc[curr] = 1;
        return acc;
      }, {});

    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .select(selectObj)
        .sort(sortObj)
        .skip(skip)
        .limit(limit),
      this.model.countDocuments(filter),
    ]);

    const pages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        pages,
      },
    };
  }

  async findById(id: string): Promise<T> {
    const doc = await this.model.findById(id);
    if (!doc) {
      throw new NotFoundError("Document not found");
    }
    return doc;
  }

  async findOne(filter: FilterQuery<T>): Promise<T | null> {
    return this.model.findOne(filter);
  }

  async create(data: Partial<T>): Promise<T> {
    return this.model.create(data);
  }

  async update(id: string, data: UpdateQuery<T>): Promise<T> {
    const doc = await this.model.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    if (!doc) {
      throw new NotFoundError("Document not found");
    }
    return doc;
  }

  async delete(id: string): Promise<void> {
    const doc = await this.model.findByIdAndDelete(id);
    if (!doc) {
      throw new NotFoundError("Document not found");
    }
  }

  async exists(filter: FilterQuery<T>): Promise<boolean> {
    const count = await this.model.countDocuments(filter);
    return count > 0;
  }

  async count(filter: FilterQuery<T> = {}): Promise<number> {
    return this.model.countDocuments(filter);
  }
}
