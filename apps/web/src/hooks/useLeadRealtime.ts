"use client";
import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";


export function useLeadRealtime(onNew: () => void) {
const ref = useRef<Socket | null>(null);


useEffect(() => {
// Avoid double-connecting if SSR or missing env
if (typeof window === "undefined") return;
const base = process.env.NEXT_PUBLIC_SOCKET_URL;
if (!base) return;


// Use access token if you store it in localStorage (aligns with your AuthContext)
const token = localStorage.getItem("accessToken");
if (!token) return;


const s = io(base, { auth: { token } });
ref.current = s;


const handler = () => {
try { onNew(); } catch {}
};


s.on("lead:new", handler);


return () => {
s.off("lead:new", handler);
s.disconnect();
ref.current = null;
};
}, [onNew]);
}

