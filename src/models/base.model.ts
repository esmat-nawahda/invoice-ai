import { Document, Model, Schema, model } from "mongoose";

export interface BaseDocument extends Document {
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  deletedAt?: Date;
}

export interface BaseModel<T extends BaseDocument> extends Model<T> {
  findActive(): Promise<T[]>;
  findByIdActive(id: string): Promise<T | null>;
  softDelete(id: string): Promise<T | null>;
  restore(id: string): Promise<T | null>;
}

export const createBaseSchema = <T extends BaseDocument>() => {
  const schema = new Schema<T>(
    {
      isDeleted: {
        type: Boolean,
        default: false,
      },
      deletedAt: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,
      toJSON: {
        virtuals: true,
        transform: (_, ret) => {
          delete ret.__v;
          delete ret.isDeleted;
          delete ret.deletedAt;
          return ret;
        },
      },
      toObject: {
        virtuals: true,
        transform: (_, ret) => {
          delete ret.__v;
          delete ret.isDeleted;
          delete ret.deletedAt;
          return ret;
        },
      },
    }
  );

  // Add indexes
  schema.index({ createdAt: -1 });
  schema.index({ updatedAt: -1 });
  schema.index({ isDeleted: 1 });

  // Add static methods
  schema.statics.findActive = function () {
    return this.find({ isDeleted: false });
  };

  schema.statics.findByIdActive = function (id: string) {
    return this.findOne({ _id: id, isDeleted: false });
  };

  schema.statics.softDelete = async function (id: string) {
    return this.findByIdAndUpdate(
      id,
      {
        isDeleted: true,
        deletedAt: new Date(),
      },
      { new: true }
    );
  };

  schema.statics.restore = async function (id: string) {
    return this.findByIdAndUpdate(
      id,
      {
        isDeleted: false,
        deletedAt: null,
      },
      { new: true }
    );
  };

  return schema;
};
