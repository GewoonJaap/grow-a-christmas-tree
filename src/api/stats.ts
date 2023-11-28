import { Guild } from "../models/Guild";

async function fetchStats(): Promise<StatsModel> {
  const totalTrees = await Guild.aggregate([
    {
      $group: {
        _id: null,
        totalTrees: {
          $sum: "$trees"
        }
      }
    }
  ]);

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

  const activeGuilds = await Guild.aggregate([
    {
      $group: {
        _id: null,
        activeGuilds: {
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
      $group: {
        _id: null,
        activeUsers: {
          $sum: {
            $size: "$contributors"
          }
        }
      }
    }
  ]);

  return {
    totalTrees: totalTrees[0]?.totalTrees || 0,
    totalContributors: totalContributors[0]?.totalContributors || 0,
    activeGuilds: activeGuilds[0]?.activeGuilds || 0,
    activeUsers: activeUsers[0]?.activeUsers || 0
  };
}

//StatsModel

interface StatsModel {
  totalTrees: number;
  totalContributors: number;
  activeGuilds: number;
  activeUsers: number;
}

export { fetchStats, StatsModel };
