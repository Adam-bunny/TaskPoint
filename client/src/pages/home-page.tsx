import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import TaskSubmissionForm from "@/components/task-submission-form";
import TaskList from "@/components/task-list";
import Leaderboard from "@/components/leaderboard";
import { useQuery } from "@tanstack/react-query";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const [, navigate] = useLocation();

  const { data: userStats } = useQuery({
    queryKey: ["/api/user/stats"],
    enabled: !!user,
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleAdminView = () => {
    navigate("/admin");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <i className="fas fa-tasks text-white text-sm"></i>
                </div>
                <span className="text-xl font-bold text-gray-900">ProofWork</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {user?.role === "admin" && (
                <Button 
                  variant="outline" 
                  onClick={handleAdminView}
                  data-testid="button-admin-view"
                >
                  Admin Dashboard
                </Button>
              )}
              
              <div className="flex items-center space-x-3">
                <div className="text-right text-sm">
                  <div className="font-medium text-gray-900" data-testid="text-username">
                    {user?.username}
                  </div>
                  <div className="text-gray-500">
                    <Badge variant="secondary" data-testid="badge-role">
                      {user?.role}
                    </Badge>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  onClick={handleLogout}
                  data-testid="button-logout"
                >
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Points</p>
                  <p className="text-3xl font-bold text-gray-900" data-testid="stat-total-points">
                    {userStats?.totalPoints || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <i className="fas fa-star text-primary text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tasks Completed</p>
                  <p className="text-3xl font-bold text-gray-900" data-testid="stat-completed-tasks">
                    {userStats?.completedTasks || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                  <i className="fas fa-check-circle text-success text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Review</p>
                  <p className="text-3xl font-bold text-gray-900" data-testid="stat-pending-tasks">
                    {userStats?.pendingTasks || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
                  <i className="fas fa-clock text-warning text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Leaderboard Rank</p>
                  <p className="text-3xl font-bold text-gray-900" data-testid="stat-rank">
                    #{userStats?.rank || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                  <i className="fas fa-trophy text-secondary text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Task Submission and Tasks Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-1">
            <TaskSubmissionForm />
          </div>
          <div className="lg:col-span-2">
            <TaskList />
          </div>
        </div>

        {/* Leaderboard */}
        <Leaderboard />
      </div>
    </div>
  );
}
