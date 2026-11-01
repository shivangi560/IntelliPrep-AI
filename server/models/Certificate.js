
const mongoose = require("mongoose");

const certificateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    interviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Interview",
      required: true
    },
    certificateId: {
      type: String,
      required: true,
      unique: true
    },
    candidateName: {
      type: String,
      required: true
    },
    role: {
      type: String,
      required: true
    },
    score: {
      type: Number,
      required: true
    },
    level: {
      type: String,
      required: true
    },
    issuedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Certificate", certificateSchema);
