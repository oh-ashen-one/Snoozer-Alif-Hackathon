import { useState, useCallback, useEffect, useRef } from "react";
import { apiRequest } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";

interface InviteState {
  code: string | null;
  expiresAt: Date | null;
  status: "idle" | "pending" | "accepted" | "expired" | "error";
  buddyName: string | null;
  mode: string | null;
  error: string | null;
  isLoading: boolean;
}

interface CreateInviteResult {
  code: string;
  expiresAt: string;
  inviteLink: string;
}

interface JoinInviteResult {
  success: boolean;
  mode: string;
  buddyName: string;
}

interface InviteStatusResult {
  status: string;
  buddyJoined: boolean;
  buddyName: string | null;
  mode: string;
  expiresAt: string;
}

export function useInvite(mode?: string) {
  const { user } = useAuth();
  const [state, setState] = useState<InviteState>({
    code: null,
    expiresAt: null,
    status: "idle",
    buddyName: null,
    mode: mode || null,
    error: null,
    isLoading: false,
  });
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Create a new invite
  const createInvite = useCallback(
    async (inviteMode?: string) => {
      if (!user) {
        setState((prev) => ({
          ...prev,
          status: "error",
          error: "Not authenticated",
        }));
        return null;
      }

      const modeToUse = inviteMode || mode;
      if (!modeToUse) {
        setState((prev) => ({
          ...prev,
          status: "error",
          error: "Mode is required",
        }));
        return null;
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const res = await apiRequest("POST", "/api/invites", {
          mode: modeToUse,
        });
        const data: CreateInviteResult = await res.json();

        setState({
          code: data.code,
          expiresAt: new Date(data.expiresAt),
          status: "pending",
          buddyName: null,
          mode: modeToUse,
          error: null,
          isLoading: false,
        });

        return data.code;
      } catch (error: any) {
        const message = error?.message || "Failed to create invite";
        setState((prev) => ({
          ...prev,
          status: "error",
          error: message,
          isLoading: false,
        }));
        return null;
      }
    },
    [user, mode]
  );

  // Poll for status updates
  const startPolling = useCallback(
    (code: string) => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }

      const poll = async () => {
        try {
          const res = await apiRequest("GET", `/api/invites/status/${code}`);
          const data: InviteStatusResult = await res.json();

          if (data.buddyJoined) {
            setState((prev) => ({
              ...prev,
              status: "accepted",
              buddyName: data.buddyName,
              mode: data.mode,
            }));
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
          } else if (new Date(data.expiresAt) < new Date()) {
            setState((prev) => ({ ...prev, status: "expired" }));
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
          }
        } catch (error) {
          // Silently handle polling errors, continue polling
        }
      };

      // Poll immediately, then every 3 seconds
      poll();
      pollIntervalRef.current = setInterval(poll, 3000);
    },
    []
  );

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Join an existing invite
  const joinInvite = useCallback(
    async (code: string) => {
      if (!user) {
        throw new Error("Not authenticated");
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const res = await apiRequest("POST", "/api/invites/join", { code });
        const data: JoinInviteResult = await res.json();

        setState((prev) => ({
          ...prev,
          status: "accepted",
          buddyName: data.buddyName,
          mode: data.mode,
          isLoading: false,
        }));

        return {
          success: true,
          mode: data.mode,
          buddyName: data.buddyName,
        };
      } catch (error: any) {
        const message = error?.message || "Failed to join invite";
        setState((prev) => ({
          ...prev,
          error: message,
          isLoading: false,
        }));
        throw new Error(message);
      }
    },
    [user]
  );

  // Cancel current invite
  const cancelInvite = useCallback(async () => {
    if (!state.code) return;

    stopPolling();

    try {
      await apiRequest("DELETE", `/api/invites/${state.code}`);
      setState({
        code: null,
        expiresAt: null,
        status: "idle",
        buddyName: null,
        mode: mode || null,
        error: null,
        isLoading: false,
      });
    } catch (error) {
      // Still reset local state even if server call fails
      setState({
        code: null,
        expiresAt: null,
        status: "idle",
        buddyName: null,
        mode: mode || null,
        error: null,
        isLoading: false,
      });
    }
  }, [state.code, stopPolling, mode]);

  // Reset state
  const reset = useCallback(() => {
    stopPolling();
    setState({
      code: null,
      expiresAt: null,
      status: "idle",
      buddyName: null,
      mode: mode || null,
      error: null,
      isLoading: false,
    });
  }, [stopPolling, mode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return {
    ...state,
    createInvite,
    joinInvite,
    cancelInvite,
    startPolling,
    stopPolling,
    reset,
  };
}
