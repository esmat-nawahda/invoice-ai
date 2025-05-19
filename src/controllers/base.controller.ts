import { Request, Response, NextFunction } from "express";
import { Model, Document, FilterQuery } from "mongoose";
import { NotFoundError } from "../utils/errors/AppError";
import { asyncHandler } from "../middlewares/error.middleware";
import { PaginationOptions } from "../services/base.service";
import { BaseService } from "../services/base.service";

export class BaseController<T extends Document> {
  protected service: BaseService<T>;

  constructor(protected model: Model<T>) {
    this.service = new BaseService<T>(model);
  }

  getAll = asyncHandler(async (req: Request, res: Response) => {
    const docs = await this.model.find();
    res.status(200).json({
      status: "success",
      results: docs.length,
      data: docs,
    });
  });

  getAllPaginated = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, sort, select, ...filterParams } = req.query;

    const options: PaginationOptions = {
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      sort: sort as string,
      select: select as string,
    };

    const filter: FilterQuery<T> = {};
    Object.entries(filterParams).forEach(([key, value]) => {
      if (value !== undefined) {
        filter[key as keyof T] = value as any;
      }
    });

    const result = await this.service.findAllPaginated(filter, options);

    res.status(200).json({
      status: "success",
      data: result.data,
      pagination: result.pagination,
    });
  });

  getOne = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const doc = await this.model.findById(req.params.id);

      if (!doc) {
        return next(new NotFoundError("No document found with that ID"));
      }

      res.status(200).json({
        status: "success",
        data: doc,
      });
    }
  );

  create = asyncHandler(async (req: Request, res: Response) => {
    const doc = await this.model.create(req.body);

    res.status(201).json({
      status: "success",
      data: doc,
    });
  });

  update = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const doc = await this.model.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });

      if (!doc) {
        return next(new NotFoundError("No document found with that ID"));
      }

      res.status(200).json({
        status: "success",
        data: doc,
      });
    }
  );

  delete = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const doc = await this.model.findByIdAndDelete(req.params.id);

      if (!doc) {
        return next(new NotFoundError("No document found with that ID"));
      }

      res.status(204).json({
        status: "success",
        data: null,
      });
    }
  );
}
