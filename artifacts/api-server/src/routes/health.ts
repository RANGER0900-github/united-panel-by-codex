import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const startTime = Date.now();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({
    status: "ok",
    uptime: (Date.now() - startTime) / 1000,
    timestamp: new Date().toISOString(),
  });
  res.json(data);
});

export default router;
