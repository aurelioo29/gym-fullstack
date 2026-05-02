import { Op, type WhereOptions } from "sequelize";
import { ZodError } from "zod";

import { Service } from "@/database/models";
import { AuditAction, ResourceType } from "@/constants/logs";
import { getAdminSession } from "@/lib/auth/admin-guard";
import { createAuditLog, serializeModel } from "@/lib/logs";
import { getClientIp } from "@/lib/request";
import {
  errorResponse,
  successResponse,
  validationErrorResponse,
} from "@/lib/response";
import { slugify } from "@/lib/slug";
import { createServiceSchema } from "@/lib/validations/admin.validation";

export async function GET(req: Request) {
  const admin = await getAdminSession("services.view");

  if (!admin.authorized) {
    return errorResponse({
      message: admin.message,
      status: admin.status,
    });
  }

  const { searchParams } = new URL(req.url);

  const search = searchParams.get("search") || "";
  const serviceType = searchParams.get("serviceType") || "";
  const isActive = searchParams.get("isActive") || "";

  const page = Number(searchParams.get("page") || 1);
  const limit = Number(searchParams.get("limit") || 10);
  const offset = (page - 1) * limit;

  const whereCondition: WhereOptions = {};

  if (serviceType && serviceType !== "ALL") {
    whereCondition.serviceType = serviceType;
  }

  if (isActive === "true") {
    whereCondition.isActive = true;
  }

  if (isActive === "false") {
    whereCondition.isActive = false;
  }

  if (search) {
    (whereCondition as any)[Op.or] = [
      {
        name: {
          [Op.iLike]: `%${search}%`,
        },
      },
      {
        slug: {
          [Op.iLike]: `%${search}%`,
        },
      },
      {
        description: {
          [Op.iLike]: `%${search}%`,
        },
      },
    ];
  }

  const { rows, count } = await Service.findAndCountAll({
    where: whereCondition,
    order: [["createdAt", "DESC"]],
    limit,
    offset,
  });

  return successResponse({
    message: "Services fetched successfully",
    data: rows,
    meta: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    },
  });
}

export async function POST(req: Request) {
  const admin = await getAdminSession("services.create");

  if (!admin.authorized || !admin.session) {
    return errorResponse({
      message: admin.message,
      status: admin.status,
    });
  }

  try {
    const body = await req.json();
    const payload = createServiceSchema.parse(body);

    const slug = payload.slug ? slugify(payload.slug) : slugify(payload.name);

    const existing = await Service.findOne({
      where: {
        slug,
      },
    });

    if (existing) {
      return errorResponse({
        message: "Slug sudah digunakan",
        status: 400,
      });
    }

    const service = await Service.create({
      name: payload.name,
      slug,
      description: payload.description ?? null,
      serviceType: payload.serviceType ?? "CLASS",
      price: String(payload.price ?? 0),
      durationMinutes: payload.durationMinutes,
      capacity: payload.capacity ?? null,
      imageUrl: payload.imageUrl ?? null,
      isActive: payload.isActive ?? true,
    });

    await createAuditLog({
      userId: admin.session.user.id,
      action: AuditAction.CREATE_SERVICE,
      resourceType: ResourceType.SERVICE,
      resourceId: service.id,
      oldData: null,
      newData: serializeModel(service),
      ipAddress: getClientIp(req),
    });

    return successResponse({
      message: "Service created successfully",
      data: service,
      status: 201,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    console.error("Create service error:", error);

    return errorResponse({
      message: "Failed to create service",
      status: 500,
    });
  }
}
