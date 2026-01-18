import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "node:http";
import { db } from "./db";
import { appUsers, invites, buddyPairs } from "../shared/schema";
import { eq, and, gt } from "drizzle-orm";

// Generate 6-char invite code (avoiding confusing characters)
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Auth middleware - extracts Firebase UID from header
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const userId = req.headers["x-user-id"] as string;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as any).userId = userId;
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // POST /api/users/sync - Sync Firebase user to database
  app.post("/api/users/sync", requireAuth, async (req: Request, res: Response) => {
    try {
      const { email, displayName } = req.body;
      const userId = (req as any).userId;

      await db
        .insert(appUsers)
        .values({ id: userId, email, displayName })
        .onConflictDoUpdate({
          target: appUsers.id,
          set: { email, displayName, updatedAt: new Date() },
        });

      res.json({ success: true });
    } catch (error) {
      console.error("Error syncing user:", error);
      res.status(500).json({ error: "Failed to sync user" });
    }
  });

  // POST /api/invites - Create a new invite
  app.post("/api/invites", requireAuth, async (req: Request, res: Response) => {
    try {
      const { mode } = req.body;
      const userId = (req as any).userId;

      if (!mode) {
        res.status(400).json({ error: "Mode is required" });
        return;
      }

      // Cancel any existing pending invites from this user
      await db
        .update(invites)
        .set({ status: "cancelled" })
        .where(and(eq(invites.hostUserId, userId), eq(invites.status, "pending")));

      // Generate unique code (retry if collision)
      let code: string = "";
      let attempts = 0;
      do {
        code = generateInviteCode();
        const existing = await db
          .select()
          .from(invites)
          .where(eq(invites.code, code))
          .limit(1);
        if (existing.length === 0) break;
        attempts++;
      } while (attempts < 10);

      if (attempts >= 10) {
        res.status(500).json({ error: "Failed to generate unique code" });
        return;
      }

      // Create invite with 24hr expiry
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const [invite] = await db
        .insert(invites)
        .values({
          code,
          hostUserId: userId,
          mode,
          expiresAt,
        })
        .returning();

      res.json({
        code: invite.code,
        expiresAt: invite.expiresAt,
        inviteLink: `https://snoozer.replit.app/join/${invite.code}`,
      });
    } catch (error) {
      console.error("Error creating invite:", error);
      res.status(500).json({ error: "Failed to create invite" });
    }
  });

  // GET /api/invites/active - Get user's active invite
  app.get("/api/invites/active", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const now = new Date();

      const [invite] = await db
        .select()
        .from(invites)
        .where(
          and(
            eq(invites.hostUserId, userId),
            eq(invites.status, "pending"),
            gt(invites.expiresAt, now)
          )
        )
        .limit(1);

      if (!invite) {
        res.json({ invite: null });
        return;
      }

      res.json({
        invite: {
          code: invite.code,
          mode: invite.mode,
          expiresAt: invite.expiresAt,
          status: invite.status,
        },
      });
    } catch (error) {
      console.error("Error fetching active invite:", error);
      res.status(500).json({ error: "Failed to fetch invite" });
    }
  });

  // GET /api/invites/status/:code - Poll for buddy join status
  app.get("/api/invites/status/:code", requireAuth, async (req: Request, res: Response) => {
    try {
      const { code } = req.params;
      const userId = (req as any).userId;

      const [result] = await db
        .select({
          invite: invites,
          guest: appUsers,
        })
        .from(invites)
        .leftJoin(appUsers, eq(invites.guestUserId, appUsers.id))
        .where(eq(invites.code, code.toUpperCase()))
        .limit(1);

      if (!result) {
        res.status(404).json({ error: "Invite not found" });
        return;
      }

      // Check if user is authorized to view this invite
      if (result.invite.hostUserId !== userId && result.invite.guestUserId !== userId) {
        res.status(403).json({ error: "Not authorized" });
        return;
      }

      res.json({
        status: result.invite.status,
        buddyJoined: result.invite.status === "accepted",
        buddyName: result.guest?.displayName || null,
        mode: result.invite.mode,
        expiresAt: result.invite.expiresAt,
      });
    } catch (error) {
      console.error("Error checking invite status:", error);
      res.status(500).json({ error: "Failed to check status" });
    }
  });

  // POST /api/invites/join - Join using invite code
  app.post("/api/invites/join", requireAuth, async (req: Request, res: Response) => {
    try {
      const { code } = req.body;
      const userId = (req as any).userId;
      const now = new Date();

      if (!code) {
        res.status(400).json({ error: "Code is required" });
        return;
      }

      // Find the invite
      const [invite] = await db
        .select()
        .from(invites)
        .where(
          and(
            eq(invites.code, code.toUpperCase()),
            eq(invites.status, "pending"),
            gt(invites.expiresAt, now)
          )
        )
        .limit(1);

      if (!invite) {
        res.status(404).json({ error: "Invalid or expired invite code" });
        return;
      }

      // Prevent self-join
      if (invite.hostUserId === userId) {
        res.status(400).json({ error: "Cannot join your own invite" });
        return;
      }

      // Update invite as accepted
      await db
        .update(invites)
        .set({
          guestUserId: userId,
          status: "accepted",
          acceptedAt: now,
        })
        .where(eq(invites.id, invite.id));

      // Create buddy pair
      await db.insert(buddyPairs).values({
        user1Id: invite.hostUserId,
        user2Id: userId,
        mode: invite.mode,
        inviteId: invite.id,
      });

      // Get host info for response
      const [host] = await db
        .select()
        .from(appUsers)
        .where(eq(appUsers.id, invite.hostUserId))
        .limit(1);

      res.json({
        success: true,
        mode: invite.mode,
        buddyName: host?.displayName || "Buddy",
      });
    } catch (error) {
      console.error("Error joining invite:", error);
      res.status(500).json({ error: "Failed to join invite" });
    }
  });

  // DELETE /api/invites/:code - Cancel an invite
  app.delete("/api/invites/:code", requireAuth, async (req: Request, res: Response) => {
    try {
      const { code } = req.params;
      const userId = (req as any).userId;

      await db
        .update(invites)
        .set({ status: "cancelled" })
        .where(
          and(
            eq(invites.code, code.toUpperCase()),
            eq(invites.hostUserId, userId),
            eq(invites.status, "pending")
          )
        );

      res.json({ success: true });
    } catch (error) {
      console.error("Error cancelling invite:", error);
      res.status(500).json({ error: "Failed to cancel invite" });
    }
  });

  // GET /api/buddy - Get current buddy info
  app.get("/api/buddy", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;

      // Find active buddy pair where user is either user1 or user2
      const pairs = await db
        .select()
        .from(buddyPairs)
        .where(eq(buddyPairs.isActive, true))
        .limit(10);

      const myPair = pairs.find((p) => p.user1Id === userId || p.user2Id === userId);

      if (!myPair) {
        res.json({ buddy: null });
        return;
      }

      // Get buddy's info
      const buddyId = myPair.user1Id === userId ? myPair.user2Id : myPair.user1Id;
      const [buddy] = await db
        .select()
        .from(appUsers)
        .where(eq(appUsers.id, buddyId))
        .limit(1);

      res.json({
        buddy: {
          id: buddy?.id,
          displayName: buddy?.displayName || "Buddy",
          mode: myPair.mode,
          since: myPair.createdAt,
        },
      });
    } catch (error) {
      console.error("Error fetching buddy:", error);
      res.status(500).json({ error: "Failed to fetch buddy" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
