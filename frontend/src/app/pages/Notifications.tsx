import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { 
  Bell, 
  Calendar, 
  Users, 
  Check, 
  ArrowRight,
  Info,
  Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  getNotificationsRequest, 
  markAsReadRequest, 
  markAllAsReadRequest,
  getUnreadCountRequest,
  type NotificationResponse 
} from '../lib/notificationApi';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { Skeleton } from '../components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function Notifications() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchNotifications = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const data = await getNotificationsRequest(token, { size: 50 });
      if (data && Array.isArray(data.content)) {
        setNotifications(data.content);
      } else {
        console.warn('[Notifications] Unexpected response format:', data);
        setNotifications([]);
      }
      const unread = await getUnreadCountRequest(token);
      setTotal(typeof unread === 'number' ? unread : 0);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      toast.error('Không thể tải thông báo');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [token]);

  const handleMarkAsRead = async (id: string) => {
    if (!token) return;
    try {
      await markAsReadRequest(id, token);
      const wasUnread = notifications.some((n) => n.id === id && n.status === 'UNREAD');
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'READ' as const } : n));
      if (wasUnread) {
        setTotal((prev) => {
          const next = Math.max(0, prev - 1);
          window.dispatchEvent(new CustomEvent('vj:notifications-unread', { detail: next }));
          return next;
        });
      }
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    if (!token || notifications.length === 0) return;
    try {
      await markAllAsReadRequest(token);
      setNotifications(prev => prev.map(n => ({ ...n, status: 'READ' as const })));
      setTotal(0);
      window.dispatchEvent(new CustomEvent('vj:notifications-unread', { detail: 0 }));
      toast.success('Đã đánh dấu tất cả là đã đọc');
    } catch (error) {
      toast.error('Thao tác thất bại');
    }
  };

  const handleAction = (notification: NotificationResponse) => {
    handleMarkAsRead(notification.id);
    
    // Logic to navigate based on notification payload
    const { timelineId, sourceReferenceId } = notification.payload;
    const targetId = timelineId || sourceReferenceId;

    if (notification.category === 'COLLABORATION' || notification.category === 'TIMELINE') {
      if (targetId) navigate(`/workspace/${targetId}`);
      else navigate('/timelines');
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Bell className="w-12 h-12 text-slate-300" />
        <h2 className="text-xl font-semibold">Vui lòng đăng nhập để xem thông báo</h2>
        <Button onClick={() => navigate('/auth')}>Đăng nhập</Button>
      </div>
    );
  }

  const getIcon = (category: string) => {
    switch (category) {
      case 'COLLABORATION': return <Users className="w-5 h-5 text-blue-500" />;
      case 'TIMELINE': return <Calendar className="w-5 h-5 text-[#0b5d55]" />;
      default: return <Info className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-[var(--vj-content-max)] px-[var(--vj-page-pad-x)] py-[var(--vj-page-pad-y)]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0b5d55]">Thông báo</h1>
          <p className="text-muted-foreground mt-1">
            {total > 0 ? `${total} thông báo chưa đọc` : 'Cập nhật mới nhất về các chuyến đi của bạn'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleMarkAllRead} disabled={notifications.length === 0}>
          <Check className="w-4 h-4 mr-2" />
          Đọc tất cả
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <Card className="border-dashed border-2 bg-slate-50/50">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="p-4 rounded-full bg-slate-100">
              <Bell className="w-8 h-8 text-slate-400" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-lg">Hộp thư trống</h3>
              <p className="text-muted-foreground">Bạn không có thông báo mới nào vào lúc này.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {notifications.map((n) => (
            <Card 
              key={n.id} 
              className={`cursor-pointer overflow-hidden bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#0b5d55]/40 hover:shadow-md ${n.status === 'UNREAD' ? 'border-slate-200 border-l-4 border-l-[#0b5d55] bg-[color-mix(in_oklab,#0b5d55_6%,white)]' : 'border-slate-200'}`}
              onClick={() => handleAction(n)}
            >
              <div className="p-4 flex gap-4">
                <div className="flex-shrink-0 mt-1">
                  <div className={`p-2 rounded-full ${n.status === 'UNREAD' ? 'bg-white shadow-sm' : 'bg-slate-100'}`}>
                    {getIcon(n.category)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{n.type.replace(/_/g, ' ')}</span>
                    <div className="flex items-center text-xs text-slate-400 gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: vi })}
                    </div>
                  </div>
                  <h3 className={`text-base font-semibold ${n.status === 'UNREAD' ? 'text-slate-900' : 'text-slate-700'}`}>
                    {n.title}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                    {n.message}
                  </p>
                  
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      {n.status === 'UNREAD' && (
                        <Badge variant="default" className="bg-[#0b5d55] text-[10px] h-4 px-1">MỚI</Badge>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 text-[#0b5d55] hover:bg-[#0b5d55]/10 group">
                      Xem chi tiết
                      <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
