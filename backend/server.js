const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true, ts: Date.now() }));

app.use("/auth", require("./routes/auth"));
app.use("/projects", require("./routes/project"));
app.use("/tasks", require("./routes/task"));
app.use("/users", require("./routes/users"));
app.use("/seed", require("./routes/seed"));

// Serve the frontend for a single-command demo.
const frontendDir = path.join(__dirname, "..", "frontend");
app.use(express.static(frontendDir));
app.get("/", (req, res) => res.sendFile(path.join(frontendDir, "index.html")));

const port = process.env.PORT ? Number(process.env.PORT) : 5000;
app.listen(port, () => console.log(`Server running on ${port}`));