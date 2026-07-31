// Ingredient film registry. Keys match the layer/art ids used in the builder.
// Each entry: { src, still } — still is the clip's final frame (build-board tile).
// Entries appear here as clips are ingested; anything missing falls back to the
// SVG slam, so the site works at any level of coverage.
//
// FINALES: the "WRAP IT" payoff. Kebabs reuse the hero loop's second half —
// the explosion in reverse IS the kebab assembling. startAt skips to that half.
export const CLIPS = {
  doner: { src: 'clips/doner.mp4', still: 'clips/doner.jpg' },
  'sauce-garlic': { src: 'clips/sauce-garlic.mp4', still: 'clips/sauce-garlic.jpg' },
  lettuce: { src: 'clips/lettuce.mp4', still: 'clips/lettuce.jpg' },
  flatbread: { src: 'clips/flatbread.mp4', still: 'clips/flatbread.jpg' },
  tomato: { src: 'clips/tomato.mp4', still: 'clips/tomato.jpg' },
  'sauce-chilli': { src: 'clips/sauce-chilli.mp4', still: 'clips/sauce-chilli.jpg' },
}

export const FINALES = {
  kebabs: { src: 'hero-loop.mp4', startAt: 8.05 },
  burgers: null, // clips/burger-finale.mp4 once generated
}

// The empty-grill set plate — resting poster for the film panel.
export const SET_PLATE = 'clips/_set.jpg'

// Map a config layer id to its clip key (buns and double-meat are indirect).
export function clipKeyFor(layerId, baseMeatArt) {
  if (layerId === 'BUN') return 'bun'
  if (layerId === 'BUN_SEEDED') return 'bun-seeded'
  if (layerId === 'DOUBLE_MEAT') return baseMeatArt || null
  return layerId
}
