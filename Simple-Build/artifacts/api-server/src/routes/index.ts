import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import projectsRouter from "./projects";
import tasksRouter from "./tasks";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(projectsRouter);
router.use(tasksRouter);
router.use(dashboardRouter);

export default router;
