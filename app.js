import express from "express";
import userRouter from "./routes/userRouter.js";
import AppError from "./utils/appError.js";
import globalErrorController from "./controllers/globalErrorHandler.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import { interviewRouter } from "./routes/interviewRouter.js";
import resumeRouter from "./routes/resumeRouter.js";
import helmet from "helmet";
import ExpressMongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import rateLimit from "express-rate-limit";
import compression from "compression";

const app = express();
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

app.use("/img/users", express.static("public/img/users"));

const corsOptions = {
  origin: "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true,
  optionsSuccessStatus: 200,
};

const limiter = rateLimit({
  max: 10,
  windowMs: 5 * 60 * 1000,
  message: "Too many request. Please wait for 5 minutes.",
});

app.use(cors(corsOptions));
app.use(helmet());
app.use(ExpressMongoSanitize());
app.use(hpp());
app.use("/api/v1/users/resetPassword/:token", limiter);
app.use(compression());

app.use("/api/v1/users", userRouter);
app.use("/api/v1/interviews", interviewRouter);
app.use("/api/v1/resume", resumeRouter);

app.use((req, res, next) => {
  return next(new AppError(`Could not found this route`, 404));
});

app.use(globalErrorController);

export default app;
