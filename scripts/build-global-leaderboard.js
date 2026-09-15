import fs from 'node:fs';
import chain from 'stream-chain';
import { parser } from 'stream-json';
import { pick } from 'stream-json/filters/pick.js';
import { streamArray } from 'stream-json/streamers/stream-array.js';

// ─── Configuration ──────────────────────────────────────────────────
const inputFileName = process.argv[2] || 'raw-export.json';
const outputFile = process.argv[3] || 'app/public/data/leaderboard.json';
const CONTEXT_WINDOW = 3; // Context messages before and after

console.log(`\n🌐 GLOBAL PERFUMERY LEADERBOARD BUILDER`);
console.log(`📄 Scanning entire raw export: ${inputFileName}`);
console.log(`🎯 Extracting all perfumes across the entire Discord archive...\n`);

// ─── Perfume Catalog ────────────────────────────────────────────────
function loadCatalogProducts() {
  const catalogPath = 'perfume_catalog.json';
  if (fs.existsSync(catalogPath)) {
    try {
      const catalogData = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
      const list = [];
      for (const [brand, bData] of Object.entries(catalogData.brands)) {
        const brandLower = brand.toLowerCase().trim();
        for (const [model, mData] of Object.entries(bData.models)) {
          const modelLower = model.toLowerCase().trim();
          if (brandLower === modelLower) continue;

          list.push({
            name: mData.full_name || `${brand} ${model}`,
            brand: brand,
            region: bData.region,
            countryCode: bData.countryCode,
            category: bData.category,
            gender: mData.gender,
            description: mData.description,
            notes: mData.notes || [],
            aliases: mData.aliases || [],
            is_ambiguous: mData.is_ambiguous || false,
          });
        }
      }
      if (list.length > 0) {
        console.log(`📋 Loaded ${list.length} products across ${Object.keys(catalogData.brands).length} brands from ${catalogPath}`);
        return list;
      }
    } catch (e) {
      console.warn('⚠️ Could not load perfume_catalog.json:', e.message);
    }
  }
  return [];
}

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'eau', 'de', 'du', 'des', 'la', 'le', 'les',
  'pour', 'femme', 'homme', 'parfum', 'toilette', 'cologne', 'edp', 'edt'
]);

const GRAMMAR_PHRASES = new Set([
  'i am', 'to be', 'made in', 'out of', 'as well', 'so much', 'on skin', 'all day'
]);

const GENERIC_OR_NOTES = new Set([
  'for', 'men', 'man', 'woman', 'women', 'him', 'her', 'and', 'the', 'with', 'about',
  'just', 'made', 'now', 'to', 'be', 'else', 'skin', 'notes', 'enjoy', 'life', 'one',
  'two', 'touch', 'sign', 'free', 'spirit', 'hero', 'cold', 'west', 'today', 'all',
  'you', 'me', 'my', 'love', 'day', 'night', 'summer', 'winter', 'spring', 'fall',
  'pure', 'clean', 'fresh', 'intense', 'extreme', 'sport', 'ice', 'dark', 'white',
  'black', 'red', 'blue', 'gold', 'silver', 'pink', 'green', 'yellow', 'delicate',
  'water', 'fire', 'tea', 'coffee', 'rose', 'vanilla', 'oud', 'musk', 'amber',
  'floral', 'woody', 'citrus', 'sweet', 'fruity', 'powdery', 'spicy', 'aquatic',
  'leather', 'tobacco', 'fragrance', 'perfume', 'cologne', 'scent'
]);

const ICONIC_STANDALONE = new Set([
  'cloud', 'baccarat rouge 540', 'br 540', 'br540', 'aventus', 'sauvage', 'eros',
  'khamrah', 'yara', 'layton', 'delina', 'angels share', "angels' share", 'jazz club',
  'by the fireplace', 'santal 33', 'lost cherry', 'black phantom', 'spicebomb',
  'farhampton', 'orgasm', 'solaris', 'bleu de chanel', 'club de nuit intense',
  'la vie est belle', 'black opium', 'coco mademoiselle', 'tobacco vanille',
  'grand soir', 'another 13', 'the noir 29', 'the matcha 26', 'hacivat', 'ani',
  'cedrat boise', 'oud wood', 'silver mountain water', 'green irish tweed'
]);

const allProducts = loadCatalogProducts();

const sortedCatalog = [...allProducts].sort((a, b) => {
  const aMax = Math.max(...a.aliases.map(al => al.length), 0);
  const bMax = Math.max(...b.aliases.map(al => al.length), 0);
  return bMax - aMax;
});

// Compile regexes and inverted token index once for high-speed streaming matching
const anchorMap = new Map();

const catalogMatchers = sortedCatalog.map((entry, entryIndex) => {
  const brandLower = entry.brand.toLowerCase().trim();
  const brandTokens = (brandLower.match(/[a-z0-9']+/g) || []).filter(w =>
    !STOPWORDS.has(w) && !['fragrance', 'fragrances', 'perfume', 'perfumes', 'perfumery', 'parfums', 'parfum', 'house', 'co'].includes(w) && w.length >= 3
  );
  const brandTokenSet = new Set(brandTokens);
  const brandRegex = new RegExp('\\b' + brandLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');

  const compiledAliases = [];

  for (const alias of entry.aliases) {
    const aliasClean = alias.toLowerCase().trim();
    if (GRAMMAR_PHRASES.has(aliasClean)) continue;

    const escaped = aliasClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp('\\b' + escaped + '\\b', 'i');
    const aliasTokens = (aliasClean.match(/[a-z0-9']+/g) || []).filter(w => w.length >= 2 || /\d/.test(w));
    if (aliasTokens.length === 0) continue;

    const hasBrand = aliasClean.includes(brandLower) || aliasTokens.some(t => brandTokenSet.has(t));
    const isAllGeneric = aliasTokens.every(t => GENERIC_OR_NOTES.has(t));
    const isAmbiguous = (entry.is_ambiguous || isAllGeneric) && !hasBrand;

    compiledAliases.push({
      regex,
      raw: aliasClean,
      tokens: aliasTokens,
      hasBrand,
      isAllGeneric,
      isAmbiguous,
    });

    // Find best anchor token to index this entry
    const candidateAnchors = aliasTokens.filter(t => !STOPWORDS.has(t) && t.length >= 3);
    const fallbackAnchors = aliasTokens.filter(t => t.length >= 2);
    const anchors = candidateAnchors.length > 0 ? candidateAnchors : (fallbackAnchors.length > 0 ? fallbackAnchors : aliasTokens);
    const bestAnchor = anchors.reduce((a, b) => a.length >= b.length ? a : b);

    if (!anchorMap.has(bestAnchor)) {
      anchorMap.set(bestAnchor, []);
    }
    anchorMap.get(bestAnchor).push(entryIndex);
  }

  return {
    entry,
    brandLower,
    brandTokens,
    brandTokenSet,
    brandRegex,
    compiledAliases,
  };
});

// Deduplicate entry indices per anchor
for (const [anchor, indices] of anchorMap.entries()) {
  anchorMap.set(anchor, Array.from(new Set(indices)));
}

console.log(`⚡ Inverted candidate index compiled: ${anchorMap.size} unique anchor tokens across ${catalogMatchers.length} models\n`);

function findPerfumesInText(text) {
  if (!text) return [];
  const textLower = text.toLowerCase();
  const tokens = textLower.match(/[a-z0-9']+/g);
  if (!tokens) return [];

  const tokenSet = new Set(tokens);
  const candidateIndices = new Set();
  for (let i = 0; i < tokens.length; i++) {
    const list = anchorMap.get(tokens[i]);
    if (list) {
      for (let j = 0; j < list.length; j++) {
        candidateIndices.add(list[j]);
      }
    }
  }
  if (candidateIndices.size === 0) return [];

  // Sort candidate indices to preserve precedence
  const sortedCandidates = Array.from(candidateIndices).sort((a, b) => a - b);
  const matched = new Set();

  for (let c = 0; c < sortedCandidates.length; c++) {
    const matcher = catalogMatchers[sortedCandidates[c]];
    if (matched.has(matcher.entry.name)) continue;

    for (let a = 0; a < matcher.compiledAliases.length; a++) {
      const aliasInfo = matcher.compiledAliases[a];

      // Fast token set subset check before regex
      let allPresent = true;
      for (let t = 0; t < aliasInfo.tokens.length; t++) {
        if (!tokenSet.has(aliasInfo.tokens[t])) {
          allPresent = false;
          break;
        }
      }
      if (!allPresent) continue;

      // Ambiguity check: aliases without brand require brand presence in text unless iconic
      if (!aliasInfo.hasBrand) {
        const hasBrandInText = matcher.brandTokens.length === 1
          ? tokenSet.has(matcher.brandTokens[0])
          : matcher.brandRegex.test(textLower);

        if (!hasBrandInText) {
          const isIconic = ICONIC_STANDALONE.has(aliasInfo.raw) || ICONIC_STANDALONE.has(matcher.entry.name.toLowerCase());
          if (!isIconic) {
            continue;
          }
        }
      }

      if (aliasInfo.regex.test(textLower)) {
        matched.add(matcher.entry.name);
        break;
      }
    }
  }

  return [...matched];
}

// ─── Create Message Stream ──────────────────────────────────────────
function createMessageStream() {
  return chain([
    fs.createReadStream(inputFileName),
    parser(),
    pick({ filter: 'messages' }),
    streamArray(),
  ]);
}

// ─── Pass 1: Stream and Match All Messages ──────────────────────────
async function processAllMessages() {
  const startTime = Date.now();
  const perfumeStats = new Map();
  const authorStats = new Map();
  const recentBuffer = []; // Sliding buffer for context
  const perfumeThreads = new Map(); // perfumeName -> array of sample threads
  const replyMap = new Map(); // childId -> parentId
  const messagesById = new Map(); // id -> compact message
  let totalMessages = 0;
  let totalPerfumeHits = 0;

  // Initialize stats map for all catalog items
  for (const entry of allProducts) {
    perfumeStats.set(entry.name, {
      name: entry.name,
      brand: entry.brand,
      region: entry.region,
      countryCode: entry.countryCode,
      category: entry.category,
      gender: entry.gender,
      description: entry.description,
      notes: entry.notes,
      topNotes: entry.notes,
      mentionCount: 0,
      threadCount: 0,
      uniqueAuthors: 0,
      authors: new Set(),
      sampleMentions: [],
      threadTimestamps: [],
      coMentions: new Map(),
    });
    perfumeThreads.set(entry.name, []);
  }

  await new Promise((resolve, reject) => {
    const pipeline = createMessageStream();

    pipeline.on('data', ({ value: msg }) => {
      totalMessages++;

      const authorName = msg.author ? msg.author.nickname || msg.author.name : 'Unknown';
      const authorUsername = msg.author ? msg.author.name : 'Unknown';
      const content = msg.content || '';
      const timestamp = msg.timestamp;
      const msgId = msg.id;

      if (msg.reference && msg.reference.messageId) {
        replyMap.set(msgId, msg.reference.messageId);
      }

      // Compact message for thread assembly
      const compactMsg = {
        id: msgId,
        type: msg.type,
        author: authorName,
        authorUsername,
        timestamp,
        content,
        reference: msg.reference ? msg.reference.messageId : null,
        attachments: (msg.attachments || []).map(a => ({ fileName: a.fileName, url: a.url })),
        embeds: (msg.embeds || []).map(e => ({ title: e.title, description: e.description, url: e.url })),
      };

      // Keep recent messages in buffer for surrounding context
      recentBuffer.push(compactMsg);
      if (recentBuffer.length > CONTEXT_WINDOW * 2 + 1) {
        recentBuffer.shift();
      }

      // Track author overall activity
      if (!authorStats.has(authorUsername)) {
        authorStats.set(authorUsername, {
          name: authorName,
          username: authorUsername,
          messageCount: 0,
          perfumesMentioned: new Set(),
        });
      }
      const aStat = authorStats.get(authorUsername);
      aStat.messageCount++;

      // Check for perfume matches in this message
      const perfumesFound = findPerfumesInText(content);

      if (perfumesFound.length > 0) {
        totalPerfumeHits++;
        messagesById.set(msgId, compactMsg);

        for (const pName of perfumesFound) {
          const stats = perfumeStats.get(pName);
          if (stats) {
            stats.mentionCount++;
            stats.threadCount++;
            stats.authors.add(authorUsername);
            stats.threadTimestamps.push(timestamp);
            aStat.perfumesMentioned.add(pName);

            // Sample quotes
            if (stats.sampleMentions.length < 8 && content.length > 15) {
              stats.sampleMentions.push({
                author: authorName,
                content: content.length > 250 ? content.substring(0, 250) + '...' : content,
                timestamp,
              });
            }

            // Co-mentions with other perfumes in the same message
            for (const otherName of perfumesFound) {
              if (otherName !== pName) {
                stats.coMentions.set(otherName, (stats.coMentions.get(otherName) || 0) + 1);
              }
            }

            // Save conversation thread sample
            const threadsList = perfumeThreads.get(pName);
            if (threadsList && threadsList.length < 15) {
              const contextBefore = recentBuffer.slice(0, recentBuffer.length - 1);
              threadsList.push({
                keywordMessage: compactMsg,
                parentChain: [],
                replies: [],
                contextBefore,
                contextAfter: [],
              });
            }
          }
        }
      }

      if (totalMessages % 20000 === 0) {
        const elapsedSec = (Date.now() - startTime) / 1000;
        const rate = Math.round(totalMessages / (elapsedSec || 1));
        console.log(`   ... scanned ${totalMessages.toLocaleString()} messages (${totalPerfumeHits.toLocaleString()} hits) [${rate.toLocaleString()} msg/sec]`);
      }
    });

    pipeline.on('end', () => {
      console.log(`\n✅ Scan complete: ${totalMessages.toLocaleString()} total messages processed.`);
      console.log(`🎯 ${totalPerfumeHits.toLocaleString()} total perfume mentions detected.`);
      resolve();
    });

    pipeline.on('error', reject);
  });

  // ─── Format & Rank ────────────────────────────────────────────────
  const allThreads = [];
  for (const [pName, list] of perfumeThreads) {
    allThreads.push(...list);
  }

  const ranked = [...perfumeStats.values()]
    .filter(stats => stats.mentionCount > 0) // Only include discussed perfumes
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
      directKeywordMentions: stats.mentionCount,
      uniqueAuthors: stats.authors.size,
      notes: stats.notes,
      topNotes: stats.notes,
      sampleMentions: stats.sampleMentions,
      coMentions: [...stats.coMentions.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([name, count]) => ({ name, count })),
      firstMentioned: stats.threadTimestamps.sort()[0] || new Date().toISOString(),
      lastMentioned: stats.threadTimestamps.sort().pop() || new Date().toISOString(),
    }));

  // ─── Regional breakdown ───────────────────────────────────────────
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

  // ─── Scent Category stats ─────────────────────────────────────────
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

  // ─── Top Contributors ─────────────────────────────────────────────
  const topContributors = [...authorStats.values()]
    .filter(a => a.perfumesMentioned.size > 0)
    .sort((a, b) => b.messageCount - a.messageCount)
    .slice(0, 20)
    .map(a => ({
      name: a.name,
      username: a.username,
      messageCount: a.messageCount,
      perfumesMentioned: a.perfumesMentioned.size,
    }));

  // ─── Save output ──────────────────────────────────────────────────
  const output = {
    meta: {
      keyword: 'Global (All Discord Discussions)',
      totalMessages,
      totalThreads: allThreads.length,
      totalPerfumesFound: ranked.length,
      generatedAt: new Date().toISOString(),
    },
    leaderboard: ranked,
    regions: regionStats,
    categories: categoryStats,
    topContributors,
    threads: allThreads,
  };

  const outputDir = outputFile.substring(0, outputFile.lastIndexOf('/'));
  if (outputDir) fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('─'.repeat(60));
  console.log(`🏆 Global Perfume Leaderboard — Top 25 (Across Entire Discord History)\n`);
  ranked.slice(0, 25).forEach(p => {
    const medal = p.rank <= 3 ? ['🥇', '🥈', '🥉'][p.rank - 1] : `${p.rank}.`.padStart(3);
    const flag = p.region === 'Indonesia' ? '🇮🇩' : p.region === 'Middle East' ? '🇦🇪' : p.region === 'France' ? '🇫🇷' : p.region === 'Italy' ? '🇮🇹' : p.region === 'Niche Houses' ? '👑' : '🌎';
    console.log(`${medal} ${flag} ${p.name.padEnd(36)} [${p.brand.padEnd(16)}] ${String(p.mentionCount).padStart(4)} mentions  (${p.uniqueAuthors} users)`);
  });

  console.log(`\n📁 Output: ${outputFile}`);
  console.log(`📊 ${ranked.length} distinct perfume products ranked from ${totalMessages.toLocaleString()} total messages`);
  console.log(`⏱  Done in ${elapsed}s\n`);
}

processAllMessages().catch(err => {
  console.error('❌ Error processing all messages:', err);
  process.exit(1);
});
