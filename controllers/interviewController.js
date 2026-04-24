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
      prompt = `You are a professional technical interviewer conducting a ${interview.difficulty} level interview for a ${interview.role} position.

            Your task: Ask ONE conceptual technical interview question.

            STRICT RULES:
            - Do NOT ask the candidate to write code.
            - Do NOT ask to build or implement anything.
            - Do NOT say "write a program", "create schema", or "implement".
            - ONLY ask explanation-based or concept-based questions.

            The question should:
            1. Test understanding of core ${interview.role} concepts
            2. Be answerable verbally (like in a real interview)
            3. Allow explanation, reasoning, and discussion
            4. Be clear and specific

            ${
              interview.role === "MERN Stack"
                ? `
            Focus on topics like:
            - React concepts (hooks, state, lifecycle)
            - Node.js event loop
            - Express middleware
            - MongoDB relationships & indexing
            - Authentication (JWT)
            - API design & best practices
            - Performance optimization
            `
                : ""
            }

            ${interview.difficulty === "easy" ? "Ask basic concept questions." : ""}
            ${interview.difficulty === "medium" ? "Ask scenario-based or real-world questions." : ""}
            ${interview.difficulty === "hardest" ? "Ask deep conceptual or architecture-level questions." : ""}

            Format:
            Return ONLY the question.
            No explanation.
            No code tasks.
            Make it sound like a real interviewer speaking.`;
    }

    if (interview.interviewType === "strict") {
      prompt = `You are a strict and demanding technical interviewer assessing a ${interview.role} candidate at ${interview.difficulty} level.

                Your task: Ask ONE challenging conceptual question.

                STRICT RULES:
                - Do NOT ask to write code.
                - Do NOT ask to implement anything.
                - Do NOT give coding problems.
                - ONLY ask deep explanation-based questions.

                The question must:
                1. Test deep understanding of ${interview.role}
                2. Require critical thinking
                3. Include a real-world scenario
                4. Require reasoning, not coding

                Examples of style:
                - "Explain how..."
                - "What would happen if..."
                - "Why would you choose..."
                - "How would you handle..."

                ${interview.difficulty === "easy" ? "Keep it basic but still conceptual." : ""}
                ${interview.difficulty === "medium" ? "Include real-world scenarios." : ""}
                ${interview.difficulty === "hardest" ? "Focus on architecture, trade-offs, and edge cases." : ""}

                Format:
                Return ONLY the question.
                No explanation.
                No coding tasks.
                Make it feel like a real strict interviewer.`;
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

export const getInterviewById = catchAsync(async (req, res, next) => {
  const interview = await Interview.findById(req.params.id);

  if (!interview) {
    return next(new AppError("There is no interviw with these Id", 400));
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
