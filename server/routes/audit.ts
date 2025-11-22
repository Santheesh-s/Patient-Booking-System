import { RequestHandler } from "express";
import { getDatabase } from "../db";
import { ObjectId } from "mongodb";

export interface AuditLog {
  _id?: string;
  userId?: string;
  userEmail?: string;
  action: string;
  entityType: "appointment" | "service" | "provider" | "user" | "availability";
  entityId: string;
  entityName?: string;
  changes: Record<string, { before: any; after: any }>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  status: "success" | "failure";
  errorMessage?: string;
}

// Log an action to the audit trail
export async function logAuditAction(
  userId: string | undefined,
  userEmail: string | undefined,
  action: string,
  entityType: "appointment" | "service" | "provider" | "user" | "availability",
  entityId: string,
  entityName: string | undefined,
  changes: Record<string, { before: any; after: any }>,
  status: "success" | "failure" = "success",
  errorMessage?: string,
  ipAddress?: string,
  userAgent?: string,
  metadata?: Record<string, any>
) {
  try {
    const db = await getDatabase();

    const auditLog: AuditLog = {
      userId: userId ? new ObjectId(userId).toString() : undefined,
      userEmail,
      action,
      entityType,
      entityId: new ObjectId(entityId).toString(),
      entityName,
      changes,
      metadata,
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString(),
      status,
      errorMessage,
    };

    await db.collection("auditLogs").insertOne(auditLog);

    return auditLog;
  } catch (error) {
    console.error("Error logging audit action:", error);
  }
}

// Get audit logs
export const getAuditLogs: RequestHandler = async (req, res) => {
  try {
    const db = await getDatabase();
    const {
      entityType,
      entityId,
      action,
      userId,
      startDate,
      endDate,
      limit = 100,
      skip = 0,
    } = req.query;

    let filter: any = {};

    if (entityType) {
      filter.entityType = entityType;
    }

    if (entityId) {
      filter.entityId = entityId;
    }

    if (action) {
      filter.action = action;
    }

    if (userId) {
      filter.userId = userId;
    }

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) {
        filter.timestamp.$gte = new Date(startDate as string).toISOString();
      }
      if (endDate) {
        filter.timestamp.$lte = new Date(endDate as string).toISOString();
      }
    }

    const logs = await db
      .collection("auditLogs")
      .find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit as string))
      .skip(parseInt(skip as string))
      .toArray();

    const total = await db.collection("auditLogs").countDocuments(filter);

    res.json({
      logs: logs as AuditLog[],
      total,
      limit: parseInt(limit as string),
      skip: parseInt(skip as string),
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
};

// Get audit log for specific entity
export const getEntityAuditTrail: RequestHandler = async (req, res) => {
  try {
    const db = await getDatabase();
    const { entityId } = req.params;

    const logs = await db
      .collection("auditLogs")
      .find({ entityId })
      .sort({ timestamp: -1 })
      .toArray();

    res.json(logs as AuditLog[]);
  } catch (error) {
    console.error("Error fetching entity audit trail:", error);
    res.status(500).json({ error: "Failed to fetch audit trail" });
  }
};

// Get user activity logs
export const getUserActivityLogs: RequestHandler = async (req, res) => {
  try {
    const db = await getDatabase();
    const { userId } = req.params;
    const { limit = 100, skip = 0 } = req.query;

    const logs = await db
      .collection("auditLogs")
      .find({ userId })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit as string))
      .skip(parseInt(skip as string))
      .toArray();

    const total = await db.collection("auditLogs").countDocuments({ userId });

    res.json({
      logs: logs as AuditLog[],
      total,
      limit: parseInt(limit as string),
      skip: parseInt(skip as string),
    });
  } catch (error) {
    console.error("Error fetching user activity logs:", error);
    res.status(500).json({ error: "Failed to fetch user activity logs" });
  }
};

// Get summary statistics for audit logs
export const getAuditSummary: RequestHandler = async (req, res) => {
  try {
    const db = await getDatabase();
    const { startDate, endDate } = req.query;

    let dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.timestamp = {};
      if (startDate) {
        dateFilter.timestamp.$gte = new Date(startDate as string).toISOString();
      }
      if (endDate) {
        dateFilter.timestamp.$lte = new Date(endDate as string).toISOString();
      }
    }

    const auditCollection = db.collection("auditLogs");

    const [totalActions, actionsByType, failedActions, topUsers] = await Promise.all([
      auditCollection.countDocuments(dateFilter),
      auditCollection
        .aggregate([
          { $match: dateFilter },
          { $group: { _id: "$action", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ])
        .toArray(),
      auditCollection.countDocuments({ ...dateFilter, status: "failure" }),
      auditCollection
        .aggregate([
          { $match: dateFilter },
          { $group: { _id: "$userEmail", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ])
        .toArray(),
    ]);

    res.json({
      totalActions,
      actionsByType,
      failedActions,
      topUsers,
      period: { startDate, endDate },
    });
  } catch (error) {
    console.error("Error fetching audit summary:", error);
    res.status(500).json({ error: "Failed to fetch audit summary" });
  }
};

// Helper to detect changes between two objects
export function detectChanges(before: any, after: any, ignoreFields: string[] = []): Record<string, { before: any; after: any }> {
  const changes: Record<string, { before: any; after: any }> = {};

  // Check all keys in both objects
  const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);

  for (const key of allKeys) {
    if (ignoreFields.includes(key)) continue;

    const beforeValue = before?.[key];
    const afterValue = after?.[key];

    // Deep equality check
    if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
      changes[key] = { before: beforeValue, after: afterValue };
    }
  }

  return changes;
}
