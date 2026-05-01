const { projects } = require("../db");

async function getProjectForUser(projectId, user) {
  const proj = await projects.findOne({ _id: projectId });
  if (!proj) return null;

  if (user.role === "admin") return proj;

  const members = Array.isArray(proj.memberIds) ? proj.memberIds : [];
  if (proj.createdBy === user.userId) return proj;
  if (members.includes(user.userId)) return proj;
  return null;
}

function adminOnly(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Admin only" });
  return next();
}

module.exports = { getProjectForUser, adminOnly };

