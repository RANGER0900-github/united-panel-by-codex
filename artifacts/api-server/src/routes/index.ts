import { Router, type IRouter } from "express";
import healthRouter from "./health";
import hostRouter from "./host";
import metricsRouter from "./metrics";
import instancesRouter from "./instances";
import logsRouter from "./logs";
import installerRouter from "./installer";

const router: IRouter = Router();

router.use("/", healthRouter);
router.use("/host", hostRouter);
router.use("/metrics", metricsRouter);
router.use("/instances", instancesRouter);
router.use("/logs", logsRouter);
router.use("/installer", installerRouter);

export default router;
