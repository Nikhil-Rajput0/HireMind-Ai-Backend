import Resume from "../models/resumeModel.js";
import User from "../models/userModel.js";
import groq from "../utils/groq.js";
import { calculateATSScore } from "../utils/atsScore.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";

export const generateResume = catchAsync(async (req, res) => {
  const { resume } = req.body;

  // Check user access
  const user = await User.findById(req.user.id);
  await user.checkSubscriptionStatus();

  if (!user.hasAccess()) {
    return res.status(402).json({
      message:
        "No credits or active subscription. Please purchase credits or subscribe.",
    });
  }

  // Try to deduct credits
  const deducted = await user.deductCredits(20);

  if (!deducted) {
    return res.status(402).json({
      message: `Insufficient credits. You need 20 credits but have ${user.credits}.`,
    });
  }

  const prompt = `
You are a professional resume writer.

Improve this resume:

Name: ${resume.name}
Role: ${resume.role}
Skills: ${resume.skills}
Experience: ${JSON.stringify(resume.experience || [])}
Projects: ${JSON.stringify(resume.projects || [])}

IMPORTANT:
- Return ONLY valid JSON
- Do NOT include any explanation
- Start response with { and end with }

STRICT FORMAT:
{
  "summary": "string",
  "skills": ["string"], 
  "experience": [
    {
      "company": "string",
      "title": "string",
      "duration": "string",
      "responsibilities": ["string"],
      "achievements": ["string"]
    }
  ],
  "projects": [
    {
      "title": "string",
      "description": "string",
      "techStack": ["string"]
    }
  ]
}

RULES:
- skills MUST be flat array of strings
- description MUST be string (NOT array)
- responsibilities MUST be array
- achievements MUST be array
`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: prompt }],
  });

  const aiText = completion.choices[0].message.content;

  let parsed;

  try {
    const jsonStart = aiText.indexOf("{");
    const jsonEnd = aiText.lastIndexOf("}") + 1;
    const cleanJSON = aiText.slice(jsonStart, jsonEnd);

    parsed = JSON.parse(cleanJSON);

    let skills = parsed.skills;

    if (typeof skills === "string") {
      try {
        skills = JSON.parse(skills);
      } catch {
        skills = skills.split(/,|\n/);
      }
    }

    let flatSkills = [];

    if (Array.isArray(skills)) {
      skills.forEach((item) => {
        if (typeof item === "string") {
          flatSkills.push(item.trim());
        } else if (item?.skills) {
          flatSkills.push(...item.skills);
        }
      });
    } else if (typeof skills === "object") {
      Object.values(skills).forEach((val) => {
        if (Array.isArray(val)) flatSkills.push(...val);
      });
    }

    parsed.skills = flatSkills.map((s) => String(s).trim());

    parsed.experience = (parsed.experience || []).map((exp) => ({
      company: exp.company || "",
      title: exp.title || exp.role || "",
      duration: exp.duration || "",
      responsibilities: Array.isArray(exp.responsibilities)
        ? exp.responsibilities
        : exp.responsibilities
          ? [exp.responsibilities]
          : [],
      achievements: Array.isArray(exp.achievements)
        ? exp.achievements
        : exp.achievements
          ? [exp.achievements]
          : [],
    }));

    parsed.projects = (parsed.projects || []).map((proj) => {
      let description = proj.description || proj["Description"] || "";

      if (Array.isArray(description)) {
        description = description.join(" ");
      }

      return {
        title: proj.title || proj["Project Name"] || "",
        description: String(description),
        techStack: Array.isArray(proj.techStack)
          ? proj.techStack
          : proj["Technologies Used"]
            ? proj["Technologies Used"]
            : [],
      };
    });

    parsed.summary = typeof parsed.summary === "string" ? parsed.summary : "";
  } catch (err) {
    console.log("❌ JSON Parse Error:", aiText);

    // Refund credits on error
    user.credits += 20;
    await user.save({ validateBeforeSave: false });

    return res.status(500).json({
      message: "AI returned invalid format",
    });
  }

  // Get updated user
  const updatedUser = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    data: {
      ...parsed,
      credits: updatedUser.credits,
    },
    message:
      updatedUser.isLifetime || updatedUser.subscription?.isActive
        ? "Resume improved (Subscription)"
        : `Resume improved (${updatedUser.credits} credits remaining)`,
  });
});

export const saveResume = catchAsync(async (req, res) => {
  if (!req.body.user) req.body.user = req.user._id;
  const { resumeData } = req.body;

  const score = calculateATSScore(resumeData);

  const resume = await Resume.create({
    user: req.body.user,
    ...resumeData,
    score,
  });

  res.status(201).json({
    success: true,
    resume,
    message: "Resume saved successfully to database.",
  });
});

export const getMyResumes = catchAsync(async (req, res) => {
  const resumes = await Resume.findById(req.params.id);

  res.status(200).json({
    success: true,
    resume: resumes,
  });
});

export const deleteResume = catchAsync(async (req, res) => {
  await Resume.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "Resume deleted successfully",
  });
});

export const getAllResumes = catchAsync(async (req, res, next) => {
  let resume = Resume.find();
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 100;
  const skip = (page - 1) * limit;

  resume = resume.skip(skip).limit(limit);
  let numResume;
  if (req.query.page) {
    numResume = await Resume.countDocuments();
    if (skip >= numResume) return next(new AppError("There is no resume", 404));
  }

  const resumes = await resume.populate({
    path: "user",
    select: "name photo email",
  });

  res.status(200).json({
    status: "success",
    results: resumes.length,
    numResume,
    resumes,
  });
});
