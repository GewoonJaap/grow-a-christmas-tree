import { Guild } from "../models/Guild";
import { context, trace, Span, SpanStatusCode } from "@opentelemetry/api";

async function fetchStats(): Promise<StatsModel> {
  const tracer = trace.getTracer("default");
  const span = tracer.startSpan("fetchStats");

  try {
    const totalTrees = await Guild.countDocuments();
    const totalContributors = await Guild.aggregate([
      {
        $group: {
          _id: null,
          totalContributors: {
            $sum: {
              $size: "$contributors"
            }
          }
        }
      }
    ]);

    const activeTrees = await Guild.aggregate([
      {
        $group: {
          _id: null,
          activeTrees: {
            $sum: {
              $cond: [
                {
                  $or: [
                    {
                      $gte: [
                        "$lastWateredAt",
                        {
                          $subtract: [new Date(), 1000 * 60 * 60 * 24 * 30]
                        }
                      ]
                    },
                    {
                      $gte: [
                        {
                          $size: "$contributors"
                        },
                        10
                      ]
                    }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const activeUsers = await Guild.aggregate([
      {
        $unwind: "$contributors"
      },
      {
        $group: {
          _id: null,
          activeUsers: {
            $sum: {
              $cond: [
                {
                  $or: [
                    {
                      $gte: [
                        "$contributors.lastWateredAt",
                        {
                          $subtract: [new Date(), 1000 * 60 * 60 * 24 * 30]
                        }
                      ]
                    },
                    {
                      $gte: ["$contributors.count", 10]
                    }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    span.setStatus({ code: SpanStatusCode.OK });

    return {
      totalTrees: totalTrees || 0,
      totalContributors: totalContributors[0]?.totalContributors || 0,
      activeTrees: activeTrees[0]?.activeTrees || 0,
      activeUsers: activeUsers[0]?.activeUsers || 0
    };
  } catch (error) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
    throw error;
  } finally {
    span.end();
  }
}

interface StatsModel {
  totalTrees: number;
  totalContributors: number;
  activeTrees: number;
  activeUsers: number;
}

export { fetchStats, StatsModel };
