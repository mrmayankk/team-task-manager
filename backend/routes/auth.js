const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const { nanoid } = require("nanoid");
const { users } = require("../db");
const { signToken } = require("../middleware/auth");

router.post("/signup", async (req, res) => {
  try {
    const input = z
      .object({
        name: z.string().min(2).max(50),
        email: z.string().email(),
        password: z.string().min(6).max(100),
        role: z.enum(["admin", "member"]).optional()
      })
      .parse(req.body);

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = {
      _id: nanoid(),
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash,
      role: input.role || "member",
      createdAt: Date.now()
    };

    await users.insert(user);
    const token = signToken({ userId: user._id, role: user.role, email: user.email, name: user.name });
    return res.json({
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
      token
    });
  } catch (e) {
    if (e && e.errorType === "uniqueViolated") return res.status(409).json({ error: "Email already exists" });
    return res.status(400).json({ error: "Invalid signup data" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const input = z
      .object({
        email: z.string().email(),
        password: z.string().min(1).max(100)
      })
      .parse(req.body);

    const user = await users.findOne({ email: input.email.toLowerCase() });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(input.password, user.passwordHash || "");
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = signToken({ userId: user._id, role: user.role, email: user.email, name: user.name });
    return res.json({
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
      token
    });
  } catch (e) {
    return res.status(400).json({ error: "Invalid login data" });
  }
});

module.exports = router;