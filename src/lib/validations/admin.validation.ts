import { z } from "zod";

export const updateUserStatusSchema = z.object({
  isActive: z.boolean({
    message: "isActive harus boolean",
  }),
});

export const updateRolePermissionsSchema = z.object({
  permissionIds: z
    .array(z.string().uuid("Permission ID tidak valid"))
    .min(1, "Minimal pilih 1 permission"),
});

export const updateGymInfoSchema = z.object({
  name: z.string().min(2, "Nama gym minimal 2 karakter").optional(),
  tagline: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  email: z.string().email("Email tidak valid").nullable().optional(),
  phone: z.string().nullable().optional(),
  whatsapp: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  province: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  latitude: z
    .string()
    .nullable()
    .optional()
    .refine((value) => {
      if (!value) return true;

      const numberValue = Number(value);

      return (
        !Number.isNaN(numberValue) && numberValue >= -90 && numberValue <= 90
      );
    }, "Latitude harus berada di antara -90 sampai 90"),

  longitude: z
    .string()
    .nullable()
    .optional()
    .refine((value) => {
      if (!value) return true;

      const numberValue = Number(value);

      return (
        !Number.isNaN(numberValue) && numberValue >= -180 && numberValue <= 180
      );
    }, "Longitude harus berada di antara -180 sampai 180"),
  logoUrl: z.string().nullable().optional(),
  faviconUrl: z.string().nullable().optional(),
  openingHours: z.record(z.string(), z.any()).nullable().optional(),
  instagramUrl: z.string().nullable().optional(),
  facebookUrl: z.string().nullable().optional(),
  tiktokUrl: z.string().nullable().optional(),
  youtubeUrl: z.string().nullable().optional(),
});

export const updateGeneralSettingSchema = z.object({
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.record(z.string(), z.any()),
    z.null(),
  ]),
});

export const createNewsCategorySchema = z.object({
  name: z.string().min(2, "Nama kategori minimal 2 karakter"),
  slug: z.string().min(2).optional(),
  description: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const updateNewsCategorySchema = z.object({
  name: z.string().min(2, "Nama kategori minimal 2 karakter").optional(),
  slug: z.string().min(2).optional(),
  description: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const createNewsSchema = z.object({
  categoryId: z.string().uuid("Category ID tidak valid"),
  title: z.string().min(3, "Title minimal 3 karakter"),
  slug: z.string().min(3).optional(),
  excerpt: z.string().nullable().optional(),
  content: z.string().min(10, "Content minimal 10 karakter"),
  thumbnailUrl: z.string().nullable().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  isFeatured: z.boolean().optional(),
  seoTitle: z.string().nullable().optional(),
  seoDescription: z.string().nullable().optional(),
});

export const updateNewsSchema = z.object({
  categoryId: z.string().uuid("Category ID tidak valid").optional(),
  title: z.string().min(3, "Title minimal 3 karakter").optional(),
  slug: z.string().min(3).optional(),
  excerpt: z.string().nullable().optional(),
  content: z.string().min(10, "Content minimal 10 karakter").optional(),
  thumbnailUrl: z.string().nullable().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  isFeatured: z.boolean().optional(),
  seoTitle: z.string().nullable().optional(),
  seoDescription: z.string().nullable().optional(),
});

export const createTrainerAssignmentSchema = z
  .object({
    customerId: z.string().uuid("Customer ID tidak valid"),
    trainerId: z.string().uuid("Trainer ID tidak valid"),
    startDate: z.coerce.date({
      message: "Start date tidak valid",
    }),
    endDate: z.coerce.date().nullable().optional(),
    isActive: z.boolean().optional(),
    notes: z.string().nullable().optional(),
  })
  .refine(
    (value) => {
      if (!value.endDate) return true;

      return value.endDate >= value.startDate;
    },
    {
      message: "End date tidak boleh sebelum start date",
      path: ["endDate"],
    },
  );

export const updateTrainerAssignmentSchema = z
  .object({
    customerId: z.string().uuid("Customer ID tidak valid").optional(),
    trainerId: z.string().uuid("Trainer ID tidak valid").optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().nullable().optional(),
    isActive: z.boolean().optional(),
    notes: z.string().nullable().optional(),
  })
  .refine(
    (value) => {
      if (!value.startDate || !value.endDate) return true;

      return value.endDate >= value.startDate;
    },
    {
      message: "End date tidak boleh sebelum start date",
      path: ["endDate"],
    },
  );
