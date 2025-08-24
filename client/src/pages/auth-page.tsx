import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, insertAdminUserSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";

const loginSchema = insertUserSchema;
const registerSchema = insertUserSchema;
const adminRegisterSchema = insertAdminUserSchema;

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;
type AdminRegisterData = z.infer<typeof adminRegisterSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [location, navigate] = useLocation();
  
  // Check if this is admin login
  const isAdminLogin = location.includes('/admin/login');

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const adminRegisterForm = useForm<AdminRegisterData>({
    resolver: zodResolver(adminRegisterSchema),
    defaultValues: {
      username: "",
      password: "",
      adminCode: "",
    },
  });

  // Redirect if already logged in
  if (user) {
    if (isAdminLogin && user.role !== "admin") {
      // Non-admin trying to access admin login - redirect to user dashboard
      navigate("/");
    } else if (isAdminLogin && user.role === "admin") {
      // Admin already logged in - go to admin dashboard
      navigate("/admin");
    } else {
      // Regular user login - go to user dashboard
      navigate("/");
    }
    // Show loading while redirecting
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p>Redirecting...</p>
        </div>
      </div>
    );
  }

  const handleLogin = (data: LoginData) => {
    loginMutation.mutate(data, {
      onSuccess: (loggedInUser) => {
        if (isAdminLogin) {
          if (loggedInUser.role === "admin") {
            navigate("/admin");
          } else {
            // Non-admin trying to login through admin portal
            navigate("/");
          }
        } else {
          navigate("/");
        }
      },
    });
  };

  const handleRegister = (data: RegisterData) => {
    registerMutation.mutate(data, {
      onSuccess: () => navigate("/"),
    });
  };

  const handleAdminRegister = (data: AdminRegisterData) => {
    registerMutation.mutate(data, {
      onSuccess: (user) => {
        if (user.role === "admin") {
          navigate("/admin");
        } else {
          navigate("/");
        }
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left side - Forms */}
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className={`w-8 h-8 ${isAdminLogin ? 'bg-red-600' : 'bg-primary'} rounded-lg flex items-center justify-center`}>
                <i className={`fas ${isAdminLogin ? 'fa-shield-alt' : 'fa-tasks'} text-white text-sm`}></i>
              </div>
              <span className="text-xl font-bold text-gray-900">
                ProofWork {isAdminLogin && 'Admin'}
              </span>
            </div>
            {isAdminLogin && (
              <Badge variant="destructive" className="mb-2">
                Administrator Portal
              </Badge>
            )}
            <CardTitle>{isAdminLogin ? 'Admin Login' : 'Welcome Back'}</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              {!isAdminLogin && (
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="register">Register</TabsTrigger>
                </TabsList>
              )}
              {isAdminLogin && (
                <div className="text-center mb-4">
                  <p className="text-sm text-gray-600">Administrator Sign In</p>
                  <p className="text-xs text-red-600 mt-1">Admin Code Required for Registration</p>
                </div>
              )}
              
              {isAdminLogin && (
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="admin-register">Create Admin</TabsTrigger>
                </TabsList>
              )}
              
              <TabsContent value="login">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="Enter your username"
                              data-testid="input-username"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="password" 
                              placeholder="Enter your password"
                              data-testid="input-password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={loginMutation.isPending}
                      data-testid="button-login"
                    >
                      {loginMutation.isPending ? "Signing in..." : "Sign In"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
              
              {!isAdminLogin && (
                <TabsContent value="register">
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="Choose a username"
                                data-testid="input-register-username"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="password" 
                                placeholder="Choose a password"
                                data-testid="input-register-password"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={registerMutation.isPending}
                        data-testid="button-register"
                      >
                        {registerMutation.isPending ? "Creating account..." : "Create Account"}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              )}
              
              {/* Admin Registration Tab */}
              {isAdminLogin && (
                <TabsContent value="admin-register">
                  <Form {...adminRegisterForm}>
                    <form onSubmit={adminRegisterForm.handleSubmit(handleAdminRegister)} className="space-y-4">
                      <FormField
                        control={adminRegisterForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Admin Username</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="Must contain 'admin'"
                                data-testid="input-admin-username"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={adminRegisterForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="password" 
                                placeholder="Secure admin password"
                                data-testid="input-admin-password"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={adminRegisterForm.control}
                        name="adminCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Admin Code</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="Enter admin authorization code"
                                data-testid="input-admin-code"
                              />
                            </FormControl>
                            <FormMessage />
                            <p className="text-xs text-gray-500">Contact system administrator for the code</p>
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={registerMutation.isPending}
                        data-testid="button-admin-register"
                      >
                        {registerMutation.isPending ? "Creating admin..." : "Create Admin Account"}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              )}
              
              {/* Navigation Links */}
              <div className="mt-4 text-center">
                {isAdminLogin ? (
                  <Button 
                    variant="link" 
                    onClick={() => navigate("/auth")}
                    className="text-sm text-gray-600"
                    data-testid="link-user-login"
                  >
                    <i className="fas fa-user mr-2"></i>
                    User Login Instead
                  </Button>
                ) : (
                  <Button 
                    variant="link" 
                    onClick={() => navigate("/admin/login")}
                    className="text-sm text-gray-600"
                    data-testid="link-admin-login"
                  >
                    <i className="fas fa-shield-alt mr-2"></i>
                    Admin Login
                  </Button>
                )}
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Right side - Hero */}
      <div className="flex-1 bg-primary flex items-center justify-center p-8">
        <div className="text-center text-white max-w-md">
          <h2 className="text-3xl font-bold mb-4">Earn Points for Your Work</h2>
          <p className="text-blue-100 mb-6">
            Submit tasks, get them reviewed by admins, and earn points to climb the leaderboard. 
            Join our community of contributors today!
          </p>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <i className="fas fa-tasks text-white"></i>
              </div>
              <span>Submit various types of tasks</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <i className="fas fa-star text-white"></i>
              </div>
              <span>Earn points for approved work</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <i className="fas fa-trophy text-white"></i>
              </div>
              <span>Compete on the leaderboard</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
