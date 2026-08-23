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
  'gucci bloom', 'bloom', 'flora gorgeous', 'gorgeous gardenia', 'gorgeous jasmine', 'gorgeous magnolia',
  'l\'interdit', 'linterdit', 'givenchy', 'chance eau tendre', 'chance', 'coco mademoiselle', 'gabrielle',
  'idole', 'miracle', 'flowerbomb', 'paradoxe', 'chloe', 'daisy', 'for her', 'pure musc',
  'narciso', 'do son', 'eau rose', 'peony & blush', 'peony and blush', 'delilah',
  'fakhar rose', 'yara moi', 'yara tous', 'souvenir floral bouquet', 'club de nuit woman', 'imperiale',
  'shaghaf oud', 'casablanca', 'theoreme', 'rue broca', 'pendora', 'paris corner', 'maison alhambra',
  'delina exclusif', 'delina la rosee', 'oriana', 'orientica'
];

console.log('Testing mentions for famous florals & middle eastern perfumes:');
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
