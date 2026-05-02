"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("news", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
        primaryKey: true,
        allowNull: false,
      },

      category_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "news_categories",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },

      author_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },

      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      slug: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },

      excerpt: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },

      thumbnail_url: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      status: {
        type: Sequelize.ENUM("DRAFT", "PUBLISHED", "ARCHIVED"),
        allowNull: false,
        defaultValue: "DRAFT",
      },

      is_featured: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      view_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      seo_title: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      seo_description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      published_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },

      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.addIndex("news", ["category_id"]);
    await queryInterface.addIndex("news", ["author_id"]);
    await queryInterface.addIndex("news", ["slug"], {
      unique: true,
    });
    await queryInterface.addIndex("news", ["status"]);
    await queryInterface.addIndex("news", ["is_featured"]);
    await queryInterface.addIndex("news", ["published_at"]);
    await queryInterface.addIndex("news", ["created_at"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("news");
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_news_status";',
    );
  },
};
