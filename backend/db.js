const path = require("path");
const Datastore = require("nedb-promises");

const dataDir = path.join(__dirname, "data");

function makeStore(filename) {
  return Datastore.create({
    filename: path.join(dataDir, filename),
    autoload: true
  });
}

const users = makeStore("users.db");
const projects = makeStore("projects.db");
const tasks = makeStore("tasks.db");

users.ensureIndex({ fieldName: "email", unique: true });
projects.ensureIndex({ fieldName: "createdBy" });
projects.ensureIndex({ fieldName: "memberIds" });
tasks.ensureIndex({ fieldName: "projectId" });
tasks.ensureIndex({ fieldName: "status" });

module.exports = { users, projects, tasks };