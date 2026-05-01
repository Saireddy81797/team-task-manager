import { useEffect } from "react";
import { useLocation } from "wouter";
import {
  useGetMe,
  getGetMeQueryKey,
  useLogin,
  useSignup,
  useLogout,
  LoginBody,
  SignupBody,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export function useAuth() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: user, isLoading, error } = useGetMe({
    query: {
      retry: false,
    },
  });

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        localStorage.setItem("auth_token", data.token);
        queryClient.setQueryData(getGetMeQueryKey(), data.user);
        setLocation("/dashboard");
      },
      onError: (err: any) => {
        toast({
          title: "Login failed",
          description: err.error || "An error occurred",
          variant: "destructive",
        });
      },
    },
  });

  const signupMutation = useSignup({
    mutation: {
      onSuccess: (data) => {
        localStorage.setItem("auth_token", data.token);
        queryClient.setQueryData(getGetMeQueryKey(), data.user);
        setLocation("/dashboard");
      },
      onError: (err: any) => {
        toast({
          title: "Signup failed",
          description: err.error || "An error occurred",
          variant: "destructive",
        });
      },
    },
  });

  const logoutMutation = useLogout({
    mutation: {
      onSuccess: () => {
        localStorage.removeItem("auth_token");
        queryClient.setQueryData(getGetMeQueryKey(), null);
        setLocation("/login");
      },
    },
  });

  return {
    user,
    isLoading,
    error,
    login: loginMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    signup: signupMutation.mutate,
    isSigningUp: signupMutation.isPending,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
