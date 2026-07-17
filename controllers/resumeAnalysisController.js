import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";
import { extractTextFromFile } from "../utils/extractText.js";
import groq from "../utils/groq.js";
import User from "../models/userModel.js";

export const analyzeResume = catchAsync(async (req, res, next) => {
  const { jobDescription } = req.body;

  // Check file exists
  if (!req.file) {
    return next(new AppError("No resume file uploaded", 400));
  }

  // Get user and check access
  const user = await User.findById(req.user.id);
  await user.checkSubscriptionStatus();

  if (!user.hasAccess()) {
    return next(
      new AppError(
        "No credits or active subscription. Please purchase credits or subscribe.",
        402,
      ),
    );
  }

  const deducted = await user.deductCredits(20);

  if (!deducted) {
    return next(
      new AppError(
        `Insufficient credits. You need 20 credits but have ${user.credits}.`,
        402,
      ),
    );
  }

  let resumeText;
  try {
    resumeText = await extractTextFromFile(req.file);
    console.log("Extracted text length:", resumeText?.length || 0);

    if (!resumeText || resumeText.trim().length < 50) {
      user.credits += 20;
      await user.save({ validateBeforeSave: false });

      return next(
        new AppError(
          "Could not extract readable text from resume. Please upload a text-based PDF or DOCX.",
          400,
        ),
      );
    }
  } catch (error) {
    user.credits += 20;
    await user.save({ validateBeforeSave: false });

    console.error("Extraction error:", error.message);
    return next(
      new AppError(error.message || "Failed to extract text from resume", 400),
    );
  }

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
      model: "openai/gpt-oss-120b",
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

    let cleaned = text.trim();
    cleaned = cleaned.replace(/```json\n?/g, "");
    cleaned = cleaned.replace(/```\n?/g, "");

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const data = JSON.parse(jsonMatch[0]);

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

    const updatedUser = await User.findById(req.user.id);

    return res.status(200).json({
      status: "success",
      data: {
        ...data,
        credits: updatedUser.credits,
        message:
          updatedUser.isLifetime || updatedUser.subscription?.isActive
            ? "Analysis completed (Subscription)"
            : `Analysis completed (${updatedUser.credits} credits remaining)`,
      },
    });
  } catch (error) {
    console.error("Analysis error:", error.message);

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
        credits: user.credits,
      },
      message: "Partial analysis due to parsing issue",
    });
  }
});
