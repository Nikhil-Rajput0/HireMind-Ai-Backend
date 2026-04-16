import mongoose from "mongoose";

const interviewSchema = new mongoose.Schema(
  {
    user: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "A interview must belongs to a user."],
      },
    ],
    type: {
      type: String,
      enum: ["hr", "technical", "strict"],
      required: [true, "A interview must have a type like HR."],
    },
    conversation: [
      {
        question: {
          type: String,
          required: [true, "Question is required"],
        },
        answer: {
          type: String,
          required: [true, "Answer is required"],
        },
      },
    ],
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    score: {
      type: Number,
      default: 0,
    },
    feedback: {
      type: String,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

const Interview = mongoose.model("Interview", interviewSchema);

export default Interview;
