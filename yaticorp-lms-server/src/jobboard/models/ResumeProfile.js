const mongoose = require("mongoose");

/**
 * What a student's resume said, structured — never the resume itself.
 *
 * The file is parsed and discarded in the same request: a stored resume is a
 * liability (names, phone numbers, addresses) that this feature has no use
 * for once the facts are out. What stays is exactly what the job matching
 * consumes — skills in the taxonomy's vocabulary, an experience level, the
 * education line — plus the headline shown back to the student so they can
 * see what the parser understood. One document per student, replaced on
 * re-upload, deletable by its owner.
 */
const resumeProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true },

    // Normalised against the job taxonomy so they slot straight into the
    // ranking; the raw spellings are kept so the review UI can show what the
    // resume actually said.
    skills: { type: [String], default: [] },
    skillsRaw: { type: [String], default: [] },

    experienceYears: { type: Number, default: 0 },
    seniority: {
      type: String,
      enum: ["Student", "Fresher", "Junior", "Mid-level", "Senior", "Lead"],
      default: "Fresher"
    },
    education: {
      level: { type: String, default: "" },
      degree: { type: String, default: "" },
      specialization: { type: String, default: "" }
    },
    pastRoles: { type: [String], default: [] },
    headline: { type: String, default: "" },

    filename: { type: String, default: "" },
    parsedAt: { type: Date, default: Date.now },

    // Set only by the profile page's upload, which keeps the file itself on
    // Bunny so the student can open it again. The Jobs tab's upload never
    // stores the file and leaves these empty.
    fileUrl: { type: String, default: "" },
    objectPath: { type: String, default: "" },
    // parsed: skills etc. came from this file. stored: the file was kept but
    // the parser was unavailable, so the extraction (if any) is older.
    parseStatus: { type: String, enum: ["parsed", "stored"], default: "parsed" }
  },
  { versionKey: false }
);

module.exports = mongoose.model("JobBoardResumeProfile", resumeProfileSchema, "jobboard_resumes");
