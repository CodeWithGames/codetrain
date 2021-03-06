import Router from 'next/router';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import DeleteIcon from '@mui/icons-material/Delete';
import GetAppIcon from '@mui/icons-material/GetApp';
import Button from '@mui/material/Button';
import GameFrame from '../GameFrame';

import { clamp, between } from '../../util/math';
import { spriteSize, mapSize } from '../../data/engine';
import { insertObjectUnits, removeObjectUnits } from '../../util/objectUnits';
import { useEffect, useRef, useState } from 'react';
import { useSnackbar } from 'notistack';
import { shortid } from '../../util/uuid';
import signInWithGoogle from '../../util/signInWithGoogle';
import compileCode from '../../util/compileCode';
import getGameSrc from '../../util/getGameSrc';
import firebase from 'firebase/app';

import styles from '../../styles/components/engine/GameEditor.module.css';

// units
const mapPixels = 512;
const spritePixels = Math.floor(mapPixels / mapSize);
const halfSprite = Math.floor(spritePixels / 2);

const highlightWidth = 4;
const highlightLength = 12;

let canvas, ctx;
let sketching = false;
let holding = false;

let editorDirty = false;
let remixing = false;

const layers = ['back', 'main', 'front'];

export default function GameEditor(props) {
  const {
    containerRef,
    projectId, creator, username,
    colors, currTile, currObject, codes,
    objectNames, tileNames, tiles, objects,
    setupUser
  } = props;
  const pixelPixels = Math.floor(spritePixels / spriteSize);

  const { enqueueSnackbar } = useSnackbar();

  const [playing, setPlaying] = useState(false);
  const [background, setBackground] = useState(props.background);
  const [gameObjects, setGameObjects] = useState(
    insertObjectUnits(props.gameObjects, pixelPixels)
  );

  const [showGrid, setShowGrid] = useState(true);
  const [showTiles, setShowTiles] = useState(true);
  const [showObjects, setShowObjects] = useState(true);
  const [showHighlight, setShowHighlight] = useState(false);

  const [title, setTitle] = useState(props.title);
  const [description, setDescription] = useState(props.description);

  const canvasRef = useRef();
  const didMountRef = useRef(false);

  const projectsRef = firebase.firestore().collection('projects');
  const uid = firebase.auth().currentUser?.uid;

  // whether any gameobject is currently selected
  const isActiveObject = showObjects && showHighlight && !!gameObjects.length;

  // current game data
  const gameData = {
    mapSize, spriteSize, mapPixels, spritePixels, pixelPixels,
    objectNames, tileNames, objects, tiles,
    codes, colors, gameObjects, background
  };

  // called before page unloads
  function beforeUnload(e) {
    // return if editor not dirty
    if (!editorDirty) return;
    // cancel unload
    e.preventDefault();
    e.returnValue = '';
  }

  // saves project to firebase
  async function saveProject() {
    // return if not authed
    if (!uid) return;
    const time = new Date().getTime();
    // construct project object
    const projectObj = {
      username, uid,
      title, description, objectNames, tileNames,
      codes, colors, background,
      gameObjects: removeObjectUnits(gameObjects, pixelPixels),
      tiles: JSON.stringify(tiles),
      objects: JSON.stringify(objects),
      modified: time
    };
    // if own project, existing, and not remixing, save
    if (props.creator && uid === props.creator && projectId && !remixing) {
      await projectsRef.doc(projectId).update(projectObj);
      editorDirty = false;
      enqueueSnackbar('Saved successfully.', { variant: 'success' });
    // if creating or remixing, publish new project
    } else {
      const docRef = await projectsRef.add(
        projectId ?
        { created: time, ...projectObj, remixed: projectId } :
        { created: time, ...projectObj }
      );
      editorDirty = false;
      Router.push(`/projects/${docRef.id}`);
    }
  }

  // draws given sprite at given position
  function drawSprite(sprite, x, y) {
    // for each pixel
    for (let yPix = 0; yPix < spriteSize; yPix++) {
      for (let xPix = 0; xPix < spriteSize; xPix++) {
        // set fill color
        const spriteIndex = yPix * spriteSize + xPix;
        const colorIndex = sprite[spriteIndex];
        if (colorIndex === -1) continue;
        const color = colors[colorIndex];
        ctx.fillStyle = color;
        // get fill position
        let xMap = x + xPix * pixelPixels;
        let yMap = y + yPix * pixelPixels;
        let pWidth = pixelPixels;
        let pHeight = pixelPixels;
        // update pixel if showing grid
        if (showGrid) {
          if (xPix === 0) { xMap += 1; pWidth -= 1; }
          if (yPix === 0) { yMap += 1; pHeight -= 1; }
          if (xPix === spriteSize - 1) pWidth -= 1;
          if (yPix === spriteSize - 1) pHeight -= 1;
        }
        // fill pixel
        ctx.fillRect(xMap, yMap, pWidth, pHeight);
      }
    }
  }

  // draws game canvas
  function draw() {
    // clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, mapPixels, mapPixels);
    // if showing tiles
    if (showTiles) {
      // for each tile
      for (let y = 0; y < mapSize; y++) {
        for (let x = 0; x < mapSize; x++) {
          // get sprite
          const spriteIndex = y * mapSize + x;
          const sprite = tiles[background[spriteIndex]];
          // draw sprite
          drawSprite(sprite, x * spritePixels, y * spritePixels);
        }
      }
    }
    // return if not showing objects
    if (!showObjects) return;
    // for each layer
    for (const layer of layers) {
      // for each object
      for (const object of gameObjects) {
        // skip if incorrect layer
        const freePass = !object.layer && layer === 'main';
        if (object.layer !== layer && !freePass) continue;
        // draw objects
        const { x, y } = object;
        const sprite = objects[object.sprite];
        drawSprite(sprite, x, y);
      }
    }
    // draw object highlight
    if (showHighlight && gameObjects.length) {
      // get selected object
      const selectedObj = gameObjects[gameObjects.length - 1];
      const { x, y } = selectedObj;
      ctx.fillStyle = '#fff';
      // calculate highlight units
      const size = highlightLength;
      const left = x - highlightWidth;
      const right = x + spritePixels + highlightWidth - highlightLength;
      const top = y - highlightWidth;
      const bottom = y + spritePixels + highlightWidth - highlightLength;
      // draw highlight
      ctx.fillRect(left, top, size / 2, size);
      ctx.fillRect(left, top, size, size / 2);
      ctx.fillRect(right, top, size, size / 2);
      ctx.fillRect(right + highlightLength / 2, top, size / 2, size);
      ctx.fillRect(left, bottom, size / 2, size);
      ctx.fillRect(left, bottom + highlightLength / 2, size, size / 2);
      ctx.fillRect(right + highlightLength / 2, bottom, size / 2, size);
      ctx.fillRect(right, bottom + highlightLength / 2, size, size / 2);
    }
  }

  // sketches map with given mouse event data
  function sketchMap(e) {
    // return if not showing sketch target
    if (currTile !== -1 && !showTiles) return;
    if (currObject !== -1 && !showObjects) return;
    // get x and y on canvas
    const currX = e.clientX - canvas.offsetLeft + containerRef.current.scrollLeft;
    const currY = e.clientY - canvas.offsetTop + containerRef.current.scrollTop;
    // get x and y in map units
    const tileX = clamp(Math.floor(currX / spritePixels), 0, mapSize - 1);
    const tileY = clamp(Math.floor(currY / spritePixels), 0, mapSize - 1);
    // get map index
    const mapIndex = tileY * mapSize + tileX;
    // sketch tile
    if (currTile !== -1) {
      // update background
      if (background[mapIndex] === currTile) return;
      const newBackground = background.slice();
      newBackground[mapIndex] = currTile;
      setBackground(newBackground);
    // sketch object
    } else {
      // get click position
      const pixeledX = Math.floor(currX / pixelPixels) * pixelPixels;
      const pixeledY = Math.floor(currY / pixelPixels) * pixelPixels;
      const centerX = clamp(pixeledX, halfSprite, mapPixels - halfSprite);
      const centerY = clamp(pixeledY, halfSprite, mapPixels - halfSprite);
      const newX = centerX - halfSprite;
      const newY = centerY - halfSprite;
      const newGameObjects = gameObjects.slice();
      // if already holding object
      if (holding) {
        // get held object
        const heldIndex = gameObjects.length - 1;
        const { x, y, ...heldObject } = gameObjects[heldIndex];
        // if held object moved
        if (x !== newX || y !== newY) {
          // update held object
          newGameObjects[heldIndex] = { x: newX, y: newY, ...heldObject };
          setGameObjects(newGameObjects);
        }
      // if not holding object
      } else {
        // get clicked objects
        const clicked = gameObjects.filter(obj => (
          between(obj.x, newX - halfSprite, newX + halfSprite) &&
          between(obj.y, newY - halfSprite, newY + halfSprite)
        )).reverse();
        // if object clicked
        if (clicked.length) {
          // get held object
          holding = true;
          const { x, y, ...heldObject } = clicked[0];
          // update held object position
          const heldIndex = newGameObjects.indexOf(clicked[0]);
          newGameObjects.splice(heldIndex, 1);
          newGameObjects.push({ x: newX, y: newY, ...heldObject });
          setGameObjects(newGameObjects);
        // if empty space
        } else {
          // create object
          const object = {
            id: shortid(), x: newX, y: newY, sprite: currObject, layer: 'main'
          };
          newGameObjects.push(object);
          // start holding and update objects
          holding = true;
          setGameObjects(newGameObjects);
        }
      }
    }
  }

  // updates current object id with given value
  function updateObjectId(value) {
    // get held object
    const { id, ...heldObject } = gameObjects[gameObjects.length - 1];
    const newGameObjects = gameObjects.slice();
    // splice new object
    newGameObjects.pop();
    newGameObjects.push({ id: value, ...heldObject });
    setGameObjects(newGameObjects);
  }

  // updates current object layer with given value
  function updateObjectLayer(value) {
    // get held object
    const { layer, ...heldObject } = gameObjects[gameObjects.length - 1];
    const newGameObjects = gameObjects.slice();
    // splice new object
    newGameObjects.pop();
    newGameObjects.push({ layer: value, ...heldObject });
    setGameObjects(newGameObjects);
  }

  // returns position of current held object
  function getHeldPosition(unit) {
    // return if no objects
    if (!gameObjects.length) return undefined;
    const { x, y } = gameObjects[gameObjects.length - 1];
    // return pixels
    if (unit === 'pixels') {
      const pixelX = Math.floor(x / pixelPixels).toString().padStart(2, '0');
      const pixelY = Math.floor(y / pixelPixels).toString().padStart(2, '0');
      return `(${pixelX}, ${pixelY})`;
    }
    // return tiles
    if (unit === 'tiles') {
      const tileX = Math.floor(x / spritePixels).toString();
      const tileY = Math.floor(y / spritePixels).toString();
      return `(${tileX}, ${tileY})`;
    }
  }

  // deletes last selected object
  function deleteObject() {
    // return if no objects
    if (!gameObjects.length) return;
    // return if not confirmed
    if (!window.confirm('Delete object?')) return;
    // pop last object
    const newGameObjects = gameObjects.slice();
    newGameObjects.pop();
    setGameObjects(newGameObjects);
  }

  // compiles code and returns whether successful
  function compile() {
    // for each code snippet
    for (let i = 0; i < codes.length; i++) {
      // try compiling code
      const header = objectNames[i];
      const error = compileCode(codes[i]);
      // if error
      if (error) {
        // enqueue snackbar and return false
        enqueueSnackbar(`[${header}] ${error}`, { variant: 'error' });
        return false;
      }
    }
    // if no fails, return true
    return true;
  }

  // toggles game playing
  function togglePlay() {
    // if playing, stop playing
    if (playing) setPlaying(false);
    // if not playing, compile and start
    else {
      if (compile()) setPlaying(true);
    }
  }

  // handle keypress
  function handleKey(e) {
    // get key
    const key = e.keyCode;
    // toggle game
    if (key === 32 || key === 13) {
      togglePlay();
      return;
    }
    // return if playing
    if (playing) return;
    // delete object
    if (key === 8) {
      if (isActiveObject) deleteObject();
    // move object
    } else if ([37, 38, 39, 40].includes(key)) {
      // cancel default action
      e.preventDefault();
      // return if no active object
      if (!isActiveObject) return;
      // get held object
      const heldObject = gameObjects[gameObjects.length - 1];
      const newGameObjects = gameObjects.slice();
      newGameObjects.pop();
      // update coordinates
      let x = heldObject.x;
      let y = heldObject.y;
      if (key === 37) x -= pixelPixels;
      else if (key === 38) y -= pixelPixels;
      else if (key === 39) x += pixelPixels;
      else if (key === 40) y += pixelPixels;
      // clamp x and y
      x = clamp(x, 0, mapPixels - spritePixels);
      y = clamp(y, 0, mapPixels - spritePixels);
      // update objects
      newGameObjects.push({
        id: heldObject.id, x, y, sprite: heldObject.sprite
      });
      setGameObjects(newGameObjects);
    }
  }

  // on start
  useEffect(() => {
    // get canvas
    canvas = canvasRef.current;
    ctx = canvas.getContext('2d');
    // initialize unload event listener
    window.addEventListener('beforeunload', beforeUnload);
  }, []);

  // listen for keys
  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  // draw map when any elements change
  useEffect(() => {
    draw();
  }, [
    colors, tiles, objects, background, gameObjects,
    showGrid, showTiles, showObjects, showHighlight
  ]);

  // change object highlight on select change
  useEffect(() => {
    if (showHighlight && currObject === -1) setShowHighlight(false);
    else if (!showHighlight && currObject !== -1) setShowHighlight(true);
  }, [currTile, currObject]);

  // set up changes may not be saved popup
  useEffect(() => {
    if (didMountRef.current) {
      if (!editorDirty) editorDirty = true;
    }
    else didMountRef.current = true;
  }, [
    colors, tiles, objects, background, gameObjects, codes, objectNames,
    title, description
  ]);

  // downloads game as an html file
  function downloadGame() {
    const gameSrc = getGameSrc(gameData);
    const link = document.createElement('a');
    link.download = 'game.html';
    link.href = `data:text/html;charset=utf-8,${encodeURIComponent(gameSrc)}`;
    link.click();
  }

  return (
    <div className={styles.container}>
      <div
        className={styles.databar}
        onKeyDown={e => e.stopPropagation()}
      >
        {
          username === null ?
          <button className="graybutton" onClick={setupUser}>
            User Setup
          </button> :
          username ?
          <form className={styles.saveform} onSubmit={e => {
            e.preventDefault();
            saveProject();
          }}>
            <input
              className="grayinput"
              placeholder="title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
            <input
              className="grayinput"
              placeholder="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
            {
              uid === creator &&
              <button
                className={`${styles.savebutton} graybutton`}
                onClick={() => { remixing = false; }}
              >
                Save
              </button>
            }
            <button
              className="graybutton"
              onClick={() => { remixing = true; }}
            >
              {!creator ? 'Create' : 'Remix'}
            </button>
          </form> :
          <button
            className="graybutton"
            onClick={() => signInWithGoogle(setupUser)}
          >
            Sign in to save
          </button>
        }
      </div>
      {
        playing &&
        <GameFrame {...gameData} />
      }
      <canvas
        style={ playing ? { display: 'none' } : {}}
        ref={canvasRef}
        className={styles.screen}
        onMouseDown={e => {
          sketching = true;
          holding = false;
          sketchMap(e);
        }}
        onMouseMove={e => {
          if (sketching) sketchMap(e);
        }}
        onMouseUp={e => { sketching = false; }}
        onMouseLeave={e => { sketching = false; }}
        width={mapPixels}
        height={mapPixels}
      />
      <div
        className={styles.tools}
        onKeyDown={e => e.stopPropagation()}
      >
        {
          !playing &&
          <>
            <label>
              Grid
              <input
                type="checkbox"
                checked={showGrid}
                onChange={e => setShowGrid(e.target.checked)}
              />
            </label>
            <label>
              Tiles
              <input
                type="checkbox"
                checked={showTiles}
                onChange={e => setShowTiles(e.target.checked)}
              />
            </label>
            <label>
              Objects
              <input
                type="checkbox"
                checked={showObjects}
                onChange={e => setShowObjects(e.target.checked)}
              />
            </label>
          </>
        }
        <span className="flexfill" />
        <Button
          className="circlebutton"
          variant="contained"
          onClick={downloadGame}
        >
          <GetAppIcon />
        </Button>
        <Button
          className="circlebutton"
          variant="contained"
          onClick={togglePlay}
        >
          {playing ? <StopIcon /> : <PlayArrowIcon />}
        </Button>
      </div>
      {
        isActiveObject &&
        <div className={styles.objectbar}>
          <input
            placeholder="object id"
            className="grayinput"
            value={gameObjects[gameObjects.length - 1].id}
            onChange={e => updateObjectId(e.target.value)}
          />
          <p>Tile: <span>{getHeldPosition('tiles')}</span></p>
          <p>Pixel: <span>{getHeldPosition('pixels')}</span></p>
          <label>
            Layer:
            <select
              value={
                gameObjects[gameObjects.length - 1].layer ?? 'main'
              }
              onChange={e => updateObjectLayer(e.target.value)}
            >
              {
                layers.map((layer, i) =>
                  <option
                    value={layer.toLowerCase()}
                    key={i}
                  >
                    {layer}
                  </option>
                )
              }
            </select>
          </label>
          <span className="flexfill" />
          <Button
            className="circlebutton"
            onClick={deleteObject}
            disabled={!gameObjects.length}
            variant="contained"
          >
            <DeleteIcon />
          </Button>
        </div>
      }
    </div>
  );
}
