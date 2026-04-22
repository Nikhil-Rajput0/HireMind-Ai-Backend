import mongoose from "mongoose";

const interviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    name: String,

    interviewType: {
      type: String,
      enum: ["hr", "technical", "strict"],
      required: true,
    },

    role: String,
    difficulty: String,

    conversation: [
      {
        question: String,
        answer: String,
        feedback: String,
        score: Number,
      },
    ],

    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
    },

    totalScore: Number,

    overallFeedback: String,

    startedAt: {
      type: Date,
      default: Date.now,
    },

    completedAt: Date,
  },
  { timestamps: true },
);

const Interview = mongoose.model("Interview", interviewSchema);
export default Interview;
