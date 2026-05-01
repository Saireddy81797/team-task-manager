import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Shield, Calendar } from "lucide-react";

export default function Settings() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) setLocation("/login");
  }, [user, isLoading, setLocation]);

  if (isLoading || !user) return null;

  return (
    <Layout>
      <div className="space-y-8 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">Your account information</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your personal account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4 py-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Full Name</p>
                <p className="font-medium" data-testid="settings-name">{user.name}</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-4 py-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Email Address</p>
                <p className="font-medium" data-testid="settings-email">{user.email}</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-4 py-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Role</p>
                <div className="mt-1">
                  <Badge variant={user.role === "admin" ? "default" : "secondary"} data-testid="settings-role">
                    {user.role}
                  </Badge>
                </div>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-4 py-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Member Since</p>
                <p className="font-medium" data-testid="settings-created-at">
                  {new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
