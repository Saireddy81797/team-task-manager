import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/layout";
import {
  useListProjects,
  getListProjectsQueryKey,
  useCreateProject,
  useDeleteProject,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, FolderOpen, Users, CheckSquare } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
});

export default function Projects() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: projects, isLoading } = useListProjects({
    query: { enabled: !!user, queryKey: getListProjectsQueryKey() },
  });

  const createProject = useCreateProject({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        setIsDialogOpen(false);
        form.reset();
        toast({ title: "Project created successfully" });
      },
      onError: () => toast({ title: "Failed to create project", variant: "destructive" }),
    },
  });

  const deleteProject = useDeleteProject({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        toast({ title: "Project deleted" });
      },
      onError: () => toast({ title: "Failed to delete project", variant: "destructive" }),
    },
  });

  const form = useForm<z.infer<typeof createProjectSchema>>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: { name: "", description: "" },
  });

  useEffect(() => {
    if (!isAuthLoading && !user) setLocation("/login");
  }, [user, isAuthLoading, setLocation]);

  if (isAuthLoading || !user) return null;

  function onSubmit(values: z.infer<typeof createProjectSchema>) {
    createProject.mutate({ data: values });
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
            <p className="text-muted-foreground mt-1">Manage your team projects</p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} data-testid="button-create-project">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        ) : projects && projects.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => {
              const progress = project.taskCount > 0
                ? Math.round((project.completedTaskCount / project.taskCount) * 100)
                : 0;
              return (
                <Card
                  key={project.id}
                  className="cursor-pointer hover:shadow-md transition-shadow group"
                  onClick={() => setLocation(`/projects/${project.id}`)}
                  data-testid={`card-project-${project.id}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">{project.name}</CardTitle>
                        {project.description && (
                          <CardDescription className="mt-1 text-xs line-clamp-2">{project.description}</CardDescription>
                        )}
                      </div>
                      <Badge variant={project.status === "active" ? "default" : "secondary"} className="ml-2 shrink-0">
                        {project.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CheckSquare className="h-3.5 w-3.5" />
                        {project.completedTaskCount}/{project.taskCount} tasks
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {project.memberCount} members
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Progress</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-1.5" />
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0 pb-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteProject.mutate({ id: project.id });
                      }}
                      data-testid={`button-delete-project-${project.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold">No projects yet</h3>
            <p className="text-muted-foreground mt-1 mb-6">Create your first project to get started</p>
            <Button onClick={() => setIsDialogOpen(true)} data-testid="button-create-first-project">
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input id="project-name" placeholder="e.g. Website Redesign" {...form.register("name")} data-testid="input-project-name" />
              {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-description">Description (optional)</Label>
              <Textarea id="project-description" placeholder="What is this project about?" {...form.register("description")} data-testid="input-project-description" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createProject.isPending} data-testid="button-submit-project">
                {createProject.isPending ? "Creating..." : "Create Project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
