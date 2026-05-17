import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import inbodyRouter from "./inbody";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(inbodyRouter);

export default router;
