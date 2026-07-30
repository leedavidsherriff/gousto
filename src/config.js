// ─────────────────────────────────────────────────────────────────────────────
// BIZ — the only block you touch to reskin this site for another shop.
// Every string, price, colour and media URL the site renders lives here.
// ─────────────────────────────────────────────────────────────────────────────
export const BIZ = {
  name: 'GOUSTO',
  tagline: 'Flame-cut. Stacked heavy. Open when the pubs shut.',
  town: 'Porthcawl',
  address: 'The Esplanade, Porthcawl Sea Front, CF36 3YW',
  phone: '01656 772 441',
  phoneHref: 'tel:+441656772441',

  hours: [
    { days: 'Mon – Thu', time: '4pm – 1am' },
    { days: 'Fri – Sat', time: '4pm – 3am' },
    { days: 'Sunday', time: '4pm – 12am' },
  ],

  // Ticker strip between hero and builder
  ticker: ['OPEN ’TIL 3AM', 'FRESH CUT DAILY', 'FLAME-GRILLED', 'SEA FRONT · PORTHCAWL', 'CASH & CARD'],

  // Hero media. Leave heroVideoUrl empty to use the animated ember fallback.
  // The clip: a kebab exploding into its separate ingredients — the builder
  // below echoes it with its exploded stack.
  heroVideoUrl: 'hero-loop.mp4',
  heroPosterUrl: 'hero-poster.jpg',

  // Builder sound kit (WebAudio). Set to null to ship the site silent.
  audio: {
    slam: 'sfx/slam.mp3',
    whoosh: 'sfx/whoosh.mp3',
  },

  colors: {
    charcoal: '#0C0A09',
    ember: '#FF5A1F',
    amber: '#FFB021',
    cream: '#F5E9D4',
    smoke: '#8A8178',
  },

  // ── The builder ────────────────────────────────────────────────────────────
  // layer:      id of the SVG art this item drops into the stack (null = no layer)
  // pick 'one'  = radio group, 'many' = toggles
  builder: {
    tabs: [
      {
        id: 'kebabs',
        label: 'Kebabs',
        groups: [
          {
            id: 'meat', label: 'The meat', pick: 'one',
            items: [
              { id: 'lamb-doner', name: 'Lamb doner', price: 6.5, layer: 'doner' },
              { id: 'chicken-doner', name: 'Chicken doner', price: 7.0, layer: 'chicken' },
              { id: 'lamb-shish', name: 'Lamb shish', price: 9.0, layer: 'shish' },
              { id: 'mixed-doner', name: 'Mixed doner', price: 8.5, layer: 'mixed' },
            ],
          },
          {
            id: 'bread', label: 'The bread', pick: 'one',
            items: [
              { id: 'flatbread', name: 'Flatbread', price: 0, layer: 'flatbread' },
              { id: 'pitta', name: 'Pitta', price: 0, layer: 'pitta' },
              { id: 'naan', name: 'Fresh naan', price: 1.0, layer: 'naan' },
            ],
          },
          {
            id: 'salad', label: 'The salad', pick: 'many',
            items: [
              { id: 'lettuce', name: 'Crisp lettuce', price: 0.5, layer: 'lettuce' },
              { id: 'tomato', name: 'Tomato', price: 0.5, layer: 'tomato' },
              { id: 'onion', name: 'Onion', price: 0.5, layer: 'onion' },
              { id: 'cabbage', name: 'Red cabbage', price: 0.5, layer: 'cabbage' },
              { id: 'chillies', name: 'Pickled chillies', price: 0.6, layer: 'chillies' },
              { id: 'halloumi', name: 'Grilled halloumi', price: 1.5, layer: 'halloumi' },
            ],
          },
          {
            id: 'sauce', label: 'The sauce — free, have the lot', pick: 'many',
            items: [
              { id: 'garlic', name: 'Garlic', price: 0, layer: 'sauce-garlic' },
              { id: 'chilli', name: 'Chilli', price: 0, layer: 'sauce-chilli' },
              { id: 'mint', name: 'Mint yoghurt', price: 0, layer: 'sauce-mint' },
              { id: 'bbq', name: 'Smoked BBQ', price: 0, layer: 'sauce-bbq' },
            ],
          },
          {
            id: 'extras', label: 'Do it properly', pick: 'many',
            items: [
              { id: 'double-meat', name: 'Double meat', price: 2.5, layer: 'DOUBLE_MEAT' },
              { id: 'meal-deal', name: 'Meal deal — chips & a can', price: 3.0, layer: null },
              { id: 'cheesy-chips', name: 'Cheesy chips', price: 3.5, layer: null },
            ],
          },
        ],
      },
      {
        id: 'burgers',
        label: 'Burgers',
        groups: [
          {
            id: 'patty', label: 'The patty', pick: 'one',
            items: [
              { id: 'smash', name: 'Smashed beef', price: 6.5, layer: 'patty' },
              { id: 'double-smash', name: 'Double smash', price: 8.5, layer: 'patty-double' },
              { id: 'chicken-fillet', name: 'Crispy chicken', price: 7.5, layer: 'fillet' },
              { id: 'halloumi-stack', name: 'Halloumi stack', price: 7.0, layer: 'halloumi-patty' },
            ],
          },
          {
            id: 'bun', label: 'The bun', pick: 'one',
            items: [
              { id: 'brioche', name: 'Toasted brioche', price: 0, layer: 'BUN' },
              { id: 'seeded', name: 'Seeded bun', price: 0, layer: 'BUN_SEEDED' },
            ],
          },
          {
            id: 'toppings', label: 'The build', pick: 'many',
            items: [
              { id: 'cheese', name: 'American cheese', price: 1.0, layer: 'cheese' },
              { id: 'lettuce', name: 'Shredded lettuce', price: 0.5, layer: 'lettuce' },
              { id: 'tomato', name: 'Tomato', price: 0.5, layer: 'tomato' },
              { id: 'onion', name: 'Red onion', price: 0.5, layer: 'onion' },
              { id: 'jalapenos', name: 'Jalapeños', price: 0.7, layer: 'jalapenos' },
              { id: 'bacon', name: 'Smoked bacon', price: 1.5, layer: 'bacon' },
            ],
          },
          {
            id: 'sauce', label: 'The sauce — free, have the lot', pick: 'many',
            items: [
              { id: 'burger-sauce', name: 'House burger sauce', price: 0, layer: 'sauce-burger' },
              { id: 'garlic', name: 'Garlic', price: 0, layer: 'sauce-garlic' },
              { id: 'chilli', name: 'Chilli', price: 0, layer: 'sauce-chilli' },
              { id: 'bbq', name: 'Smoked BBQ', price: 0, layer: 'sauce-bbq' },
            ],
          },
          {
            id: 'extras', label: 'Do it properly', pick: 'many',
            items: [
              { id: 'extra-patty', name: 'Extra patty', price: 2.5, layer: 'DOUBLE_MEAT' },
              { id: 'meal-deal', name: 'Meal deal — chips & a can', price: 3.0, layer: null },
              { id: 'cheesy-chips', name: 'Cheesy chips', price: 3.5, layer: null },
            ],
          },
        ],
      },
    ],
  },
}
