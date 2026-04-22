import Interview from "../models/interviewModel.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";
import groq from "../utils/groq.js";

export const generateQuestion = catchAsync(async (req, res, next) => {
  try {
    const interview = await Interview.findById(req.body.id);

    let prompt;

    if (interview.interviewType === "hr") {
      prompt = `You are an expert HR interviewer conducting a ${interview.difficulty} level interview for a ${interview.role} position.

                Your task: Ask ONE professional HR interview question that:
                1. Evaluates soft skills and cultural fit
                2. Assesses communication and problem-solving abilities
                3. Is appropriate for ${interview.difficulty} level candidates
                4. Is specific to the ${interview.role} role

                Question types to consider:
                - Behavioral (Tell me about a time when...)
                - Situational (How would you handle...)
                - Motivational (Why do you want this role?)
                - Cultural fit (What's your ideal work environment?)

                Format: Return ONLY the question, no explanations or prefixes.
                Keep the question concise, clear, and professional (2-3 sentences max).`;
    }

    if (interview.interviewType === "technical") {
      prompt = `You are a senior technical interviewer conducting a ${interview.difficulty} level technical interview for a ${interview.role} position.

              Your task: Ask ONE technical interview question that:
              1. Tests core ${interview.role} skills and knowledge
              2. Is appropriate for ${interview.difficulty} level candidates
              3. Has a clear correct/incorrect answer path
              4. Allows the candidate to demonstrate depth of knowledge

              ${interview.role === "MERN Stack" ? "Focus areas: MongoDB, Express.js, React.js, Node.js, REST APIs, JWT, Authentication, Database Design, State Management, Hooks, Middleware, Async Operations " : ""}

              ${interview.difficulty === "easy" ? "Ask fundamental concepts and basic implementation questions." : ""}
              ${interview.difficulty === "medium" ? "Ask about best practices, optimization, and real-world scenarios." : ""}
              ${interview.difficulty === "hardest" ? "Ask about system design, performance optimization, and architectural decisions." : ""}

              Format: Return ONLY the question, no explanations or prefixes.
              Be specific and technical. Include a scenario if appropriate.`;
    }

    if (interview.interviewType === "strict") {
      prompt = `You are a rigorous technical assessor conducting a ${interview.difficulty} level technical assessment for a ${interview.role} position.

              Your task: Ask ONE challenging technical question that:
              1. Tests deep understanding of ${interview.role} fundamentals
              2. Requires critical thinking and problem-solving
              3. Has specific, measurable evaluation criteria
              4. Is appropriate for ${interview.difficulty} level

              Include specific requirements or constraints in the question.
              Format: Return ONLY the question, no explanations or prefixes.
              Make it challenging but fair.`;
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

export const getAllInterviews = catchAsync(async (req, res, next) => {
  const allInterviews = await Interview.find();
  res.status(200).json({
    status: "success",
    result: allInterviews.length,
    data: {
      interview: allInterviews,
    },
  });
});

export const createInterview = catchAsync(async (req, res, next) => {
  if (!req.body.user) req.body.user = req.user.id;
  const interview = await Interview.create({
    user: req.body.user,
    name: req.body.name,
    interviewType: req.body.interviewType,
    role: req.body.role,
    difficulty: req.body.difficulty,
  });

  res.status(201).json({
    status: "success",
    message: "Interview started successfully ⭐",
    data: {
      interview,
    },
  });
});

export const saveAnswer = catchAsync(async (req, res, next) => {
  const { interviewId, question, answer, feedback, score } = req.body;

  const interview = await Interview.findById(interviewId);

  interview.conversation.push({
    question,
    answer,
    feedback,
    score,
  });

  await interview.save();

  res.json({ message: "Saved" });
});

export const finishInterview = catchAsync(async (req, res, next) => {
  const { interviewId } = req.body;

  const interview = await Interview.findById(interviewId);
  if (!interview) {
    return next(new AppError("There is no user with these id."));
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

  res.status(200).json({ message: "Thanks for visitng😇", interview });
});

export const getInterviewById = catchAsync(async (req, res) => {
  const interview = await Interview.findById(req.params.id);

  if (!interview) {
    return res.status(404).json({
      status: "fail",
      message: "Interview not found",
    });
  }

  res.status(200).json(interview);
});

export const deleteOneInterview = catchAsync(async (req, res, next) => {
  await Interview.findByIdAndDelete(req.params.id);
  return res.status(204).json({
    status: "success",
    message: "Interview Deleted",
  });
});
