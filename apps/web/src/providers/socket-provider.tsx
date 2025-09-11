"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "@/providers/auth-provider";
import { useQueryClient } from "@tanstack/react-query";

type Notification = {
  id: string;
  userId: string;
  type: string;
  subject: string;
  contentHtml?: string | null;
  read: boolean;
  createdAt: string;
};

const SocketCtx = createContext<Socket | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { token, isAuthed } = useAuth();
  const qc = useQueryClient();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!isAuthed || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const s = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
      auth: { token },
      transports: ["websocket"],
    });

    setSocket(s);

    // New notification came in
    s.on("notify:new", (_n: Notification) => {
      // Keep it simple: refresh unread, let the feed refetch on open or via manual refresh
      qc.invalidateQueries({ queryKey: ["me", "unread"] });
      // If the feed is open, we can also invalidate it:
      // qc.invalidateQueries({ queryKey: ["me", "notifications"] });
    });

    // Server-pushed unread badge count
    s.on("badge:update", (p: { unread: number }) => {
      qc.setQueryData<number>(["me", "unread"], p.unread);
    });

    return () => {
      s.disconnect();
      setSocket(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed, token]);

  const value = useMemo(() => socket, [socket]);
  return <SocketCtx.Provider value={value}>{children}</SocketCtx.Provider>;
}

export function useSocket() {
  return useContext(SocketCtx);
}
