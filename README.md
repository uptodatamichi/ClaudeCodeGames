# ClaudeCodeGames
vibe coded games to demonstrate usage of claude code harness

## PROMPT

>I want to create a small game, and it should be run inside a web app.
>What the game is about:
>the game is 2D and scrolls vertically up all the time. The player sees a creature in the center of the screen, or more at the lower bottom. Use player_sprite.png for the player character. The player jumps on platforms and cannot run on the platform. As soon as the player's sprite touches the platform, he immediately jumps up two thirds of the screen size. The goal is then for the player to reach the next platform (use platform.png for that). He can move the character only left and right by pressing the left and right buttons, but has no other control mechanisms of control. If the player misses the platform, he falls down until he either reaches a platform or falls down further than the starting point. There are also round spiky obstacles randomly arranged on the way (use obstacle.png for that). Touching one of these obstacles during the game will eliminate the player, and a game over screen is shown with the highest point in fictional meters that the player has reached so far. The background should be a nice sky blue with occasional clouds walking by. The only direction the player can take is further up, and when falling down, the camera scrolls with him down until the starting point. If he falls further than that or on an obstacle, the game is over.
>
>Begin by creating a folder called 'DoodleJumper' . 
>In there use bun to setup a small SPA using https://www.npmjs.com/package/@temir.ra/create-hono-spa.
>Follow the steps in the quickstart guide get everything up and running.
```