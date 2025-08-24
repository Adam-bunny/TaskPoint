import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTaskSchema, TASK_POINTS } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText } from "lucide-react";
import { z } from "zod";

type TaskFormData = z.infer<typeof insertTaskSchema>;

const taskTypes = [
  { value: "content_creation", label: "Content Creation", points: TASK_POINTS.content_creation },
  { value: "bug_report", label: "Bug Report", points: TASK_POINTS.bug_report },
  { value: "feature_request", label: "Feature Request", points: TASK_POINTS.feature_request },
  { value: "community_help", label: "Community Help", points: TASK_POINTS.community_help },
  { value: "documentation", label: "Documentation", points: TASK_POINTS.documentation },
];

export default function TaskSubmissionForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const form = useForm<TaskFormData>({
    resolver: zodResolver(insertTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      type: undefined,
    },
  });

  const submitTaskMutation = useMutation({
    mutationFn: async (data: TaskFormData) => {
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('description', data.description);
      formData.append('type', data.type);
      
      if (selectedFile) {
        formData.append('proofFile', selectedFile);
      }

      const res = await fetch('/api/tasks', {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to submit task');
      }
      
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
      toast({
        title: "Task Submitted!",
        description: "Your task has been submitted for review.",
      });
      form.reset();
      setSelectedFile(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
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

  const onSubmit = (data: TaskFormData) => {
    submitTaskMutation.mutate(data);
  };

  const selectedTaskType = form.watch("type");
  const selectedTypeData = taskTypes.find(type => type.value === selectedTaskType);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit New Task</CardTitle>
        <p className="text-sm text-gray-600">
          Complete tasks to earn points and climb the leaderboard
        </p>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-task-type">
                        <SelectValue placeholder="Select task type..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {taskTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label} ({type.points} pts)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Title</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter task title..."
                      data-testid="input-task-title"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={4}
                      placeholder="Describe your task in detail..."
                      className="resize-none"
                      data-testid="textarea-task-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* File Upload Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Proof File (Optional PDF)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <div className="space-y-2">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="proof-file-upload"
                    data-testid="input-proof-file-upload"
                  />
                  <label
                    htmlFor="proof-file-upload"
                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                  >
                    Choose PDF File
                  </label>
                  <p className="text-xs text-gray-500">Maximum file size: 10MB</p>
                </div>
              </div>
              
              {selectedFile && (
                <div className="mt-2 p-2 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-700 font-medium">
                      {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {selectedTypeData && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <i className="fas fa-info-circle mr-2"></i>
                  This task type awards <strong>{selectedTypeData.points} points</strong> upon approval.
                </p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={submitTaskMutation.isPending}
              data-testid="button-submit-task"
            >
              {submitTaskMutation.isPending ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Submitting...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane mr-2"></i>
                  Submit Task
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
