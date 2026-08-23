import fs from 'fs';

const d = JSON.parse(fs.readFileSync('floral_results.json', 'utf8'));
const allContent = d.threads.flatMap(t => [
  t.keywordMessage,
  ...t.parentChain,
  ...t.replies,
  ...t.contextBefore,
  ...t.contextAfter,
]);
const text = allContent.map(m => m.content).join(' ').toLowerCase();

// Known perfume brands/products from Indonesian perfume community
const brands = [
  'miss dior', 'dior sauvage', 'sauvage', 'dior', 'ysl y', 'ysl',
  'versace eros', 'eros', 'versace', 'creed aventus', 'aventus', 'creed',
  'bleu de chanel', 'blue de chanel', 'chanel', 'montblanc explorer', 'explorer', 'montblanc',
  'mykonos', 'matcha latte', 'saff', 'hmns', 'luzi', 'lattafa',
  'guess', 'bvlgari', 'tom ford', 'acqua di gio', 'armani',
  'prada', 'gucci', 'burberry', 'calvin klein', 'lacoste',
  'nautica', 'davidoff', 'rasasi', 'al rehab', 'ajmal', 'swiss arabian',
  'jean paul gaultier', 'jpg', 'hugo boss', 'narciso rodriguez', 'narciso',
  'issey miyake', 'kenzo', 'hermes', 'givenchy', 'jimmy choo',
  'ralph lauren', 'polo', 'maison margiela', 'replica',
  'jo malone', 'byredo', 'diptyque', 'nishane', 'xerjoff',
  'mancera', 'montale', 'initio', 'parfums de marly', 'pdm',
  'amouage', 'le labo', 'club de nuit', 'cdnim', 'cdni',
  'al haramain', 'amber oud', 'afnan', 'armaf',
  'asad', 'raghba', 'yara', 'oud mood',
  'bonjour', 'quantum', 'regatta', 'bellagio', 'casablanca',
  'implora', 'miniso', 'zara', 'bath and body works', 'bbw',
  'brasov', 'bravas', 'axe', 'hachivat', 'nishane hacivat', 'hacivat',
  'baccarat rouge', 'br540', 'mfk', 'maison francis kurkdjian',
  'terre d hermes', 'dolce gabbana', 'light blue', 'the one',
  'fahrenheit', 'cool water', 'dunhill', 'bentley', 'jaguar',
  'perry ellis', 'carolina herrera', 'good girl', 'la vie est belle',
  'lancome', 'chloe', 'marc jacobs', 'daisy', 'euphoria',
  'guerlain', 'shalimar', 'angel', 'mugler', 'thierry mugler',
  'azzaro', 'wanted', 'invictus', 'paco rabanne', 'one million',
  'coach', 'kenneth cole', 'vera wang', 'elizabeth arden',
  'bath body works', 'victoria secret', 'vs', 'body shop',
  'oriflame', 'wardah', 'zwitsal', 'molto',
  'bibit parfum', 'refill', 'decant',
  'fwb', '9am', 'laz pozaz', 'bsp', 'blue point',
  'snoi', 'bonjour quantum',
];

const found = new Map();

brands.forEach(b => {
  try {
    const escaped = b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp('\\b' + escaped + '\\b', 'gi');
    const matches = text.match(regex);
    if (matches) found.set(b, matches.length);
  } catch (e) {
    // skip invalid regex
  }
});

const sorted = [...found.entries()].sort((a, b) => b[1] - a[1]);
console.log('=== Perfume brand/product mentions ===\n');
sorted.forEach(([b, c]) => console.log(`${String(c).padStart(4)}  ${b}`));
console.log(`\nTotal unique brands found: ${sorted.length}`);
