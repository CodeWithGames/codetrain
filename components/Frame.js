import GetAppIcon from '@material-ui/icons/GetApp';
import Button from '@material-ui/core/Button';

import styles from '../styles/Frame.module.css';

export default function Frame(props) {
  const {
    mapPixels, spriteSize, spritePixels, pixelPixels,
    mapSize, codes, colors, sprites, background, objects
  } = props;

  // returns function definition for given code
  function getCodeFunction(code, spriteIndex) {
    return (
`(function() {
  ${code}
  return {
    start: typeof start === 'function' ? start : () => {},
    update: typeof update === 'function' ? update : () => {}
  };
})()`);
  }

  const gameSrc =
`<html>
  <body onload="gameStart()">
    <canvas
      id="canvas-game"
      width=${mapPixels}
      height=${mapPixels}
    />
  </body>
  <style>
    body {
      margin: 0;
      overflow: hidden;
      background: #fff;
    }
  </style>
  <script>
    // variable declarations
    let canvas, ctx;
    const spriteSize = ${spriteSize};
    const mapSize = ${mapSize};
    const spritePixels = ${spritePixels};
    const pixelPixels = ${pixelPixels};
    const colors = ${JSON.stringify(colors)};
    const sprites = ${JSON.stringify(sprites)};
    const background = ${JSON.stringify(background)};
    const objects = ${JSON.stringify(objects)};
    function move(mapIndex, dir) {
      const spriteIndex = objects[mapIndex];
      if (spriteIndex === -1) return;
      if (dir === 'up') {
        if (mapIndex < mapSize) return;
        const newIndex = mapIndex - mapSize;
        if (objects[newIndex] !== -1) return;
        objects[newIndex] = spriteIndex;
        objects[mapIndex] = -1;
      }
      else if (dir === 'down') {
        if (mapIndex >= mapSize * mapSize - mapSize) return;
        const newIndex = mapIndex + mapSize;
        if (objects[newIndex] !== -1) return;
        objects[newIndex] = spriteIndex;
        objects[mapIndex] = -1;
      }
      else if (dir === 'right') {
        if (mapIndex % mapSize === mapSize - 1) return;
        const newIndex = mapIndex + 1;
        if (objects[newIndex] !== -1) return;
        objects[newIndex] = spriteIndex;
        objects[mapIndex] = -1;
      }
      else if (dir === 'left') {
        if (mapIndex % mapSize === 0) return;
        const newIndex = mapIndex - 1;
        if (objects[newIndex] !== -1) return;
        objects[newIndex] = spriteIndex;
        objects[mapIndex] = -1;
      }
    }
    // sprite codes
    const spriteCodes = [
      ${codes.map((code, i) => getCodeFunction(code, i)).join(',\n')}
    ];
    // canvas functions
    function drawSprite(sprite, x, y) {
      // for each pixel
      for (let yp = 0; yp < spriteSize; yp++) {
        for (let xp = 0; xp < spriteSize; xp++) {
          // set fill color
          const colorIndex = yp * spriteSize + xp;
          const color = colors[sprite[colorIndex]];
          ctx.fillStyle = color;
          // get fill position
          let xm = x * spritePixels + xp * pixelPixels;
          let ym = y * spritePixels + yp * pixelPixels;
          // fill pixel
          ctx.fillRect(xm, ym, pixelPixels, pixelPixels);
        }
      }
    }
    function draw() {
      // for each tile
      for (let y = 0; y < mapSize; y++) {
        for (let x = 0; x < mapSize; x++) {
          // get sprite
          const spriteIndex = y * mapSize + x;
          const sprite = objects[spriteIndex] === -1 ?
          sprites[background[spriteIndex]] : sprites[objects[spriteIndex]];
          // draw sprite
          drawSprite(sprite, x, y);
        }
      }
    }
    // game loop
    function gameLoop(time) {
      // run update functions
      background.forEach((sprite, mapIndex) => {
        spriteCodes[sprite].update(mapIndex);
      });
      objects.forEach((sprite, mapIndex) => {
        if (sprite !== -1) spriteCodes[sprite].update(mapIndex);
      });
      // draw
      draw();
      // continue loop
      requestAnimationFrame(gameLoop);
    }
    // runs after body has loaded
    function gameStart() {
      // get canvas and context
      canvas = document.getElementById('canvas-game');
      ctx = canvas.getContext('2d');
      // run start functions
      background.forEach((sprite, mapIndex) => {
        spriteCodes[sprite].start(mapIndex);
      });
      objects.forEach((sprite, mapIndex) => {
        if (sprite !== -1) spriteCodes[sprite].start(mapIndex)
      });
      // start game loop
      requestAnimationFrame(gameLoop);
    }
  </script>
</html>
`;

  // downloads game as an html file
  function downloadGame() {
    const link = document.createElement('a');
    link.download = 'game.html';
    link.href = `data:text/html;charset=utf-8,${encodeURIComponent(gameSrc)}`;
    link.click();
  }

  return (
    <>
      <Button
        variant="contained"
        onClick={downloadGame}
      >
        <GetAppIcon />
      </Button>
      <iframe
        title="game"
        sandbox="allow-scripts"
        srcDoc={gameSrc}
        width={mapPixels}
        height={mapPixels}
        frameBorder="0"
      />
    </>
  );
}
