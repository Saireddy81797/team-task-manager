import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/layout";
import {
  useListMyTasks,
  getListMyTasksQueryKey,
  useUpdateTask,
  useDeleteTask,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, CheckSquare, Clock, AlertCircle } from "lucide-react";

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

export default function MyTasks() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tasks, isLoading } = useListMyTasks({
    query: { enabled: !!user, queryKey: getListMyTasksQueryKey() },
  });

  const updateTask = useUpdateTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMyTasksQueryKey() });
      },
    },
  });

  const deleteTask = useDeleteTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMyTasksQueryKey() });
        toast({ title: "Task deleted" });
      },
    },
  });

  useEffect(() => {
    if (!isAuthLoading && !user) setLocation("/login");
  }, [user, isAuthLoading, setLocation]);

  if (isAuthLoading || !user) return null;

  const now = new Date();
  const overdue = tasks?.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== "done") ?? [];
  const active = tasks?.filter(t => t.status !== "done") ?? [];
  const done = tasks?.filter(t => t.status === "done") ?? [];

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Tasks</h1>
          <p className="text-muted-foreground mt-1">All tasks assigned to you across projects</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
        ) : !tasks || tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <CheckSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold">No tasks assigned</h3>
            <p className="text-muted-foreground mt-1">Tasks assigned to you will appear here</p>
          </div>
        ) : (
          <div className="space-y-6">
            {overdue.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <h2 className="text-sm font-semibold text-destructive">Overdue ({overdue.length})</h2>
                </div>
                {overdue.map(task => (
                  <TaskCard key={task.id} task={task} onStatusChange={(status) => updateTask.mutate({ id: task.id, data: { status } })} onDelete={() => deleteTask.mutate({ id: task.id })} isOverdue />
                ))}
              </div>
            )}

            {active.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-muted-foreground">Active ({active.length})</h2>
                </div>
                {active.map(task => (
                  <TaskCard key={task.id} task={task} onStatusChange={(status) => updateTask.mutate({ id: task.id, data: { status } })} onDelete={() => deleteTask.mutate({ id: task.id })} />
                ))}
              </div>
            )}

            {done.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-green-600" />
                  <h2 className="text-sm font-semibold text-muted-foreground">Completed ({done.length})</h2>
                </div>
                {done.map(task => (
                  <TaskCard key={task.id} task={task} onStatusChange={(status) => updateTask.mutate({ id: task.id, data: { status } })} onDelete={() => deleteTask.mutate({ id: task.id })} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

function TaskCard({ task, onStatusChange, onDelete, isOverdue }: {
  task: any;
  onStatusChange: (status: string) => void;
  onDelete: () => void;
  isOverdue?: boolean;
}) {
  return (
    <Card className={isOverdue ? "border-destructive/50" : ""} data-testid={`card-task-${task.id}`}>
      <CardContent className="flex items-center gap-4 py-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{task.title}</p>
            {isOverdue && <Badge variant="destructive" className="text-xs">Overdue</Badge>}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span>{task.projectName}</span>
            {task.dueDate && <span>Due {new Date(task.dueDate).toLocaleDateString()}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${(priorityColors as any)[task.priority]}`}>
            {task.priority}
          </span>
          <Select value={task.status} onValueChange={onStatusChange}>
            <SelectTrigger className="h-8 w-36 text-xs" data-testid={`select-status-${task.id}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onDelete}
            data-testid={`button-delete-task-${task.id}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
