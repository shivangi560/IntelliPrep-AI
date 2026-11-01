
const mongoose = require("mongoose");

const interviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    role: {
      type: String,
      required: true
    },
    difficulty: {
      type: String,
      default: "medium"
    },
    questions: [
      {
        question: String,
        topic: String,
        answer: String,
        evaluation: {
          score: Number,
          correctness: Number,
          relevance: Number,
          technicalDepth: Number,
          completeness: Number,
          communication: Number,
          feedback: String,
          strengths: [String],
          improvements: [String],
          idealAnswer: String
        }
      }
    ],
    totalScore: {
      type: Number,
      default: 0
    },
    completedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Interview", interviewSchema);
