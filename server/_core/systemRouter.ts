import { z } from "zod";
import { sql } from "drizzle-orm";
import { getDb } from "../db";
import { ENV } from "./env";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(async () => {
      const configurationReady = Boolean(
        ENV.databaseUrl && ENV.cookieSecret && ENV.oAuthServerUrl && ENV.oAuthPortalUrl && ENV.appId,
      );
      const db = await getDb();
      let databaseReady = false;
      if (db) {
        try {
          await db.execute(sql`SELECT 1`);
          databaseReady = true;
        } catch {
          databaseReady = false;
        }
      }
      return {
        ok: configurationReady && databaseReady,
        readiness: {
          configuration: configurationReady,
          database: databaseReady,
        },
      };
    }),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),
});
