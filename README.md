![Preview Image](https://github.com/GewoonJaap/grow-a-christmas-tree/assets/33700526/ca709b29-3150-407a-923c-cc7735b6b072)


[![Build and Lint application](https://github.com/GewoonJaap/grow-a-christmas-tree/actions/workflows/build.yml/badge.svg?branch=main)](https://github.com/GewoonJaap/grow-a-christmas-tree/actions/workflows/build.yml)

# [Invite me!](https://discord.com/api/oauth2/authorize?client_id=1050722873569968128&permissions=2147486720&scope=bot%20applications.commands)

Work with your Discord community to grow the biggest tree you can!

The tree cannot be watered by the same person twice, and takes longer to grow as its size increases. Work together to keep it growing regularly and compete to make yours the biggest tree in the forest.

Uses the [interactions.ts](https://github.com/ssMMiles/interactions.ts) framework.

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
