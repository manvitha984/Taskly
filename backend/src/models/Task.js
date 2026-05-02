const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", default: null },

    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },

    status: {
      type: String,
      enum: ["todo", "in-progress", "done", "pending", "completed"],
      default: "todo",
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    assigneeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    dueDate: { type: Date, default: null },
  },
  { timestamps: true }
);

taskSchema.index({ organizationId: 1, createdAt: -1 });
taskSchema.index({ projectId: 1, createdAt: -1 });
taskSchema.index({ organizationId: 1, assigneeId: 1, createdAt: -1 });
taskSchema.index({ organizationId: 1, assigneeIds: 1, createdAt: -1 });
taskSchema.index({ organizationId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.models.Task || mongoose.model("Task", taskSchema);