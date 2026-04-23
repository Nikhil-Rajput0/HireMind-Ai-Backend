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
              Experience: ${JSON.stringify(resume.experience || "")}
              Projects: ${JSON.stringify(resume.projects || "")}

              IMPORTANT:
              - Return ONLY valid JSON
              - Do NOT include any explanation
              - Do NOT include text before or after JSON
              - Start response with { and end with }

              Make it:
              - ATS optimized
              - Professional
              - Use bullet points
              - Strong action verbs

              Format:
              {
                "summary": "",
                "skills": [],
                "experience": [],
                "projects": []
              }
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
    if (typeof parsed.skills === "object") {
      parsed.skills = Object.values(parsed.skills).flat();
    }
    parsed.experience = parsed.experience.map((exp) => ({
      company: exp.company || "",
      title: exp.title || exp.role || "",
      duration: exp.duration || "",
      responsibilities: exp.responsibilities || [],
      achievements: exp.achievements || [],
    }));
    parsed.projects = parsed.projects.map((proj) => ({
      title: proj.title || proj["Project Name"] || "",
      description: proj.description || proj["Description"] || "",
      techStack: proj.techStack || proj["Technologies Used"] || [],
    }));
  } catch (err) {
    console.log("JSON Parse Error:", aiText);

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
