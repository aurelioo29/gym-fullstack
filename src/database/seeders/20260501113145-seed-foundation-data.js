"use strict";

const bcrypt = require("bcryptjs");

const now = new Date();

const roles = [
  {
    name: "Superadmin",
    slug: "SUPERADMIN",
    description: "Full system access",
    is_active: true,
  },
  {
    name: "Admin",
    slug: "ADMIN",
    description: "Gym admin dashboard access",
    is_active: true,
  },
  {
    name: "Customer",
    slug: "CUSTOMER",
    description: "Gym customer mobile app access",
    is_active: true,
  },
  {
    name: "Trainer",
    slug: "TRAINER",
    description: "Personal trainer mobile app access",
    is_active: true,
  },
];

const permissions = [
  // Dashboard
  ["View Dashboard", "dashboard.view", "dashboard"],

  // Users
  ["View Users", "users.view", "users"],
  ["Create Users", "users.create", "users"],
  ["Update Users", "users.update", "users"],
  ["Delete Users", "users.delete", "users"],
  ["Update User Status", "users.update_status", "users"],

  // Roles
  ["View Roles", "roles.view", "roles"],
  ["Create Roles", "roles.create", "roles"],
  ["Update Roles", "roles.update", "roles"],
  ["Delete Roles", "roles.delete", "roles"],
  ["Assign Role Permissions", "roles.assign_permissions", "roles"],

  // Permissions
  ["View Permissions", "permissions.view", "permissions"],
  ["Create Permissions", "permissions.create", "permissions"],
  ["Update Permissions", "permissions.update", "permissions"],
  ["Delete Permissions", "permissions.delete", "permissions"],

  // Customer Profiles
  ["View Customer Profiles", "customer_profiles.view", "customer_profiles"],
  ["Update Customer Profiles", "customer_profiles.update", "customer_profiles"],

  // Trainer Profiles
  ["View Trainer Profiles", "trainer_profiles.view", "trainer_profiles"],
  ["Update Trainer Profiles", "trainer_profiles.update", "trainer_profiles"],
  ["Review Trainer Profiles", "trainer_profiles.review", "trainer_profiles"],
  ["Approve Trainers", "trainer_profiles.approve", "trainer_profiles"],
  ["Reject Trainers", "trainer_profiles.reject", "trainer_profiles"],

  // Trainer Assignments
  [
    "View Trainer Assignments",
    "trainer_assignments.view",
    "trainer_assignments",
  ],
  [
    "Create Trainer Assignments",
    "trainer_assignments.create",
    "trainer_assignments",
  ],
  [
    "Update Trainer Assignments",
    "trainer_assignments.update",
    "trainer_assignments",
  ],
  [
    "Delete Trainer Assignments",
    "trainer_assignments.delete",
    "trainer_assignments",
  ],

  // Gym Info
  ["View Gym Info", "gym_info.view", "gym_info"],
  ["Update Gym Info", "gym_info.update", "gym_info"],

  // General Settings
  ["View General Settings", "settings.view", "settings"],
  ["Update General Settings", "settings.update", "settings"],

  // Notifications - Dashboard internal notifications
  ["View Notifications", "notifications.view", "notifications"],
  ["Create Notifications", "notifications.create", "notifications"],
  ["Update Notifications", "notifications.update", "notifications"],
  ["Delete Notifications", "notifications.delete", "notifications"],
  ["Mark Notifications Read", "notifications.mark_read", "notifications"],

  // Push Notifications - Mobile Flutter feed
  ["View Push Notifications", "push_notifications.view", "push_notifications"],
  [
    "Create Push Notifications",
    "push_notifications.create",
    "push_notifications",
  ],
  [
    "Update Push Notifications",
    "push_notifications.update",
    "push_notifications",
  ],
  [
    "Delete Push Notifications",
    "push_notifications.delete",
    "push_notifications",
  ],
  [
    "Publish Push Notifications",
    "push_notifications.publish",
    "push_notifications",
  ],
  [
    "Cancel Push Notifications",
    "push_notifications.cancel",
    "push_notifications",
  ],

  // News Categories
  ["View News Categories", "news_categories.view", "news_categories"],
  ["Create News Categories", "news_categories.create", "news_categories"],
  ["Update News Categories", "news_categories.update", "news_categories"],
  ["Delete News Categories", "news_categories.delete", "news_categories"],

  // News
  ["View News", "news.view", "news"],
  ["Create News", "news.create", "news"],
  ["Update News", "news.update", "news"],
  ["Delete News", "news.delete", "news"],
  ["Publish News", "news.publish", "news"],

  // Membership Plans
  ["View Membership Plans", "membership_plans.view", "membership_plans"],
  ["Create Membership Plans", "membership_plans.create", "membership_plans"],
  ["Update Membership Plans", "membership_plans.update", "membership_plans"],
  ["Delete Membership Plans", "membership_plans.delete", "membership_plans"],

  // Member Memberships / Offline Transactions
  ["View Member Memberships", "member_memberships.view", "member_memberships"],
  [
    "Create Member Memberships",
    "member_memberships.create",
    "member_memberships",
  ],
  [
    "Update Member Memberships",
    "member_memberships.update",
    "member_memberships",
  ],
  [
    "Delete Member Memberships",
    "member_memberships.delete",
    "member_memberships",
  ],

  // Services
  ["View Services", "services.view", "services"],
  ["Create Services", "services.create", "services"],
  ["Update Services", "services.update", "services"],
  ["Delete Services", "services.delete", "services"],

  // Service Schedules
  ["View Service Schedules", "service_schedules.view", "service_schedules"],
  ["Create Service Schedules", "service_schedules.create", "service_schedules"],
  ["Update Service Schedules", "service_schedules.update", "service_schedules"],
  ["Delete Service Schedules", "service_schedules.delete", "service_schedules"],
  ["Cancel Service Schedules", "service_schedules.cancel", "service_schedules"],

  // Bookings
  ["View Bookings", "bookings.view", "bookings"],
  ["Create Bookings", "bookings.create", "bookings"],
  ["Update Bookings", "bookings.update", "bookings"],
  ["Delete Bookings", "bookings.delete", "bookings"],
  ["Cancel Bookings", "bookings.cancel", "bookings"],

  // Logs
  ["View Audit Logs", "audit_logs.view", "audit_logs"],
  ["View Activity Logs", "activity_logs.view", "activity_logs"],
];

module.exports = {
  async up(queryInterface) {
    /**
     * 1. Seed roles
     */
    await queryInterface.bulkInsert(
      "roles",
      roles.map((role) => ({
        ...role,
        created_at: now,
        updated_at: now,
      })),
      {},
    );

    /**
     * 2. Seed permissions
     */
    await queryInterface.bulkInsert(
      "permissions",
      permissions.map(([name, key, module]) => ({
        name,
        key,
        module,
        description: `${name} permission`,
        created_at: now,
        updated_at: now,
      })),
      {},
    );

    /**
     * 3. Get inserted roles and permissions
     */
    const [roleRows] = await queryInterface.sequelize.query(
      `SELECT id, slug FROM roles WHERE slug IN ('SUPERADMIN', 'ADMIN', 'CUSTOMER', 'TRAINER');`,
    );

    const [permissionRows] = await queryInterface.sequelize.query(
      `SELECT id, key FROM permissions;`,
    );

    const superadminRole = roleRows.find((role) => role.slug === "SUPERADMIN");
    const adminRole = roleRows.find((role) => role.slug === "ADMIN");
    const customerRole = roleRows.find((role) => role.slug === "CUSTOMER");
    const trainerRole = roleRows.find((role) => role.slug === "TRAINER");

    if (!superadminRole || !adminRole || !customerRole || !trainerRole) {
      throw new Error("Required roles were not created");
    }

    /**
     * 4. Assign all permissions to SUPERADMIN
     */
    const superadminRolePermissions = permissionRows.map((permission) => ({
      role_id: superadminRole.id,
      permission_id: permission.id,
      created_at: now,
    }));

    /**
     * 5. Assign selected permissions to ADMIN
     */
    const adminPermissionKeys = [
      "dashboard.view",

      "users.view",
      "users.create",
      "users.update",
      "users.update_status",

      "customer_profiles.view",
      "customer_profiles.update",

      "trainer_profiles.view",
      "trainer_profiles.review",
      "trainer_profiles.approve",
      "trainer_profiles.reject",

      "trainer_assignments.view",
      "trainer_assignments.create",
      "trainer_assignments.update",
      "trainer_assignments.delete",

      "gym_info.view",
      "gym_info.update",

      "settings.view",
      "settings.update",

      "notifications.view",
      "notifications.create",
      "notifications.update",
      "notifications.delete",
      "notifications.mark_read",

      "push_notifications.view",
      "push_notifications.create",
      "push_notifications.update",
      "push_notifications.delete",
      "push_notifications.publish",
      "push_notifications.cancel",

      "news_categories.view",
      "news_categories.create",
      "news_categories.update",
      "news_categories.delete",

      "news.view",
      "news.create",
      "news.update",
      "news.delete",
      "news.publish",

      "membership_plans.view",
      "membership_plans.create",
      "membership_plans.update",
      "membership_plans.delete",

      "member_memberships.view",
      "member_memberships.create",
      "member_memberships.update",
      "member_memberships.delete",

      "services.view",
      "services.create",
      "services.update",
      "services.delete",

      "service_schedules.view",
      "service_schedules.create",
      "service_schedules.update",
      "service_schedules.delete",
      "service_schedules.cancel",

      "bookings.view",
      "bookings.create",
      "bookings.update",
      "bookings.delete",
      "bookings.cancel",

      "audit_logs.view",
      "activity_logs.view",
    ];

    const adminRolePermissions = permissionRows
      .filter((permission) => adminPermissionKeys.includes(permission.key))
      .map((permission) => ({
        role_id: adminRole.id,
        permission_id: permission.id,
        created_at: now,
      }));

    /**
     * 6. Assign selected permissions to CUSTOMER
     */
    const customerPermissionKeys = [
      "customer_profiles.view",
      "customer_profiles.update",
      "gym_info.view",
    ];

    const customerRolePermissions = permissionRows
      .filter((permission) => customerPermissionKeys.includes(permission.key))
      .map((permission) => ({
        role_id: customerRole.id,
        permission_id: permission.id,
        created_at: now,
      }));

    /**
     * 7. Assign selected permissions to TRAINER
     */
    const trainerPermissionKeys = [
      "trainer_profiles.view",
      "trainer_profiles.update",
      "gym_info.view",
    ];

    const trainerRolePermissions = permissionRows
      .filter((permission) => trainerPermissionKeys.includes(permission.key))
      .map((permission) => ({
        role_id: trainerRole.id,
        permission_id: permission.id,
        created_at: now,
      }));

    await queryInterface.bulkInsert(
      "role_permissions",
      [
        ...superadminRolePermissions,
        ...adminRolePermissions,
        ...customerRolePermissions,
        ...trainerRolePermissions,
      ],
      {},
    );

    /**
     * 8. Create default superadmin user
     */
    const passwordHash = await bcrypt.hash("password123", 10);

    await queryInterface.bulkInsert(
      "users",
      [
        {
          role_id: superadminRole.id,
          email: "superadmin@gym.com",
          phone: "081234567890",
          password_hash: passwordHash,
          full_name: "Superadmin Gym",
          avatar_url: null,
          is_active: true,
          email_verified_at: now,
          last_login_at: null,
          created_at: now,
          updated_at: now,
        },
      ],
      {},
    );

    /**
     * 9. Seed gym info
     */
    await queryInterface.bulkInsert(
      "gym_infos",
      [
        {
          name: "Aurelio Gym",
          tagline: "Train stronger. Live better.",
          description:
            "A modern gym management system for members, trainers, and admins.",
          email: "info@gym.com",
          phone: "081234567890",
          whatsapp: "081234567890",
          address: "Medan, Indonesia",
          city: "Medan",
          province: "Sumatera Utara",
          postal_code: null,
          latitude: null,
          longitude: null,
          logo_url: null,
          favicon_url: null,
          opening_hours: JSON.stringify({
            monday: { open: "06:00", close: "22:00" },
            tuesday: { open: "06:00", close: "22:00" },
            wednesday: { open: "06:00", close: "22:00" },
            thursday: { open: "06:00", close: "22:00" },
            friday: { open: "06:00", close: "22:00" },
            saturday: { open: "07:00", close: "20:00" },
            sunday: { open: "07:00", close: "18:00" },
          }),
          instagram_url: null,
          facebook_url: null,
          tiktok_url: null,
          youtube_url: null,
          created_at: now,
          updated_at: now,
        },
      ],
      {},
    );

    /**
     * 10. Seed general settings
     */
    await queryInterface.bulkInsert(
      "general_settings",
      [
        {
          key: "maintenance_mode",
          value: "false",
          type: "BOOLEAN",
          group_name: "system",
          label: "Maintenance Mode",
          description: "Enable or disable maintenance mode",
          is_public: false,
          created_at: now,
          updated_at: now,
        },
        {
          key: "allow_customer_registration",
          value: "true",
          type: "BOOLEAN",
          group_name: "auth",
          label: "Allow Customer Registration",
          description: "Allow customers to register from mobile app",
          is_public: true,
          created_at: now,
          updated_at: now,
        },
        {
          key: "allow_trainer_registration",
          value: "true",
          type: "BOOLEAN",
          group_name: "auth",
          label: "Allow Trainer Registration",
          description: "Allow trainers to register from mobile app",
          is_public: true,
          created_at: now,
          updated_at: now,
        },
        {
          key: "email_verification_required",
          value: "true",
          type: "BOOLEAN",
          group_name: "auth",
          label: "Email Verification Required",
          description:
            "Require email OTP verification before account activation",
          is_public: false,
          created_at: now,
          updated_at: now,
        },
        {
          key: "trainer_certificate_required",
          value: "true",
          type: "BOOLEAN",
          group_name: "trainer",
          label: "Trainer Certificate Required",
          description: "Require trainer certificate approval before teaching",
          is_public: false,
          created_at: now,
          updated_at: now,
        },
        {
          key: "offline_payment_enabled",
          value: "true",
          type: "BOOLEAN",
          group_name: "payment",
          label: "Offline Payment Enabled",
          description: "Enable manual/offline payment at gym location",
          is_public: true,
          created_at: now,
          updated_at: now,
        },
        {
          key: "payment_gateway_enabled",
          value: "false",
          type: "BOOLEAN",
          group_name: "payment",
          label: "Payment Gateway Enabled",
          description: "Enable online payment gateway integration",
          is_public: false,
          created_at: now,
          updated_at: now,
        },
      ],
      {},
    );

    /**
     * 11. Activity log
     */
    const [superadminRows] = await queryInterface.sequelize.query(
      `SELECT id FROM users WHERE email = 'superadmin@gym.com' LIMIT 1;`,
    );

    const superadminUser = superadminRows[0];

    await queryInterface.bulkInsert(
      "activity_logs",
      [
        {
          user_id: superadminUser?.id || null,
          activity: "SEED_FOUNDATION_DATA",
          description: "Initial foundation data seeded successfully",
          metadata: JSON.stringify({
            roles: roles.length,
            permissions: permissions.length,
            defaultUser: "superadmin@gym.com",
          }),
          ip_address: null,
          user_agent: "sequelize-seeder",
          created_at: now,
        },
      ],
      {},
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("activity_logs", {
      activity: "SEED_FOUNDATION_DATA",
    });

    await queryInterface.bulkDelete("general_settings", {
      key: [
        "maintenance_mode",
        "allow_customer_registration",
        "allow_trainer_registration",
        "email_verification_required",
        "trainer_certificate_required",
        "offline_payment_enabled",
        "payment_gateway_enabled",
      ],
    });

    await queryInterface.bulkDelete("gym_infos", {
      name: "Aurelio Gym",
    });

    await queryInterface.bulkDelete("users", {
      email: "superadmin@gym.com",
    });

    await queryInterface.bulkDelete("role_permissions", null, {});

    await queryInterface.bulkDelete("permissions", {
      key: permissions.map((permission) => permission[1]),
    });

    await queryInterface.bulkDelete("roles", {
      slug: roles.map((role) => role.slug),
    });
  },
};
