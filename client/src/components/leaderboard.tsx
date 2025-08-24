import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type User } from "@shared/schema";

export default function Leaderboard() {
  const { data: leaderboard = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/leaderboard"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex items-center space-x-4 p-4">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getRankStyle = (index: number) => {
    switch (index) {
      case 0:
        return "bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200";
      case 1:
        return "bg-gray-50 border-gray-200";
      case 2:
        return "bg-orange-50 border-orange-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const getRankBadgeStyle = (index: number) => {
    switch (index) {
      case 0:
        return "bg-yellow-500 text-white";
      case 1:
        return "bg-gray-400 text-white";
      case 2:
        return "bg-orange-400 text-white";
      default:
        return "bg-gray-400 text-white";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leaderboard</CardTitle>
        <p className="text-sm text-gray-600 mt-1">Top performers this month</p>
      </CardHeader>
      
      <CardContent>
        {leaderboard.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <i className="fas fa-trophy text-4xl mb-4 text-gray-300"></i>
            <p>No users on the leaderboard yet</p>
            <p className="text-sm">Be the first to earn points!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {leaderboard.map((user, index) => (
              <div
                key={user.id}
                className={`flex items-center space-x-4 p-4 rounded-lg border ${getRankStyle(index)}`}
                data-testid={`leaderboard-user-${index + 1}`}
              >
                <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${getRankBadgeStyle(index)}`}>
                  <span data-testid={`leaderboard-rank-${index + 1}`}>
                    {index + 1}
                  </span>
                </div>
                
                <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                  <i className="fas fa-user text-gray-600"></i>
                </div>
                
                <div className="flex-1">
                  <div className="font-medium text-gray-900" data-testid={`leaderboard-username-${index + 1}`}>
                    {user.username}
                  </div>
                  <div className="text-sm text-gray-600">
                    User since {new Date(user.createdAt).toLocaleDateString()}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="font-bold text-gray-900 text-lg" data-testid={`leaderboard-points-${index + 1}`}>
                    {user.totalPoints.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">points</div>
                </div>
                
                {index < 3 && (
                  <div className="text-2xl">
                    {index === 0 && <i className="fas fa-crown text-yellow-500"></i>}
                    {index === 1 && <i className="fas fa-medal text-gray-400"></i>}
                    {index === 2 && <i className="fas fa-award text-orange-400"></i>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
