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
        You are a senior resume writer and ATS optimization expert.

        Rewrite and improve the following resume for a ${resume.role} role.

        Make it:
        - Professional and modern
        - ATS-friendly (important keywords)
        - Impact-driven (use action verbs + measurable results)
        - Clear and concise

        Candidate Info:
        Name: ${resume.name}
        Role: ${resume.role}
        Skills: ${resume.skills}
        Experience: ${JSON.stringify(resume.experience || [])}
        Projects: ${JSON.stringify(resume.projects || [])}

        STRICT RULES:
        - Return ONLY valid JSON
        - No explanation, no markdown, no text outside JSON
        - Ensure all fields are properly filled
        - Do NOT return null values

        FORMAT:
        {
          "summary": "2-3 lines professional summary with strong impact",
          "skills": ["skill1", "skill2"],
          "experience": [
            {
              "company": "string",
              "title": "string",
              "duration": "string",
              "responsibilities": ["action-based bullet points"],
              "achievements": ["quantified achievements with metrics if possible"]
            }
          ],
          "projects": [
            {
              "title": "string",
              "description": "1-2 line strong project description with impact",
              "techStack": ["tech1", "tech2"]
            }
          ]
        }

        QUALITY RULES:
        - Use strong action verbs (Built, Optimized, Designed, Led)
        - Add numbers/metrics wherever possible (%, time saved, performance improved)
        - Avoid generic phrases like "worked on" or "responsible for"
        - Keep everything concise but impactful
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
  const score = calculateATSScore(resumeData);

  res.status(200).json({
    success: true,
    data: {
      ...parsed,
      credits: updatedUser.credits,
    },
    score,
    message:
      updatedUser.isLifetime || updatedUser.subscription?.isActive
        ? "Resume improved (Subscription)"
        : `Resume improved (${updatedUser.credits} credits remaining)`,
  });
});

export const saveResume = catchAsync(async (req, res) => {
  if (!req.body.user) req.body.user = req.user._id;
  const { resumeData } = req.body;

  const resume = await Resume.create({
    user: req.body.user,
    ...resumeData,
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
