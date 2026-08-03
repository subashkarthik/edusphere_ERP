import { useEffect, useRef, useState } from 'react';
import { ToastMessage } from '../components/LiveNotificationToast';

export function useSocket(userId: string, orgId: string = 'org-edusphere') {
  const socket = useRef<WebSocket | null>(null);
  const [pulse, setPulse] = useState({ active_users: 1 });
  const [messages, setMessages] = useState<any[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const host = window.location.hostname || 'localhost';
    const wsUrl = `ws://${host}:5000/ws/${orgId}/${userId}`;
    
    let isSubscribed = true;

    const connect = () => {
      console.log('[WS] Connecting to', wsUrl);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        if (!isSubscribed) return;
        console.log('[WS] Live WebSocket connected');
        setIsConnected(true);
      };
      
      ws.onmessage = (event) => {
        if (!isSubscribed) return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'LIVE_PULSE') {
            setPulse({ active_users: data.active_users || 1 });
          } else {
            setMessages((prev) => [data, ...prev].slice(0, 50));

            // Generate Toast for push notifications
            if (data.type === 'NEW_ANNOUNCEMENT') {
              const toast: ToastMessage = {
                id: String(Date.now()),
                type: data.type,
                title: data.announcement?.title || 'New Announcement',
                message: data.announcement?.content || 'Check announcement center',
                timestamp: 'Just now'
              };
              setToasts((prev) => [toast, ...prev].slice(0, 5));
            } else if (data.type === 'NEW_ASSIGNMENT') {
              const toast: ToastMessage = {
                id: String(Date.now()),
                type: data.type,
                title: 'New Assignment Posted',
                message: `${data.assignment?.title} - ${data.assignment?.course_name}`,
                timestamp: 'Just now'
              };
              setToasts((prev) => [toast, ...prev].slice(0, 5));
            } else if (data.type === 'NOTIFICATION') {
              const toast: ToastMessage = {
                id: String(Date.now()),
                type: data.type,
                title: data.title || 'System Notification',
                message: data.message || '',
                timestamp: 'Just now'
              };
              setToasts((prev) => [toast, ...prev].slice(0, 5));
            }
          }
        } catch (err) {
          console.error('[WS] Parse error', err);
        }
      };

      ws.onerror = (err) => {
        console.warn('[WS] Socket error (fallback active)');
        setIsConnected(false);
      };

      ws.onclose = () => {
        if (!isSubscribed) return;
        setIsConnected(false);
        setTimeout(connect, 5000);
      };

      socket.current = ws;
    };

    connect();

    return () => {
      isSubscribed = false;
      if (socket.current) {
        socket.current.close();
      }
    };
  }, [userId, orgId]);

  const send = (data: any) => {
    if (socket.current?.readyState === WebSocket.OPEN) {
      socket.current.send(JSON.stringify(data));
    }
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { pulse, messages, toasts, isConnected, send, dismissToast };
}
