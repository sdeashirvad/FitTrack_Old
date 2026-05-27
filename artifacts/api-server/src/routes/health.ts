import { Router } from "express";
import { getHealthStatus } from "./health.controller";

const router = Router();

/**
 * @openapi
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns a 200 status if the server is running.
 *     tags:
 *       - System
 *     responses:
 *       '200':
 *         description: Server is healthy.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ok"
 *                 message:
 *                   type: string
 *                   example: "Server is running"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get("/health", getHealthStatus);

export default router;