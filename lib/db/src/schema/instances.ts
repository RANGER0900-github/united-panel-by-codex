import { pgTable, text, integer, numeric, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const vpsInstances = pgTable("vps_instances", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  status: text("status").notNull().default("stopped"),
  cpuCores: integer("cpu_cores").notNull(),
  memoryMb: integer("memory_mb").notNull(),
  diskGb: numeric("disk_gb").notNull(),
  ipAddress: text("ip_address"),
  os: text("os").notNull(),
  type: text("type").notNull().default("docker"),
  sshPort: integer("ssh_port"),
  sshUsername: text("ssh_username").notNull().default("root"),
  hostname: text("hostname"),
  timezone: text("timezone").notNull().default("UTC"),
  autoStart: boolean("auto_start").notNull().default(false),
  hasPublicIpv4: boolean("has_public_ipv4").notNull().default(true),
  cfTunnelEnabled: boolean("cf_tunnel_enabled").notNull().default(false),
  cfTunnelUrl: text("cf_tunnel_url"),
  tags: text("tags").array().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  startedAt: timestamp("started_at"),
});

export const insertVpsInstanceSchema = createInsertSchema(vpsInstances).omit({ id: true, createdAt: true });
export type InsertVpsInstance = z.infer<typeof insertVpsInstanceSchema>;
export type VpsInstance = typeof vpsInstances.$inferSelect;
