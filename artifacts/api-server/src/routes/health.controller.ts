import type { Request, Response } from "express";

/**
 * Responds with a simple health check status.
 */
export function getHealthStatus(req: Request, res: Response) {
  res.status(200).json({
    status: "ok",
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
}