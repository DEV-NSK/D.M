"use client";
import { useEffect, useState } from "react";
import { api } from "./useWorkspace";
export function useRealtime(refresh: () => void) {
  const [status, setStatus] = useState("connecting");
  useEffect(() => {
    let es: EventSource | undefined,
      timer: any,
      closed = false;
    const connect = () => {
      es = new EventSource(api + "/realtime/events", { withCredentials: true });
      es.onopen = () => setStatus("connected");
      es.onmessage = refresh;
      for (const name of [
        "client.comment.created",
        "client.reviewed",
        "client.changes_requested",
        "notification.created",
        "submission.created",
      ])
        es.addEventListener(name, refresh);
      es.onerror = () => {
        es?.close();
        if (!closed) {
          setStatus("reconnecting");
          timer = setTimeout(() => {
            refresh();
            connect();
          }, 2000);
        }
      };
    };
    connect();
    return () => {
      closed = true;
      clearTimeout(timer);
      es?.close();
    };
  }, [refresh]);
  return status;
}
