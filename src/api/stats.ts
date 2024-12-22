import { trace, SpanStatusCode } from "@opentelemetry/api";
import { Guild } from "../models/Guild";

async function fetchStats(): Promise<StatsModel> {
  const tracer = trace.getTracer("grow-a-tree");
  return tracer.startActiveSpan("fetchStats", async (span) => {
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

      //an active guild is a guild where the lastWateredAt is less than 1 month ago, or the guild has more than 10 contributors. Note there is no activeGuild field

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

      //where the contributor watered in the last month, or the contributor has more than 10 contributions. Note there is no activeUser field

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
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

//StatsModel

interface StatsModel {
  totalTrees: number;
  totalContributors: number;
  activeTrees: number;
  activeUsers: number;
}

export { fetchStats, StatsModel };
