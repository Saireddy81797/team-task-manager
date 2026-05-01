import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, tasksTable, projectsTable, usersTable, projectMembersTable, activityTable } from "@workspace/db";
import {
  CreateTaskParams,
  CreateTaskBody,
  GetTaskParams,
  UpdateTaskParams,
  UpdateTaskBody,
  DeleteTaskParams,
  ListProjectTasksParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

async function formatTask(task: typeof tasksTable.$inferSelect) {
  const [project] = await db.select({ name: projectsTable.name }).from(projectsTable).where(eq(projectsTable.id, task.projectId));
  let assigneeName: string | null = null;
  if (task.assigneeId) {
    const [u] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, task.assigneeId));
    assigneeName = u?.name ?? null;
  }
  return {
    ...task,
    projectName: project?.name ?? "",
    assigneeName,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
  };
}

router.get("/projects/:id/tasks", requireAuth, async (req, res): Promise<void> => {
  const params = ListProjectTasksParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const tasks = await db.select().from(tasksTable).where(eq(tasksTable.projectId, params.data.id));
  const formatted = await Promise.all(tasks.map(formatTask));
  res.json(formatted);
});

router.post("/projects/:id/tasks", requireAuth, async (req, res): Promise<void> => {
  const params = CreateTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const userId = req.user!.userId;
  const [task] = await db
    .insert(tasksTable)
    .values({
      ...parsed.data,
      projectId: params.data.id,
      status: parsed.data.status ?? "todo",
      priority: parsed.data.priority ?? "medium",
    })
    .returning();

  await db.insert(activityTable).values({
    type: "task_created",
    description: `Task "${task.title}" was created`,
    userId,
    projectId: params.data.id,
    taskId: task.id,
  });

  const formatted = await formatTask(task);
  res.status(201).json(formatted);
});

router.get("/tasks/my", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const tasks = await db.select().from(tasksTable).where(eq(tasksTable.assigneeId, userId));
  const formatted = await Promise.all(tasks.map(formatTask));
  res.json(formatted);
});

router.get("/tasks/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, params.data.id));
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  const formatted = await formatTask(task);
  res.json(formatted);
});

router.patch("/tasks/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const userId = req.user!.userId;
  const [task] = await db.update(tasksTable).set(parsed.data).where(eq(tasksTable.id, params.data.id)).returning();
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const activityType = parsed.data.status === "done" ? "task_completed" : "task_updated";
  await db.insert(activityTable).values({
    type: activityType,
    description: parsed.data.status === "done" ? `Task "${task.title}" was completed` : `Task "${task.title}" was updated`,
    userId,
    projectId: task.projectId,
    taskId: task.id,
  });

  const formatted = await formatTask(task);
  res.json(formatted);
});

router.delete("/tasks/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [task] = await db.delete(tasksTable).where(eq(tasksTable.id, params.data.id)).returning();
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
