import Interview from "../models/interviewModel.js";
import User from "../models/userModel.js";
import ApiFeatures from "../utils/apiFeatures.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";
import groq from "../utils/groq.js";

export const generateQuestion = catchAsync(async (req, res, next) => {
  try {
    const interview = await Interview.findById(req.body.id);

    let prompt;

    if (interview.interviewType === "hr") {
      prompt = `You are a friendly and professional HR interviewer speaking directly to a candidate.

              Start naturally like a real interview (for example: "Tell me about yourself" can be used sometimes).

              Ask ONE HR interview question for a ${interview.difficulty} level ${interview.role} candidate.

              Guidelines:
              - Keep it conversational and natural
              - Focus on behavior, communication, motivation, or cultural fit
              - Make it feel like a real interviewer speaking in person
              - Keep it concise (1–2 sentences max)

              Examples of tone:
              - "Tell me about a time when..."
              - "How do you usually handle..."
              - "Why are you interested in..."

              Return ONLY the question. No explanation.`;
    }

    if (interview.interviewType === "technical") {
      prompt = `You are a professional technical interviewer having a real conversation with a candidate.

            Ask ONE conceptual question for a ${interview.difficulty} level ${interview.role} candidate.

            Important:
            - Do NOT ask to write code
            - Do NOT ask to implement anything
            - Ask only explanation-based questions
            - Make it sound like a real interviewer speaking casually but professionally

            ${
              interview.role === "MERN Stack"
                ? `
            Focus on topics like:
            - React (hooks, state, lifecycle)
            - Node.js event loop
            - Express middleware
            - MongoDB
            - Authentication (JWT)
            - API design
            - Performance
            `
                : ""
            }

            Difficulty guidance:
            ${interview.difficulty === "easy" ? "- Ask basic understanding questions." : ""}
            ${interview.difficulty === "medium" ? "- Ask scenario-based questions." : ""}
            ${interview.difficulty === "hardest" ? "- Ask deep reasoning or architecture questions." : ""}

            Tone examples:
            - "Can you explain how..."
            - "What happens when..."
            - "Why would you choose..."

            Return ONLY the question.`;
    }

    if (interview.interviewType === "strict") {
      prompt = `You are a strict and demanding technical interviewer.

        Ask ONE challenging conceptual question for a ${interview.difficulty} level ${interview.role} candidate.

        Rules:
        - No coding questions
        - No implementation tasks
        - Only deep explanation-based questions
        - Make it feel like a real high-pressure interview

        The question should:
        - Include a real-world scenario
        - Test deep understanding
        - Force the candidate to think critically

        Tone examples:
        - "Why would you choose..."
        - "What would happen if..."
        - "How would you handle..."

        ${interview.difficulty === "easy" ? "Keep it simple but still thoughtful." : ""}
        ${interview.difficulty === "medium" ? "Include realistic scenarios." : ""}
        ${interview.difficulty === "hardest" ? "Focus on trade-offs, scaling, and edge cases." : ""}

        Return ONLY the question.`;
    }
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const question = completion.choices[0]?.message?.content;
    res.status(200).json({ question });
  } catch (error) {
    res.status(500).json({ message: "Error genrating question" });
  }
});

export const evaluateAnswer = catchAsync(async (req, res, next) => {
  try {
    const { question, answer } = req.body;

    const prompt = `
  Question: ${question}
  Answer: ${answer}

  Give:
  1. Score out of 10
  2. Short feedback

  Format:
  Score: X
  Feedback: ...
  `;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const text = completion.choices[0]?.message?.content;

    const scoreMatch = text.match(/Score:\s*(\d+)/);
    const feedbackMatch = text.match(/Feedback:\s*(.*)/);

    res.json({
      score: scoreMatch ? Number(scoreMatch[1]) : 5,
      feedback: feedbackMatch ? feedbackMatch[1] : "Good attempt",
    });
  } catch (error) {
    res.status(500).json({ message: "Error evaluating answer" });
  }
});

export const createInterview = catchAsync(async (req, res, next) => {
  if (!req.body.user) req.body.user = req.user.id;

  // Get user with fresh data
  const user = await User.findById(req.user.id);

  // Check subscription status
  await user.checkSubscriptionStatus();

  // Check if user has access
  if (!user.hasAccess()) {
    return next(
      new AppError(
        "No credits or active subscription. Please purchase credits or subscribe to continue.",
        402,
      ),
    );
  }

  // Try to deduct credits
  const deducted = await user.deductCredits(20);

  if (!deducted) {
    return next(
      new AppError(
        `Insufficient credits. You have ${user.credits} credits but need 20.`,
        402,
      ),
    );
  }

  // Create interview
  const interview = await Interview.create({
    user: req.body.user,
    name: req.body.name,
    interviewType: req.body.interviewType,
    role: req.body.role,
    difficulty: req.body.difficulty,
  });

  // Get updated user
  const updatedUser = await User.findById(req.user.id);

  res.status(201).json({
    status: "success",
    message:
      updatedUser.isLifetime || updatedUser.subscription?.isActive
        ? "Interview started (Subscription Active) ⭐"
        : `Interview started successfully ⭐ (${updatedUser.credits} credits remaining)`,
    data: {
      interview,
      credits: updatedUser.credits,
    },
  });
});

export const saveAnswer = catchAsync(async (req, res, next) => {
  const { interviewId, question, answer, feedback, score } = req.body;

  const interview = await Interview.findById(interviewId);

  if (!interview) {
    return next(new AppError("Interview not found", 404));
  }

  interview.conversation.push({
    question,
    answer,
    feedback,
    score,
  });

  await interview.save();

  res.json({ message: "Answer saved successfully" });
});

export const finishInterview = catchAsync(async (req, res, next) => {
  const { interviewId } = req.body;

  const interview = await Interview.findById(interviewId);
  if (!interview) {
    return next(new AppError("There is no interview with this ID.", 404));
  }

  const conversation = interview.conversation || [];
  if (conversation.length === 0) {
    interview.totalScore = 0;
  } else {
    const sum = conversation.reduce((acc, el) => acc + (el.score || 0), 0);
    interview.totalScore = sum / conversation.length;
  }

  interview.status = "completed";
  interview.completedAt = Date.now();

  const totalScore = interview.totalScore;

  interview.overallFeedback =
    totalScore > 7
      ? "Great performance"
      : totalScore > 5
        ? "Good but needs improvement"
        : "Needs serious practice";

  await interview.save();

  res.status(200).json({ message: "Thanks for visiting 😇", interview });
});

export const getInterviewById = catchAsync(async (req, res, next) => {
  const interview = await Interview.findById(req.params.id);

  if (!interview) {
    return next(new AppError("There is no interview with this ID", 400));
  }

  res.status(200).json({
    status: "success",
    data: interview,
  });
});

export const deleteOneInterview = catchAsync(async (req, res, next) => {
  await Interview.findByIdAndDelete(req.params.id);
  return res.status(204).json({
    status: "success",
    message: "Interview Deleted",
  });
});

export const getAllInterview = catchAsync(async (req, res, next) => {
  const numInterview = await Interview.countDocuments();

  const features = new ApiFeatures(Interview.find(), req.query)
    .filter()
    .sort()
    .paginate();

  const interviews = await features.query.populate({
    path: "user",
    select: "name email photo",
  });

  res.status(200).json({
    status: "success",
    result: interviews.length,
    numInterview,
    interviews,
  });
});
