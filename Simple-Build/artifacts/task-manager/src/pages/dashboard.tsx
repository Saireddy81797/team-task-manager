import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/layout";
import {
  useGetDashboardSummary,
  getGetDashboardSummaryQueryKey,
  useGetOverdueTasks,
  getGetOverdueTasksQueryKey,
  useGetRecentActivity,
  getGetRecentActivityQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Clock, FolderKanban, ListTodo, AlertTriangle, Activity } from "lucide-react";

const activityIcons: Record<string, string> = {
  task_created: "✦",
  task_updated: "✎",
  task_completed: "✓",
  project_created: "⊕",
  member_added: "⊞",
};

export default function Dashboard() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: summary, isLoading: isSummaryLoading } = useGetDashboardSummary({
    query: { enabled: !!user, queryKey: getGetDashboardSummaryQueryKey() },
  });

  const { data: overdueTasks, isLoading: isOverdueLoading } = useGetOverdueTasks({
    query: { enabled: !!user, queryKey: getGetOverdueTasksQueryKey() },
  });

  const { data: activity, isLoading: isActivityLoading } = useGetRecentActivity({
    query: { enabled: !!user, queryKey: getGetRecentActivityQueryKey() },
  });

  useEffect(() => {
    if (!isAuthLoading && !user) setLocation("/login");
  }, [user, isAuthLoading, setLocation]);

  if (isAuthLoading || !user) return null;

  const completionRate = summary && summary.totalTasks > 0
    ? Math.round((summary.completedTasks / summary.totalTasks) * 100)
    : 0;

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back, {user.name}</p>
        </div>

        {/* Stats */}
        {isSummaryLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : summary ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                <FolderKanban className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-total-projects">{summary.totalProjects}</div>
                <p className="text-xs text-muted-foreground mt-1">Active workspaces</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">My Assigned Tasks</CardTitle>
                <ListTodo className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-my-tasks">{summary.myAssignedTasks}</div>
                <p className="text-xs text-muted-foreground mt-1">Assigned to you</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600" data-testid="stat-completed-tasks">{summary.completedTasks}</div>
                <div className="mt-2">
                  <Progress value={completionRate} className="h-1.5" />
                  <p className="text-xs text-muted-foreground mt-1">{completionRate}% of all tasks</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                <Clock className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive" data-testid="stat-overdue-tasks">{summary.overdueTasks}</div>
                <p className="text-xs text-muted-foreground mt-1">Needs attention</p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Task breakdown */}
        {summary && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Tasks by Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "To Do", key: "todo", color: "bg-slate-400" },
                  { label: "In Progress", key: "in_progress", color: "bg-blue-500" },
                  { label: "Done", key: "done", color: "bg-green-500" },
                ].map(({ label, key, color }) => {
                  const count = summary.tasksByStatus[key as keyof typeof summary.tasksByStatus];
                  const pct = summary.totalTasks > 0 ? (count / summary.totalTasks) * 100 : 0;
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${color}`} />
                      <span className="text-sm flex-1">{label}</span>
                      <span className="text-sm font-medium tabular-nums">{count}</span>
                      <div className="w-24">
                        <Progress value={pct} className="h-1.5" />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Tasks by Priority</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "High", key: "high", color: "bg-red-500" },
                  { label: "Medium", key: "medium", color: "bg-yellow-500" },
                  { label: "Low", key: "low", color: "bg-gray-400" },
                ].map(({ label, key, color }) => {
                  const count = summary.tasksByPriority[key as keyof typeof summary.tasksByPriority];
                  const pct = summary.totalTasks > 0 ? (count / summary.totalTasks) * 100 : 0;
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${color}`} />
                      <span className="text-sm flex-1">{label}</span>
                      <span className="text-sm font-medium tabular-nums">{count}</span>
                      <div className="w-24">
                        <Progress value={pct} className="h-1.5" />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {/* Overdue tasks */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              {isOverdueLoading ? (
                <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-10 rounded" />)}</div>
              ) : overdueTasks && overdueTasks.length > 0 ? (
                <div className="space-y-3">
                  {overdueTasks.slice(0, 5).map(task => (
                    <div key={task.id} className="flex items-start justify-between gap-2" data-testid={`overdue-task-${task.id}`}>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground">{task.projectName}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge variant="destructive" className="text-xs">
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : ""}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No overdue tasks</p>
              )}
            </CardContent>
          </Card>

          {/* Recent activity */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {isActivityLoading ? (
                <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 rounded" />)}</div>
              ) : activity && activity.length > 0 ? (
                <div className="space-y-3">
                  {activity.slice(0, 6).map(item => (
                    <div key={item.id} className="flex items-start gap-3" data-testid={`activity-${item.id}`}>
                      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-bold">
                        {activityIcons[item.type] ?? "·"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-foreground leading-relaxed">{item.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.userName} · {new Date(item.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
