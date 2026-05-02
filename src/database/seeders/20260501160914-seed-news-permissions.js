"use strict";

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const permissions = [
      {
        name: "View News Categories",
        key: "news_categories.view",
        module: "news_categories",
        description: "View news categories permission",
      },
      {
        name: "Create News Categories",
        key: "news_categories.create",
        module: "news_categories",
        description: "Create news categories permission",
      },
      {
        name: "Update News Categories",
        key: "news_categories.update",
        module: "news_categories",
        description: "Update news categories permission",
      },
      {
        name: "Delete News Categories",
        key: "news_categories.delete",
        module: "news_categories",
        description: "Delete news categories permission",
      },

      {
        name: "View News",
        key: "news.view",
        module: "news",
        description: "View news permission",
      },
      {
        name: "Create News",
        key: "news.create",
        module: "news",
        description: "Create news permission",
      },
      {
        name: "Update News",
        key: "news.update",
        module: "news",
        description: "Update news permission",
      },
      {
        name: "Delete News",
        key: "news.delete",
        module: "news",
        description: "Delete news permission",
      },
      {
        name: "Publish News",
        key: "news.publish",
        module: "news",
        description: "Publish news permission",
      },
    ];

    /**
     * 1. Insert permissions safely
     * PostgreSQL version: ON CONFLICT DO NOTHING
     */
    for (const permission of permissions) {
      await queryInterface.sequelize.query(
        `
        INSERT INTO permissions (
          id,
          name,
          key,
          module,
          description,
          created_at,
          updated_at
        )
        VALUES (
          gen_random_uuid(),
          :name,
          :key,
          :module,
          :description,
          :createdAt,
          :updatedAt
        )
        ON CONFLICT ("key") DO NOTHING;
        `,
        {
          replacements: {
            name: permission.name,
            key: permission.key,
            module: permission.module,
            description: permission.description,
            createdAt: now,
            updatedAt: now,
          },
        },
      );
    }

    /**
     * 2. Get SUPERADMIN role
     */
    const [roleRows] = await queryInterface.sequelize.query(
      `
      SELECT id
      FROM roles
      WHERE slug = 'SUPERADMIN'
      LIMIT 1;
      `,
    );

    const superadminRole = roleRows[0];

    if (!superadminRole) {
      throw new Error(
        "SUPERADMIN role not found. Run foundation seeder first.",
      );
    }

    /**
     * 3. Get news permissions
     */
    const permissionKeys = permissions.map((permission) => permission.key);

    const [permissionRows] = await queryInterface.sequelize.query(
      `
      SELECT id, key
      FROM permissions
      WHERE key IN (:permissionKeys);
      `,
      {
        replacements: {
          permissionKeys,
        },
      },
    );

    /**
     * 4. Assign news permissions to SUPERADMIN safely
     */
    for (const permission of permissionRows) {
      await queryInterface.sequelize.query(
        `
        INSERT INTO role_permissions (
          role_id,
          permission_id,
          created_at
        )
        SELECT
          :roleId,
          :permissionId,
          :createdAt
        WHERE NOT EXISTS (
          SELECT 1
          FROM role_permissions
          WHERE role_id = :roleId
          AND permission_id = :permissionId
        );
        `,
        {
          replacements: {
            roleId: superadminRole.id,
            permissionId: permission.id,
            createdAt: now,
          },
        },
      );
    }
  },

  async down(queryInterface) {
    const permissionKeys = [
      "news_categories.view",
      "news_categories.create",
      "news_categories.update",
      "news_categories.delete",
      "news.view",
      "news.create",
      "news.update",
      "news.delete",
      "news.publish",
    ];

    /**
     * 1. Get permission IDs first
     */
    const [permissionRows] = await queryInterface.sequelize.query(
      `
      SELECT id
      FROM permissions
      WHERE key IN (:permissionKeys);
      `,
      {
        replacements: {
          permissionKeys,
        },
      },
    );

    const permissionIds = permissionRows.map((permission) => permission.id);

    /**
     * 2. Delete role permission relations first
     */
    if (permissionIds.length > 0) {
      await queryInterface.bulkDelete("role_permissions", {
        permission_id: permissionIds,
      });
    }

    /**
     * 3. Delete permissions
     */
    await queryInterface.bulkDelete("permissions", {
      key: permissionKeys,
    });
  },
};
