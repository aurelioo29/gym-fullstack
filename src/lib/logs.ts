import { ActivityLog, AuditLog } from "@/database/models";

type CreateActivityLogParams = {
  userId?: string | null;
  activity: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

type CreateAuditLogParams = {
  userId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  ipAddress?: string | null;
};

export async function createActivityLog({
  userId = null,
  activity,
  description = null,
  metadata = null,
  ipAddress = null,
  userAgent = null,
}: CreateActivityLogParams) {
  try {
    return await ActivityLog.create({
      userId,
      activity,
      description,
      metadata,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    console.error("Failed to create activity log:", error);
    return null;
  }
}

export async function createAuditLog({
  userId = null,
  action,
  resourceType,
  resourceId = null,
  oldData = null,
  newData = null,
  ipAddress = null,
}: CreateAuditLogParams) {
  try {
    return await AuditLog.create({
      userId,
      action,
      resourceType,
      resourceId,
      oldData,
      newData,
      ipAddress,
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
    return null;
  }
}

export function serializeModel<T extends { toJSON: () => unknown }>(
  model: T | null,
) {
  if (!model) return null;

  return model.toJSON() as Record<string, unknown>;
}
