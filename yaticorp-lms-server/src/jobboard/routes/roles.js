const express = require("express");
const Role = require("../models/Role.js");
const Job = require("../models/Job.js");
const { isConnected } = require("../config/db.js");
const { ROLES, ALL_SKILLS, POPULAR_SKILLS } = require("../data/roles.js");
const { analyzeGap, resolveRole, normalizeSkillList, norm, getRole } = require("../services/matchService.js");
const { coursesForSkills } = require("../services/lmsCourses.js");

const router = express.Router();

/** GET /api/roles — every role in the taxonomy. */
router.get("/", async (_req, res, next) => {
  try {
    if (isConnected()) {
      const docs = await Role.find().sort({ name: 1 }).lean();
      if (docs.length) return res.json({ source: "db", roles: docs });
    }
    // Fall back to the bundled taxonomy if the DB hasn't been seeded.
    res.json({ source: "bundled", roles: ROLES });
  } catch (err) {
    next(err);
  }
});

/** GET /api/roles/skills — canonical skill vocabulary for autocomplete. */
router.get("/skills", (_req, res) => {
  res.json({ all: ALL_SKILLS, popular: POPULAR_SKILLS });
});

/**
 * POST /api/roles/skill-gap
 * Role-to-skill recommendation on its own — "what must I learn to
 * become an X?" — without running a job search.
 * Body: { role, skills: [] }
 */
router.post("/skill-gap", async (req, res, next) => {
  try {
    const roleText = String(req.body?.role ?? "").trim();
    if (!roleText) return res.status(400).json({ error: "A role is required." });

    const roleName = resolveRole(roleText);
    if (!roleName) {
      return res.status(404).json({
        error: `"${roleText}" isn't in the skill library yet.`,
        suggestions: ROLES.slice(0, 8).map((r) => r.name),
      });
    }

    const skills = normalizeSkillList(req.body?.skills ?? []);

    // Market demand from stored listings whose title matches the role.
    const demand = new Map();
    if (isConnected()) {
      const role = getRole(roleName);
      const names = [role.name, ...role.aliases];
      const rx = names.map((n) => new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
      const jobs = await Job.find({ active: true, title: { $in: rx } }).select("skills title").limit(400).lean();
      for (const j of jobs) {
        const t = norm(j.title);
        if (!names.some((n) => t.includes(norm(n)))) continue;
        for (const s of j.skills ?? []) demand.set(s, (demand.get(s) ?? 0) + 1);
      }
    }

    const gap = analyzeGap(roleName, skills, demand);
    const teach = await coursesForSkills([...(gap.learn ?? []), ...(gap.nice ?? [])]);
    res.json({ ...gap, teach, listingsAnalyzed: demand.size });
  } catch (err) {
    next(err);
  }
});

/** GET /api/roles/:slug */
router.get("/:slug", async (req, res, next) => {
  try {
    const name = resolveRole(req.params.slug.replace(/-/g, " "));
    const role = name ? getRole(name) : null;
    if (!role) return res.status(404).json({ error: "Role not found." });
    res.json(role);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
