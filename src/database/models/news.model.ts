import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from "sequelize";

export type NewsStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export class News extends Model<
  InferAttributes<News>,
  InferCreationAttributes<News>
> {
  declare id: CreationOptional<string>;

  declare categoryId: string;
  declare authorId: string | null;

  declare title: string;
  declare slug: string;
  declare excerpt: string | null;
  declare content: string;
  declare thumbnailUrl: string | null;

  declare status: CreationOptional<NewsStatus>;
  declare isFeatured: CreationOptional<boolean>;
  declare viewCount: CreationOptional<number>;

  declare seoTitle: string | null;
  declare seoDescription: string | null;
  declare publishedAt: Date | null;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  static initModel(sequelize: Sequelize) {
    News.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },

        categoryId: {
          type: DataTypes.UUID,
          allowNull: false,
          field: "category_id",
        },

        authorId: {
          type: DataTypes.UUID,
          allowNull: true,
          field: "author_id",
        },

        title: {
          type: DataTypes.STRING,
          allowNull: false,
        },

        slug: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
        },

        excerpt: {
          type: DataTypes.TEXT,
          allowNull: true,
        },

        content: {
          type: DataTypes.TEXT,
          allowNull: false,
        },

        thumbnailUrl: {
          type: DataTypes.STRING,
          allowNull: true,
          field: "thumbnail_url",
        },

        status: {
          type: DataTypes.ENUM("DRAFT", "PUBLISHED", "ARCHIVED"),
          allowNull: false,
          defaultValue: "DRAFT",
        },

        isFeatured: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: "is_featured",
        },

        viewCount: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: "view_count",
        },

        seoTitle: {
          type: DataTypes.STRING,
          allowNull: true,
          field: "seo_title",
        },

        seoDescription: {
          type: DataTypes.TEXT,
          allowNull: true,
          field: "seo_description",
        },

        publishedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          field: "published_at",
        },

        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          field: "created_at",
        },

        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          field: "updated_at",
        },
      },
      {
        sequelize,
        tableName: "news",
        modelName: "News",
        underscored: true,
      },
    );

    return News;
  }
}
