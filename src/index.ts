import "dotenv/config";

// Import and initialize telemetry and metrics
import "./tracing/sdk";
import { Metrics } from "./tracing/metrics";

import fastify from "fastify";
import rawBody from "fastify-raw-body";
import * as nacl from "tweetnacl";
import {
  AutocompleteContext,
  DiscordApplication,
  InteractionContext,
  InteractionHandlerTimedOut,
  PingContext,
  SimpleError,
  SlashCommandContext,
  UnauthorizedInteraction,
  UnknownApplicationCommandType,
  UnknownComponentType,
  UnknownInteractionType
} from "interactions.ts";
import { connect, HydratedDocument } from "mongoose";
import { createClient } from "redis";
import {
  About,
  Forest,
  Leaderboard,
  Ping,
  Plant,
  Profile,
  Tree,
  Recycle,
  NotificationSettings,
  SendCoinsCommand,
  DailyReward,
  Composter,
  Shop,
  SetTimezone,
  ServerInfo,
  Wheel,
  RedeemPurchasesCommand,
  AdventCalendar,
  Rename,
  Styles
} from "./commands";
import { Guild, IGuild } from "./models/Guild";
import { fetchStats } from "./api/stats";
import { Feedback } from "./commands/Feedback";
import { startBackupTimer } from "./backup/backup";
import { WebhookEventType } from "./util/types/discord/DiscordTypeExtension";
import { handleEntitlementCreate } from "./util/discord/DiscordWebhookEvents";
import { unleash } from "./util/unleash/UnleashHelper";
import { startAntiBotCleanupTimer } from "./util/anti-bot/antiBotCleanupTimer";
import { flagPotentialAutoClickers } from "./util/anti-bot/flaggingHelper";
import { DynamicButtonsCommandType } from "./util/types/command/DynamicButtonsCommandType";
import { runMigrations } from "./migrations";
import { safeReply } from "./util/discord/MessageExtenstions";

const VERSION = "2.0";

unleash.on("ready", console.log.bind(console, "Unleash ready"));

declare module "interactions.ts" {
  interface BaseInteractionContext {
    game: HydratedDocument<IGuild> | null;
    timeouts: Map<string, NodeJS.Timeout>;
  }
}

const timeouts = new Map();
const keys = ["CLIENT_ID", "TOKEN", "PUBLIC_KEY", "PORT"];

if (keys.some((key) => !(key in process.env))) {
  console.error(`Missing Environment Variables`);
  process.exit(1);
}

(async () => {
  const redisClient = createClient({
    url: "redis://redis"
  });

  await redisClient.connect();

  const app = new DiscordApplication({
    clientId: process.env.CLIENT_ID as string,
    token: process.env.TOKEN as string,
    publicKey: process.env.PUBLIC_KEY as string,

    cache: {
      get: (key: string) => redisClient.get(key),
      set: (key: string, ttl: number, value: string) => redisClient.setEx(key, ttl, value)
    },

    hooks: {
      interaction: async (ctx: InteractionContext) => {
        if (ctx instanceof PingContext) return;
        if (!ctx.interaction.guild_id) return;

        let game;

        try {
          game = await Guild.findOne({ id: ctx.interaction.guild_id });

          if (game) await game.populate("contributors");
        } catch (err) {
          console.error(err);

          if (ctx instanceof AutocompleteContext) {
            await safeReply(ctx, []);
          } else {
            await safeReply(ctx, SimpleError("There was an error loading your game data"));
          }

          return true;
        }

        ctx.decorate("game", game);
        ctx.decorate("timeouts", timeouts);
        try {
          flagPotentialAutoClickers(ctx as SlashCommandContext);
        } catch (err) {
          console.error(err);
        }
      }
    }
  });

  const commands = [
    new Ping(),
    new Plant(),
    new Tree(),
    new Leaderboard(),
    new Forest(),
    new Profile(),
    new About(),
    new Recycle(),
    new Feedback(),
    new NotificationSettings(),
    new SendCoinsCommand(),
    new RedeemPurchasesCommand(),
    new DailyReward(),
    new Composter(),
    new Shop(),
    new SetTimezone(),
    new ServerInfo(),
    new Wheel(),
    new AdventCalendar(),
    new Rename(),
    new Styles()
  ];

  await app.commands.register(commands, false);

  await app.commands.deleteUnregistered();

  for (const command of commands) {
    if ("registerDynamicButtons" in command) {
      await (command as DynamicButtonsCommandType).registerDynamicButtons(app.components);
    }
  }

  const server = fastify();
  server.register(rawBody);

  server.post("/", async (request, reply) => {
    const signature = request.headers["x-signature-ed25519"];
    const timestamp = request.headers["x-signature-timestamp"];

    if (typeof request.rawBody !== "string" || typeof signature !== "string" || typeof timestamp !== "string") {
      return reply.code(400).send({
        error: "Invalid request"
      });
    }

    try {
      await app.handleInteraction(
        async (response) => {
          reply.code(200).send(response);
        },
        request.rawBody,
        timestamp,
        signature
      );
    } catch (err) {
      if (err instanceof UnauthorizedInteraction) {
        console.error("Unauthorized Interaction");
        return reply.code(401).send();
      }

      if (err instanceof InteractionHandlerTimedOut) {
        console.error("Interaction Handler Timed Out");

        return reply.code(408).send();
      }

      if (
        err instanceof UnknownInteractionType ||
        err instanceof UnknownApplicationCommandType ||
        err instanceof UnknownComponentType
      ) {
        console.error("Unknown Interaction - Library may be out of date.");
        console.dir(err.interaction);

        return reply.code(400).send();
      }

      console.error(err);
      reply.code(500).send({ error: "Internal Server Error" });
    }
  });

  server.post("/webhook-events", async (request, reply) => {
    const signature = request.headers["x-signature-ed25519"];
    const timestamp = request.headers["x-signature-timestamp"];

    if (typeof request.rawBody !== "string" || typeof signature !== "string" || typeof timestamp !== "string") {
      return reply.code(401).send({
        error: "Invalid request"
      });
    }

    const body = JSON.parse(request.rawBody);

    console.log(body, signature, timestamp);

    if (body.type === WebhookEventType.PING) {
      return reply.code(204).send();
    }

    const isVerified = nacl.sign.detached.verify(
      Buffer.from(timestamp + request.rawBody),
      Buffer.from(signature, "hex"),
      Buffer.from(process.env.PUBLIC_KEY as string, "hex")
    );

    if (!isVerified) {
      return reply.code(401).send({
        error: "Invalid request signature"
      });
    }

    if (body.type === WebhookEventType.EVENT) {
      const event = body.event;

      switch (event.type) {
        case "ENTITLEMENT_CREATE":
          await handleEntitlementCreate(event.data);
          break;
        default:
          console.warn(`Unhandled event type: ${event.type}`);
      }

      return reply.code(204).send();
    }

    return reply.code(400).send({
      error: "Unknown event type"
    });
  });

  server.get("/api/stats", async (request, reply) => {
    //api/stats.ts
    try {
      const stats = await fetchStats();
      reply.code(200).send(stats);
      return;
    } catch (err: unknown) {
      console.error(err);
      reply.code(500).send();
      return;
    }
  });

  server.get("/api/health", async (request, reply) => {
    reply.code(200).send({ status: "healthy", version: `V${VERSION}` });
    return;
  });

  connect(process.env.MONGO_URI ?? `mongodb://mongo/trees`)
    .then(async () => {
      const address = "0.0.0.0";
      const port = process.env.PORT as string;

      await runMigrations();

      server.listen({ port: parseInt(port), host: address });
      console.log(`Listening for interactions on http://${address}:${port}.`);
    })
    .catch((err: unknown) => {
      console.error(err);
    });
})();

console.log(`Grow a christmas tree - V${VERSION}`);

startBackupTimer();
startAntiBotCleanupTimer();
