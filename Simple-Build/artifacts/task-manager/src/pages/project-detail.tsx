import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/layout";
import {
  useGetProject,
  getGetProjectQueryKey,
  useListProjectTasks,
  getListProjectTasksQueryKey,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useListProjectMembers,
  getListProjectMembersQueryKey,
  useAddProjectMember,
  useRemoveProjectMember,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, UserPlus, ArrowLeft } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "done"]).default("todo"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  dueDate: z.string().optional(),
});

const addMemberSchema = z.object({
  email: z.string().email("Invalid email"),
  role: z.enum(["admin", "member"]),
});

const statusColors: Record<string, string> = {
  todo: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-100 text-blue-700",
  done: "bg-green-100 text-green-700",
};

const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-red-100 text-red-700",
};

export default function ProjectDetail() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/projects/:id");
  const [, params2] = useRoute("/projects/:id/tasks");
  const projectId = Number((params || params2)?.id);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);

  const { data: project, isLoading: isProjectLoading } = useGetProject(projectId, {
    query: { enabled: !!projectId && !!user, queryKey: getGetProjectQueryKey(projectId) },
  });

  const { data: tasks, isLoading: isTasksLoading } = useListProjectTasks(projectId, {
    query: { enabled: !!projectId && !!user, queryKey: getListProjectTasksQueryKey(projectId) },
  });

  const { data: members, isLoading: isMembersLoading } = useListProjectMembers(projectId, {
    query: { enabled: !!projectId && !!user, queryKey: getListProjectMembersQueryKey(projectId) },
  });

  const createTask = useCreateTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProjectTasksQueryKey(projectId) });
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
        setIsTaskDialogOpen(false);
        taskForm.reset();
        toast({ title: "Task created" });
      },
      onError: () => toast({ title: "Failed to create task", variant: "destructive" }),
    },
  });

  const updateTask = useUpdateTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProjectTasksQueryKey(projectId) });
        setEditingTask(null);
        toast({ title: "Task updated" });
      },
      onError: () => toast({ title: "Failed to update task", variant: "destructive" }),
    },
  });

  const deleteTask = useDeleteTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProjectTasksQueryKey(projectId) });
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
        toast({ title: "Task deleted" });
      },
    },
  });

  const addMember = useAddProjectMember({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProjectMembersQueryKey(projectId) });
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
        setIsMemberDialogOpen(false);
        memberForm.reset();
        toast({ title: "Member added" });
      },
      onError: (err: any) => toast({ title: err?.error || "Failed to add member", variant: "destructive" }),
    },
  });

  const removeMember = useRemoveProjectMember({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProjectMembersQueryKey(projectId) });
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
        toast({ title: "Member removed" });
      },
    },
  });

  const taskForm = useForm<z.infer<typeof createTaskSchema>>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: { title: "", description: "", status: "todo", priority: "medium" },
  });

  const memberForm = useForm<z.infer<typeof addMemberSchema>>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: { email: "", role: "member" },
  });

  useEffect(() => {
    if (!isAuthLoading && !user) setLocation("/login");
  }, [user, isAuthLoading, setLocation]);

  useEffect(() => {
    if (editingTask) {
      taskForm.reset({
        title: editingTask.title,
        description: editingTask.description ?? "",
        status: editingTask.status,
        priority: editingTask.priority,
        dueDate: editingTask.dueDate ? new Date(editingTask.dueDate).toISOString().slice(0, 16) : "",
      });
      setIsTaskDialogOpen(true);
    }
  }, [editingTask]);

  if (isAuthLoading || !user) return null;

  function onTaskSubmit(values: z.infer<typeof createTaskSchema>) {
    const data = {
      ...values,
      dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : undefined,
    };
    if (editingTask) {
      updateTask.mutate({ id: editingTask.id, data });
    } else {
      createTask.mutate({ id: projectId, data });
    }
  }

  function onMemberSubmit(values: z.infer<typeof addMemberSchema>) {
    addMember.mutate({ id: projectId, data: values });
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/projects")} data-testid="button-back">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Projects
          </Button>
        </div>

        {isProjectLoading ? (
          <Skeleton className="h-20 rounded-xl" />
        ) : project ? (
          <div>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
                {project.description && <p className="text-muted-foreground mt-1">{project.description}</p>}
              </div>
              <Badge variant={project.status === "active" ? "default" : "secondary"}>{project.status}</Badge>
            </div>
            <div className="flex gap-6 mt-3 text-sm text-muted-foreground">
              <span>{project.taskCount} tasks</span>
              <span>{project.completedTaskCount} completed</span>
              <span>{project.memberCount} members</span>
            </div>
          </div>
        ) : null}

        <Tabs defaultValue="tasks">
          <TabsList>
            <TabsTrigger value="tasks" data-testid="tab-tasks">Tasks</TabsTrigger>
            <TabsTrigger value="members" data-testid="tab-members">Members</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="mt-6 space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { setEditingTask(null); taskForm.reset(); setIsTaskDialogOpen(true); }} data-testid="button-add-task">
                <Plus className="mr-2 h-4 w-4" />
                Add Task
              </Button>
            </div>
            {isTasksLoading ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
            ) : tasks && tasks.length > 0 ? (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Assignee</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task) => (
                      <TableRow
                        key={task.id}
                        className="cursor-pointer"
                        onClick={() => setEditingTask(task)}
                        data-testid={`row-task-${task.id}`}
                      >
                        <TableCell className="font-medium">{task.title}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColors[task.status]}`}>
                            {task.status.replace("_", " ")}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${priorityColors[task.priority]}`}>
                            {task.priority}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{task.assigneeName ?? "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => { e.stopPropagation(); deleteTask.mutate({ id: task.id }); }}
                            data-testid={`button-delete-task-${task.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <p>No tasks yet. Add the first task to get started.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="members" className="mt-6 space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setIsMemberDialogOpen(true)} data-testid="button-add-member">
                <UserPlus className="mr-2 h-4 w-4" />
                Add Member
              </Button>
            </div>
            {isMembersLoading ? (
              <Skeleton className="h-40 rounded-xl" />
            ) : members && members.length > 0 ? (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.userId} data-testid={`row-member-${member.userId}`}>
                        <TableCell className="font-medium">{member.name}</TableCell>
                        <TableCell className="text-muted-foreground">{member.email}</TableCell>
                        <TableCell>
                          <Badge variant={member.role === "admin" ? "default" : "secondary"}>{member.role}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(member.joinedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {member.userId !== user.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => removeMember.mutate({ id: projectId, userId: member.userId })}
                              data-testid={`button-remove-member-${member.userId}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            ) : (
              <div className="text-center py-16 text-muted-foreground">No members found.</div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Task dialog */}
      <Dialog open={isTaskDialogOpen} onOpenChange={(open) => { setIsTaskDialogOpen(open); if (!open) setEditingTask(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Task" : "New Task"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={taskForm.handleSubmit(onTaskSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input placeholder="Task title" {...taskForm.register("title")} data-testid="input-task-title" />
              {taskForm.formState.errors.title && <p className="text-sm text-destructive">{taskForm.formState.errors.title.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Optional description" {...taskForm.register("description")} data-testid="input-task-description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Controller
                  name="status"
                  control={taskForm.control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger data-testid="select-task-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo">To Do</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Controller
                  name="priority"
                  control={taskForm.control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger data-testid="select-task-priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="datetime-local" {...taskForm.register("dueDate")} data-testid="input-task-due-date" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsTaskDialogOpen(false); setEditingTask(null); }}>Cancel</Button>
              <Button type="submit" disabled={createTask.isPending || updateTask.isPending} data-testid="button-submit-task">
                {createTask.isPending || updateTask.isPending ? "Saving..." : editingTask ? "Update" : "Create Task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add member dialog */}
      <Dialog open={isMemberDialogOpen} onOpenChange={setIsMemberDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={memberForm.handleSubmit(onMemberSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input type="email" placeholder="member@company.com" {...memberForm.register("email")} data-testid="input-member-email" />
              {memberForm.formState.errors.email && <p className="text-sm text-destructive">{memberForm.formState.errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Controller
                name="role"
                control={memberForm.control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger data-testid="select-member-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsMemberDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={addMember.isPending} data-testid="button-submit-member">
                {addMember.isPending ? "Adding..." : "Add Member"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
