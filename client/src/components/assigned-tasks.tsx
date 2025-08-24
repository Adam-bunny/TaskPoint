import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  FileText, 
  User,
  Target
} from "lucide-react";
import { format } from "date-fns";

interface Task {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  points: number;
  deadline: string;
  assignedBy: string;
  createdAt: string;
  proofFile?: string;
  completedAt?: string;
}

function TaskCard({ task, onComplete }: { task: Task; onComplete: (task: Task) => void }) {
  const deadline = new Date(task.deadline);
  const isOverdue = deadline < new Date() && task.status !== "completed" && task.status !== "approved";
  const timeLeft = deadline.getTime() - new Date().getTime();
  const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));

  const getStatusColor = (status: string) => {
    switch (status) {
      case "assigned": return "bg-blue-100 text-blue-800";
      case "in_progress": return "bg-yellow-100 text-yellow-800";
      case "completed": return "bg-purple-100 text-purple-800";
      case "approved": return "bg-green-100 text-green-800";
      case "rejected": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "content_creation": return <FileText className="w-4 h-4" />;
      case "bug_report": return <AlertTriangle className="w-4 h-4" />;
      case "feature_request": return <Target className="w-4 h-4" />;
      case "community_help": return <User className="w-4 h-4" />;
      case "documentation": return <FileText className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <Card className={`transition-shadow hover:shadow-lg ${isOverdue ? 'border-red-200' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            {getTypeIcon(task.type)}
            <CardTitle className="text-lg">{task.title}</CardTitle>
          </div>
          <Badge className={getStatusColor(task.status)} data-testid={`task-status-${task.id}`}>
            {task.status.replace('_', ' ')}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-gray-600 text-sm">{task.description}</p>
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className={isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}>
                Due: {format(deadline, 'MMM dd, yyyy')}
              </span>
            </div>
            
            <div className="flex items-center space-x-1">
              <Target className="w-4 h-4 text-blue-500" />
              <span className="text-blue-600 font-medium">{task.points} points</span>
            </div>
          </div>
          
          {!isOverdue && task.status === "assigned" && (
            <div className="flex items-center space-x-1 text-sm">
              <Clock className="w-4 h-4 text-green-500" />
              <span className="text-green-600">
                {daysLeft > 0 ? `${daysLeft} days left` : 'Due today'}
              </span>
            </div>
          )}
          
          {isOverdue && (
            <div className="flex items-center space-x-1">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-red-600 font-medium">Overdue</span>
            </div>
          )}
        </div>

        {task.status === "approved" && (
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700 font-medium">
                Task approved! +{task.points} points earned
              </span>
            </div>
          </div>
        )}
        
        {(task.status === "assigned" || task.status === "in_progress") && (
          <Button 
            onClick={() => onComplete(task)}
            className="w-full"
            data-testid={`button-complete-task-${task.id}`}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Complete Task
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function AssignedTasks() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: assignedTasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks/assigned"],
  });

  const completeMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await fetch(`/api/tasks/${taskId}/complete-assigned`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to complete task');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Task Completed!",
        description: "Your task has been completed and points awarded.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/assigned"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Completion Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCompleteTask = (task: Task) => {
    completeMutation.mutate(task.id);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse bg-gray-200 h-32 rounded-lg"></div>
        <div className="animate-pulse bg-gray-200 h-32 rounded-lg"></div>
      </div>
    );
  }

  const activeTasks = assignedTasks.filter(task => 
    ["assigned", "in_progress", "completed"].includes(task.status)
  );
  const completedTasks = assignedTasks.filter(task => 
    task.status === "approved"
  );

  return (
    <div className="space-y-6">
      {activeTasks.length === 0 && completedTasks.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Assigned Tasks</h3>
            <p className="text-gray-600">
              No tasks have been assigned to you yet. Check back later or contact your admin.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {activeTasks.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-blue-600" />
                Active Tasks ({activeTasks.length})
              </h3>
              <div className="space-y-4">
                {activeTasks.map((task) => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onComplete={handleCompleteTask}
                  />
                ))}
              </div>
            </div>
          )}

          {completedTasks.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                Completed Tasks ({completedTasks.length})
              </h3>
              <div className="space-y-4">
                {completedTasks.map((task) => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onComplete={handleCompleteTask}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}