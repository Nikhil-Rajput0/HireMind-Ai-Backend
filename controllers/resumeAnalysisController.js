import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";
import { extractTextFromFile } from "../utils/extractText.js";
import groq from "../utils/groq.js";

export const analyzeResume = catchAsync(async (req, res, next) => {
  const { jobDescription } = req.body;

  // Check if file exists
  if (!req.file) {
    return next(new AppError("No resume file uploaded", 400));
  }

  // Extract text from file
  let resumeText;
  try {
    resumeText = await extractTextFromFile(req.file);
    console.log("Extracted text length:", resumeText?.length || 0);

    if (!resumeText || resumeText.trim().length < 50) {
      return next(
        new AppError(
          "Could not extract readable text from resume. Please upload a text-based PDF or DOCX.",
          400,
        ),
      );
    }
  } catch (error) {
    console.error("Extraction error:", error.message);
    return next(
      new AppError(error.message || "Failed to extract text from resume", 400),
    );
  }

  // Truncate if too long
  const truncatedResume = resumeText.slice(0, 8000);
  const truncatedJob = (jobDescription || "Software Developer").slice(0, 2000);

  const prompt = `You are an expert ATS (Applicant Tracking System) analyst.

Analyze this resume against the job description and return ONLY valid JSON (no markdown, no extra text):

{
  "atsScore": number (0-100),
  "matchScore": number (0-100),
  "missingKeywords": [string],
  "strengths": [string],
  "weaknesses": [string],
  "improvements": [string],
  "sections": {
    "skills": number (0-100),
    "projects": number (0-100),
    "experience": number (0-100),
    "formatting": number (0-100)
  }
}

Resume Text:
${truncatedResume}

Job Description:
${truncatedJob}`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content:
            "You are an ATS expert. Return ONLY valid JSON. No explanations, no markdown formatting.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const text = completion.choices[0].message.content;
    console.log("Groq response received, length:", text.length);

    // Clean and parse JSON
    let cleaned = text.trim();

    // Remove markdown code blocks if present
    cleaned = cleaned.replace(/```json\n?/g, "");
    cleaned = cleaned.replace(/```\n?/g, "");

    // Find JSON object
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const data = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (typeof data.atsScore !== "number") data.atsScore = 0;
    if (typeof data.matchScore !== "number") data.matchScore = 0;
    if (!data.missingKeywords) data.missingKeywords = [];
    if (!data.strengths) data.strengths = [];
    if (!data.weaknesses) data.weaknesses = [];
    if (!data.improvements) data.improvements = [];
    if (!data.sections) {
      data.sections = {
        skills: 0,
        projects: 0,
        experience: 0,
        formatting: 0,
      };
    }

    return res.status(200).json({
      status: "success",
      data,
    });
  } catch (error) {
    console.error("Analysis error:", error.message);

    // Return fallback response
    return res.status(200).json({
      status: "partial",
      data: {
        atsScore: 65,
        matchScore: 60,
        missingKeywords: ["JavaScript", "React", "Node.js"],
        strengths: ["Resume uploaded successfully"],
        weaknesses: ["Could not fully analyze"],
        improvements: ["Ensure resume has readable text"],
        sections: {
          skills: 50,
          projects: 50,
          experience: 50,
          formatting: 70,
        },
      },
      message: "Partial analysis due to parsing issue",
    });
  }
});
