import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Leaderboard from "@/components/leaderboard";
import { useQuery } from "@tanstack/react-query";

interface AdminStats {
  pendingTasks: number;
  approvedToday: number;
  pointsDistributed: number;
  activeUsers: number;
}

export default function AdminDashboard() {
  const { user, logoutMutation } = useAuth();
  const [, navigate] = useLocation();

  const { data: adminStats } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: !!user && user.role === "admin",
  });

  // Redirect if not admin
  if (user?.role !== "admin") {
    navigate("/");
    return null;
  }

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleUserView = () => {
    navigate("/");
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
                <span className="text-xl font-bold text-gray-900">ProofWork Admin</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                onClick={handleUserView}
                data-testid="button-user-view"
              >
                User View
              </Button>
              
              <div className="flex items-center space-x-3">
                <div className="text-right text-sm">
                  <div className="font-medium text-gray-900" data-testid="text-admin-username">
                    {user?.username}
                  </div>
                  <div className="text-gray-500">
                    <Badge variant="destructive" data-testid="badge-admin-role">
                      Admin
                    </Badge>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  onClick={handleLogout}
                  data-testid="button-admin-logout"
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
        {/* Admin Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Reviews</p>
                  <p className="text-3xl font-bold text-gray-900" data-testid="admin-stat-pending">
                    {adminStats?.pendingTasks || 0}
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
                  <p className="text-sm font-medium text-gray-600">Approved Today</p>
                  <p className="text-3xl font-bold text-gray-900" data-testid="admin-stat-approved">
                    {adminStats?.approvedToday || 0}
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
                  <p className="text-sm font-medium text-gray-600">Points Distributed</p>
                  <p className="text-3xl font-bold text-gray-900" data-testid="admin-stat-points">
                    {adminStats?.pointsDistributed || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <i className="fas fa-coins text-primary text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Users</p>
                  <p className="text-3xl font-bold text-gray-900" data-testid="admin-stat-users">
                    {adminStats?.activeUsers || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                  <i className="fas fa-users text-secondary text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Leaderboard Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">User Leaderboard</h2>
          <Leaderboard />
        </div>
      </div>
    </div>
  );
}
