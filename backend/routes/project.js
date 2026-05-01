const express = require("express");
const router = express.Router();
const { z } = require("zod");
const { nanoid } = require("nanoid");
const { projects, users } = require("../db");
const { authRequired } = require("../middleware/auth");
const { adminOnly } = require("../lib/access");

router.use(authRequired);

router.post("/", async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });

    const input = z
      .object({
        name: z.string().min(2).max(80)
      })
      .parse(req.body);

    const project = {
      _id: nanoid(),
      name: input.name,
      createdBy: req.user.userId,
      memberIds: [],
      createdAt: Date.now()
    };
    await projects.insert(project);
    return res.json(project);
  } catch (e) {
    return res.status(400).json({ error: "Invalid project data" });
  }
});

router.get("/", async (req, res) => {
  if (req.user.role === "admin") {
    const data = await projects.find({ createdBy: req.user.userId }).sort({ createdAt: -1 });
    return res.json(data);
  }

  const data = await projects.find({ memberIds: req.user.userId }).sort({ createdAt: -1 });
  return res.json(data);
});

router.get("/:id/members", async (req, res) => {
  const project = await projects.findOne({ _id: req.params.id });
  if (!project) return res.status(404).json({ error: "Project not found" });

  const canView =
    req.user.role === "admin"
      ? project.createdBy === req.user.userId
      : Array.isArray(project.memberIds) && project.memberIds.includes(req.user.userId);

  if (!canView) return res.status(403).json({ error: "Forbidden" });

  const memberIds = Array.isArray(project.memberIds) ? project.memberIds : [];
  const members = await users.find({ _id: { $in: memberIds } });
  const safe = members.map((u) => ({ _id: u._id, name: u.name, email: u.email, role: u.role }));
  return res.json(safe);
});

router.post("/:id/members", adminOnly, async (req, res) => {
  const project = await projects.findOne({ _id: req.params.id, createdBy: req.user.userId });
  if (!project) return res.status(404).json({ error: "Project not found" });

  const input = z.object({ email: z.string().email() }).parse(req.body);
  const member = await users.findOne({ email: input.email.toLowerCase() });
  if (!member) return res.status(404).json({ error: "User not found" });
  if (member._id === req.user.userId) return res.status(400).json({ error: "You are already the owner" });

  const memberIds = Array.isArray(project.memberIds) ? project.memberIds : [];
  if (!memberIds.includes(member._id)) memberIds.push(member._id);

  await projects.update({ _id: project._id }, { $set: { memberIds } });
  return res.json({ ok: true });
});

router.delete("/:id/members/:memberId", adminOnly, async (req, res) => {
  const project = await projects.findOne({ _id: req.params.id, createdBy: req.user.userId });
  if (!project) return res.status(404).json({ error: "Project not found" });

  const memberIds = Array.isArray(project.memberIds) ? project.memberIds : [];
  const next = memberIds.filter((x) => x !== req.params.memberId);
  await projects.update({ _id: project._id }, { $set: { memberIds: next } });
  return res.json({ ok: true });
});

router.delete("/:id", authRequired, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });
  await projects.remove({ _id: req.params.id, createdBy: req.user.userId }, { multi: false });
  res.json({ ok: true });
});

module.exports = router;