import express from "express";
import userRouter from "./routes/userRouter.js";
import AppError from "./utils/appError.js";
import globalErrorController from "./controllers/globalErrorHandler.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import { interviewRouter } from "./routes/interviewRouter.js";
import resumeRouter from "./routes/resumeRouter.js";
import helmet from "helmet";
import hpp from "hpp";
import rateLimit from "express-rate-limit";
import compression from "compression";
import supportRouter from "./routes/supportRouter.js";
import planRouter from "./routes/subscriptionRouter.js";
import paymentRouter from "./routes/paymentRoutes.js";

const app = express();
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

app.use("/img/users", express.static("public/img/users"));

const corsOptions = {
  origin: [
    "https://hiremind-ai-org.vercel.app",
    "https://api.razorpay.com",
    "http://localhost:3000",
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true,
  optionsSuccessStatus: 200,
};

const limiter = rateLimit({
  max: 10,
  windowMs: 5 * 60 * 1000,
  message: "Too many request. Please wait for 5 minutes.",
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Server is running..",
    uptime: process.uptime(),
    memory: process.memoryUsage().heapUsed,
    timestamp: new Date().toISOString(),
  });
});

app.use(cors(corsOptions));
app.use(helmet());
app.use(hpp());
app.use("/api/v1/users/resetPassword/", limiter);
app.use(compression());

app.use("/api/v1/users", userRouter);
app.use("/api/v1/interviews", interviewRouter);
app.use("/api/v1/resume", resumeRouter);
app.use("/api/v1/supports", supportRouter);
app.use("/api/v1/plans", planRouter);
app.use("/api/v1/payments", paymentRouter);

app.use((req, res, next) => {
  return next(new AppError(`Could not found this route`, 404));
});

app.use(globalErrorController);

export default app;
