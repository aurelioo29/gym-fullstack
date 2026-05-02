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

export const createMembershipPlanSchema = z.object({
  name: z.string().min(2, "Nama plan minimal 2 karakter"),
  slug: z.string().min(2).optional(),
  description: z.string().nullable().optional(),

  price: z.coerce.number().min(0, "Harga tidak boleh negatif"),

  durationDays: z.coerce
    .number()
    .int("Duration days harus integer")
    .min(1, "Duration minimal 1 hari"),

  maxBookingsPerMonth: z.coerce
    .number()
    .int("Max bookings harus integer")
    .min(0, "Max bookings tidak boleh negatif")
    .nullable()
    .optional(),

  benefits: z.array(z.string()).nullable().optional(),

  isActive: z.boolean().optional(),
});

export const updateMembershipPlanSchema = z.object({
  name: z.string().min(2, "Nama plan minimal 2 karakter").optional(),
  slug: z.string().min(2).optional(),
  description: z.string().nullable().optional(),

  price: z.coerce.number().min(0, "Harga tidak boleh negatif").optional(),

  durationDays: z.coerce
    .number()
    .int("Duration days harus integer")
    .min(1, "Duration minimal 1 hari")
    .optional(),

  maxBookingsPerMonth: z.coerce
    .number()
    .int("Max bookings harus integer")
    .min(0, "Max bookings tidak boleh negatif")
    .nullable()
    .optional(),

  benefits: z.array(z.string()).nullable().optional(),

  isActive: z.boolean().optional(),
});

export const createMemberMembershipSchema = z.object({
  userId: z.string().uuid("User ID tidak valid"),
  membershipPlanId: z.string().uuid("Membership plan ID tidak valid"),

  startDate: z.coerce.date({
    message: "Start date tidak valid",
  }),

  status: z.enum(["PENDING", "ACTIVE", "EXPIRED", "CANCELLED"]).optional(),

  paymentStatus: z.enum(["UNPAID", "PAID", "CANCELLED"]).optional(),

  paymentMethod: z.enum(["OFFLINE_CASH", "OFFLINE_TRANSFER"]).optional(),

  paidAmount: z.coerce.number().min(0, "Paid amount tidak boleh negatif"),

  paymentReference: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const updateMemberMembershipSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),

  status: z.enum(["PENDING", "ACTIVE", "EXPIRED", "CANCELLED"]).optional(),

  paymentStatus: z.enum(["UNPAID", "PAID", "CANCELLED"]).optional(),

  paymentMethod: z.enum(["OFFLINE_CASH", "OFFLINE_TRANSFER"]).optional(),

  paidAmount: z.coerce
    .number()
    .min(0, "Paid amount tidak boleh negatif")
    .optional(),

  paymentReference: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const createServiceSchema = z.object({
  name: z.string().min(2, "Nama service minimal 2 karakter"),
  slug: z.string().min(2).optional(),
  description: z.string().nullable().optional(),

  serviceType: z
    .enum(["CLASS", "PERSONAL_TRAINING", "FACILITY", "OTHER"])
    .optional(),

  price: z.coerce.number().min(0, "Harga tidak boleh negatif").optional(),

  durationMinutes: z.coerce
    .number()
    .int("Durasi harus integer")
    .min(1, "Durasi minimal 1 menit"),

  capacity: z.coerce
    .number()
    .int("Capacity harus integer")
    .min(0, "Capacity tidak boleh negatif")
    .nullable()
    .optional(),

  imageUrl: z.string().nullable().optional(),

  isActive: z.boolean().optional(),
});

export const updateServiceSchema = z.object({
  name: z.string().min(2, "Nama service minimal 2 karakter").optional(),
  slug: z.string().min(2).optional(),
  description: z.string().nullable().optional(),

  serviceType: z
    .enum(["CLASS", "PERSONAL_TRAINING", "FACILITY", "OTHER"])
    .optional(),

  price: z.coerce.number().min(0, "Harga tidak boleh negatif").optional(),

  durationMinutes: z.coerce
    .number()
    .int("Durasi harus integer")
    .min(1, "Durasi minimal 1 menit")
    .optional(),

  capacity: z.coerce
    .number()
    .int("Capacity harus integer")
    .min(0, "Capacity tidak boleh negatif")
    .nullable()
    .optional(),

  imageUrl: z.string().nullable().optional(),

  isActive: z.boolean().optional(),
});

export const createServiceScheduleSchema = z
  .object({
    serviceId: z.string().uuid("Service ID tidak valid"),
    trainerId: z.string().uuid("Trainer ID tidak valid").nullable().optional(),

    title: z.string().nullable().optional(),

    startTime: z.coerce.date({
      message: "Start time tidak valid",
    }),

    endTime: z.coerce.date({
      message: "End time tidak valid",
    }),

    capacity: z.coerce
      .number()
      .int("Capacity harus integer")
      .min(0, "Capacity tidak boleh negatif"),

    location: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
  })
  .refine((value) => value.endTime > value.startTime, {
    message: "End time harus setelah start time",
    path: ["endTime"],
  });

export const updateServiceScheduleSchema = z
  .object({
    serviceId: z.string().uuid("Service ID tidak valid").optional(),
    trainerId: z.string().uuid("Trainer ID tidak valid").nullable().optional(),

    title: z.string().nullable().optional(),

    startTime: z.coerce.date().optional(),
    endTime: z.coerce.date().optional(),

    capacity: z.coerce
      .number()
      .int("Capacity harus integer")
      .min(0, "Capacity tidak boleh negatif")
      .optional(),

    location: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),

    isCancelled: z.boolean().optional(),
    cancelReason: z.string().nullable().optional(),
  })
  .refine(
    (value) => {
      if (!value.startTime || !value.endTime) return true;

      return value.endTime > value.startTime;
    },
    {
      message: "End time harus setelah start time",
      path: ["endTime"],
    },
  );

export const cancelServiceScheduleSchema = z.object({
  cancelReason: z.string().min(3, "Cancel reason minimal 3 karakter"),
});

export const createBookingSchema = z.object({
  userId: z.string().uuid("User ID tidak valid"),
  serviceScheduleId: z.string().uuid("Service schedule ID tidak valid"),

  amountPaid: z.coerce
    .number()
    .min(0, "Amount paid tidak boleh negatif")
    .optional(),

  paymentReference: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const updateBookingSchema = z.object({
  status: z.enum(["BOOKED", "COMPLETED", "CANCELLED", "NO_SHOW"]).optional(),

  amountPaid: z.coerce
    .number()
    .min(0, "Amount paid tidak boleh negatif")
    .optional(),

  paymentReference: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const cancelBookingSchema = z.object({
  cancelReason: z.string().min(3, "Cancel reason minimal 3 karakter"),
});
