import Resume from "../models/resumeModel.js";
import groq from "../utils/groq.js";
import { calculateATSScore } from "../utils/atsScore.js";
import catchAsync from "../utils/catchAsync.js";

export const generateResume = catchAsync(async (req, res) => {
  const { resume } = req.body;

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
    // 🔥 Extract JSON safely
    const jsonStart = aiText.indexOf("{");
    const jsonEnd = aiText.lastIndexOf("}") + 1;
    const cleanJSON = aiText.slice(jsonStart, jsonEnd);

    parsed = JSON.parse(cleanJSON);

    // =========================
    // 🔥 SKILLS CLEANING
    // =========================
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

    // =========================
    // 🔥 EXPERIENCE CLEANING
    // =========================
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

    // =========================
    // 🔥 PROJECTS CLEANING
    // =========================
    parsed.projects = (parsed.projects || []).map((proj) => {
      let description = proj.description || proj["Description"] || "";

      // 🔥 FIX: description must be string
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

    // =========================
    // 🔥 SUMMARY SAFETY
    // =========================
    parsed.summary = typeof parsed.summary === "string" ? parsed.summary : "";
  } catch (err) {
    console.log("❌ JSON Parse Error:", aiText);

    return res.status(500).json({
      message: "AI returned invalid format",
    });
  }

  res.status(200).json({
    success: true,
    data: parsed,
    message: "Resume Improved",
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
    message: "Data saved successfully on database.",
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
    message: "Deleted",
  });
});
