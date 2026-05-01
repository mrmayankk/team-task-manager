const express = require("express");
const router = express.Router();
const { z } = require("zod");
const { nanoid } = require("nanoid");
const { tasks, projects } = require("../db");
const { authRequired } = require("../middleware/auth");
const { getProjectForUser } = require("../lib/access");

router.use(authRequired);

router.post("/", async (req, res) => {
  try {
    const input = z
      .object({
        title: z.string().min(2).max(120),
        projectId: z.string().min(1),
        assignedToUserId: z.string().min(1).optional(),
        assignedToName: z.string().min(0).max(80).optional(),
        dueDate: z.number().int().optional(),
        status: z.enum(["Pending", "In Progress", "Completed"]).optional()
      })
      .parse(req.body);

    // Admin can add tasks only for owned projects; members can only add tasks in projects they belong to.
    const project = await getProjectForUser(input.projectId, req.user);
    if (!project) return res.status(404).json({ error: "Project not found or forbidden" });

    const task = {
      _id: nanoid(),
      title: input.title,
      assignedToUserId: input.assignedToUserId || "",
      assignedToName: input.assignedToName || "",
      status: input.status || "Pending",
      dueDate: typeof input.dueDate === "number" ? input.dueDate : null,
      projectId: input.projectId,
      createdBy: req.user.userId,
      projectOwnerId: project.createdBy,
      createdAt: Date.now()
    };
    await tasks.insert(task);
    return res.json(task);
  } catch (e) {
    return res.status(400).json({ error: "Invalid task data" });
  }
});

router.get("/", async (req, res) => {
  const projectId = typeof req.query.projectId === "string" ? req.query.projectId : null;
  const status = typeof req.query.status === "string" ? req.query.status : null;
  if (!projectId) return res.status(400).json({ error: "projectId is required" });

  const project = await getProjectForUser(projectId, req.user);
  if (!project) return res.status(404).json({ error: "Project not found or forbidden" });

  const query = { projectId };
  if (status) query.status = status;
  const data = await tasks.find(query).sort({ createdAt: -1 });
  return res.json(data);
});

router.get("/my", async (req, res) => {
  // Member-focused view: tasks assigned to the current user across all projects.
  const status = typeof req.query.status === "string" ? req.query.status : null;
  const query = { assignedToUserId: req.user.userId };
  if (status) query.status = status;
  const data = await tasks.find(query).sort({ dueDate: 1, createdAt: -1 });
  return res.json(data);
});

router.put("/:id", async (req, res) => {
  try {
    const input = z
      .object({
        title: z.string().min(2).max(120).optional(),
        assignedToUserId: z.string().min(0).optional(),
        assignedToName: z.string().min(0).max(80).optional(),
        dueDate: z.number().int().nullable().optional(),
        status: z.enum(["Pending", "In Progress", "Completed"]).optional()
      })
      .parse(req.body);

    const task = await tasks.findOne({ _id: req.params.id });
    if (!task) return res.status(404).json({ error: "Task not found" });

    const project = await getProjectForUser(task.projectId, req.user);
    if (!project) return res.status(403).json({ error: "Forbidden" });

    const isOwnerAdmin = req.user.role === "admin" && project.createdBy === req.user.userId;
    const isAssigneeMember = req.user.role !== "admin" && task.assignedToUserId && task.assignedToUserId === req.user.userId;

    // Members: can only update status (and only for tasks assigned to them).
    if (!isOwnerAdmin) {
      if (!isAssigneeMember) return res.status(403).json({ error: "Members can only update their assigned tasks" });
      const allowed = {};
      if (input.status) allowed.status = input.status;
      await tasks.update({ _id: task._id }, { $set: allowed });
      return res.json({ ok: true });
    }

    await tasks.update({ _id: task._id }, { $set: input });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(400).json({ error: "Invalid update" });
  }
});

router.delete("/:id", async (req, res) => {
  const task = await tasks.findOne({ _id: req.params.id });
  if (!task) return res.status(404).json({ error: "Task not found" });

  const project = await getProjectForUser(task.projectId, req.user);
  if (!project) return res.status(403).json({ error: "Forbidden" });

  const isOwnerAdmin = req.user.role === "admin" && project.createdBy === req.user.userId;
  if (!isOwnerAdmin) return res.status(403).json({ error: "Admin only" });

  await tasks.remove({ _id: task._id }, { multi: false });
  return res.json({ ok: true });
});

module.exports = router;