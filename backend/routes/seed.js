const express = require("express");
const bcrypt = require("bcryptjs");
const { nanoid } = require("nanoid");
const { users, projects, tasks } = require("../db");
const { signToken } = require("../middleware/auth");

const router = express.Router();

// Creates a demo admin + project + tasks.
// Safe: idempotent-ish by email; re-running creates missing pieces.
router.post("/", async (req, res) => {
  const email = "demo@team.local";
  const password = "demo1234";
  const memberEmail = "member@team.local";
  const memberPassword = "member1234";

  let user = await users.findOne({ email });
  if (!user) {
    user = await users.insert({
      _id: nanoid(),
      name: "Demo Admin",
      email,
      role: "admin",
      passwordHash: await bcrypt.hash(password, 10),
      createdAt: Date.now()
    });
  }

  let member = await users.findOne({ email: memberEmail });
  if (!member) {
    member = await users.insert({
      _id: nanoid(),
      name: "Demo Member",
      email: memberEmail,
      role: "member",
      passwordHash: await bcrypt.hash(memberPassword, 10),
      createdAt: Date.now()
    });
  }

  let project = await projects.findOne({ createdBy: user._id, name: "Launch Sprint" });
  if (!project) {
    project = await projects.insert({
      _id: nanoid(),
      name: "Launch Sprint",
      createdBy: user._id,
      memberIds: [member._id],
      createdAt: Date.now()
    });
  } else if (!Array.isArray(project.memberIds) || !project.memberIds.includes(member._id)) {
    const memberIds = Array.isArray(project.memberIds) ? project.memberIds : [];
    memberIds.push(member._id);
    await projects.update({ _id: project._id }, { $set: { memberIds } });
  }

  // Always reset demo tasks to guarantee a clean demo.
  await tasks.remove({ projectId: project._id }, { multi: true });
  {
    const now = Date.now();
    await tasks.insert([
      {
        _id: nanoid(),
        title: "Design landing page",
        assignedToUserId: member._id,
        assignedToName: "Demo Member",
        status: "In Progress",
        dueDate: now + 2 * 24 * 60 * 60 * 1000,
        projectId: project._id,
        createdBy: user._id,
        projectOwnerId: user._id,
        createdAt: Date.now()
      },
      {
        _id: nanoid(),
        title: "Implement auth + API",
        assignedToUserId: user._id,
        assignedToName: "Demo Admin",
        status: "Completed",
        dueDate: now - 2 * 24 * 60 * 60 * 1000,
        projectId: project._id,
        createdBy: user._id,
        projectOwnerId: user._id,
        createdAt: Date.now()
      },
      {
        _id: nanoid(),
        title: "QA + final checklist",
        assignedToUserId: member._id,
        assignedToName: "Demo Member",
        status: "Pending",
        dueDate: now - 24 * 60 * 60 * 1000,
        projectId: project._id,
        createdBy: user._id,
        projectOwnerId: user._id,
        createdAt: Date.now()
      }
    ]);
  }

  const token = signToken({ userId: user._id, role: user.role, email: user.email, name: user.name });
  res.json({
    ok: true,
    demo: {
      admin: { email, password },
      member: { email: memberEmail, password: memberPassword }
    },
    token,
    projectId: project._id
  });
});

module.exports = router;

