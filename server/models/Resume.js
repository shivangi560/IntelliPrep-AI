
const mongoose = require("mongoose");

const resumeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    originalName: {
      type: String,
      required: true
    },

    fileName: {
      type: String,
      required: true
    },

    filePath: {
      type: String,
      required: true
    },

    fileType: {
      type: String,
      required: true
    },

    extractedText: {
      type: String,
      default: ""
    },

    skills: {
      type: [String],
      default: []
    },

    resumeScore: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Resume", resumeSchema);
