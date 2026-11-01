
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const pdf = require("pdf-parse");
const mammoth = require("mammoth");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { GoogleGenAI } = require("@google/genai");
const Certificate = require("./models/Certificate");

require("dotenv").config();

const User = require("./models/User");
const Resume = require("./models/Resume");
const Interview = require("./models/Interview");

const app = express();

// -------------------- CONFIGURATION --------------------

app.use(cors());
app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PORT || 5000;

const uploadDir = path.join(__dirname, "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

// -------------------- AUTHENTICATION --------------------

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Please login first"
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }
};

// -------------------- GEMINI RESPONSE HELPER --------------------

const getAIResponse = async (prompt, options = {}) => {
  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      ...options
    }
  });

  const text = (response.text || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  if (!text) {
    throw new Error("AI returned an empty response.");
  }

  return JSON.parse(text);
};

// -------------------- MULTER CONFIGURATION --------------------

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname).toLowerCase();

    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },

  fileFilter: (req, file, cb) => {
    const allowedExtensions = [".pdf", ".docx"];
    const extension = path.extname(file.originalname).toLowerCase();

    if (allowedExtensions.includes(extension)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and DOCX files are allowed"));
    }
  }
});

// -------------------- TEST ROUTE --------------------

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to IntelliPrep AI Backend!"
  });
});

// -------------------- REGISTER API --------------------

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword
    });

    await newUser.save();

    return res.status(201).json({
      success: true,
      message: "Registration successful"
    });

  } catch (error) {
    console.error("Registration error:", error.message);

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// -------------------- LOGIN API --------------------

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found"
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid password"
      });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// -------------------- RESUME UPLOAD API --------------------

app.post(
  "/api/resume/upload",
  authMiddleware,
  (req, res, next) => {
    upload.single("resume")(req, res, (error) => {
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      next();
    });
  },

  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Please upload a resume"
        });
      }

      const extension = path.extname(
        req.file.originalname
      ).toLowerCase();

      let extractedText = "";

      if (extension === ".pdf") {
        const data = await pdf(
          fs.readFileSync(req.file.path)
        );

        extractedText = data.text;

      } else if (extension === ".docx") {
        const data = await mammoth.extractRawText({
          path: req.file.path
        });

        extractedText = data.value;
      }

      if (!extractedText.trim()) {
        fs.unlinkSync(req.file.path);

        return res.status(400).json({
          success: false,
          message: "Could not extract text from this resume"
        });
      }

      const resume = await Resume.create({
        userId: req.userId,
        originalName: req.file.originalname,
        fileName: req.file.filename,
        filePath: req.file.path,
        fileType: extension,
        extractedText
      });

      return res.status(201).json({
        success: true,
        message: "Resume uploaded successfully!",
        resume: {
          id: resume._id,
          originalName: resume.originalName,
          extractedText: resume.extractedText
        }
      });

    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      console.error("Resume upload error:", error.message);

      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);
// -------------------- AI RESUME ANALYSIS API --------------------

app.post("/api/resume/analyze", authMiddleware, async (req, res) => {
  try {
    const resume = await Resume.findOne({
      userId: req.userId
    }).sort({ createdAt: -1 });

    if (!resume || !resume.extractedText) {
      return res.status(404).json({
        success: false,
        message: "Please upload your resume first."
      });
    }

    const prompt = `
You are IntelliPrep AI, an expert resume analyst.

Analyze the candidate's resume carefully.

RESUME CONTENT:
"""
${resume.extractedText.slice(0, 12000)}
"""

Evaluate the resume based only on the information provided.

Return ONLY valid JSON in this exact structure:

{
  "resumeScore": 75,
  "summary": "A clear summary of the candidate's resume.",
  "skills": ["JavaScript", "React.js"],
  "strengths": [
    "Clearly mentioned technical skills"
  ],
  "weaknesses": [
    "Project descriptions need more details"
  ],
  "missingSkills": [
    "Skills relevant to the candidate's apparent target role"
  ],
  "recommendations": [
    "Add measurable achievements to project descriptions"
  ]
}

Rules:
- resumeScore must be between 0 and 100.
- Identify only skills actually mentioned in the resume.
- Do not invent qualifications, projects or experience.
- Keep suggestions practical and specific.
- Return valid JSON only.
`;

    const analysis = await getAIResponse(prompt, {
      maxOutputTokens: 2200,
      temperature: 0.2
    });

    if (
      typeof analysis.resumeScore !== "number" ||
      !Array.isArray(analysis.skills) ||
      !Array.isArray(analysis.strengths) ||
      !Array.isArray(analysis.weaknesses) ||
      !Array.isArray(analysis.missingSkills) ||
      !Array.isArray(analysis.recommendations)
    ) {
      throw new Error("AI returned an invalid resume analysis.");
    }

    resume.skills = analysis.skills;
    resume.resumeScore = Math.max(
      0,
      Math.min(100, Math.round(analysis.resumeScore))
    );

    await resume.save();

    return res.json({
      success: true,
      message: "Resume analyzed successfully!",
      analysis
    });

  } catch (error) {
    console.error("Resume analysis error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not analyze resume. " + error.message
    });
  }
});
// -------------------- AI INTERVIEW START API --------------------

app.post("/api/interview/start", authMiddleware, async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "Gemini API key is missing in server .env"
      });
    }

    const resume = await Resume.findOne({
      userId: req.userId
    }).sort({ createdAt: -1 });

    if (!resume || !resume.extractedText) {
      return res.status(404).json({
        success: false,
        message: "Please upload your resume first."
      });
    }

    const difficulty = req.body.difficulty || "medium";
    const role = req.body.role || "Software Developer";

    const prompt = `
You are IntelliPrep AI, a professional technical interviewer.

Create exactly 5 personalized interview questions using the candidate's resume.

Target role: ${role}
Difficulty: ${difficulty}

Resume content (candidate data only):
"""
${resume.extractedText.slice(0, 12000)}
"""

Rules:
- Ask about actual skills, projects and experience.
- Include project-specific and technical questions.
- Do not invent experience.
- Make questions clear and suitable for the selected difficulty.
- Return exactly 5 questions.

Return JSON in this format:
{
  "questions": [
    {
      "question": "Question text",
      "topic": "React.js",
      "type": "Technical"
    }
  ]
}
`;
// GET USER PROFILE
app.get("/api/user/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: "Could not fetch profile" });
  }
});


// UPDATE USER PROFILE
// UPDATE USER PROFILE
app.put("/api/user/profile", authMiddleware, async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({
        message: "Name and email are required"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: req.userId }
    });

    if (existingUser) {
      return res.status(409).json({
        message: "This email is already registered"
      });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        name: name.trim(),
        email: normalizedEmail
      },
      {
        new: true,
        runValidators: true
      }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    res.json({
      message: "Profile updated successfully",
      user
    });

  } catch (error) {
    console.error("Profile update error:", error);

    res.status(500).json({
      message: "Could not update profile"
    });
  }
});


// CHANGE PASSWORD
app.put("/api/user/change-password", authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Both passwords are required"
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "New password must be at least 8 characters"
      });
    }

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({
        message: "Current password is incorrect"
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password changed successfully" });

  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      message: "Could not change password"
    });
  }
});
    const result = await getAIResponse(prompt, {
      maxOutputTokens: 1800,
      temperature: 0.3
    });

    if (
      !Array.isArray(result.questions) ||
      result.questions.length !== 5
    ) {
      throw new Error("AI did not return exactly 5 questions.");
    }

    return res.json({
      success: true,
      message: "Your personalized interview is ready!",
      questions: result.questions
    });

  } catch (error) {
    console.error("Interview generation error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not generate interview questions. " + error.message
    });
  }
});

// -------------------- AI ANSWER EVALUATION API --------------------

app.post("/api/interview/evaluate", authMiddleware, async (req, res) => {
  try {
    const {
      question,
      answer,
      role,
      topic,
      difficulty
    } = req.body;

    if (!question || !answer || !answer.trim()) {
      return res.status(400).json({
        success: false,
        message: "Question and answer are required."
      });
    }

    const prompt = `
You are IntelliPrep AI, a professional interview evaluator.

Evaluate the candidate's answer objectively.

Target Role: ${role || "Software Developer"}
Difficulty: ${difficulty || "medium"}
Topic: ${topic || "General"}

Interview Question:
${question}

Candidate Answer:
${answer}

Evaluate:
1. Correctness
2. Relevance
3. Technical depth
4. Completeness
5. Communication clarity

Give a fair score out of 100.

Return ONLY valid JSON:
{
  "score": 75,
  "correctness": 80,
  "relevance": 85,
  "technicalDepth": 70,
  "completeness": 65,
  "communication": 75,
  "strengths": ["Good explanation"],
  "improvements": ["Add a practical example"],
  "feedback": "Your answer is relevant but needs more technical detail.",
  "idealAnswer": "A clear example of an ideal answer."
}

All scores must be between 0 and 100.
Do not give high scores without evidence.
`;

    const evaluation = await getAIResponse(prompt, {
      maxOutputTokens: 1800,
      temperature: 0.2
    });

    return res.json({
      success: true,
      message: "Answer evaluated successfully!",
      evaluation
    });

  } catch (error) {
    console.error("Answer evaluation error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not evaluate answer. " + error.message
    });
  }
});

// -------------------- SAVE INTERVIEW API --------------------

app.post("/api/interview/save", authMiddleware, async (req, res) => {
  try {
    const { role, difficulty, questions } = req.body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Interview questions are required."
      });
    }

    const validQuestions = questions.filter(
      (item) =>
        item.question &&
        item.answer?.trim() &&
        item.evaluation
    );

    if (validQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No evaluated answers found."
      });
    }

    const totalScore = Math.round(
      validQuestions.reduce(
        (sum, item) => sum + Number(item.evaluation.score || 0),
        0
      ) / validQuestions.length
    );

    const interview = await Interview.create({
      userId: req.userId,
      role: role || "Software Developer",
      difficulty: difficulty || "medium",
      questions: validQuestions,
      totalScore
    });

    return res.status(201).json({
      success: true,
      message: "Interview result saved successfully!",
      interviewId: interview._id,
      totalScore
    });

  } catch (error) {
    console.error("Save interview error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not save interview result."
    });
  }
});

// -------------------- DASHBOARD INTERVIEW STATS API --------------------

app.get("/api/interview/stats", authMiddleware, async (req, res) => {
  try {
    const interviews = await Interview.find({
      userId: req.userId
    })
      .sort({ createdAt: -1 })
      .lean();

    const totalInterviews = interviews.length;

    const averageScore = totalInterviews
      ? Math.round(
          interviews.reduce(
            (sum, item) => sum + item.totalScore,
            0
          ) / totalInterviews
        )
      : 0;

    const bestScore = totalInterviews
      ? Math.max(...interviews.map(item => item.totalScore))
      : 0;

    return res.json({
      success: true,
      totalInterviews,
      averageScore,
      bestScore,

      history: interviews.slice(0, 5).map(item => ({
        role: item.role,
        score: item.totalScore,
        date: item.createdAt
      }))
    });

  } catch (error) {
    console.error("Interview stats error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not fetch interview statistics."
    });
  }
});

// -------------------- AI SKILL GAP ANALYSIS API --------------------

app.get("/api/skills/analyze", authMiddleware, async (req, res) => {
  try {
    const interviews = await Interview.find({
      userId: req.userId
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    if (interviews.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Complete an interview first to analyze your skills."
      });
    }

    const performance = interviews.flatMap(interview =>
      (interview.questions || []).map(item => ({
        topic: item.topic,
        question: item.question,
        answer: item.answer,
        score: item.evaluation?.score || 0,
        feedback: item.evaluation?.feedback || ""
      }))
    );

    const prompt = `
You are an expert technical skills analyst.

Analyze this candidate's actual interview performance.

Performance data:
${JSON.stringify(performance).slice(0, 12000)}

Identify strengths and weak areas based on evidence.

Return ONLY valid JSON:
{
  "overallSummary": "Performance summary",
  "skills": [
    {
      "name": "React.js",
      "score": 75,
      "level": "Good",
      "recommendation": "Practice advanced hooks"
    }
  ],
  "priorityTopics": [
    "JavaScript fundamentals",
    "DBMS joins"
  ]
}

Rules:
- Use only topics supported by performance data.
- Do not invent skills.
- Scores must be between 0 and 100.
- Give practical recommendations.
`;

    const result = await getAIResponse(prompt, {
      maxOutputTokens: 2500,
      temperature: 0.2
    });

    return res.json({
      success: true,
      analysis: result
    });

  } catch (error) {
    console.error("Skill analysis error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not analyze skills. " + error.message
    });
  }
});

// -------------------- PERSONALIZED AI LEARNING ROADMAP API --------------------

app.get("/api/roadmap/generate", authMiddleware, async (req, res) => {
  try {
    console.log("Roadmap generation started...");

    const interviews = await Interview.find({
      userId: req.userId
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    if (interviews.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Complete an interview first to generate your roadmap."
      });
    }

    const performance = interviews.flatMap(interview =>
      (interview.questions || []).map(item => ({
        topic: item.topic,
        question: item.question,
        answer: item.answer,
        score: item.evaluation?.score || 0,
        improvements: item.evaluation?.improvements || [],
        feedback: item.evaluation?.feedback || ""
      }))
    );

    const prompt = `
You are IntelliPrep AI, an expert technical interview preparation mentor.

Analyze the candidate's actual interview performance carefully.

Candidate performance:
${JSON.stringify(performance).slice(0, 12000)}

Create a high-quality, personalized 7-day learning roadmap.

IMPORTANT REQUIREMENTS:

1. Identify weak topics from low-scoring answers.
2. Prioritize topics that will improve interview performance.
3. Do not recommend unrelated topics.
4. Explain what to learn and why it matters.
5. Give practical and achievable learning tasks.
6. Include coding practice wherever relevant.
7. Include trusted learning resources.
8. Include meaningful practical exercises.
9. Make difficulty progressive from basic to advanced.
10. Avoid generic and repeated recommendations.
11. Do not invent candidate skills or performance results.

Use only these trusted resources where relevant:

- React: https://react.dev/learn
- JavaScript: https://javascript.info/
- MDN: https://developer.mozilla.org/en-US/docs/Learn_web_development
- Java: https://dev.java/learn/
- Python: https://docs.python.org/3/tutorial/
- SQL: https://www.w3schools.com/sql/
- freeCodeCamp: https://www.freecodecamp.org/learn/

Return ONLY valid JSON in this structure:

{
  "title": "Personalized Learning Roadmap",
  "summary": "Detailed summary based on candidate performance",
  "days": [
    {
      "day": 1,
      "topic": "Topic name",
      "goal": "Specific learning goal",
      "tasks": [
        "Detailed learning task",
        "Practical coding task"
      ],
      "resources": [
        {
          "name": "Resource name",
          "type": "Documentation or Tutorial",
          "url": "Exact trusted URL"
        }
      ],
      "practiceTasks": [
        "Practical exercise with a clear objective"
      ]
    }
  ]
}

Generate exactly 7 complete days.

Keep content technically accurate, specific and useful.
Use the candidate's actual weak areas to personalize the plan.
Return valid JSON only.
`;

    const roadmap = await getAIResponse(prompt, {
      maxOutputTokens: 3500,
      temperature: 0.2
    });

    if (
      !Array.isArray(roadmap.days) ||
      roadmap.days.length !== 7
    ) {
      throw new Error("AI did not generate exactly 7 days.");
    }

    console.log("Roadmap generated successfully!");

    return res.json({
      success: true,
      roadmap
    });

  } catch (error) {
    console.error("Roadmap generation error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not generate learning roadmap. " + error.message
    });
  }
});

// -------------------- CERTIFICATE GENERATION API --------------------

app.post("/api/certificate/generate", authMiddleware, async (req, res) => {
  try {
    const { interviewId } = req.body;

    if (!interviewId) {
      return res.status(400).json({
        success: false,
        message: "Interview ID is required."
      });
    }

    const interview = await Interview.findOne({
      _id: interviewId,
      userId: req.userId
    });

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview result not found."
      });
    }

    if (interview.totalScore < 50) {
      return res.status(400).json({
        success: false,
        message: "You need at least 50% score to receive a certificate."
      });
    }

    const existingCertificate = await Certificate.findOne({
      userId: req.userId,
      interviewId: interview._id
    });

    if (existingCertificate) {
      return res.json({
        success: true,
        message: "Certificate already exists.",
        certificate: existingCertificate
      });
    }

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    let level = "Completion";

    if (interview.totalScore >= 85) {
      level = "Excellence";
    } else if (interview.totalScore >= 70) {
      level = "Proficiency";
    }

    const certificateId =
      "IPA-" + Date.now() + "-" +
      Math.random().toString(36).substring(2, 8).toUpperCase();

    const certificate = await Certificate.create({
      userId: req.userId,
      interviewId: interview._id,
      certificateId,
      candidateName: user.name,
      role: interview.role,
      score: interview.totalScore,
      level
    });

    return res.status(201).json({
      success: true,
      message: "Certificate generated successfully!",
      certificate
    });

  } catch (error) {
    console.error("Certificate generation error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not generate certificate."
    });
  }
});

// -------------------- CERTIFICATE VERIFICATION API --------------------

app.get("/api/certificate/verify/:certificateId", async (req, res) => {
  try {
    const certificateId = req.params.certificateId.trim();

    const certificate = await Certificate.findOne({
      certificateId
    }).select(
      "certificateId candidateName role score level issuedAt"
    );

    if (!certificate) {
      return res.status(404).json({
        success: false,
        verified: false,
        message: "Invalid certificate ID. Certificate not found."
      });
    }

    return res.json({
      success: true,
      verified: true,
      message: "Certificate verified successfully!",
      certificate
    });

  } catch (error) {
    console.error("Certificate verification error:", error.message);

    return res.status(500).json({
      success: false,
      verified: false,
      message: "Could not verify certificate."
    });
  }
});

// -------------------- USER INTERVIEW HISTORY FOR CERTIFICATES --------------------

app.get("/api/certificate/interviews", authMiddleware, async (req, res) => {
  try {
    const interviews = await Interview.find({
      userId: req.userId
    })
      .select("_id role totalScore completedAt createdAt")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      interviews
    });

  } catch (error) {
    console.error("Certificate interview history error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not fetch interview history."
    });
  }
});
// Dashboard Summary API
app.get("/api/dashboard/summary", authMiddleware, async (req, res) => {
  try {
    const [latestResume, certificateCount] = await Promise.all([
      Resume.findOne({ userId: req.userId })
        .sort({ createdAt: -1 })
        .select("resumeScore")
        .lean(),

      Certificate.countDocuments({ userId: req.userId })
    ]);

    res.json({
      resumeScore: latestResume?.resumeScore ?? null,
      certificateCount
    });

  } catch (error) {
    console.error("Dashboard summary error:", error);
    res.status(500).json({
      message: "Could not fetch dashboard summary"
    });
  }
});

 // -------------------- USER PROFILE API --------------------

// GET PROFILE
app.get("/api/user/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("name email");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    return res.json({
      success: true,
      user
    });

  } catch (error) {
    console.error("Fetch profile error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not load profile."
    });
  }
});


// UPDATE PROFILE
app.put("/api/user/profile", authMiddleware, async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: req.userId }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "This email is already registered."
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      {
        name: name.trim(),
        email: normalizedEmail
      },
      {
        new: true,
        runValidators: true
      }
    ).select("name email");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    return res.json({
      success: true,
      message: "Profile updated successfully!",
      user: updatedUser
    });

  } catch (error) {
    console.error("Update profile error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Profile update failed."
    });
  }
});


// CHANGE PASSWORD
app.put("/api/user/change-password", authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current and new passwords are required."
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must contain at least 8 characters."
      });
    }

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    const isMatch = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect."
      });
    }

    const samePassword = await bcrypt.compare(
      newPassword,
      user.password
    );

    if (samePassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from current password."
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({
      success: true,
      message: "Password changed successfully!"
    });

  } catch (error) {
    console.error("Change password error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Password change failed."
    });
  }
});

 // -------------------- DASHBOARD SUMMARY API --------------------

app.get("/api/dashboard/summary", authMiddleware, async (req, res) => {
  try {
    const resume = await Resume.findOne({
      userId: req.userId
    }).sort({ createdAt: -1 });

    const certificateCount = await Certificate.countDocuments({
      userId: req.userId
    });

    return res.json({
      success: true,
      resumeScore: resume ? resume.resumeScore : null,
      certificateCount
    });

  } catch (error) {
    console.error("Dashboard summary error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not fetch dashboard summary."
    });
  }
});

// -------------------- MONGODB CONNECTION --------------------

if (!process.env.MONGO_URI) {
  console.error("MONGO_URI is missing in server .env");
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is missing in server .env");
  process.exit(1);
}

if (!process.env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is missing in server .env");
  process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected Successfully!");

    app.listen(PORT, () => {
      console.log(`IntelliPrep AI Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB Connection Error:", error.message);
    process.exit(1);
  });
