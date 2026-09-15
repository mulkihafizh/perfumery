import fs from 'fs';

// ─── Configuration ──────────────────────────────────────────────────
const inputFile = process.argv[2] || 'floral_results.json';
const outputFile = process.argv[3] || 'app/public/data/leaderboard.json';

console.log(`\n🧪 Building granular perfume product leaderboard from: ${inputFile}`);

// Standardized Scent Note Families:
// 'floral', 'fresh', 'woody', 'sweet', 'fruity', 'powdery', 'aromatic', 'spicy', 'oriental', 'leather', 'aquatic'

export const PERFUME_PRODUCTS = [
  // ──────────────────────────────────────────────────────────────────
  // 🇮🇩 INDONESIA (LOCAL BRANDS)
  // ──────────────────────────────────────────────────────────────────
  // ── HMNS ──
  {
    name: 'HMNS Orgasm',
    brand: 'HMNS',
    region: 'Indonesia',
    countryCode: 'ID',
    category: 'Local Brand',
    gender: 'Women / Unisex',
    notes: ['floral', 'sweet', 'fruity', 'powdery'],
    description: 'Rich floral and sweet notes with apple, red rose, jasmine, and vanilla beans.',
    aliases: ['hmns orgasm', 'orgasm hmns', 'darker shade of orgasm', 'darker shade of o', 'dsoo', 'orgasm'],
  },
  {
    name: 'HMNS Farhampton',
    brand: 'HMNS',
    region: 'Indonesia',
    countryCode: 'ID',
    category: 'Local Brand',
    gender: 'Men / Unisex',
    notes: ['aromatic', 'spicy', 'woody', 'fresh'],
    description: 'Sophisticated bergamot, orange blossom, and cedarwood blend.',
    aliases: ['hmns farhampton', 'farhampton'],
  },
  {
    name: 'HMNS Essence of the Sun (EOS)',
    brand: 'HMNS',
    region: 'Indonesia',
    countryCode: 'ID',
    category: 'Local Brand',
    gender: 'Unisex',
    notes: ['floral', 'sweet', 'fresh'],
    description: 'Warm solar floral fragrance with bergamot, coriander, tiare blossom, and vanilla.',
    aliases: ['essence of the sun', 'hmns eos', 'hmns essence of the sun', 'eos hmns'],
  },
  {
    name: 'HMNS The Perfection',
    brand: 'HMNS',
    region: 'Indonesia',
    countryCode: 'ID',
    category: 'Local Brand',
    gender: 'Men / Unisex',
    notes: ['spicy', 'woody', 'leather', 'fresh'],
    description: 'Signature collab with Christian Sugiono featuring spicy and woody notes.',
    aliases: ['hmns the perfection', 'the perfection'],
  },
  {
    name: 'HMNS Unrosed',
    brand: 'HMNS',
    region: 'Indonesia',
    countryCode: 'ID',
    category: 'Local Brand',
    gender: 'Unisex',
    notes: ['floral', 'woody', 'aromatic'],
    description: 'Deconstructed rose scent highlighting green palmarosa and earthy cedar.',
    aliases: ['hmns unrosed', 'unrosed'],
  },
  {
    name: 'HMNS Untitled Humans',
    brand: 'HMNS',
    region: 'Indonesia',
    countryCode: 'ID',
    category: 'Local Brand',
    gender: 'Unisex',
    notes: ['powdery', 'woody', 'fresh'],
    description: 'Clean, soothing skin scent crafted with sandalwood and musk.',
    aliases: ['hmns untitled humans', 'untitled humans'],
  },

  // ── Mykonos ──
  {
    name: 'Mykonos Matcha Latte',
    brand: 'Mykonos',
    region: 'Indonesia',
    countryCode: 'ID',
    category: 'Local Brand',
    gender: 'Unisex',
    notes: ['sweet', 'aromatic', 'floral', 'fresh'],
    description: 'Soothing milky green tea with subtle citrus top and white floral heart.',
    aliases: ['mykonos matcha latte', 'matcha latte'],
  },
  {
    name: 'Mykonos California',
    brand: 'Mykonos',
    region: 'Indonesia',
    countryCode: 'ID',
    category: 'Local Brand',
    gender: 'Unisex',
    notes: ['fresh', 'fruity', 'sweet'],
    description: 'Vibrant blend of mandarin, sweet tropical fruits, and soft musky drydown.',
    aliases: ['mykonos california', 'mykonos califonia', 'california mykonos'],
  },
  {
    name: 'Mykonos Aphrodite',
    brand: 'Mykonos',
    region: 'Indonesia',
    countryCode: 'ID',
    category: 'Local Brand',
    gender: 'Women',
    notes: ['sweet', 'floral', 'spicy', 'oriental'],
    description: 'Warm cinnamon, jasmine, and vanilla creating a seductive sweet scent.',
    aliases: ['mykonos aphrodite', 'aphrodite mykonos', 'aphrodite'],
  },
  {
    name: 'Mykonos Vanilla Clouds',
    brand: 'Mykonos',
    region: 'Indonesia',
    countryCode: 'ID',
    category: 'Local Brand',
    gender: 'Women / Unisex',
    notes: ['sweet', 'powdery', 'floral'],
    description: 'Fluffy marshmallow, sweet vanilla, white florals, and caramel dessert notes.',
    aliases: ['mykonos vanilla clouds', 'vanilla clouds'],
  },
  {
    name: 'Mykonos Pistachio Milk',
    brand: 'Mykonos',
    region: 'Indonesia',
    countryCode: 'ID',
    category: 'Local Brand',
    gender: 'Unisex',
    notes: ['sweet', 'powdery'],
    description: 'Creamy roasted pistachio and sweet condensed milk notes.',
    aliases: ['mykonos pistachio milk', 'pistachio milk'],
  },
  {
    name: 'Mykonos Bonfire Vanilla',
    brand: 'Mykonos',
    region: 'Indonesia',
    countryCode: 'ID',
    category: 'Local Brand',
    gender: 'Unisex',
    notes: ['sweet', 'woody', 'spicy', 'oriental'],
    description: 'Smoky campfire warmth balanced by rich sweet vanilla and woods.',
    aliases: ['mykonos bonfire vanilla', 'bonfire vanilla'],
  },
  {
    name: 'Mykonos Caramel Fudge Cookie',
    brand: 'Mykonos',
    region: 'Indonesia',
    countryCode: 'ID',
    category: 'Local Brand',
    gender: 'Women',
    notes: ['sweet', 'powdery'],
    description: 'Ultra-decadent freshly baked cookies drenched in warm caramel fudge.',
    aliases: ['mykonos caramel fudge cookie', 'caramel fudge cookie', 'caramel fudge'],
  },
  {
    name: 'Mykonos When in Paris',
    brand: 'Mykonos',
    region: 'Indonesia',
    countryCode: 'ID',
    category: 'Local Brand',
    gender: 'Women',
    notes: ['floral', 'fruity', 'sweet', 'fresh'],
    description: 'Sparkling romantic blend of lychee, rose, and amber.',
    aliases: ['mykonos when in paris', 'when in paris'],
  },
  {
    name: 'Mykonos Sansa',
    brand: 'Mykonos',
    region: 'Indonesia',
    countryCode: 'ID',
    category: 'Local Brand',
    gender: 'Women',
    notes: ['floral', 'fruity', 'sweet'],
    description: 'Regal floral scent featuring peony, peach, and soft musk.',
    aliases: ['mykonos sansa', 'sansa mykonos'],
  },

  // ── Saff & Co ──
  {
    name: 'Saff & Co Ostara',
    brand: 'Saff & Co',
    region: 'Indonesia',
    countryCode: 'ID',
    category: 'Local Brand',
    gender: 'Women / Unisex',
    notes: ['floral', 'sweet', 'fruity', 'powdery'],
    description: 'Bright springtime floral with raspberry, passionfruit, and sweet white jasmine.',
    aliases: ['saff & co ostara', 'saff and co ostara', 'saff n co ostara', 'ostara'],
  },
  {
    name: 'Saff & Co Las Pozas',
    brand: 'Saff & Co',
    region: 'Indonesia',
    countryCode: 'ID',
    category: 'Local Brand',
    gender: 'Unisex',
    notes: ['fresh', 'woody', 'floral', 'aromatic'],
    description: 'Lush tropical forest aroma with mineral waters and green foliage.',
    aliases: ['saff & co las pozas', 'saff n co laz pozas', 'laz pozas', 'laz pozaz', 'las pozas'],
  },
  {
    name: 'Saff & Co S.O.T.B',
    brand: 'Saff & Co',
    region: 'Indonesia',
    countryCode: 'ID',
    category: 'Local Brand',
    gender: 'Unisex',
    notes: ['sweet', 'fruity', 'floral', 'fresh'],
    description: 'Sun On The Beach vibe with mandarin, sweet floral bouquet, and creamy vanilla.',
    aliases: ['saff & co sotb', 'saff & co s.o.t.b', 'sotb', 's.o.t.b'],
  },
  {
    name: 'Saff & Co LOUI',
    brand: 'Saff & Co',
    region: 'Indonesia',
    countryCode: 'ID',
    category: 'Local Brand',
    gender: 'Unisex',
    notes: ['fresh', 'floral', 'clean'],
    description: 'Refreshing tropical clean citrus and delicate floral bouquet.',
    aliases: ['saff & co loui', 'saff n co loui', 'loui'],
  },
  {
    name: 'Saff & Co CHNO',
    brand: 'Saff & Co',
    region: 'Indonesia',
    countryCode: 'ID',
    category: 'Local Brand',
    gender: 'Unisex',
    notes: ['sweet', 'spicy', 'oriental'],
    description: 'Addictive coffee, pink pepper, and sweet vanilla gourmand profile.',
    aliases: ['saff & co chno', 'saff n co chno', 'chno'],
  },
  {
    name: 'Saff & Co Minouet',
    brand: 'Saff & Co',
    region: 'Indonesia',
    countryCode: 'ID',
    category: 'Local Brand',
    gender: 'Women',
    notes: ['floral', 'powdery', 'sweet'],
    description: 'Charming blend of iris, soft rose petals, and comforting white musks.',
    aliases: ['saff & co minouet', 'saff n co minouet', 'minouet'],
  },
  {
    name: 'Saff & Co Cascavel',
    brand: 'Saff & Co',
    region: 'Indonesia',
    countryCode: 'ID',
    category: 'Local Brand',
    gender: 'Men / Unisex',
    notes: ['woody', 'spicy', 'oriental'],
    description: 'Intense saffron, smoky woods, and amber undertones.',
    aliases: ['saff & co cascavel', 'saff n co cascavel', 'cascavel'],
  },
  {
    name: 'Saff & Co Solaris',
    brand: 'Saff & Co',
    region: 'Indonesia',
    countryCode: 'ID',
    category: 'Local Brand',
    gender: 'Unisex',
    notes: ['floral', 'fresh', 'oriental'],
    description: 'Luminous sun-kissed citrus, white floral blossoms, and warm golden amber.',
    aliases: ['saff & co solaris', 'saff n co solaris', 'solaris'],
  },
  {
    name: 'Saff & Co Coco',
    brand: 'Saff & Co',
    region: 'Indonesia',
    countryCode: 'ID',
    category: 'Local Brand',
    gender: 'Women / Unisex',
    notes: ['sweet', 'fruity', 'powdery'],
    description: 'Delicious creamy coconut combined with delicate floral sweetness.',
    aliases: ['saff & co coco', 'saffnco yg coco', 'saff n co coco'],
  },

  // ── Other Indonesian Brands ──
  {
    name: 'BSP Blue Point',
    brand: 'Bless Scent Perfume',
    region: 'Indonesia',
    countryCode: 'ID',
    category: 'Local Brand',
    gender: 'Men',
    notes: ['fresh', 'aquatic', 'spicy', 'woody'],
    description: 'Popular Indonesian blue fragrance with crisp marine citrus projection.',
    aliases: ['bsp blue point', 'blue point'],
  },
  {
    name: 'SNOI Perfumery',
    brand: 'SNOI',
    region: 'Indonesia',
    countryCode: 'ID',
    category: 'Local Brand',
    gender: 'Unisex',
    notes: ['fruity', 'fresh', 'woody'],
    description: 'Indonesian house inspired by versatile fruity pineapple and birch DNA.',
    aliases: ['snoi perfumery', 'snoi perfume'],
  },
  {
    name: 'Bonjour Quantum',
    brand: 'Bonjour',
    region: 'Indonesia',
    countryCode: 'ID',
    category: 'Local Brand',
    gender: 'Men / Unisex',
    notes: ['fresh', 'aquatic', 'woody'],
    description: 'Crisp aquatic daily signature for warm tropical climates.',
    aliases: ['bonjour quantum'],
  },
  {
    name: 'FWB Fragrance',
    brand: 'FWB',
    region: 'Indonesia',
    countryCode: 'ID',
    category: 'Local Brand',
    gender: 'Unisex',
    notes: ['sweet', 'fruity', 'oriental'],
    description: 'Crowd-pleasing sweet daytime fragrance tailored for office and dating.',
    aliases: ['fwb fragrance', 'fwb parfum'],
  },
  {
    name: 'Kahf Revered Oud',
    brand: 'Kahf',
    region: 'Indonesia',
    countryCode: 'ID',
    category: 'Local Brand',
    gender: 'Men',
    notes: ['woody', 'oriental', 'spicy'],
    description: 'Accessible oriental oud softened with amber and spices.',
    aliases: ['kahf revered oud', 'revered oud'],
  },
  {
    name: 'Onix Senopati',
    brand: 'Onix',
    region: 'Indonesia',
    countryCode: 'ID',
    category: 'Local Brand',
    gender: 'Unisex',
    notes: ['floral', 'sweet', 'powdery', 'woody'],
    description: 'Trendy Jakarta lifestyle scent with sweet florals and modern woods.',
    aliases: ['onix senopati', 'senopati'],
  },
  {
    name: 'Layr Second Skin',
    brand: 'Layr',
    region: 'Indonesia',
    countryCode: 'ID',
    category: 'Local Brand',
    gender: 'Unisex',
    notes: ['powdery', 'floral', 'fresh'],
    description: 'Ultra-comforting intimate skin scent with soft musk and white blossoms.',
    aliases: ['layr second skin', 'second skin layr'],
  },

  // ── Alchemist Fragrance ──
  {
    name: 'Alchemist Onirique',
    brand: 'Alchemist Fragrance',
    region: 'Indonesia',
    countryCode: 'ID',
    category: 'Local Brand',
    gender: 'Unisex',
    notes: ['floral', 'fruity', 'fresh', 'woody'],
    description: 'Sophisticated smoky pear, night-blooming white florals, and cedarwood.',
    aliases: ['alchemist onirique', 'onirique', 'alchemist onirik'],
  },
  {
    name: 'Alchemist Jatuh Hati',
    brand: 'Alchemist Fragrance',
    region: 'Indonesia',
    countryCode: 'ID',
    category: 'Local Brand',
    gender: 'Women / Unisex',
    notes: ['floral', 'powdery', 'fresh'],
    description: 'Comforting romantic floral musk with white florals, rose, and amber.',
    aliases: ['alchemist jatuh hati', 'jatuh hati'],
  },
  {
    name: 'Alchemist Pink Laundry',
    brand: 'Alchemist Fragrance',
    region: 'Indonesia',
    countryCode: 'ID',
    category: 'Local Brand',
    gender: 'Unisex',
    notes: ['floral', 'fresh', 'powdery'],
    description: 'Clean linen freshness with rose petals, aldehydes, and soft white musk.',
    aliases: ['alchemist pink laundry', 'pink laundry'],
  },
  {
    name: 'Alchemist Powder Room',
    brand: 'Alchemist Fragrance',
    region: 'Indonesia',
    countryCode: 'ID',
    category: 'Local Brand',
    gender: 'Women / Unisex',
    notes: ['powdery', 'floral', 'fresh'],
    description: 'Vintage powdery iris, soft Turkish rose, and comforting musk.',
    aliases: ['alchemist powder room', 'powder room'],
  },
  {
    name: 'Alchemist Galleria',
    brand: 'Alchemist Fragrance',
    region: 'Indonesia',
    countryCode: 'ID',
    category: 'Local Brand',
    gender: 'Women',
    notes: ['floral', 'fruity', 'sweet'],
    description: 'Extravagant white floral tuberose, honeyed plum, and cedar.',
    aliases: ['alchemist galleria', 'galleria alchemist'],
  },
  {
    name: 'Alchemist Out West',
    brand: 'Alchemist Fragrance',
    region: 'Indonesia',
    countryCode: 'ID',
    category: 'Local Brand',
    gender: 'Unisex',
    notes: ['fresh', 'woody', 'aromatic'],
    description: 'Vibrant yuzu, earthy cedarwood, and vetiver.',
    aliases: ['alchemist out west', 'out west'],
  },

  // ── Scent of Pluto ──
  {
    name: 'Scent of Pluto White Floral Bouquet',
    brand: 'Scent of Pluto',
    region: 'Indonesia',
    countryCode: 'ID',
    category: 'Local Brand',
    gender: 'Women / Unisex',
    notes: ['floral', 'fresh', 'powdery'],
    description: 'Photorealistic Indonesian white floral bouquet with lush jasmine, tuberose, and green dewy leaves.',
    aliases: ['scent of pluto white floral bouquet', 'pluto white floral bouquet', 'white floral bouquet'],
  },
  {
    name: 'Scent of Pluto Lost in the Italian Sea',
    brand: 'Scent of Pluto',
    region: 'Indonesia',
    countryCode: 'ID',
    category: 'Local Brand',
    gender: 'Unisex',
    notes: ['fresh', 'aquatic', 'aromatic'],
    description: 'Mediterranean oceanic breeze with sea salt, citrus, and mineral notes.',
    aliases: ['lost in the italian sea', 'italian sea pluto', 'pluto italian sea'],
  },
  {
    name: 'Scent of Pluto Empty Room',
    brand: 'Scent of Pluto',
    region: 'Indonesia',
    countryCode: 'ID',
    category: 'Local Brand',
    gender: 'Unisex',
    notes: ['powdery', 'floral', 'woody'],
    description: 'Melancholic powdery iris, soft violet, and pale woods.',
    aliases: ['pluto empty room', 'empty room pluto'],
  },

  // ── Foncé ──
  {
    name: 'Foncé Serenitea',
    brand: 'Foncé',
    region: 'Indonesia',
    countryCode: 'ID',
    category: 'Local Brand',
    gender: 'Unisex',
    notes: ['aromatic', 'floral', 'fresh'],
    description: 'All-rounder compliment getter: authentic calming white tea with delicate jasmine blossom.',
    aliases: ['fonce serenitea', 'foncé serenitea', 'serenitea'],
  },
  {
    name: 'Foncé Bouquet Profusion',
    brand: 'Foncé',
    region: 'Indonesia',
    countryCode: 'ID',
    category: 'Local Brand',
    gender: 'Women',
    notes: ['floral', 'sweet', 'fresh'],
    description: 'Lush blooming bouquet of white flowers, lily, and rose petals.',
    aliases: ['fonce bouquet profusion', 'bouquet profusion'],
  },

  // ── Project 1945 ──
  {
    name: 'Project 1945 Fields of Ubud',
    brand: 'Project 1945',
    region: 'Indonesia',
    countryCode: 'ID',
    category: 'Local Brand',
    gender: 'Unisex',
    notes: ['aromatic', 'floral', 'fresh'],
    description: 'Balinese green paddy fields, herbal tea, and fragrant frangipani / white flowers.',
    aliases: ['project 1945 fields of ubud', 'fields of ubud'],
  },
  {
    name: 'Project 1945 Putri Kencana',
    brand: 'Project 1945',
    region: 'Indonesia',
    countryCode: 'ID',
    category: 'Local Brand',
    gender: 'Women',
    notes: ['floral', 'sweet', 'oriental'],
    description: 'Traditional Javanese royal bouquet of jasmine sambac, rose, and amber.',
    aliases: ['putri kencana', 'project 1945 putri kencana'],
  },

  // ── Mine. Perfumery ──
  {
    name: 'Mine. Floraison',
    brand: 'Mine. Perfumery',
    region: 'Indonesia',
    countryCode: 'ID',
    category: 'Local Brand',
    gender: 'Women / Unisex',
    notes: ['floral', 'sweet', 'fresh'],
    description: 'Blossoming tuberose, white jasmine, and creamy gardenia.',
    aliases: ['mine floraison', 'floraison', 'mine tuberose', 'mine sedap malam'],
  },
  {
    name: 'Mine. Lucid Dreams',
    brand: 'Mine. Perfumery',
    region: 'Indonesia',
    countryCode: 'ID',
    category: 'Local Brand',
    gender: 'Unisex',
    notes: ['floral', 'powdery', 'fresh'],
    description: 'Dreamy white amber and ethereal soft floral veil.',
    aliases: ['mine lucid dreams', 'lucid dreams'],
  },

  // ── Alien Objects ──
  {
    name: 'Alien Objects x Tara Basro',
    brand: 'Alien Objects',
    region: 'Indonesia',
    countryCode: 'ID',
    category: 'Local Brand',
    gender: 'Unisex',
    notes: ['floral', 'spicy', 'oriental'],
    description: 'Artisanal avant-garde creation featuring exotic florals, spices, and warm resins.',
    aliases: ['alien objects tara basro', 'alien objects x tara basro', 'tara basro alien objects'],
  },

  // ── Crusita ──
  {
    name: 'Crusita The Poet',
    brand: 'Crusita',
    region: 'Indonesia',
    countryCode: 'ID',
    category: 'Local Brand',
    gender: 'Unisex',
    notes: ['floral', 'woody', 'aromatic'],
    description: 'Introspective herbal tea, delicate rose, and smoky cedar.',
    aliases: ['crusita the poet'],
  },

  // ──────────────────────────────────────────────────────────────────
  // 🇦🇪 MIDDLE EAST / ARABIAN HOUSES & CLONES
  // ──────────────────────────────────────────────────────────────────
  // ── Afnan ──
  {
    name: 'Afnan Supremacy Not Only Intense (SNOI)',
    brand: 'Afnan',
    region: 'Middle East',
    countryCode: 'AE',
    category: 'Arabian / Clone',
    gender: 'Men',
    notes: ['fruity', 'woody', 'fresh'],
    description: 'Powerhouse blackcurrant, bergamot, apple, and oakmoss blend inspired by Hacivat/Aventus.',
    aliases: ['afnan snoi', 'supremacy not only intense', 'afnan supremacy'],
  },
  {
    name: 'Afnan 9 AM Dive',
    brand: 'Afnan',
    region: 'Middle East',
    countryCode: 'AE',
    category: 'Arabian / Clone',
    gender: 'Men / Unisex',
    notes: ['fresh', 'aquatic', 'sweet', 'aromatic'],
    description: 'Invigorating blend of mint, apple, blackcurrant, and cedar blending YSL Y & BDC.',
    aliases: ['9am dive', '9 am dive', 'afnan 9am', '9am'],
  },
  {
    name: 'Afnan 9 PM',
    brand: 'Afnan',
    region: 'Middle East',
    countryCode: 'AE',
    category: 'Arabian / Clone',
    gender: 'Men',
    notes: ['sweet', 'spicy', 'fruity', 'aromatic'],
    description: 'Famous sweet clubbing scent with apple, cinnamon, lavender, and vanilla (Ultra Male DNA).',
    aliases: ['afnan 9pm', '9pm', '9 pm'],
  },
  {
    name: 'Afnan Turathi Blue',
    brand: 'Afnan',
    region: 'Middle East',
    countryCode: 'AE',
    category: 'Arabian / Clone',
    gender: 'Men',
    notes: ['fresh', 'woody', 'oriental'],
    description: 'Sparkling zesty grapefruit and rich ambroxan inspired by Bvlgari Tygar.',
    aliases: ['afnan turathi blue', 'turathi blue', 'turathi'],
  },

  // ── Armaf ──
  {
    name: 'Armaf Club de Nuit Intense Man (CDNIM)',
    brand: 'Armaf',
    region: 'Middle East',
    countryCode: 'AE',
    category: 'Arabian / Clone',
    gender: 'Men',
    notes: ['fruity', 'woody', 'fresh', 'leather'],
    description: 'Legendary citrus-smoky powerhouse inspired by Creed Aventus.',
    aliases: ['club de nuit intense man', 'cdnim', 'cdni', 'club de nuit intense', 'club de nuit'],
  },
  {
    name: 'Armaf Club de Nuit Milestone',
    brand: 'Armaf',
    region: 'Middle East',
    countryCode: 'AE',
    category: 'Arabian / Clone',
    gender: 'Unisex',
    notes: ['aquatic', 'fruity', 'woody', 'fresh'],
    description: 'Crisp sea salt and fruity melon notes echoing Creed Millesime Imperial.',
    aliases: ['club de nuit milestone', 'armaf milestone', 'milestone'],
  },
  {
    name: 'Armaf Club de Nuit Sillage',
    brand: 'Armaf',
    region: 'Middle East',
    countryCode: 'AE',
    category: 'Arabian / Clone',
    gender: 'Unisex',
    notes: ['fresh', 'aromatic', 'powdery', 'woody'],
    description: 'Crisp inky blackcurrant and mountain air inspired by Silver Mountain Water.',
    aliases: ['club de nuit sillage', 'armaf sillage', 'sillage'],
  },
  {
    name: 'Armaf Club de Nuit Iconic',
    brand: 'Armaf',
    region: 'Middle East',
    countryCode: 'AE',
    category: 'Arabian / Clone',
    gender: 'Men',
    notes: ['fresh', 'woody', 'oriental', 'aromatic'],
    description: 'Blue fragrance masterwork inspired by Bleu de Chanel.',
    aliases: ['club de nuit iconic', 'armaf iconic', 'iconic'],
  },
  {
    name: 'Armaf Hunter Intense',
    brand: 'Armaf',
    region: 'Middle East',
    countryCode: 'AE',
    category: 'Arabian / Clone',
    gender: 'Men',
    notes: ['fresh', 'aromatic', 'woody'],
    description: 'Hybrid of Sauvage freshness and Invictus sweetness.',
    aliases: ['armaf hunter intense', 'hunter intense', 'armaf hunter'],
  },

  // ── Lattafa ──
  {
    name: 'Lattafa Khamrah',
    brand: 'Lattafa',
    region: 'Middle East',
    countryCode: 'AE',
    category: 'Arabian / Clone',
    gender: 'Unisex',
    notes: ['sweet', 'spicy', 'oriental', 'woody'],
    description: 'Rich boozy dates, praline, cinnamon, and vanilla dessert masterpiece.',
    aliases: ['lattafa khamrah', 'khamrah qahwa', 'khamrah'],
  },
  {
    name: 'Lattafa Asad',
    brand: 'Lattafa',
    region: 'Middle East',
    countryCode: 'AE',
    category: 'Arabian / Clone',
    gender: 'Men',
    notes: ['spicy', 'oriental', 'sweet', 'woody'],
    description: 'Warm spicy, dark amber and licorice profile inspired by Sauvage Elixir.',
    aliases: ['lattafa asad', 'asad'],
  },
  {
    name: 'Lattafa Yara',
    brand: 'Lattafa',
    region: 'Middle East',
    countryCode: 'AE',
    category: 'Arabian / Clone',
    gender: 'Women',
    notes: ['sweet', 'fruity', 'floral', 'powdery'],
    description: 'Fluffy strawberry milkshake with marshmallow, heliotrope floral, and vanilla.',
    aliases: ['lattafa yara', 'yara'],
  },
  {
    name: 'Lattafa Fakhar Black',
    brand: 'Lattafa',
    region: 'Middle East',
    countryCode: 'AE',
    category: 'Arabian / Clone',
    gender: 'Men',
    notes: ['fresh', 'fruity', 'woody', 'aromatic'],
    description: 'Crisp aromatic blue clone mirroring YSL Y EDP signature apple-sage vibe.',
    aliases: ['lattafa fakhar', 'fakhar black', 'fakhar'],
  },
  {
    name: 'Lattafa Nebras',
    brand: 'Lattafa',
    region: 'Middle East',
    countryCode: 'AE',
    category: 'Arabian / Clone',
    gender: 'Women / Unisex',
    notes: ['sweet', 'fruity', 'oriental'],
    description: 'Warm cocoa, candied red berries, and amber vanilla inspired by Eilish No. 1.',
    aliases: ['lattafa nebras', 'nebras'],
  },

  // ── Rasasi ──
  {
    name: 'Rasasi Hawas',
    brand: 'Rasasi',
    region: 'Middle East',
    countryCode: 'AE',
    category: 'Arabian / Clone',
    gender: 'Men',
    notes: ['aquatic', 'fruity', 'spicy', 'fresh'],
    description: 'High-projection sweet aquatic melon, apple, and cinnamon powerhouse.',
    aliases: ['rasasi hawas', 'hawas', 'hawas ice', 'hawas black'],
  },

  // ── Al Haramain ──
  {
    name: 'Al Haramain Amber Oud Gold Edition',
    brand: 'Al Haramain',
    region: 'Middle East',
    countryCode: 'AE',
    category: 'Arabian / Clone',
    gender: 'Unisex',
    notes: ['sweet', 'fruity', 'oriental'],
    description: 'Luscious melon and pineapple sweetness over radiant amber (Erba Pura DNA).',
    aliases: ['amber oud gold', 'al haramain amber oud', 'amber oud'],
  },

  // ── Al Rehab ──
  {
    name: 'Al Rehab Choco Musk',
    brand: 'Al Rehab',
    region: 'Middle East',
    countryCode: 'SA',
    category: 'Arabian / Clone',
    gender: 'Unisex',
    notes: ['sweet', 'powdery', 'oriental'],
    description: 'Affordable cult-favorite creamy hot cocoa, milk chocolate, and soft vanilla.',
    aliases: ['al rehab choco musk', 'choco musk'],
  },

  // ── Rue Broca ──
  {
    name: 'Rue Broca Théorème',
    brand: 'Rue Broca',
    region: 'Middle East',
    countryCode: 'AE',
    category: 'Arabian / Clone',
    gender: 'Men',
    notes: ['fresh', 'woody', 'oriental'],
    description: 'Celebrated Middle Eastern citrus-woody ambroxan gem (Tygar / BDC alternative).',
    aliases: ['rue broca theoreme', 'theoreme'],
  },

  // ── Pendora Scents ──
  {
    name: 'Pendora Scents Idyll',
    brand: 'Pendora Scents',
    region: 'Middle East',
    countryCode: 'AE',
    category: 'Arabian / Clone',
    gender: 'Women / Unisex',
    notes: ['floral', 'fresh', 'powdery'],
    description: 'Paris Corner Pendora creation blending delicate white florals, dewy petals, and soothing musks.',
    aliases: ['pendora scents idyll', 'pendora idyll', 'idyll pendora'],
  },

  // ── Maison Alhambra ──
  {
    name: 'Maison Alhambra Delilah',
    brand: 'Maison Alhambra',
    region: 'Middle East',
    countryCode: 'AE',
    category: 'Arabian / Clone',
    gender: 'Women',
    notes: ['floral', 'fruity', 'sweet'],
    description: 'Celebrated Middle Eastern floral tribute featuring Turkish rose, lychee, and vanilla cream.',
    aliases: ['maison alhambra delilah', 'delilah'],
  },

  // ── Armaf Imperiale ──
  {
    name: 'Armaf Club de Nuit Imperiale',
    brand: 'Armaf',
    region: 'Middle East',
    countryCode: 'AE',
    category: 'Arabian / Clone',
    gender: 'Women',
    notes: ['floral', 'sweet', 'oriental'],
    description: 'Lush Turkish rose, lychee, incense, and vanilla cream inspired by Delina Exclusif.',
    aliases: ['club de nuit imperiale', 'cdn imperiale', 'imperiale'],
  },

  // ──────────────────────────────────────────────────────────────────
  // 🇫🇷 FRANCE (DESIGNER)
  // ──────────────────────────────────────────────────────────────────
  // ── Christian Dior ──
  {
    name: 'Dior Sauvage',
    brand: 'Dior',
    region: 'France',
    countryCode: 'FR',
    category: 'Designer',
    gender: 'Men',
    notes: ['fresh', 'spicy', 'woody', 'aromatic'],
    description: 'The global benchmark for modern masculine freshness with Calabrian bergamot.',
    aliases: ['dior sauvage', 'sauvage edp', 'sauvage elixir', 'sauvage edt', 'sauvage'],
  },
  {
    name: 'Miss Dior Blooming Bouquet',
    brand: 'Dior',
    region: 'France',
    countryCode: 'FR',
    category: 'Designer',
    gender: 'Women',
    notes: ['floral', 'fresh', 'powdery'],
    description: 'Delicate, romantic silk bouquet of Damascus rose and pink peony.',
    aliases: ['miss dior blooming bouquet', 'miss dior', 'blooming bouquet'],
  },
  {
    name: 'Dior Homme Intense',
    brand: 'Dior',
    region: 'France',
    countryCode: 'FR',
    category: 'Designer',
    gender: 'Men',
    notes: ['powdery', 'woody', 'oriental', 'floral'],
    description: 'Luxurious powdery Tuscan iris blended with ambrette and Virginia cedar.',
    aliases: ['dior homme intense', 'dior homme'],
  },

  // ── Yves Saint Laurent ──
  {
    name: 'YSL Y EDP',
    brand: 'Yves Saint Laurent',
    region: 'France',
    countryCode: 'FR',
    category: 'Designer',
    gender: 'Men',
    notes: ['fresh', 'fruity', 'aromatic', 'woody'],
    description: 'Crisp green apple and aromatic sage on a bold woody-amber foundation.',
    aliases: ['ysl y edp', 'ysl y', 'y edp', 'ysl y le parfum'],
  },
  {
    name: 'YSL MYSLF',
    brand: 'Yves Saint Laurent',
    region: 'France',
    countryCode: 'FR',
    category: 'Designer',
    gender: 'Men',
    notes: ['fresh', 'floral', 'woody'],
    description: 'Modern clean floral-woody freshness driven by sparkling Tunisian orange blossom.',
    aliases: ['ysl myslf', 'ysl myself', 'myslf', 'myself'],
  },
  {
    name: 'YSL Libre',
    brand: 'Yves Saint Laurent',
    region: 'France',
    countryCode: 'FR',
    category: 'Designer',
    gender: 'Women',
    notes: ['floral', 'aromatic', 'sweet'],
    description: 'Bold grand floral contrasting French lavender with Moroccan orange blossom and vanilla.',
    aliases: ['ysl libre', 'libre edp', 'libre intense', 'libre'],
  },
  {
    name: 'YSL Black Opium',
    brand: 'Yves Saint Laurent',
    region: 'France',
    countryCode: 'FR',
    category: 'Designer',
    gender: 'Women',
    notes: ['sweet', 'floral', 'oriental'],
    description: 'Electrifying black coffee accord mingled with sweet vanilla and jasmine.',
    aliases: ['ysl black opium', 'black opium'],
  },
  {
    name: 'YSL La Nuit de L\'Homme',
    brand: 'Yves Saint Laurent',
    region: 'France',
    countryCode: 'FR',
    category: 'Designer',
    gender: 'Men',
    notes: ['spicy', 'aromatic', 'woody'],
    description: 'Seductive cardamom and lavender nighttime classic.',
    aliases: ['la nuit de l\'homme', 'la nuit de lhomme', 'la nuit'],
  },

  // ── Chanel ──
  {
    name: 'Bleu de Chanel',
    brand: 'Chanel',
    region: 'France',
    countryCode: 'FR',
    category: 'Designer',
    gender: 'Men',
    notes: ['fresh', 'woody', 'oriental', 'aromatic'],
    description: 'The archetype blue fragrance: fresh grapefruit, aromatic mint, and rich incense.',
    aliases: ['bleu de chanel', 'blue de chanel', 'bdc'],
  },
  {
    name: 'Chanel Allure Homme Sport',
    brand: 'Chanel',
    region: 'France',
    countryCode: 'FR',
    category: 'Designer',
    gender: 'Men',
    notes: ['fresh', 'aquatic', 'sweet', 'woody'],
    description: 'Invigorating mandarin with creamy tonka bean and aquatic freshness.',
    aliases: ['allure homme sport', 'allure homme', 'chanel allure'],
  },

  // ── Jean Paul Gaultier ──
  {
    name: 'Jean Paul Gaultier Le Male Elixir',
    brand: 'Jean Paul Gaultier',
    region: 'France',
    countryCode: 'FR',
    category: 'Designer',
    gender: 'Men',
    notes: ['sweet', 'oriental', 'aromatic', 'leather'],
    description: 'Intoxicating sweet honey, warm tonka, and golden amber vanilla.',
    aliases: ['le male elixir', 'jpg elixir', 'jpg le male elixir', 'le male elixir jpg'],
  },

  // ── Paco Rabanne ──
  {
    name: 'Paco Rabanne Invictus',
    brand: 'Paco Rabanne',
    region: 'France',
    countryCode: 'FR',
    category: 'Designer',
    gender: 'Men',
    notes: ['fresh', 'aquatic', 'sweet'],
    description: 'Triumphant fresh marine grapefruit and sweet ambergris breeze.',
    aliases: ['paco rabanne invictus', 'invictus'],
  },
  {
    name: 'Paco Rabanne 1 Million',
    brand: 'Paco Rabanne',
    region: 'France',
    countryCode: 'FR',
    category: 'Designer',
    gender: 'Men',
    notes: ['sweet', 'spicy', 'leather', 'oriental'],
    description: 'Iconic gold bar fragrance bursting with blood mandarin, cinnamon, and leather.',
    aliases: ['one million', '1 million', 'paco rabanne 1 million'],
  },

  // ── Hermès ──
  {
    name: 'Hermès Terre d\'Hermès',
    brand: 'Hermès',
    region: 'France',
    countryCode: 'FR',
    category: 'Designer',
    gender: 'Men',
    notes: ['fresh', 'woody', 'spicy'],
    description: 'Masterpiece blending bitter orange, flint mineral notes, and cedarwood.',
    aliases: ['terre d hermes', "terre d'hermes", 'terre dhermes', 'hermes terre d hermes'],
  },

  // ── Lancôme ──
  {
    name: 'Lancôme La Vie Est Belle',
    brand: 'Lancôme',
    region: 'France',
    countryCode: 'FR',
    category: 'Designer',
    gender: 'Women',
    notes: ['sweet', 'floral', 'powdery'],
    description: 'Radiant iris gourmand sweetened with praline, spun sugar, and patchouli.',
    aliases: ['la vie est belle', 'lancome la vie est belle', 'lancôme la vie est belle', 'lveb'],
  },

  // ──────────────────────────────────────────────────────────────────
  // 🇮🇹 ITALY (DESIGNER)
  // ──────────────────────────────────────────────────────────────────
  // ── Versace ──
  {
    name: 'Versace Eros',
    brand: 'Versace',
    region: 'Italy',
    countryCode: 'IT',
    category: 'Designer',
    gender: 'Men',
    notes: ['fresh', 'sweet', 'fruity', 'aromatic'],
    description: 'Loud party fragrance with cooling mint, crisp green apple, and creamy vanilla.',
    aliases: ['versace eros', 'eros flame', 'eros energy', 'eros edt', 'eros edp', 'eros'],
  },
  {
    name: 'Versace Dylan Blue',
    brand: 'Versace',
    region: 'Italy',
    countryCode: 'IT',
    category: 'Designer',
    gender: 'Men',
    notes: ['fresh', 'aquatic', 'woody', 'oriental'],
    description: 'Versatile Mediterranean blue scent with aquatic notes and sensual incense.',
    aliases: ['versace dylan blue', 'dylan blue'],
  },
  {
    name: 'Versace Pour Homme',
    brand: 'Versace',
    region: 'Italy',
    countryCode: 'IT',
    category: 'Designer',
    gender: 'Men',
    notes: ['fresh', 'floral', 'aromatic'],
    description: 'Crisp Diamante lemon, bitter orange leaves, and Mediterranean neroli floral.',
    aliases: ['versace pour homme', 'versace pour homme edt'],
  },

  // ── Giorgio Armani ──
  {
    name: 'Acqua di Giò Profondo',
    brand: 'Giorgio Armani',
    region: 'Italy',
    countryCode: 'IT',
    category: 'Designer',
    gender: 'Men',
    notes: ['aquatic', 'fresh', 'aromatic'],
    description: 'Deep oceanic marine notes, green mandarin, and aromatic rosemary.',
    aliases: ['acqua di gio profondo', 'adg profondo', 'acqua di gio profondo edp'],
  },

  // ── Gucci ──
  {
    name: 'Gucci Bloom',
    brand: 'Gucci',
    region: 'Italy',
    countryCode: 'IT',
    category: 'Designer',
    gender: 'Women',
    notes: ['floral', 'powdery', 'fresh'],
    description: 'Masterpiece white floral bouquet capturing a thriving garden of tuberose, natural jasmine bud, and Rangoon creeper.',
    aliases: ['gucci bloom', 'bloom gucci', 'bloom'],
  },
  {
    name: 'Gucci Flora Gorgeous Gardenia',
    brand: 'Gucci',
    region: 'Italy',
    countryCode: 'IT',
    category: 'Designer',
    gender: 'Women',
    notes: ['floral', 'sweet', 'fruity'],
    description: 'Joyful floral signature built around gorgeous white gardenia, solar jasmine, and pear blossom.',
    aliases: ['gucci flora', 'flora gorgeous gardenia', 'gorgeous gardenia', 'gorgeous jasmine', 'gorgeous magnolia'],
  },
  {
    name: 'Gucci Guilty Pour Homme',
    brand: 'Gucci',
    region: 'Italy',
    countryCode: 'IT',
    category: 'Designer',
    gender: 'Men',
    notes: ['fresh', 'aromatic', 'floral', 'woody'],
    description: 'Modern aromatic fougere with Amalfi lemon, lavender, and orange blossom.',
    aliases: ['gucci guilty pour homme', 'gucci guilty'],
  },

  // ── Prada ──
  {
    name: 'Prada Paradoxe',
    brand: 'Prada',
    region: 'Italy',
    countryCode: 'IT',
    category: 'Designer',
    gender: 'Women',
    notes: ['floral', 'sweet', 'fresh', 'oriental'],
    description: 'Iconic floral amber signature reinventing freshness with Neroli bud, Ambrofix, and white musks.',
    aliases: ['prada paradoxe', 'paradoxe prada', 'paradoxe'],
  },
  {
    name: 'Prada L\'Homme',
    brand: 'Prada',
    region: 'Italy',
    countryCode: 'IT',
    category: 'Designer',
    gender: 'Men',
    notes: ['powdery', 'floral', 'fresh', 'woody'],
    description: 'The pinnacle of office elegance: luxurious soapy iris, neroli, and cedar.',
    aliases: ['prada l\'homme', 'prada lhomme', 'prada l\'homme edt'],
  },

  // ──────────────────────────────────────────────────────────────────
  // 👑 NICHE & LUXURY HOUSES
  // ──────────────────────────────────────────────────────────────────
  // ── Creed ──
  {
    name: 'Creed Aventus',
    brand: 'Creed',
    region: 'Niche Houses',
    countryCode: 'FR',
    category: 'Niche / Luxury',
    gender: 'Men',
    notes: ['fruity', 'woody', 'fresh', 'leather'],
    description: 'The king of niche perfumery: smoky blackcurrant, juicy pineapple, and birch.',
    aliases: ['creed aventus', 'aventus'],
  },
  {
    name: 'Creed Silver Mountain Water',
    brand: 'Creed',
    region: 'Niche Houses',
    countryCode: 'FR',
    category: 'Niche / Luxury',
    gender: 'Unisex',
    notes: ['fresh', 'aromatic', 'fruity', 'powdery'],
    description: 'Pure Alpine mountain streams with sparkling green tea and blackcurrant.',
    aliases: ['silver mountain water', 'creed silver mountain water', 'smw', 'creed smw'],
  },

  // ── Nishane ──
  {
    name: 'Nishane Hacivat',
    brand: 'Nishane',
    region: 'Niche Houses',
    countryCode: 'TR',
    category: 'Niche / Luxury',
    gender: 'Unisex',
    notes: ['fruity', 'woody', 'fresh'],
    description: 'Extrait de parfum delivering nuclear pineapple, bergamot, and rich oakmoss.',
    aliases: ['nishane hacivat', 'hacivat', 'hachivat'],
  },
  {
    name: 'Nishane Wulong Cha',
    brand: 'Nishane',
    region: 'Niche Houses',
    countryCode: 'TR',
    category: 'Niche / Luxury',
    gender: 'Unisex',
    notes: ['fresh', 'aromatic', 'fruity'],
    description: 'World-renowned photorealistic oolong tea with refreshing citrus and fig.',
    aliases: ['nishane wulong cha', 'wulong cha'],
  },

  // ── Parfums de Marly ──
  {
    name: 'Parfums de Marly Delina',
    brand: 'Parfums de Marly',
    region: 'Niche Houses',
    countryCode: 'FR',
    category: 'Niche / Luxury',
    gender: 'Women',
    notes: ['floral', 'fruity', 'sweet', 'powdery'],
    description: 'Modern royal floral benchmark featuring Turkish rose, lychee, and tart rhubarb.',
    aliases: ['parfums de marly delina', 'pdm delina', 'delina'],
  },
  {
    name: 'Parfums de Marly Layton',
    brand: 'Parfums de Marly',
    region: 'Niche Houses',
    countryCode: 'FR',
    category: 'Niche / Luxury',
    gender: 'Men / Unisex',
    notes: ['sweet', 'spicy', 'fruity', 'aromatic', 'woody'],
    description: 'Opulent blend of crisp apple, lavender, warm cardamom, and creamy vanilla.',
    aliases: ['parfums de marly layton', 'pdm layton', 'layton pdm', 'layton'],
  },

  // ── Xerjoff ──
  {
    name: 'Xerjoff Naxos',
    brand: 'Xerjoff',
    region: 'Niche Houses',
    countryCode: 'IT',
    category: 'Niche / Luxury',
    gender: 'Unisex',
    notes: ['sweet', 'aromatic', 'spicy', 'oriental'],
    description: 'Sicilian masterpiece of golden honey, aromatic lavender, and smooth tobacco.',
    aliases: ['xerjoff naxos', 'naxos'],
  },

  // ── Maison Francis Kurkdjian ──
  {
    name: 'MFK Baccarat Rouge 540',
    brand: 'Maison Francis Kurkdjian',
    region: 'Niche Houses',
    countryCode: 'FR',
    category: 'Niche / Luxury',
    gender: 'Unisex',
    notes: ['sweet', 'oriental', 'woody', 'spicy'],
    description: 'Luminous woody-amber with burnt cotton candy sweetness, saffron, and ambergris radiance.',
    aliases: ['baccarat rouge 540', 'baccarat rouge', 'br540', 'br 540', 'mfk baccarat rouge', 'mfk br540'],
  },

  // ── Maison Margiela Replica ──
  {
    name: 'Maison Margiela Replica Jazz Club',
    brand: 'Maison Margiela',
    region: 'Niche Houses',
    countryCode: 'FR',
    category: 'Niche / Luxury',
    gender: 'Men / Unisex',
    notes: ['sweet', 'leather', 'woody', 'spicy'],
    description: 'Cozy Brooklyn jazz ambiance with aged rum, tobacco leaf, and vanilla.',
    aliases: ['replica jazz club', 'jazz club', 'margiela jazz club', 'maison margiela jazz club'],
  },

  // ── Diptyque ──
  {
    name: 'Diptyque Fleur de Peau',
    brand: 'Diptyque',
    region: 'Niche Houses',
    countryCode: 'FR',
    category: 'Niche / Luxury',
    gender: 'Unisex',
    notes: ['floral', 'powdery', 'spicy'],
    description: 'Intimate poetic skin scent driven by soft cottony musks, pink pepper, and powdery iris.',
    aliases: ['fleur de peau', 'diptyque fleur de peau'],
  },
  {
    name: 'Diptyque Do Son',
    brand: 'Diptyque',
    region: 'Niche Houses',
    countryCode: 'FR',
    category: 'Niche / Luxury',
    gender: 'Women / Unisex',
    notes: ['floral', 'fresh', 'aquatic'],
    description: 'Iconic sea-breeze tuberose and fresh orange blossom inspired by Ha Long Bay coastal memories.',
    aliases: ['diptyque do son', 'do son', 'doson'],
  },

  // ── Jo Malone ──
  {
    name: 'Jo Malone English Pear & Freesia',
    brand: 'Jo Malone',
    region: 'Niche Houses',
    countryCode: 'GB',
    category: 'Niche / Luxury',
    gender: 'Women / Unisex',
    notes: ['floral', 'fruity', 'fresh'],
    description: 'British orchard freshness of just-ripe King William pear and white freesias.',
    aliases: ['english pear & freesia', 'english pear and freesia', 'english pear', 'jo malone english pear', 'jo malone english pear & freesia', 'jm english pear'],
  },

  // ── Givenchy ──
  {
    name: 'Givenchy L\'Interdit',
    brand: 'Givenchy',
    region: 'France',
    countryCode: 'FR',
    category: 'Designer',
    gender: 'Women',
    notes: ['floral', 'sweet', 'woody'],
    description: 'Thrilling white floral contrast of radiant tuberose, jasmine, orange blossom, and dark vetiver.',
    aliases: ['givenchy l\'interdit', 'givenchy linterdit', 'l\'interdit', 'linterdit'],
  },

  // ── Narciso Rodriguez ──
  {
    name: 'Narciso Rodriguez For Her',
    brand: 'Narciso Rodriguez',
    region: 'United States',
    countryCode: 'US',
    category: 'Designer',
    gender: 'Women',
    notes: ['floral', 'powdery', 'woody'],
    description: 'Sensual iconic floral-musk masterpiece blending African orange flower, osmanthus, and amber.',
    aliases: ['narciso rodriguez for her', 'narciso for her', 'for her'],
  },

  // ──────────────────────────────────────────────────────────────────
  // 🇺🇸 UNITED STATES & GLOBAL DESIGNER
  // ──────────────────────────────────────────────────────────────────
  // ── Tom Ford ──
  {
    name: 'Tom Ford Ombré Leather',
    brand: 'Tom Ford',
    region: 'United States',
    countryCode: 'US',
    category: 'Luxury / Designer',
    gender: 'Unisex',
    notes: ['leather', 'spicy', 'floral', 'oriental'],
    description: 'Vast textured black leather layered with floral jasmine, cardamom, and warm amber.',
    aliases: ['tom ford ombre leather', 'tom ford ombré leather', 'ombre leather', 'ombré leather'],
  },

  // ── Montblanc ──
  {
    name: 'Montblanc Explorer',
    brand: 'Montblanc',
    region: 'Europe',
    countryCode: 'DE',
    category: 'Designer',
    gender: 'Men',
    notes: ['fresh', 'woody', 'leather'],
    description: 'Globally celebrated versatile woody-aromatic driven by Italian bergamot and vetiver.',
    aliases: ['montblanc explorer', 'explorer'],
  },

  // ── Nautica ──
  {
    name: 'Nautica Voyage',
    brand: 'Nautica',
    region: 'United States',
    countryCode: 'US',
    category: 'Designer',
    gender: 'Men',
    notes: ['fresh', 'aquatic', 'fruity', 'floral'],
    description: 'The undisputed budget aquatic king with crisp green leaves and dewy lotus blossom.',
    aliases: ['nautica voyage', 'voyage nautica'],
  },

  // ── Davidoff ──
  {
    name: 'Davidoff Cool Water',
    brand: 'Davidoff',
    region: 'Europe',
    countryCode: 'CH',
    category: 'Designer',
    gender: 'Men',
    notes: ['fresh', 'aquatic', 'aromatic'],
    description: 'The legendary pioneer of aquatic freshness with sea water, lavender, and crisp mint.',
    aliases: ['davidoff cool water', 'cool water'],
  },

  // ── Zara ──
  {
    name: 'Zara Vibrant Leather',
    brand: 'Zara',
    region: 'Europe',
    countryCode: 'ES',
    category: 'Budget / High Street',
    gender: 'Men',
    notes: ['fresh', 'leather', 'woody'],
    description: 'Clean modern high-street favorite crafted with bergamot, bamboo, and soft leather.',
    aliases: ['zara vibrant leather', 'vibrant leather'],
  },
];

// ─── Load Data ──────────────────────────────────────────────────────
const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
const { threads, meta } = data;

console.log(`📊 Loaded ${threads.length} threads (keyword: "${meta.keyword}")\n`);

function getAllMessages(thread) {
  return [
    thread.keywordMessage,
    ...thread.parentChain,
    ...thread.replies,
    ...thread.contextBefore,
    ...thread.contextAfter,
  ];
}

// Sort catalog by alias length (longest first) to prevent false substring collisions
const sortedCatalog = [...PERFUME_PRODUCTS].sort((a, b) => {
  const aMax = Math.max(...a.aliases.map(al => al.length));
  const bMax = Math.max(...b.aliases.map(al => al.length));
  return bMax - aMax;
});

function findPerfumesInText(text) {
  const lower = text.toLowerCase();
  const matched = new Set();

  for (const entry of sortedCatalog) {
    for (const alias of entry.aliases) {
      try {
        const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp('\\b' + escaped + '\\b', 'i');
        if (regex.test(lower)) {
          matched.add(entry.name);
          break;
        }
      } catch {
        // skip
      }
    }
  }

  return [...matched];
}

// ─── Build leaderboard ──────────────────────────────────────────────
const perfumeStats = new Map();

for (const thread of threads) {
  const allMsgs = getAllMessages(thread);
  const threadAuthors = new Set(allMsgs.map(m => m.authorUsername));

  const keywordPerfumes = findPerfumesInText(thread.keywordMessage.content);
  const allPerfumesInThread = new Set();

  for (const msg of allMsgs) {
    findPerfumesInText(msg.content).forEach(p => allPerfumesInThread.add(p));
  }

  for (const perfumeName of allPerfumesInThread) {
    if (!perfumeStats.has(perfumeName)) {
      const catalogEntry = PERFUME_PRODUCTS.find(e => e.name === perfumeName);
      perfumeStats.set(perfumeName, {
        name: perfumeName,
        brand: catalogEntry?.brand || 'Unknown',
        region: catalogEntry?.region || 'Global',
        countryCode: catalogEntry?.countryCode || 'GL',
        category: catalogEntry?.category || 'Designer',
        gender: catalogEntry?.gender || 'Unisex',
        description: catalogEntry?.description || '',
        notes: catalogEntry?.notes || [],
        mentionCount: 0,
        threadCount: 0,
        directKeywordMentions: 0,
        authors: new Set(),
        sampleMentions: [],
        threadTimestamps: [],
        coMentions: new Map(),
      });
    }

    const stats = perfumeStats.get(perfumeName);
    stats.threadCount++;
    stats.threadTimestamps.push(thread.keywordMessage.timestamp);
    threadAuthors.forEach(a => stats.authors.add(a));

    for (const msg of allMsgs) {
      const found = findPerfumesInText(msg.content);
      if (found.includes(perfumeName)) {
        stats.mentionCount++;
        if (stats.sampleMentions.length < 6) {
          stats.sampleMentions.push({
            author: msg.author,
            content: msg.content.substring(0, 200),
            timestamp: msg.timestamp,
          });
        }
      }
    }

    if (keywordPerfumes.includes(perfumeName)) {
      stats.directKeywordMentions++;
    }

    for (const otherPerfume of allPerfumesInThread) {
      if (otherPerfume !== perfumeName) {
        stats.coMentions.set(otherPerfume, (stats.coMentions.get(otherPerfume) || 0) + 1);
      }
    }
  }
}

// ─── Sort and rank ──────────────────────────────────────────────────
const ranked = [...perfumeStats.values()]
  .sort((a, b) => {
    if (b.mentionCount !== a.mentionCount) return b.mentionCount - a.mentionCount;
    if (b.threadCount !== a.threadCount) return b.threadCount - a.threadCount;
    return b.authors.size - a.authors.size;
  })
  .map((stats, index) => ({
    rank: index + 1,
    name: stats.name,
    brand: stats.brand,
    region: stats.region,
    countryCode: stats.countryCode,
    category: stats.category,
    gender: stats.gender,
    description: stats.description,
    mentionCount: stats.mentionCount,
    threadCount: stats.threadCount,
    directKeywordMentions: stats.directKeywordMentions,
    uniqueAuthors: stats.authors.size,
    // Notes is strictly the authentic verified scent note profile
    notes: stats.notes,
    topNotes: stats.notes,
    sampleMentions: stats.sampleMentions,
    coMentions: [...stats.coMentions.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count })),
    firstMentioned: stats.threadTimestamps.sort()[0],
    lastMentioned: stats.threadTimestamps.sort().pop(),
  }));

// ─── Region & Category Statistics ───────────────────────────────────
const regionStats = {};
for (const perfume of ranked) {
  if (!regionStats[perfume.region]) {
    regionStats[perfume.region] = {
      name: perfume.region,
      countryCode: perfume.countryCode,
      count: 0,
      totalMentions: 0,
      topPerfumes: [],
    };
  }
  regionStats[perfume.region].count++;
  regionStats[perfume.region].totalMentions += perfume.mentionCount;
  if (regionStats[perfume.region].topPerfumes.length < 3) {
    regionStats[perfume.region].topPerfumes.push(perfume.name);
  }
}

// ─── Scent Category stats ───────────────────────────────────────────
const categoryStats = {};
for (const perfume of ranked) {
  for (const note of perfume.notes) {
    if (!categoryStats[note]) categoryStats[note] = { count: 0, perfumes: [] };
    categoryStats[note].count++;
    if (categoryStats[note].perfumes.length < 5) {
      categoryStats[note].perfumes.push(perfume.name);
    }
  }
}

// ─── Author leaderboard ────────────────────────────────────────────
const authorMentions = new Map();
for (const thread of threads) {
  const allMsgs = getAllMessages(thread);
  for (const msg of allMsgs) {
    const author = msg.author;
    if (!authorMentions.has(author)) {
      authorMentions.set(author, { name: author, username: msg.authorUsername, messageCount: 0, perfumesMentioned: new Set() });
    }
    authorMentions.get(author).messageCount++;
    findPerfumesInText(msg.content).forEach(p => authorMentions.get(author).perfumesMentioned.add(p));
  }
}

const topAuthors = [...authorMentions.values()]
  .sort((a, b) => b.messageCount - a.messageCount)
  .slice(0, 20)
  .map(a => ({
    name: a.name,
    username: a.username,
    messageCount: a.messageCount,
    perfumesMentioned: a.perfumesMentioned.size,
  }));

// ─── Output ─────────────────────────────────────────────────────────
const output = {
  meta: {
    keyword: meta.keyword,
    totalMessages: meta.totalMessages,
    totalThreads: meta.threadsAssembled,
    totalPerfumesFound: ranked.length,
    generatedAt: new Date().toISOString(),
  },
  leaderboard: ranked,
  regions: regionStats,
  categories: categoryStats,
  topContributors: topAuthors,
  threads: threads,
};

const outputDir = outputFile.substring(0, outputFile.lastIndexOf('/'));
if (outputDir) fs.mkdirSync(outputDir, { recursive: true });

fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));

const elapsed = process.uptime().toFixed(1);
console.log('─'.repeat(60));
console.log(`🏆 Granular Perfume Product Leaderboard — Top 25\n`);
ranked.slice(0, 25).forEach(p => {
  const medal = p.rank <= 3 ? ['🥇', '🥈', '🥉'][p.rank - 1] : `${p.rank}.`.padStart(3);
  const flag = p.region === 'Indonesia' ? '🇮🇩' : p.region === 'Middle East' ? '🇦🇪' : p.region === 'France' ? '🇫🇷' : p.region === 'Italy' ? '🇮🇹' : p.region === 'Niche Houses' ? '👑' : '🌎';
  console.log(`${medal} ${flag} ${p.name.padEnd(35)} [${p.brand.padEnd(16)}] ${String(p.mentionCount).padStart(3)} mentions  [${p.notes.join(', ')}]`);
});

console.log(`\n📁 Output: ${outputFile}`);
console.log(`📊 ${ranked.length} distinct perfume products ranked from ${threads.length} threads`);
console.log(`⏱  Done in ${elapsed}s\n`);
