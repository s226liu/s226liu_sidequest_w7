## Project Title
GBDA 302 Sidequest 7: Kingsman upgrade

---
## Student
- Name: `Suyao Liu`
- WatID: `s226liu`
- Student Number: `21069335`

---
## Project Overview
Kingsman is a 2D side-scrolling platformer built with `p5.js`, `p5play`, and `p5.sound`. The player controls a king character who moves through two levels, rescues diamonds, avoids fire hazards, and defeats boar enemies.

The project includes:
- Two playable levels with a level-select screen
- Parallax background layers
- Enemy patrol and hazard logic
- HUD for rescued diamonds and health
- Sound effects and looping background music
- A small in-game debug menu for development and testing

---
## How To Run
1. Open `index.html` in a browser.
2. On the level-select screen, press `1` for Level 1 or `2` for Level 2.
3. Play using the controls listed below.

---
## Controls
- `A` or `Left Arrow`: Move left
- `D` or `Right Arrow`: Move right
- `W` or `Up Arrow`: Jump
- `Space`: Attack
- `R`: Restart after winning or dying

### Debug Controls
- `` ` ``: Toggle debug panel
- `G`: Toggle moon gravity on/off
- `I`: Toggle invincibility on/off
- `P`: Show or hide collision probes/sensors

---
## Gameplay Features
- The player can run, jump, attack, take damage, and die.
- Boar enemies patrol platforms, turn around at edges, react to hazards, and can be defeated.
- Fire hazards damage the player and destroy boars.
- Diamonds increase the rescued count and are required to complete each level.
- A HUD shows rescued diamonds, current level, and remaining health.
- The game includes win, death, and restart states.

---
## Technical Notes
- The game uses manual physics stepping for more stable pixel-art rendering.
- Level data is normalized so each tilemap row has a consistent width. This prevents collision and camera errors, especially in Level 2.
- An invisible ceiling prevents the player or enemies from leaving the top of the playable screen area.
- The debug menu was added to help test gravity, damage behavior, and collision probes during development.

---
## Assets
- `assets/kinghuman_sprites.png`: player sprite sheet
- `assets/boar_sprites.png`: enemy sprite sheet
- `assets/diamond.png`: collectible sprite sheet
- `assets/fireSpriteSheet.png`: hazard animation sprite sheet
- `assets/bg-1.png`
- `assets/bg-2.png`
- `assets/bg-3.png`
- `assets/groundTile.png`
- `assets/groundTileDeep.png`
- `assets/platformLC.png`
- `assets/platformRC.png`
- `assets/wallL.png`
- `assets/wallR.png`
- `assets/bitmapFont.png`
- `assets/jump sound.mp3`
- `assets/attacking.mp3`
- `assets/hurt.mp3`
- `assets/coin.mp3`
- `assets/gameover.mp3`
- `assets/bgmusic2.mp3`

---
## Libraries
- `p5.js`
- `p5play`
- `planck.js`
- `p5.sound`

---
## References
- https://pixelfrog-assets.itch.io/kings-and-pigs
- https://pixabay.com/sound-effects/search/retro%20game%20music%20end/
