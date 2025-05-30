import { Request, Response } from "express";
import os from "os";
import mongoose from "mongoose";
import environment from "../config/environment";

export class HealthController {
  /**
   * @swagger
   * /api/v1/health:
   *   get:
   *     summary: Get system health status
   *     description: Returns detailed information about the system's health and status
   *     tags: [System]
   *     responses:
   *       200:
   *         description: System health information
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   type: object
   *                   properties:
   *                     uptime:
   *                       type: number
   *                       description: System uptime in seconds
   *                     timestamp:
   *                       type: string
   *                       format: date-time
   *                     environment:
   *                       type: string
   *                     database:
   *                       type: object
   *                       properties:
   *                         status:
   *                           type: string
   *                         connectionState:
   *                           type: string
   *                     system:
   *                       type: object
   *                       properties:
   *                         memory:
   *                           type: object
   *                           properties:
   *                             total:
   *                               type: number
   *                             free:
   *                               type: number
   *                             used:
   *                               type: number
   *                         cpu:
   *                           type: object
   *                           properties:
   *                             cores:
   *                               type: number
   *                             loadAverage:
   *                               type: array
   *                               items:
   *                                 type: number
   */
  public getHealth = async (_req: Request, res: Response): Promise<void> => {
    const healthData = {
      status: "success",
      data: {
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        environment: environment.nodeEnv,
        database: {
          status:
            mongoose.connection.readyState === 1 ? "connected" : "disconnected",
          connectionState: this.getMongoConnectionState(
            mongoose.connection.readyState
          ),
        },
        system: {
          memory: {
            total: os.totalmem(),
            free: os.freemem(),
            used: os.totalmem() - os.freemem(),
          },
          cpu: {
            cores: os.cpus().length,
            loadAverage: os.loadavg(),
          },
        },
      },
    };

    res.status(200).json(healthData);
  };

  private getMongoConnectionState(state: number): string {
    const states: { [key: number]: string } = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting",
    };
    return states[state] || "unknown";
  }
}
