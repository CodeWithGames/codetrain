import { palettes } from '../../data/palettes.js';
import { useState } from 'react';

import styles from '../../styles/components/engine/Colors.module.css';

export default function Colors(props) {
  const { colors, setColors, currColor, setCurrColor } = props;

  const [palette, setPalette] = useState(0);

  // updates current color with given value
  function updateColor(val) {
    const newColors = colors.slice();
    newColors[currColor] = val;
    setColors(newColors);
  }

  return (
    <div className={styles.container}>
      <div className={styles.tilegrid}>
        {
          colors.map((color, i) =>
            <div
              onClick={() => setCurrColor(i)}
              className={
                currColor === i ?
                `${styles.tile} ${styles.selected}` :
                styles.tile
              }
              key={i}
              style={{ background: color }}
            >
            </div>
          )
        }
      </div>
      <input
        type="color"
        value={colors[currColor]}
        className={styles.colorinput}
        onChange={e => updateColor(e.target.value)}
      />
      <select
        value={palette}
        onChange={e => {
          const newPalette = e.target.value;
          setPalette(newPalette);
          setColors(palettes[newPalette].colors);
        }}
      >
      {
        palettes.map((pal, i) =>
          <option value={i} key={i}>{pal.name}</option>
        )
      }
      </select>
    </div>
  );
}
