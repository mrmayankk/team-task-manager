const mongoose = require("../db");

const projectSchema = new mongoose.Schema({
  name: String,
  createdBy: String
});

module.exports = mongoose.model("Project", projectSchema);