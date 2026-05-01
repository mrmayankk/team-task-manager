const mongoose = require("../db");

const taskSchema = new mongoose.Schema({
  title: String,
  assignedTo: String,
  status: { type: String, default: "Pending" },
  projectId: String
});

module.exports = mongoose.model("Task", taskSchema);
