![Preview Image](https://github.com/GewoonJaap/grow-a-christmas-tree/assets/33700526/ca709b29-3150-407a-923c-cc7735b6b072)


[![Build and Lint application](https://github.com/GewoonJaap/grow-a-christmas-tree/actions/workflows/build.yml/badge.svg?branch=main)](https://github.com/GewoonJaap/grow-a-christmas-tree/actions/workflows/build.yml)

# [Invite me!](https://discord.com/api/oauth2/authorize?client_id=1050722873569968128&permissions=2147486720&scope=bot%20applications.commands)

Work with your Discord community to grow the biggest tree you can!

The tree cannot be watered by the same person twice, and takes longer to grow as its size increases. Work together to keep it growing regularly and compete to make yours the biggest tree in the forest.

Uses the [interactions.ts](https://github.com/ssMMiles/interactions.ts) framework.

## Daily Coin Reward Feature

### Claiming Daily Rewards

You can claim your daily coin reward using the `/dailyreward` slash command. The reward amount is based on your current streak of consecutive days claiming the reward.

### Streaks

- Your streak increases by 1 each day you claim the reward.
- If you miss a day, your streak will reset to 1.
- There is a grace period of 1 day, allowing you to miss one day without resetting your streak.
- Premium users have an extended grace period of 3 days.

### Reward Calculation

- Base reward: 10 coins per day.
- Streak multiplier: The reward is multiplied by your current streak.
- Maximum streak bonus: The streak multiplier is capped at 30 days, so the maximum reward is 300 coins.
- Premium users receive a base reward of 15 coins per day.

### Leaderboard Recognition

Users with the longest streaks are displayed on a special leaderboard. You can view the leaderboard using the `/leaderboard` command.

### Upsell Messages

- Daily reward notification: When you claim your daily reward, you will see a message highlighting the benefits of premium access, such as increased daily coin rewards and an extended grace period.
- Profile and leaderboard displays: Upsell messages are included in the user's profile and leaderboard displays to encourage users to upgrade to premium.

## Booster Shop Feature

### Accessing the Shop

You can access the booster shop using the `/shop` slash command. The shop interface displays an embed with available boosters, their effects, and costs.

### Available Boosters

- **Turbo Grow 🌱**
  - **Effect:** Doubles the tree growth speed for 1 hour
  - **Cost:** 100 coins
- **Quick Water 💧**
  - **Effect:** Reduces the watering interval by half for 1 hour
  - **Cost:** 80 coins
- **Minigame Mania 🎮**
  - **Effect:** Increases the chance of triggering minigames by 50% for 1 hour
  - **Cost:** 120 coins
- **Coin Doubler 🪙**
  - **Effect:** Doubles the coins earned from minigames and daily rewards for 1 hour
  - **Cost:** 150 coins

### Purchasing Boosters

To purchase a booster, click the corresponding button with the emoji and label in the shop interface. The cost of the booster will be deducted from your coin balance.

### Booster Activation and Expiration

- When a booster is purchased, it is added to the `activeBoosters` array in the `IGuild` object.
- Each booster has a `type`, `startTime`, and `duration` property.
- The booster effects are applied to the game for the duration of the booster.
- When a booster expires, it is removed from the `activeBoosters` array, and its effects are reverted.

## ENV Variables

- IMAGE_GEN_API: Provide a URL to the Christmas Image tree Gen API, you can host it yourself on a Cloudflare Worker: https://github.com/GewoonJaap/christmas-tree-images-gen

## API Endpoints

### `GET /api/stats`

Returns the current stats for the bot.

```json
{"totalTrees":548,"totalContributors":4226,"activeTrees":106,"activeUsers":1498}
```

### `GET /api/health`

Returns the current health of the bot.

```json
{"status":"healthy","version":"V1.1"}
```

### `GET /images/<FileName>`

Returns the image with the given filename from the `images` folder.
