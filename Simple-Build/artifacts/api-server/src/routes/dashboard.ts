import { Router, type IRouter } from "express";
import { eq, lt, sql } from "drizzle-orm";
import { db, tasksTable, projectsTable, projectMembersTable, activityTable, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/dashboard/summary", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const memberships = await db
    .select({ projectId: projectMembersTable.projectId })
    .from(projectMembersTable)
    .where(eq(projectMembersTable.userId, userId));
  const projectIds = memberships.map((m) => m.projectId);

  const totalProjects = projectIds.length;
  const now = new Date();

  if (projectIds.length === 0) {
    res.json({
      totalProjects: 0,
      totalTasks: 0,
      completedTasks: 0,
      overdueTasks: 0,
      myAssignedTasks: 0,
      tasksByStatus: { todo: 0, in_progress: 0, done: 0 },
      tasksByPriority: { low: 0, medium: 0, high: 0 },
    });
    return;
  }

  const tasks = await db
    .select()
    .from(tasksTable)
    .where(sql`${tasksTable.projectId} = ANY(${sql.raw(`ARRAY[${projectIds.join(",")}]`)})`);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "done").length;
  const overdueTasks = tasks.filter((t) => t.dueDate && t.dueDate < now && t.status !== "done").length;
  const myAssignedTasks = tasks.filter((t) => t.assigneeId === userId).length;
  const tasksByStatus = {
    todo: tasks.filter((t) => t.status === "todo").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    done: tasks.filter((t) => t.status === "done").length,
  };
  const tasksByPriority = {
    low: tasks.filter((t) => t.priority === "low").length,
    medium: tasks.filter((t) => t.priority === "medium").length,
    high: tasks.filter((t) => t.priority === "high").length,
  };

  res.json({ totalProjects, totalTasks, completedTasks, overdueTasks, myAssignedTasks, tasksByStatus, tasksByPriority });
});

router.get("/dashboard/overdue-tasks", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const memberships = await db
    .select({ projectId: projectMembersTable.projectId })
    .from(projectMembersTable)
    .where(eq(projectMembersTable.userId, userId));
  const projectIds = memberships.map((m) => m.projectId);

  if (projectIds.length === 0) {
    res.json([]);
    return;
  }

  const now = new Date();
  const tasks = await db
    .select()
    .from(tasksTable)
    .where(sql`${tasksTable.projectId} = ANY(${sql.raw(`ARRAY[${projectIds.join(",")}]`)}) AND ${tasksTable.dueDate} < ${now.toISOString()} AND ${tasksTable.status} != 'done'`);

  const formatted = await Promise.all(
    tasks.map(async (task) => {
      const [project] = await db.select({ name: projectsTable.name }).from(projectsTable).where(eq(projectsTable.id, task.projectId));
      let assigneeName: string | null = null;
      if (task.assigneeId) {
        const [u] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, task.assigneeId));
        assigneeName = u?.name ?? null;
      }
      return { ...task, projectName: project?.name ?? "", assigneeName, dueDate: task.dueDate?.toISOString() ?? null };
    })
  );

  res.json(formatted);
});

router.get("/dashboard/activity", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const memberships = await db
    .select({ projectId: projectMembersTable.projectId })
    .from(projectMembersTable)
    .where(eq(projectMembersTable.userId, userId));
  const projectIds = memberships.map((m) => m.projectId);

  if (projectIds.length === 0) {
    res.json([]);
    return;
  }

  const activities = await db
    .select({
      id: activityTable.id,
      type: activityTable.type,
      description: activityTable.description,
      userId: activityTable.userId,
      userName: usersTable.name,
      projectId: activityTable.projectId,
      taskId: activityTable.taskId,
      createdAt: activityTable.createdAt,
    })
    .from(activityTable)
    .innerJoin(usersTable, eq(activityTable.userId, usersTable.id))
    .where(sql`${activityTable.projectId} = ANY(${sql.raw(`ARRAY[${projectIds.join(",")}]`)})`)
    .orderBy(sql`${activityTable.createdAt} DESC`)
    .limit(20);

  const enriched = await Promise.all(
    activities.map(async (a) => {
      let projectName: string | null = null;
      if (a.projectId) {
        const [p] = await db.select({ name: projectsTable.name }).from(projectsTable).where(eq(projectsTable.id, a.projectId));
        projectName = p?.name ?? null;
      }
      return { ...a, projectName };
    })
  );

  res.json(enriched);
});

export default router;
