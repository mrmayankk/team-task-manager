const express = require("express");
const { z } = require("zod");
const { users } = require("../db");
const { authRequired } = require("../middleware/auth");
const { adminOnly } = require("../lib/access");

const router = express.Router();
router.use(authRequired);
router.use(adminOnly);

router.get("/search", async (req, res) => {
  const email = typeof req.query.email === "string" ? req.query.email.trim().toLowerCase() : "";
  z.string().min(3).parse(email);

  const u = await users.findOne({ email });
  if (!u) return res.status(404).json({ error: "User not found" });
  return res.json({ _id: u._id, name: u.name, email: u.email, role: u.role });
});

module.exports = router;

