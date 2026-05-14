import React, { useEffect, useState } from 'react';
import { Check, X, User, Clock, AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { getPendingProposals, decideProposal } from '../lib/timelineApi';
import { toast } from 'sonner';

interface ProposalSidebarProps {
  timelineId: string;
  token: string;
  currentVersion: number;
  onMerged: () => void;
  isOwner: boolean;
  currentUsername?: string;
}

export default function ProposalSidebar({ 
  timelineId, 
  token, 
  currentVersion, 
  onMerged,
  isOwner,
  currentUsername
}: ProposalSidebarProps) {
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProposals = async () => {
    try {
      setLoading(true);
      const data = await getPendingProposals(timelineId, token);
      setProposals(data);
    } catch (error) {
      console.error('Failed to fetch proposals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
    const interval = setInterval(fetchProposals, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [timelineId, token]);

  const handleDecision = async (proposalId: string, status: 'ACCEPTED' | 'REJECTED') => {
    try {
      await decideProposal(timelineId, proposalId, status, token);
      toast.success(status === 'ACCEPTED' ? 'Đã chấp nhận đề xuất' : 'Đã từ chối đề xuất');
      fetchProposals();
      if (status === 'ACCEPTED') {
        onMerged();
      }
    } catch (error) {
      toast.error('Lỗi khi thực hiện thao tác');
    }
  };

  // Filter based on role: Owners see all, Contributors see their own
  const displayedProposals = isOwner 
    ? proposals 
    : proposals.filter(p => p.authorUsername === currentUsername);

  return (
    <div className="flex flex-col h-full bg-slate-50 border-l w-80">
      <div className="p-4 border-b bg-white">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          {isOwner ? 'Quản lý đề xuất' : 'Đề xuất của tôi'}
          {displayedProposals.length > 0 && (
            <Badge variant="destructive" className="ml-auto">{displayedProposals.length}</Badge>
          )}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          {isOwner 
            ? 'Phê duyệt hoặc từ chối các thay đổi từ thành viên' 
            : 'Theo dõi trạng thái các đề xuất bạn đã gửi'}
        </p>
      </div>

      <ScrollArea className="flex-1">
        {displayedProposals.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <p>{isOwner ? 'Không có đề xuất mới' : 'Bạn chưa có đề xuất nào'}</p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {displayedProposals.map((prop) => {
              const isStale = prop.baseVersion < currentVersion;
              return (
                <div key={prop.id} className={`bg-white p-3 rounded-lg border shadow-sm space-y-3 ${isPending(prop) ? 'border-amber-200 bg-amber-50/10' : ''}`}>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">
                      {isOwner ? prop.authorUsername : 'Đề xuất của bạn'}
                    </span>
                    <Badge variant="outline" className="ml-auto text-[10px] uppercase">
                      {prop.changeType}
                    </Badge>
                  </div>

                  <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded">
                    {prop.changeType === 'MOVE' && (
                      <p>Di chuyển hoạt động đến vị trí mới</p>
                    )}
                    {prop.changeType === 'ADD' && (
                      <p>Thêm địa điểm mới: <strong>{prop.payload?.placeName || 'Địa điểm'}</strong></p>
                    )}
                  </div>

                  {isStale && isOwner && (
                    <div className="flex items-center gap-1.5 text-[10px] text-amber-600 bg-amber-50 p-1.5 rounded border border-amber-100">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Đề xuất cũ (v{prop.baseVersion}) - Có thể xung đột</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {new Date(prop.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    
                    {isOwner ? (
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                          onClick={() => handleDecision(prop.id, 'REJECTED')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="default" 
                          className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700"
                          onClick={() => handleDecision(prop.id, 'ACCEPTED')}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Badge className={prop.status === 'PENDING' ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' : 'bg-blue-100 text-blue-700 hover:bg-blue-100'}>
                        {prop.status === 'PENDING' ? 'Đang chờ' : prop.status}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function isPending(prop: any) {
  return prop.status === 'PENDING';
}
