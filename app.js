import express from "express";
import userRouter from "./routes/userRouter.js";
import AppError from "./utils/appError.js";
import globalErrorController from "./controllers/globalErrorHandler.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import { interviewRouter } from "./routes/interviewRouter.js";
import resumeRouter from "./routes/resumeRouter.js";
import helmet from "helmet";

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use("/img/users", express.static("public/img/users"));

const corsOptions = {
  origin: "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(helmet());

app.use("/api/v1/users", userRouter);
app.use("/api/v1/interviews", interviewRouter);
app.use("/api/v1/resume", resumeRouter);

app.use((req, res, next) => {
  return next(new AppError(`Could not found this route`, 404));
});

app.use(globalErrorController);

export default app;
