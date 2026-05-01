import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Settings,
  LogOut,
} from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout, isLoggingOut } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in page components
  }

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/projects", label: "Projects", icon: FolderKanban },
    { href: "/tasks", label: "My Tasks", icon: CheckSquare },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-64 border-r bg-sidebar flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <span className="text-lg font-semibold tracking-tight text-sidebar-foreground">
            TaskMaster
          </span>
        </div>
        <nav className="flex-1 py-4 flex flex-col gap-1 px-3">
          {navItems.map((item) => {
            const isActive = location === item.href || location.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href} className="w-full">
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={`w-full justify-start ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:text-sidebar-foreground"}`}
                  data-testid={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <div className="mb-4 px-2">
            <p className="text-sm font-medium text-sidebar-foreground truncate" data-testid="user-name">{user.name}</p>
            <p className="text-xs text-sidebar-foreground/60 truncate" data-testid="user-email">{user.email}</p>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => logout()}
            disabled={isLoggingOut}
            data-testid="button-logout"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </Button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
