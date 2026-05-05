import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ReviewQueueProps {
  quizId: number;
}

export function ReviewQueue({ quizId }: ReviewQueueProps) {
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);

  const { data: reviewsData, isLoading } = trpc.spaced.getNextReview.useQuery({
    quizId,
  });

  const recordReviewMutation = trpc.spaced.recordReview.useMutation();

  const handleReview = async (result: "again" | "hard" | "good" | "easy", difficulty: number) => {
    if (!reviewsData?.reviews[currentReviewIndex]) return;

    const review = reviewsData.reviews[currentReviewIndex];

    try {
      await recordReviewMutation.mutateAsync({
        questionId: review.question.id,
        quizId,
        result,
        difficulty,
      });

      toast.success(`Review recorded: ${result}`);

      if (currentReviewIndex < reviewsData.reviews.length - 1) {
        setCurrentReviewIndex(currentReviewIndex + 1);
      } else {
        toast.success("All reviews completed!");
      }
    } catch (error) {
      toast.error("Failed to record review");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!reviewsData?.reviews || reviewsData.reviews.length === 0) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="pt-6 text-center text-gray-400">
          No reviews due right now. Great job staying on top of your learning!
        </CardContent>
      </Card>
    );
  }

  const currentReview = reviewsData.reviews[currentReviewIndex];
  const progress = ((currentReviewIndex + 1) / reviewsData.reviews.length) * 100;

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Review Session</span>
          <span className="text-sm font-normal text-gray-400">
            {currentReviewIndex + 1} / {reviewsData.reviews.length}
          </span>
        </CardTitle>
        <div className="w-full bg-gray-800 rounded-full h-2 mt-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="bg-gray-800 p-4 rounded-lg">
          <p className="text-gray-300">{currentReview.question.questionText}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={() => handleReview("again", 1)}
            disabled={recordReviewMutation.isPending}
            className="border-red-500 text-red-400 hover:bg-red-500/10"
          >
            Again
          </Button>
          <Button
            variant="outline"
            onClick={() => handleReview("hard", 2)}
            disabled={recordReviewMutation.isPending}
            className="border-orange-500 text-orange-400 hover:bg-orange-500/10"
          >
            Hard
          </Button>
          <Button
            variant="outline"
            onClick={() => handleReview("good", 3)}
            disabled={recordReviewMutation.isPending}
            className="border-green-500 text-green-400 hover:bg-green-500/10"
          >
            Good
          </Button>
          <Button
            variant="outline"
            onClick={() => handleReview("easy", 4)}
            disabled={recordReviewMutation.isPending}
            className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
          >
            Easy
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
