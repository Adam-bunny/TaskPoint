import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type Task } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  assigned: "bg-blue-100 text-blue-800",
  in_progress: "bg-orange-100 text-orange-800",
  completed: "bg-purple-100 text-purple-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const typeColors = {
  content_creation: "bg-blue-50 text-blue-700",
  bug_report: "bg-green-50 text-green-700",
  feature_request: "bg-purple-50 text-purple-700",
  community_help: "bg-orange-50 text-orange-700",
  documentation: "bg-indigo-50 text-indigo-700",
};

const typeLabels = {
  content_creation: "Content Creation",
  bug_report: "Bug Report",
  feature_request: "Feature Request",
  community_help: "Community Help",
  documentation: "Documentation",
};

export default function TaskList() {
  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks/my"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Tasks</CardTitle>
        <p className="text-sm text-gray-600 mt-1">
          Your submitted tasks
        </p>
      </CardHeader>
      
      <CardContent>
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <i className="fas fa-tasks text-4xl mb-4 text-gray-300"></i>
            <p>No tasks submitted yet</p>
            <p className="text-sm">Submit your first task to get started!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                data-testid={`task-item-${task.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-medium text-gray-900" data-testid={`task-title-${task.id}`}>
                        {task.title}
                      </h4>
                      <Badge className={statusColors[task.status]} data-testid={`task-status-${task.id}`}>
                        {task.status}
                      </Badge>
                      <Badge className={typeColors[task.type]} data-testid={`task-type-${task.id}`}>
                        {typeLabels[task.type]}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3" data-testid={`task-description-${task.id}`}>
                      {task.description}
                    </p>
                    {task.status === "rejected" && task.rejectionReason && (
                      <div className="bg-error/5 border border-error/20 rounded-lg p-3 mb-3">
                        <p className="text-sm text-error font-medium mb-1">Rejection Reason:</p>
                        <p className="text-sm text-error" data-testid={`task-rejection-${task.id}`}>
                          {task.rejectionReason}
                        </p>
                      </div>
                    )}
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>
                        <i className="fas fa-calendar-alt mr-1"></i>
                        {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                      </span>
                      <span>
                        <i className="fas fa-star mr-1"></i>
                        {task.points} points
                      </span>
                      {task.status === "approved" && (
                        <span className="text-success">
                          <i className="fas fa-check mr-1"></i>
                          Approved
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
