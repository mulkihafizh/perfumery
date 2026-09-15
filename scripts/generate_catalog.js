import fs from 'fs';
import { PERFUME_PRODUCTS } from './build-leaderboard.js';

// ─── Configuration ──────────────────────────────────────────────────
const outputFile = process.argv[2] || 'perfume_catalog.json';

console.log(`\n📦 PERFUME CATALOG GENERATOR`);
console.log(`📄 Converting ${PERFUME_PRODUCTS.length} products from PERFUME_PRODUCTS → ${outputFile}\n`);

// ─── Ambiguity Detection ────────────────────────────────────────────
// A model name is "ambiguous" if it's a single common word that could
// appear in non-perfume contexts (e.g., "Cloud", "Alpha", "Bloom", "Eros").
// These require proximity validation in the Reddit extractor.

const FORCE_AMBIGUOUS = new Set([
  // Multi-word names that are still ambiguous in general text
  'cool water', 'lost cherry', 'black orchid', 'bubble bath',
  'powder room', 'out west', 'pink laundry', 'baby love',
  'black sakura', 'lazy sunday morning', 'by the fireplace',
  'matcha latte', 'second skin', 'vanilla clouds', 'pistachio milk',
  'caramel fudge cookie', 'when in paris', 'white floral bouquet', 'fields of ubud'
]);

function isAmbiguousModel(modelName) {
  const lower = modelName.toLowerCase().trim();

  // Forced ambiguous list
  if (FORCE_AMBIGUOUS.has(lower)) return true;

  // Single word, ≤12 chars, no digits → likely ambiguous
  const words = lower.split(/\s+/);
  if (words.length === 1 && lower.length <= 12 && !/\d/.test(lower)) {
    return true;
  }

  return false;
}

// ─── Extract Model Name ─────────────────────────────────────────────
// Strips the brand prefix from the full product name.
// "HMNS Orgasm" → "Orgasm", "Dior Sauvage" → "Sauvage"
// Handles edge cases like "Saff & Co Ostara" and "MFK Baccarat Rouge 540"

function extractModelName(fullName, brandName) {
  // Try stripping brand prefix directly
  if (fullName.startsWith(brandName + ' ')) {
    return fullName.slice(brandName.length + 1).trim();
  }

  // Handle abbreviated or alternate brand prefixes
  if (fullName.startsWith('YSL ') && brandName.includes('Saint Laurent')) {
    return fullName.slice(4).trim();
  }
  if (fullName.startsWith('MFK ') && brandName.includes('Francis Kurkdjian')) {
    return fullName.slice(4).trim();
  }

  return fullName;
}

// ─── Build Catalog ──────────────────────────────────────────────────
const catalog = { brands: {} };
let totalModels = 0;
let ambiguousCount = 0;

const SUPPLEMENTARY_PRODUCTS = [
  {
    brand: 'Ariana Grande',
    name: 'Ariana Grande Cloud',
    category: 'Celebrity',
    region: 'United States',
    countryCode: 'US',
    gender: 'Women / Unisex',
    description: 'Sweet gourmand fragrance with lavender, coconut, praline, and vanilla notes.',
    notes: ['sweet', 'vanilla', 'gourmand', 'fruity'],
    aliases: ['ariana grande cloud', 'ag cloud', 'cloud 2.0', 'cloud'],
  },
  {
    brand: 'HMNS',
    name: 'HMNS Alpha',
    category: 'Local Brand',
    region: 'Indonesia',
    countryCode: 'ID',
    gender: 'Men / Unisex',
    description: 'Fresh citrus and green grass notes with cedarwood base.',
    notes: ['fresh', 'citrus', 'green', 'woody'],
    aliases: ['hmns alpha', 'alpha hmns', 'alpha'],
  },
  {
    brand: 'Burberry',
    name: 'Burberry Hero',
    category: 'Designer',
    region: 'United Kingdom',
    countryCode: 'GB',
    gender: 'Men',
    description: 'Fresh woody aroma with bergamot, juniper, black pepper, and three cedarwood oils.',
    notes: ['woody', 'fresh', 'spicy'],
    aliases: ['burberry hero', 'hero burberry', 'hero edp', 'hero edt', 'hero'],
  },
  {
    brand: 'Tom Ford',
    name: 'Tom Ford Tobacco Vanille',
    category: 'Designer / Luxury',
    region: 'United States',
    countryCode: 'US',
    gender: 'Unisex',
    description: 'Opulent warm spicy scent with tobacco leaf, vanilla, cacao, and tonka bean.',
    notes: ['tobacco', 'vanilla', 'sweet', 'spicy'],
    aliases: ['tom ford tobacco vanille', 'tobacco vanille', 'tf tv'],
  },
  {
    brand: 'Tom Ford',
    name: 'Tom Ford Lost Cherry',
    category: 'Designer / Luxury',
    region: 'United States',
    countryCode: 'US',
    gender: 'Unisex',
    description: 'Luscious black cherry, bitter almond, liqueur, and roasted tonka notes.',
    notes: ['sweet', 'fruity', 'gourmand', 'amber'],
    aliases: ['tom ford lost cherry', 'lost cherry'],
  },
  {
    brand: 'Tom Ford',
    name: 'Tom Ford Oud Wood',
    category: 'Designer / Luxury',
    region: 'United States',
    countryCode: 'US',
    gender: 'Unisex',
    description: 'Rare oud wood, rosewood, cardamom, and sandalwood blend.',
    notes: ['woody', 'spicy', 'amber', 'smoky'],
    aliases: ['tom ford oud wood', 'oud wood'],
  },
  {
    brand: 'Tom Ford',
    name: 'Tom Ford Black Orchid',
    category: 'Designer / Luxury',
    region: 'United States',
    countryCode: 'US',
    gender: 'Unisex',
    description: 'Sensual black truffle, black orchid, patchouli, and dark chocolate.',
    notes: ['sweet', 'earthy', 'floral', 'spicy'],
    aliases: ['tom ford black orchid', 'black orchid'],
  },

  // ── Marc Jacobs ──
  {
    brand: 'Marc Jacobs',
    name: 'Marc Jacobs Daisy',
    category: 'Designer',
    region: 'United States',
    countryCode: 'US',
    gender: 'Women',
    description: 'Charming floral fragrance with wild strawberry, violet leaves, jasmine, and white woods.',
    notes: ['floral', 'fruity', 'powdery', 'fresh'],
    aliases: ['marc jacobs daisy', 'daisy marc jacobs', 'daisy marc jacob', 'daisy jacobs', 'daisy jacob', 'daisy by marc jacobs', 'mj daisy', 'daisy eau so fresh', 'daisy edp', 'daisy edt', 'daisy'],
  },
  {
    brand: 'Marc Jacobs',
    name: 'Marc Jacobs Perfect',
    category: 'Designer',
    region: 'United States',
    countryCode: 'US',
    gender: 'Women',
    description: 'Playful floral harmony of juicy rhubarb, daffodil, almond milk, and cashmeran.',
    notes: ['floral', 'sweet', 'fresh', 'fruity'],
    aliases: ['marc jacobs perfect', 'perfect marc jacobs', 'mj perfect'],
  },

  // ── Kilian ──
  {
    brand: 'Kilian',
    name: "Kilian Angels' Share",
    category: 'Niche / Luxury',
    region: 'France',
    countryCode: 'FR',
    gender: 'Unisex',
    description: 'Intoxicating cognac, cinnamon, oak wood, tonka bean, and praline gourmand masterpiece.',
    notes: ['sweet', 'spicy', 'gourmand', 'woody', 'amber'],
    aliases: ["kilian angels' share", 'kilian angels share', "kilian angel's share", 'kilian angel share', "angels' share", 'angels share', 'angel share'],
  },

  // ── Alchemist Fragrance (Indonesia) ──
  {
    brand: 'Alchemist',
    name: 'Alchemist Out West',
    category: 'Local Brand',
    region: 'Indonesia',
    countryCode: 'ID',
    gender: 'Unisex',
    description: 'Earthy woody elegance with yuzu, bergamot, cedarwood, and vetiver.',
    notes: ['woody', 'earthy', 'citrus', 'aromatic'],
    aliases: ['alchemist out west', 'out west alchemist', 'out west'],
  },
  {
    brand: 'Alchemist',
    name: 'Alchemist Powder Room',
    category: 'Local Brand',
    region: 'Indonesia',
    countryCode: 'ID',
    gender: 'Women / Unisex',
    description: 'Clean crisp powdery floral with fresh watery notes, rose, and comforting skin musk.',
    notes: ['powdery', 'floral', 'fresh', 'clean'],
    aliases: ['alchemist powder room', 'powder room alchemist', 'powder room'],
  },
  {
    brand: 'Alchemist',
    name: 'Alchemist Pink Laundry',
    category: 'Local Brand',
    region: 'Indonesia',
    countryCode: 'ID',
    gender: 'Women / Unisex',
    description: 'Clean aldehydes, delicate rose, and soft sandalwood reminiscent of fresh luxury linen.',
    notes: ['clean', 'floral', 'fresh', 'powdery'],
    aliases: ['alchemist pink laundry', 'pink laundry alchemist', 'pink laundry'],
  },

  // ── Maison Margiela ──
  {
    brand: 'Maison Margiela',
    name: 'Maison Margiela By the Fireplace',
    category: 'Niche / Luxury',
    region: 'France',
    countryCode: 'FR',
    gender: 'Unisex',
    description: 'Comforting warmth of a crackling fire with chestnut, clove, orange blossom, and vanilla.',
    notes: ['woody', 'smoky', 'sweet', 'spicy', 'vanilla'],
    aliases: ['by the fireplace', 'margiela by the fireplace', 'replica by the fireplace', 'maison margiela by the fireplace', 'btfp'],
  },
  {
    brand: 'Maison Margiela',
    name: 'Maison Margiela Jazz Club',
    category: 'Niche / Luxury',
    region: 'France',
    countryCode: 'FR',
    gender: 'Men / Unisex',
    description: 'Atmospheric heady rum, tobacco leaf, pink pepper, and vanilla cocktail.',
    notes: ['tobacco', 'sweet', 'spicy', 'woody'],
    aliases: ['jazz club', 'replica jazz club', 'margiela jazz club', 'maison margiela jazz club'],
  },
  {
    brand: 'Maison Margiela',
    name: 'Maison Margiela Lazy Sunday Morning',
    category: 'Niche / Luxury',
    region: 'France',
    countryCode: 'FR',
    gender: 'Unisex',
    description: 'Silky smooth clean bedsheets with lily of the valley, pear, iris, and white musk.',
    notes: ['clean', 'floral', 'powdery', 'fresh'],
    aliases: ['lazy sunday morning', 'replica lazy sunday morning', 'margiela lazy sunday morning'],
  },

  // ── Mykonos (Indonesia) ──
  {
    brand: 'Mykonos',
    name: 'Mykonos Matcha Latte',
    category: 'Local Brand',
    region: 'Indonesia',
    countryCode: 'ID',
    gender: 'Unisex',
    description: 'Creamy soothing matcha, warm white chocolate, milk, and soft musk.',
    notes: ['gourmand', 'sweet', 'green', 'fresh'],
    aliases: ['mykonos matcha latte', 'matcha latte mykonos', 'matcha latte'],
  },
  {
    brand: 'Mykonos',
    name: 'Mykonos Baby Love',
    category: 'Local Brand',
    region: 'Indonesia',
    countryCode: 'ID',
    gender: 'Unisex',
    description: 'Nostalgic gentle baby powder scent with violet, rose, and comforting musk.',
    notes: ['powdery', 'floral', 'fresh', 'clean'],
    aliases: ['mykonos baby love', 'baby love mykonos', 'baby love'],
  },

  // ── Jo Malone London ──
  {
    brand: 'Jo Malone',
    name: 'Jo Malone English Pear & Freesia',
    category: 'Designer / Luxury',
    region: 'United Kingdom',
    countryCode: 'GB',
    gender: 'Women / Unisex',
    description: 'Sensuous freshness of just-ripe pears wrapped in white freesias and mellowed by amber.',
    notes: ['fruity', 'floral', 'fresh', 'powdery'],
    aliases: ['english pear & freesia', 'english pear and freesia', 'english pear', 'jo malone english pear', 'jo malone english pear & freesia', 'jm english pear'],
  },
  {
    brand: 'Jo Malone',
    name: 'Jo Malone Wood Sage & Sea Salt',
    category: 'Designer / Luxury',
    region: 'United Kingdom',
    countryCode: 'GB',
    gender: 'Unisex',
    description: 'Windswept shore with mineral waves, sea salt, and woody aromatic earthiness of sage.',
    notes: ['aromatic', 'fresh', 'aquatic', 'woody'],
    aliases: ['wood sage & sea salt', 'wood sage and sea salt', 'wood sage', 'jo malone wood sage', 'jo malone wood sage & sea salt', 'jm wood sage'],
  },

  // ── Le Labo ──
  {
    brand: 'Le Labo',
    name: 'Le Labo Santal 33',
    category: 'Niche / Luxury',
    region: 'United States',
    countryCode: 'US',
    gender: 'Unisex',
    description: 'Iconic smoky sandalwood, cedarwood, cardamom, violet, and leather scent.',
    notes: ['woody', 'leather', 'spicy', 'powdery', 'aromatic'],
    aliases: ['le labo santal 33', 'santal 33', 'santal33', 'le labo santal'],
  },
  {
    brand: 'Le Labo',
    name: 'Le Labo Another 13',
    category: 'Niche / Luxury',
    region: 'United States',
    countryCode: 'US',
    gender: 'Unisex',
    description: 'Hypnotic second-skin molecular amber with ambroxan, jasmine, moss, and ambrette.',
    notes: ['amber', 'musk', 'woody', 'fresh'],
    aliases: ['le labo another 13', 'another 13', 'another13', 'le labo another'],
  },

  // ── Dior ──
  {
    brand: 'Dior',
    name: 'Dior Miss Dior',
    category: 'Designer / Luxury',
    region: 'France',
    countryCode: 'FR',
    gender: 'Women',
    description: 'Romantic floral bouquet with centifolia rose, lily of the valley, peony, and tender woods.',
    notes: ['floral', 'fresh', 'sweet', 'powdery'],
    aliases: ['miss dior', 'dior miss dior', 'miss dior edp', 'miss dior blooming bouquet', 'blooming bouquet'],
  },

  // ── Chanel ──
  {
    brand: 'Chanel',
    name: 'Chanel Coco Mademoiselle',
    category: 'Designer / Luxury',
    region: 'France',
    countryCode: 'FR',
    gender: 'Women',
    description: 'Vibrant orange, jasmine, May rose, patchouli, and vetiver defining modern elegance.',
    notes: ['citrus', 'floral', 'patchouli', 'sweet'],
    aliases: ['coco mademoiselle', 'chanel coco mademoiselle', 'coco mademoiselle edp', 'coco mademoiselle intense'],
  },

  // ── Victoria\'s Secret ──
  {
    brand: "Victoria's Secret",
    name: "Victoria's Secret Bombshell",
    category: 'Designer',
    region: 'United States',
    countryCode: 'US',
    gender: 'Women',
    description: 'Sparkling purple passion fruit, Shangri-la peony, and vanilla orchid.',
    notes: ['fruity', 'floral', 'sweet', 'fresh'],
    aliases: ["victoria's secret bombshell", 'vs bombshell', 'victorias secret bombshell', 'bombshell'],
  },

  // ── Hermès ──
  {
    brand: 'Hermès',
    name: "Hermès Twilly d'Hermès",
    category: 'Designer / Luxury',
    region: 'France',
    countryCode: 'FR',
    gender: 'Women',
    description: 'Playful ginger, tuberose, and sandalwood woven with feminine spirit.',
    notes: ['spicy', 'floral', 'woody', 'warm'],
    aliases: ["twilly d'hermès", "twilly d'hermes", 'twilly hermes', 'hermes twilly', 'hermes d twilly', 'twilly'],
  },

  // ── Evangeline (Indonesia) ──
  {
    brand: 'Evangeline',
    name: 'Evangeline Black Sakura',
    category: 'Local Brand',
    region: 'Indonesia',
    countryCode: 'ID',
    gender: 'Women / Unisex',
    description: 'Sweet berry, cherry blossom, and soft musk popular in Indonesian fragrance community.',
    notes: ['floral', 'fruity', 'sweet', 'fresh'],
    aliases: ['evangeline black sakura', 'black sakura evangeline', 'black sakura'],
  },

  // ── Yves Saint Laurent ──
  {
    brand: 'Yves Saint Laurent',
    name: 'Yves Saint Laurent Libre',
    category: 'Designer / Luxury',
    region: 'France',
    countryCode: 'FR',
    gender: 'Women',
    description: 'Sensual Moroccan orange blossom, French diva lavender, and bold vanilla bourbon.',
    notes: ['floral', 'sweet', 'citrus', 'vanilla'],
    aliases: ['ysl libre', 'libre ysl', 'libre intense', 'libre edp', 'libre edt', 'libre'],
  },

  // ── Parfums de Marly ──
  {
    brand: 'Parfums de Marly',
    name: 'Parfums de Marly Layton',
    category: 'Niche / Luxury',
    region: 'France',
    countryCode: 'FR',
    gender: 'Men / Unisex',
    description: 'Addictive blend of crisp apple, lavender, vanilla, cardamom, and sandalwood.',
    notes: ['spicy', 'sweet', 'vanilla', 'woody'],
    aliases: ['pdm layton', 'parfums de marly layton', 'layton pdm', 'layton'],
  },
  {
    brand: 'Parfums de Marly',
    name: 'Parfums de Marly Delina',
    category: 'Niche / Luxury',
    region: 'France',
    countryCode: 'FR',
    gender: 'Women',
    description: 'Sculptural Turkish rose, lychee, rhubarb, peony, and creamy vanilla cashmere.',
    notes: ['floral', 'fruity', 'sweet', 'powdery'],
    aliases: ['pdm delina', 'parfums de marly delina', 'delina pdm', 'delina', 'delina exclusif'],
  },

  // ── Glossier ──
  {
    brand: 'Glossier',
    name: 'Glossier You',
    category: 'Designer',
    region: 'United States',
    countryCode: 'US',
    gender: 'Unisex',
    description: 'Sparkling pink pepper, powdery iris, and warm creamy ambrox that smells like clean skin.',
    notes: ['powdery', 'musk', 'fresh', 'spicy'],
    aliases: ['glossier you', 'you glossier', 'glossier you edp'],
  },

  // ── Lattafa ──
  {
    brand: 'Lattafa',
    name: 'Lattafa Khamrah',
    category: 'Middle East',
    region: 'Middle East',
    countryCode: 'AE',
    gender: 'Unisex',
    description: 'Decadent cinnamon, nutmeg, dates, praline, vanilla, and roasted tonka bean.',
    notes: ['sweet', 'spicy', 'gourmand', 'amber'],
    aliases: ['lattafa khamrah', 'khamrah lattafa', 'khamrah qahwa', 'khamrah'],
  },
  {
    brand: 'Lattafa',
    name: 'Lattafa Yara',
    category: 'Middle East',
    region: 'Middle East',
    countryCode: 'AE',
    gender: 'Women',
    description: 'Fluffy strawberry milkshake with vanilla, tropical fruits, and heliotrope.',
    notes: ['sweet', 'gourmand', 'fruity', 'powdery'],
    aliases: ['lattafa yara', 'yara lattafa', 'yara candy', 'yara'],
  },

  // ── Armaf ──
  {
    brand: 'Armaf',
    name: 'Armaf Club de Nuit Intense Man',
    category: 'Middle East',
    region: 'Middle East',
    countryCode: 'AE',
    gender: 'Men',
    description: 'Smoky birch, lemon, blackcurrant, and ambergris inspired by iconic masculine aventus DNA.',
    notes: ['citrus', 'fruity', 'woody', 'smoky'],
    aliases: ['club de nuit intense man', 'club de nuit intense', 'armaf cdnim', 'cdnim'],
  },

  // ── Diptyque ──
  {
    brand: 'Diptyque',
    name: 'Diptyque Philosykos',
    category: 'Niche / Luxury',
    region: 'France',
    countryCode: 'FR',
    gender: 'Unisex',
    description: 'Natural green fig tree in summer with fig leaves, green fruit, milky sap, and cedar bark.',
    notes: ['green', 'woody', 'fruity', 'fresh'],
    aliases: ['diptyque philosykos', 'philosykos diptyque', 'philosykos'],
  },
  {
    brand: 'Diptyque',
    name: 'Diptyque Fleur de Peau',
    category: 'Niche / Luxury',
    region: 'France',
    countryCode: 'FR',
    gender: 'Unisex',
    description: 'Intimate skin musk woven with powdery iris, ambrette seeds, and pink peppercorn.',
    notes: ['musk', 'powdery', 'floral', 'fresh'],
    aliases: ['diptyque fleur de peau', 'fleur de peau diptyque', 'fleur de peau'],
  },

  // ── Maison Francis Kurkdjian ──
  {
    brand: 'Maison Francis Kurkdjian',
    name: 'Maison Francis Kurkdjian Grand Soir',
    category: 'Niche / Luxury',
    region: 'France',
    countryCode: 'FR',
    gender: 'Unisex',
    description: 'Sensual warm Parisian night with radiant benzoin, amber, tonka bean, and vanilla.',
    notes: ['amber', 'vanilla', 'sweet', 'warm'],
    aliases: ['mfk grand soir', 'grand soir mfk', 'grand soir'],
  },
];


// Combine base products with supplementary products (avoiding duplicates)
const existingNames = new Set();
const allProducts = [];

for (const p of PERFUME_PRODUCTS) {
  let item = p;
  if (p.name === 'Tom Ford Ombré Leather') {
    item = {
      ...p,
      aliases: ['tom ford ombre leather', 'tom ford ombré leather', 'ombre leather', 'ombré leather']
    };
  } else if (p.name === 'YSL MYSLF') {
    item = {
      ...p,
      aliases: ['ysl myslf', 'ysl myself', 'myslf']
    };
  } else if (p.name === 'Maison Margiela Replica Jazz Club') {
    item = {
      ...p,
      name: 'Maison Margiela Jazz Club',
      aliases: ['replica jazz club', 'jazz club', 'margiela jazz club', 'maison margiela jazz club']
    };
  }
  allProducts.push(item);
  existingNames.add(item.name.toLowerCase());
  existingNames.add(p.name.toLowerCase());
}

for (const p of SUPPLEMENTARY_PRODUCTS) {
  if (!existingNames.has(p.name.toLowerCase())) {
    allProducts.push(p);
    existingNames.add(p.name.toLowerCase());
  }
}

for (const product of allProducts) {
  const { brand, name, region, countryCode, category, gender, description, notes, aliases } = product;

  // Filter out any alias that is strictly identical to the brand name
  // (e.g., "creed", "prada", "tom ford" should not match a single specific model)
  const cleanedAliases = (aliases || []).filter(a => a.toLowerCase().trim() !== brand.toLowerCase().trim());

  // Initialize brand if new
  if (!catalog.brands[brand]) {
    catalog.brands[brand] = {
      category: category,
      region: region,
      countryCode: countryCode,
      models: {},
    };
  }

  const modelName = extractModelName(name, brand);
  const ambiguous = isAmbiguousModel(modelName);

  catalog.brands[brand].models[modelName] = {
    full_name: name,
    aliases: cleanedAliases,
    notes: notes || [],
    gender: gender || 'Unisex',
    description: description || '',
    is_ambiguous: ambiguous,
  };

  totalModels++;
  if (ambiguous) ambiguousCount++;
}

// ─── Write Output ───────────────────────────────────────────────────
fs.writeFileSync(outputFile, JSON.stringify(catalog, null, 2));

// ─── Summary ────────────────────────────────────────────────────────
const brandCount = Object.keys(catalog.brands).length;

console.log('─'.repeat(60));
console.log(`✅ Catalog generated successfully!`);
console.log(`   📊 ${brandCount} brands, ${totalModels} models`);
console.log(`   ⚠️  ${ambiguousCount} models flagged as ambiguous (require proximity validation)`);
console.log(`   📁 Output: ${outputFile}\n`);

// Show ambiguous models for verification
console.log(`🔍 Ambiguous models (proximity validation required):`);
for (const [brandName, brandData] of Object.entries(catalog.brands)) {
  for (const [modelName, modelData] of Object.entries(brandData.models)) {
    if (modelData.is_ambiguous) {
      console.log(`   ⚠️  ${brandName} → "${modelName}"`);
    }
  }
}
console.log('');
