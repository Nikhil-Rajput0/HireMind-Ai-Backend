import mongoose from "mongoose";

const resumeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    name: String,
    role: String,

    summary: String,

    skills: [String],

    experience: [
      {
        company: String,
        role: String,
        duration: String,
        description: String,
      },
    ],

    projects: [
      {
        title: String,
        description: [String],
        techStack: [String],
      },
    ],

    education: [
      {
        institute: String,
        degree: String,
        year: String,
      },
    ],

    template: {
      type: String,
      default: "modern",
    },

    score: {
      type: Number,
      default: 0,
    },

    feedback: String,
  },
  { timestamps: true },
);

const Resume = mongoose.model("Resume", resumeSchema);
export default Resume;
