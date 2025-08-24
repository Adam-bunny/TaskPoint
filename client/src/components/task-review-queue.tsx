import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { type Task } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

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

interface ReviewModalProps {
  task: Task;
  onReview: (taskId: string, status: "approved" | "rejected", points: number, rejectionReason?: string) => void;
  isReviewing: boolean;
}

function ReviewModal({ task, onReview, isReviewing }: ReviewModalProps) {
  const [status, setStatus] = useState<"approved" | "rejected">("approved");
  const [points, setPoints] = useState(task.points);
  const [rejectionReason, setRejectionReason] = useState("");
  const [open, setOpen] = useState(false);

  const handleSubmit = () => {
    onReview(task.id, status, points, status === "rejected" ? rejectionReason : undefined);
    setOpen(false);
    setRejectionReason("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid={`button-review-${task.id}`}>
          <i className="fas fa-eye mr-2"></i>
          Review
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Review Task: {task.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">Description:</p>
            <p className="text-gray-900">{task.description}</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Badge className={typeColors[task.type]}>
              {typeLabels[task.type]}
            </Badge>
            <span className="text-sm text-gray-500">
              Submitted {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Decision
              </label>
              <Select value={status} onValueChange={(value: "approved" | "rejected") => setStatus(value)}>
                <SelectTrigger data-testid={`select-status-${task.id}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approve</SelectItem>
                  <SelectItem value="rejected">Reject</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Points to Award
              </label>
              <Input
                type="number"
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
                disabled={status === "rejected"}
                data-testid={`input-points-${task.id}`}
              />
            </div>
          </div>

          {status === "rejected" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason
              </label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this task was rejected..."
                rows={3}
                data-testid={`textarea-rejection-${task.id}`}
              />
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isReviewing || (status === "rejected" && !rejectionReason.trim())}
              data-testid={`button-submit-review-${task.id}`}
            >
              {isReviewing ? "Processing..." : "Submit Review"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function TaskReviewQueue() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pendingTasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks/pending"],
  });

  const reviewTaskMutation = useMutation({
    mutationFn: async ({ 
      taskId, 
      status, 
      points, 
      rejectionReason 
    }: { 
      taskId: string; 
      status: "approved" | "rejected"; 
      points: number; 
      rejectionReason?: string; 
    }) => {
      const res = await apiRequest("PATCH", `/api/tasks/${taskId}/review`, {
        status,
        points,
        rejectionReason,
      });
      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Task Reviewed",
        description: `Task has been ${variables.status}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Review Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleQuickApprove = (taskId: string, points: number) => {
    reviewTaskMutation.mutate({ taskId, status: "approved", points });
  };

  const handleQuickReject = (taskId: string) => {
    reviewTaskMutation.mutate({ 
      taskId, 
      status: "rejected", 
      points: 0, 
      rejectionReason: "Task did not meet requirements" 
    });
  };

  const handleReview = (taskId: string, status: "approved" | "rejected", points: number, rejectionReason?: string) => {
    reviewTaskMutation.mutate({ taskId, status, points, rejectionReason });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Task Review Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse border border-gray-200 rounded-lg p-4">
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
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Task Review Queue</CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            Tasks awaiting admin approval ({pendingTasks.length} pending)
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select defaultValue="all">
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="content_creation">Content Creation</SelectItem>
              <SelectItem value="bug_report">Bug Report</SelectItem>
              <SelectItem value="documentation">Documentation</SelectItem>
              <SelectItem value="feature_request">Feature Request</SelectItem>
              <SelectItem value="community_help">Community Help</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent>
        {pendingTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <i className="fas fa-inbox text-4xl mb-4 text-gray-300"></i>
            <p>No pending tasks to review</p>
            <p className="text-sm">All caught up!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingTasks.map((task) => (
              <div
                key={task.id}
                className="border border-gray-200 rounded-lg p-4"
                data-testid={`pending-task-${task.id}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-medium text-gray-900" data-testid={`pending-task-title-${task.id}`}>
                        {task.title}
                      </h4>
                      <Badge className={typeColors[task.type]}>
                        {typeLabels[task.type]}
                      </Badge>
                      <Badge variant="outline">
                        {task.points} pts
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                      <span>
                        <i className="fas fa-user mr-1"></i>
                        Submitted by user
                      </span>
                      <span>
                        <i className="fas fa-calendar-alt mr-1"></i>
                        {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-4" data-testid={`pending-task-description-${task.id}`}>
                      {task.description}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Button
                      size="sm"
                      className="bg-success text-white hover:bg-green-600"
                      onClick={() => handleQuickApprove(task.id, task.points)}
                      disabled={reviewTaskMutation.isPending}
                      data-testid={`button-approve-${task.id}`}
                    >
                      <i className="fas fa-check mr-2"></i>
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleQuickReject(task.id)}
                      disabled={reviewTaskMutation.isPending}
                      data-testid={`button-reject-${task.id}`}
                    >
                      <i className="fas fa-times mr-2"></i>
                      Reject
                    </Button>
                    <ReviewModal 
                      task={task} 
                      onReview={handleReview}
                      isReviewing={reviewTaskMutation.isPending}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">Points to award:</span>
                    <span className="font-medium">{task.points}</span>
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
