import { useEffect, useRef } from "react";
import { useAuth } from "./use-auth";
import { useToast } from "./use-toast";
import { queryClient } from "@/lib/queryClient";

export function useNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!user) return;

    // WebSocket connection for real-time notifications
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected for notifications");
        // Identify this client with the user ID
        ws.send(JSON.stringify({
          type: 'identify',
          userId: user.id
        }));
      };

      ws.onmessage = (event) => {
        try {
          const notification = JSON.parse(event.data);
          
          // Invalidate relevant queries when tasks are updated
          if (notification.type === 'task_reviewed' || notification.type === 'task_assigned') {
            queryClient.invalidateQueries({ queryKey: ['/api/tasks/my'] });
            queryClient.invalidateQueries({ queryKey: ['/api/user/stats'] });
            queryClient.invalidateQueries({ queryKey: ['/api/leaderboard'] });
          }
          
          // Show toast notification
          toast({
            title: notification.title,
            description: notification.message,
            variant: notification.type === 'task_reviewed' && notification.status === 'rejected' 
              ? "destructive" 
              : "default",
          });

          // You can also dispatch custom events for other components to listen
          window.dispatchEvent(new CustomEvent('proofwork:notification', {
            detail: notification
          }));
          
        } catch (error) {
          console.error("Error parsing notification:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      ws.onclose = () => {
        console.log("WebSocket connection closed");
      };

    } catch (error) {
      console.error("Failed to establish WebSocket connection:", error);
    }

    // Cleanup on unmount or user change
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [user, toast]);

  return null;
}