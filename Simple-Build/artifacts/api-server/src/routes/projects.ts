import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, projectsTable, projectMembersTable, usersTable, activityTable } from "@workspace/db";
import {
  CreateProjectBody,
  GetProjectParams,
  UpdateProjectParams,
  UpdateProjectBody,
  DeleteProjectParams,
  ListProjectMembersParams,
  AddProjectMemberParams,
  AddProjectMemberBody,
  UpdateProjectMemberParams,
  UpdateProjectMemberBody,
  RemoveProjectMemberParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

async function getProjectWithCounts(projectId: number) {
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project) return null;

  const [counts] = await db
    .select({
      taskCount: sql<number>`count(distinct t.id)::int`,
      completedTaskCount: sql<number>`count(distinct t.id) filter (where t.status = 'done')::int`,
      memberCount: sql<number>`count(distinct pm.user_id)::int`,
    })
    .from(projectsTable)
    .leftJoin(sql`tasks t`, sql`t.project_id = ${projectsTable.id}`)
    .leftJoin(sql`project_members pm`, sql`pm.project_id = ${projectsTable.id}`)
    .where(eq(projectsTable.id, projectId));

  return {
    ...project,
    taskCount: counts?.taskCount ?? 0,
    completedTaskCount: counts?.completedTaskCount ?? 0,
    memberCount: counts?.memberCount ?? 0,
  };
}

router.get("/projects", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const memberships = await db
    .select({ projectId: projectMembersTable.projectId })
    .from(projectMembersTable)
    .where(eq(projectMembersTable.userId, userId));
  const projectIds = memberships.map((m) => m.projectId);

  const projects = await Promise.all(projectIds.map((id) => getProjectWithCounts(id)));
  res.json(projects.filter(Boolean));
});

router.post("/projects", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const userId = req.user!.userId;
  const [project] = await db
    .insert(projectsTable)
    .values({ ...parsed.data, ownerId: userId })
    .returning();

  await db.insert(projectMembersTable).values({ userId, projectId: project.id, role: "admin" });
  await db.insert(activityTable).values({
    type: "project_created",
    description: `Created project "${project.name}"`,
    userId,
    projectId: project.id,
  });

  const full = await getProjectWithCounts(project.id);
  res.status(201).json(full);
});

router.get("/projects/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const project = await getProjectWithCounts(params.data.id);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(project);
});

router.patch("/projects/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [updated] = await db
    .update(projectsTable)
    .set(parsed.data)
    .where(eq(projectsTable.id, params.data.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const full = await getProjectWithCounts(updated.id);
  res.json(full);
});

router.delete("/projects/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const userId = req.user!.userId;
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, params.data.id));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  if (project.ownerId !== userId) {
    res.status(403).json({ error: "Only the project owner can delete it" });
    return;
  }
  await db.delete(projectsTable).where(eq(projectsTable.id, params.data.id));
  res.sendStatus(204);
});

// Members
router.get("/projects/:id/members", requireAuth, async (req, res): Promise<void> => {
  const params = ListProjectMembersParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const members = await db
    .select({
      userId: projectMembersTable.userId,
      projectId: projectMembersTable.projectId,
      role: projectMembersTable.role,
      name: usersTable.name,
      email: usersTable.email,
      joinedAt: projectMembersTable.joinedAt,
    })
    .from(projectMembersTable)
    .innerJoin(usersTable, eq(projectMembersTable.userId, usersTable.id))
    .where(eq(projectMembersTable.projectId, params.data.id));
  res.json(members);
});

router.post("/projects/:id/members", requireAuth, async (req, res): Promise<void> => {
  const params = AddProjectMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = AddProjectMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [targetUser] = await db.select().from(usersTable).where(eq(usersTable.email, parsed.data.email));
  if (!targetUser) {
    res.status(404).json({ error: "User not found with that email" });
    return;
  }
  const [existing] = await db
    .select()
    .from(projectMembersTable)
    .where(and(eq(projectMembersTable.projectId, params.data.id), eq(projectMembersTable.userId, targetUser.id)));
  if (existing) {
    res.status(409).json({ error: "User is already a member" });
    return;
  }
  await db.insert(projectMembersTable).values({ userId: targetUser.id, projectId: params.data.id, role: parsed.data.role });
  await db.insert(activityTable).values({
    type: "member_added",
    description: `${targetUser.name} was added to the project`,
    userId: req.user!.userId,
    projectId: params.data.id,
  });
  const [member] = await db
    .select({
      userId: projectMembersTable.userId,
      projectId: projectMembersTable.projectId,
      role: projectMembersTable.role,
      name: usersTable.name,
      email: usersTable.email,
      joinedAt: projectMembersTable.joinedAt,
    })
    .from(projectMembersTable)
    .innerJoin(usersTable, eq(projectMembersTable.userId, usersTable.id))
    .where(and(eq(projectMembersTable.projectId, params.data.id), eq(projectMembersTable.userId, targetUser.id)));
  res.status(201).json(member);
});

router.patch("/projects/:id/members/:userId", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateProjectMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateProjectMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await db
    .update(projectMembersTable)
    .set({ role: parsed.data.role })
    .where(and(eq(projectMembersTable.projectId, params.data.id), eq(projectMembersTable.userId, params.data.userId)));
  const [member] = await db
    .select({
      userId: projectMembersTable.userId,
      projectId: projectMembersTable.projectId,
      role: projectMembersTable.role,
      name: usersTable.name,
      email: usersTable.email,
      joinedAt: projectMembersTable.joinedAt,
    })
    .from(projectMembersTable)
    .innerJoin(usersTable, eq(projectMembersTable.userId, usersTable.id))
    .where(and(eq(projectMembersTable.projectId, params.data.id), eq(projectMembersTable.userId, params.data.userId)));
  if (!member) {
    res.status(404).json({ error: "Member not found" });
    return;
  }
  res.json(member);
});

router.delete("/projects/:id/members/:userId", requireAuth, async (req, res): Promise<void> => {
  const params = RemoveProjectMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db
    .delete(projectMembersTable)
    .where(and(eq(projectMembersTable.projectId, params.data.id), eq(projectMembersTable.userId, params.data.userId)));
  res.sendStatus(204);
});

export default router;
