import fs from 'fs';

const data = JSON.parse(fs.readFileSync('floral_results.json', 'utf8'));
const allText = data.threads.flatMap(t => [
  t.keywordMessage,
  ...t.parentChain,
  ...t.replies,
  ...t.contextBefore,
  ...t.contextAfter
]).map(m => m.content).join('\n');

const testNames = [
  'orgasm', 'darker shade of orgasm', 'farhampton', 'the perfection', 'unrosed', 'essence of the sun', 'eos',
  'matcha latte', 'california', 'aphrodite', 'vanilla clouds', 'pistachio milk', 'bonfire vanilla', 'caramel fudge', 'when in paris', 'sansa', 'rouge', 'avalanche', 'senorita',
  'ostara', 'laz pozaz', 'las pozas', 'minouet', 'coco', 'loui', 'chno', 'sotb', 's.o.t.b', 'cascavel', 'solaris', 'maleali', 'troupe', 'omni', 'irani', 'solar',
  'sauvage', 'sauvage elixir', 'miss dior', 'blooming bouquet', 'dior homme', 'fahrenheit',
  'ysl y', 'y edp', 'myself', 'myslf', 'libre', 'black opium', 'tuxedo', 'la nuit',
  'eros', 'eros energy', 'eros flame', 'dylan blue', 'pour homme', 'bright crystal', 'crystal noir',
  'bleu de chanel', 'allure homme', 'coco mademoiselle',
  'explorer', 'explorer ultra blue', 'legend',
  'aventus', 'silver mountain water', 'green irish tweed', 'millesime imperial',
  'hacivat', 'ani', 'hundred silent ways', 'wulong cha',
  'snoi', 'supremacy not only intense', '9am', '9am dive', '9pm', 'turathi blue', 'rare carbon',
  'cdnim', 'club de nuit', 'milestone', 'sillage', 'iconic', 'untold', 'hunter', 'hunter intense',
  'khamrah', 'asad', 'yara', 'fakhar', 'nebras', 'bade\'e al oud', 'oud for glory', 'velvet oud', 'qaed al fursan',
  'br540', 'baccarat rouge', 'grand soir',
  'jazz club', 'by the fireplace', 'lazy sunday morning', 'bubble bath', 'sailing day',
  'english pear', 'wood sage', 'peony & blush',
  'tam dao', 'philosykos', 'fleur de peau', 'eau rose', 'do son',
  'tobacco vanille', 'lost cherry', 'oud wood', 'black orchid', 'ombre leather', 'bitter peach',
  'le male', 'ultra male', 'le beau', 'scandal',
  'invictus', '1 million', 'one million',
  'acqua di gio', 'adg', 'profondo',
  'amber oud', 'l\'aventure', 'laventure',
  'hawas', 'hawas ice', 'hawas black', 'la yuqawam',
  'cool water', 'nautica voyage', 'voyage', 'la vie est belle',
  'good girl', 'bad boy',
  'layton', 'carlisle', 'percival', 'althair', 'delina', 'herod', 'sedley',
  'naxos', 'erba pura', 'renaissance',
  'terre d\'hermes', 'terre d hermes', 'h24',
  'guilty', 'flora gorgeous gardenia', 'bloom',
  'paradoxe', 'l\'homme', 'luna rossa',
  'aqva', 'man in black',
  'choco musk', 'soft',
  'vibrant leather', 'sunrise on the red sand dunes', 'ebony wood',
  'revered oud', 'humbling forest', 'senopati', 'unke naru', 'layr'
];

console.log('Testing specific product names matches in text:');
const matches = [];
for (const name of testNames) {
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const reg = new RegExp('\\b' + esc + '\\b', 'gi');
  const m = allText.match(reg);
  if (m && m.length > 0) {
    matches.push({ name, count: m.length });
  }
}
matches.sort((a,b) => b.count - a.count);
matches.forEach(m => console.log(String(m.count).padStart(4), m.name));
