import mongoose from "mongoose";
import validator from "validator";

const supportSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "A Complaint must belongs to a user"],
    },

    subject: {
      type: String,
      required: [true, "A Complaint must contain a subject"],
      trim: true,
    },

    problemPhoto: {
      type: String,
      default: "",
    },

    message: {
      type: String,
      required: [true, "A Complaint must contain a Message"],
      trim: true,
    },

    status: {
      type: String,
      enum: ["pending", "resolved", "in-progress"],
      default: "pending",
    },
  },
  { timestamps: true },
);

const Support = mongoose.model("Support", supportSchema);

export default Support;
