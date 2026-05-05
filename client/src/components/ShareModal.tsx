import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ShareModalProps {
  quizId: number;
  quizTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareModal({ quizId, quizTitle, open, onOpenChange }: ShareModalProps) {
  const [shareToken, setShareToken] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const createShareMutation = trpc.sharing.createShareLink.useMutation();

  const handleCreateShare = async () => {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      const result = await createShareMutation.mutateAsync({
        quizId,
        expiresAt,
        maxUses: 100,
      });
      setShareToken(result.shareToken);
      toast.success("Share link created!");
    } catch (error) {
      toast.error("Failed to create share link");
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/shared/${shareToken}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copied to clipboard!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share "{quizTitle}"</DialogTitle>
        </DialogHeader>

        {!shareToken ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Create a shareable link to let others practice this quiz
            </p>
            <Button onClick={handleCreateShare} disabled={createShareMutation.isPending} className="w-full">
              {createShareMutation.isPending ? "Creating..." : "Create Share Link"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                readOnly
                value={`${window.location.origin}/shared/${shareToken}`}
                className="bg-gray-800 border-gray-700"
              />
              <Button
                size="sm"
                onClick={handleCopyLink}
                className="px-3"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </Button>
            </div>
            <p className="text-xs text-gray-400">
              Link expires in 30 days or after 100 uses
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
