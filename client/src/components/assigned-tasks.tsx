import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Calendar, 
  Clock, 
  Upload, 
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
        
        {task.status === "completed" && task.proofFile && (
          <div className="bg-purple-50 p-3 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-purple-700">
                Proof submitted - waiting for admin review
              </span>
            </div>
            <p className="text-xs text-purple-600 mt-1">
              Completed: {task.completedAt ? format(new Date(task.completedAt), 'MMM dd, yyyy HH:mm') : 'Unknown'}
            </p>
          </div>
        )}

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
            <Upload className="w-4 h-4 mr-2" />
            {task.status === "assigned" ? "Start & Complete Task" : "Upload Proof"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function TaskCompletionDialog({ task, open, onOpenChange }: { 
  task: Task | null; 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const completeMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const formData = new FormData();
      if (selectedFile) {
        formData.append('proofFile', selectedFile);
      }
      
      const response = await fetch(`/api/tasks/${taskId}/complete`, {
        method: 'POST',
        body: formData,
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
        description: "Your proof has been submitted for admin review.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/assigned"] });
      setSelectedFile(null);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Completion Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({
          title: "Invalid File Type",
          description: "Please upload a PDF file as proof of completion.",
          variant: "destructive",
        });
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB
        toast({
          title: "File Too Large",
          description: "Please upload a file smaller than 10MB.",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleSubmit = () => {
    if (!task) return;
    
    if (!selectedFile) {
      toast({
        title: "No Proof File",
        description: "Please upload a PDF file as proof of completion.",
        variant: "destructive",
      });
      return;
    }
    
    completeMutation.mutate(task.id);
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
            Complete Task: {task.title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Task Description:</h4>
            <p className="text-sm text-gray-600">{task.description}</p>
          </div>
          
          <div>
            <h4 className="font-medium mb-3">Upload Proof of Completion (PDF only):</h4>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <div className="space-y-2">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="proof-file"
                  data-testid="input-proof-file"
                />
                <label
                  htmlFor="proof-file"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                >
                  Choose PDF File
                </label>
                <p className="text-xs text-gray-500">Maximum file size: 10MB</p>
              </div>
            </div>
            
            {selectedFile && (
              <div className="mt-3 p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700 font-medium">
                    {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)
                  </span>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-completion"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!selectedFile || completeMutation.isPending}
              data-testid="button-submit-completion"
            >
              {completeMutation.isPending ? "Submitting..." : "Submit Proof"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AssignedTasks() {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: assignedTasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks/assigned"],
  });

  const handleCompleteTask = (task: Task) => {
    setSelectedTask(task);
    setDialogOpen(true);
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

      <TaskCompletionDialog 
        task={selectedTask}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}