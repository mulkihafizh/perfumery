import fs from 'node:fs';

// ─── Configuration ──────────────────────────────────────────────────
const discordLeaderboardPath = process.argv[2] || 'app/public/data/leaderboard.json';
const redditRankingsPath = process.argv[3] || 'reddit_perfume_rankings.json';
const catalogPath = process.argv[4] || 'perfume_catalog.json';
const outputPath = process.argv[5] || 'app/public/data/leaderboard.json';

console.log(`\n🔗 UNIFIED LEADERBOARD BUILDER`);
console.log(`═${'═'.repeat(58)}`);
console.log(`💬 Discord data:  ${discordLeaderboardPath}`);
console.log(`🔴 Reddit data:   ${redditRankingsPath}`);
console.log(`📋 Catalog:       ${catalogPath}`);
console.log(`📁 Output:        ${outputPath}\n`);

// ─── Load Inputs ────────────────────────────────────────────────────

let discordData = null;
let redditData = null;
let catalog = null;

// Discord leaderboard (may not exist on first run)
if (fs.existsSync(discordLeaderboardPath)) {
  discordData = JSON.parse(fs.readFileSync(discordLeaderboardPath, 'utf8'));
  console.log(`✅ Discord: ${discordData.leaderboard.length} perfumes, ${discordData.meta.totalMessages.toLocaleString()} messages`);
} else {
  console.log(`⚠️  Discord leaderboard not found at ${discordLeaderboardPath} — building Reddit-only output`);
  discordData = {
    meta: { keyword: '', totalMessages: 0, totalThreads: 0, totalPerfumesFound: 0, generatedAt: new Date().toISOString() },
    leaderboard: [],
    regions: {},
    categories: {},
    topContributors: [],
    threads: [],
  };
}

// Reddit rankings (may not exist if extractor hasn't been run)
if (fs.existsSync(redditRankingsPath)) {
  redditData = JSON.parse(fs.readFileSync(redditRankingsPath, 'utf8'));
  console.log(`✅ Reddit:  ${redditData.length} year×perfume entries`);
} else {
  console.log(`⚠️  Reddit rankings not found at ${redditRankingsPath} — keeping Discord-only output`);
  redditData = [];
}

// Catalog for metadata fallback
if (fs.existsSync(catalogPath)) {
  catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  console.log(`✅ Catalog: ${Object.keys(catalog.brands).length} brands loaded\n`);
} else {
  console.log(`⚠️  Catalog not found — proceeding without metadata fallback\n`);
  catalog = { brands: {} };
}

// ─── Step 1: Index Discord data by perfume name ─────────────────────

const discordMap = new Map();
for (const entry of discordData.leaderboard) {
  discordMap.set(entry.name, entry);
}

// ─── Step 2: Aggregate Reddit data by perfume ───────────────────────
// Group the flat (year, brand, model) entries into per-perfume summaries

const redditMap = new Map();

for (const entry of redditData) {
  const name = entry.full_name || `${entry.brand} ${entry.model}`;

  if (!redditMap.has(name)) {
    redditMap.set(name, {
      brand: entry.brand,
      model: entry.model,
      full_name: name,
      category: entry.category,
      region: entry.region,
      totalMentions: 0,
      yearlyBreakdown: {},
      accordDistribution: {},
      sampleMentions: [],
    });
  }

  const agg = redditMap.get(name);

  // Sum mentions
  agg.totalMentions += entry.mention_count;

  // Collect sample mentions
  if (entry.sample_mentions && Array.isArray(entry.sample_mentions)) {
    for (const sm of entry.sample_mentions) {
      if (agg.sampleMentions.length < 15) {
        agg.sampleMentions.push({
          author: sm.author || '[anonymous]',
          content: sm.content,
          timestamp: sm.timestamp,
          source: 'reddit',
          url: sm.url || (sm.permalink ? `https://www.reddit.com${sm.permalink}` : ''),
          score: sm.score || 1,
          id: sm.id || '',
        });
      }
    }
  }

  // Yearly breakdown
  const year = entry.year;
  agg.yearlyBreakdown[year] = (agg.yearlyBreakdown[year] || 0) + entry.mention_count;

  // Accord distribution (merge across years)
  for (const [accord, count] of Object.entries(entry.accord_distribution || {})) {
    agg.accordDistribution[accord] = (agg.accordDistribution[accord] || 0) + count;
  }
}

console.log(`📊 Reddit aggregated: ${redditMap.size} unique perfumes across all years`);

// ─── Step 3: Build unified entries ──────────────────────────────────
// Union of discord and reddit perfume sets

const allPerfumeNames = new Set([...discordMap.keys(), ...redditMap.keys()]);
const unifiedEntries = [];

for (const name of allPerfumeNames) {
  const discord = discordMap.get(name);
  const reddit = redditMap.get(name);

  // ── Build sources breakdown ─────────────────────────────────
  // Use existing discord source count if reading an already-unified file
  const discordMentions = discord?.sources?.discord?.mentionCount ?? discord?.mentionCount ?? 0;
  const sources = {
    discord: {
      mentionCount: discordMentions,
      threadCount: discord?.threadCount || 0,
      uniqueAuthors: discord?.uniqueAuthors || 0,
    },
    reddit: {
      mentionCount: reddit?.totalMentions || 0,
      yearlyBreakdown: reddit?.yearlyBreakdown || {},
    },
  };

  // ── Combined mention count ──────────────────────────────────
  const combinedMentions = sources.discord.mentionCount + sources.reddit.mentionCount;

  // ── Yearly mentions (combine Discord timestamps + Reddit yearly) ──
  const yearlyMentions = { ...(reddit?.yearlyBreakdown || {}) };

  // Bucket Discord mentions by year from timestamps
  if (discord) {
    const timestamps = [
      ...(discord.sampleMentions || []).map(s => s.timestamp),
      discord.firstMentioned,
      discord.lastMentioned,
    ].filter(Boolean);

    // Use threadTimestamps if available, otherwise estimate from sample timestamps
    if (discord.threadTimestamps) {
      for (const ts of discord.threadTimestamps) {
        try {
          const y = String(new Date(ts).getFullYear());
          yearlyMentions[y] = (yearlyMentions[y] || 0) + 1;
        } catch { /* skip */ }
      }
    } else if (discord.firstMentioned && discord.lastMentioned) {
      // Distribute Discord mentions evenly across its active years
      try {
        const firstYear = new Date(discord.firstMentioned).getFullYear();
        const lastYear = new Date(discord.lastMentioned).getFullYear();
        const span = Math.max(1, lastYear - firstYear + 1);
        const perYear = Math.round(discord.mentionCount / span);
        for (let y = firstYear; y <= lastYear; y++) {
          yearlyMentions[String(y)] = (yearlyMentions[String(y)] || 0) + perYear;
        }
      } catch { /* skip */ }
    }
  }

  // ── Accord distribution (from Reddit) ───────────────────────
  const accordDistribution = reddit?.accordDistribution || {};

  // ── Build unified entry ─────────────────────────────────────
  // Start from Discord entry if it exists (preserves all rich fields),
  // otherwise build from catalog metadata

  let unified;

  if (discord) {
    // Clone Discord entry as base
    unified = { ...discord };
  } else {
    // Reddit-only perfume — pull metadata from catalog
    const catalogMeta = findInCatalog(catalog, name, reddit);

    unified = {
      rank: 0, // Will be set after sorting
      name: name,
      brand: reddit?.brand || catalogMeta.brand || 'Unknown',
      region: reddit?.region || catalogMeta.region || 'Global',
      countryCode: catalogMeta.countryCode || 'GL',
      category: reddit?.category || catalogMeta.category || 'Unknown',
      gender: catalogMeta.gender || 'Unisex',
      description: catalogMeta.description || '',
      mentionCount: 0,
      threadCount: 0,
      directKeywordMentions: 0,
      uniqueAuthors: 0,
      notes: catalogMeta.notes || [],
      topNotes: catalogMeta.notes || [],
      sampleMentions: [],
      coMentions: [],
      firstMentioned: null,
      lastMentioned: null,
    };
  }

  // Override with combined values
  unified.mentionCount = combinedMentions;
  unified.sources = sources;
  unified.accordDistribution = accordDistribution;
  unified.yearlyMentions = yearlyMentions;

  // ── Combine and format sample mentions ──────────────────────
  const discordSamples = (discord?.sampleMentions || [])
    .filter(s => s.source !== 'reddit')
    .map(s => ({
      ...s,
      source: 'discord',
    }));

  const redditSamples = (reddit?.sampleMentions || []).map(s => ({
    ...s,
    source: 'reddit',
  }));

  // Interleave samples up to 12 total
  const mergedSamples = [];
  const maxPerSource = 6;
  const dSlice = discordSamples.slice(0, maxPerSource);
  const rSlice = redditSamples.slice(0, maxPerSource);
  const maxLen = Math.max(dSlice.length, rSlice.length);
  for (let i = 0; i < maxLen; i++) {
    if (rSlice[i]) mergedSamples.push(rSlice[i]);
    if (dSlice[i]) mergedSamples.push(dSlice[i]);
  }
  if (mergedSamples.length < 10) {
    for (const r of redditSamples.slice(maxPerSource)) {
      if (mergedSamples.length >= 12) break;
      mergedSamples.push(r);
    }
    for (const d of discordSamples.slice(maxPerSource)) {
      if (mergedSamples.length >= 12) break;
      mergedSamples.push(d);
    }
  }

  unified.sampleMentions = mergedSamples;

  // Update date range if Reddit extends it
  if (reddit?.yearlyBreakdown) {
    const redditYears = Object.keys(reddit.yearlyBreakdown).sort();
    if (redditYears.length > 0) {
      const redditFirstDate = `${redditYears[0]}-01-01T00:00:00.000Z`;
      const redditLastDate = `${redditYears[redditYears.length - 1]}-12-31T23:59:59.000Z`;

      if (!unified.firstMentioned || new Date(redditFirstDate) < new Date(unified.firstMentioned)) {
        unified.firstMentioned = redditFirstDate;
      }
      if (!unified.lastMentioned || new Date(redditLastDate) > new Date(unified.lastMentioned)) {
        unified.lastMentioned = redditLastDate;
      }
    }
  }

  unifiedEntries.push(unified);
}

// ─── Step 4: Re-rank by combined mentionCount ───────────────────────

unifiedEntries.sort((a, b) => {
  if (b.mentionCount !== a.mentionCount) return b.mentionCount - a.mentionCount;
  if ((b.threadCount || 0) !== (a.threadCount || 0)) return (b.threadCount || 0) - (a.threadCount || 0);
  return (b.sources?.discord?.uniqueAuthors || 0) - (a.sources?.discord?.uniqueAuthors || 0);
});

unifiedEntries.forEach((entry, index) => {
  entry.rank = index + 1;
});

// ─── Step 5: Recompute region and category stats ────────────────────

const regionStats = {};
for (const perfume of unifiedEntries) {
  const r = perfume.region;
  if (!regionStats[r]) {
    regionStats[r] = {
      name: r,
      countryCode: perfume.countryCode,
      count: 0,
      totalMentions: 0,
      topPerfumes: [],
    };
  }
  regionStats[r].count++;
  regionStats[r].totalMentions += perfume.mentionCount;
  if (regionStats[r].topPerfumes.length < 3) {
    regionStats[r].topPerfumes.push(perfume.name);
  }
}

const categoryStats = {};
for (const perfume of unifiedEntries) {
  const notes = perfume.notes || perfume.topNotes || [];
  for (const note of notes) {
    if (!categoryStats[note]) categoryStats[note] = { count: 0, perfumes: [] };
    categoryStats[note].count++;
    if (categoryStats[note].perfumes.length < 5 && !categoryStats[note].perfumes.includes(perfume.name)) {
      categoryStats[note].perfumes.push(perfume.name);
    }
  }
}

// ─── Step 6: Build unified meta ─────────────────────────────────────

const totalRedditMentions = [...redditMap.values()].reduce((sum, r) => sum + r.totalMentions, 0);
const redditYearsAll = new Set();
for (const r of redditMap.values()) {
  for (const y of Object.keys(r.yearlyBreakdown)) {
    redditYearsAll.add(y);
  }
}
const sortedRedditYears = [...redditYearsAll].sort();

const discordTotalMessages = discordData.meta?.sources?.discord?.totalMessages ?? discordData.meta?.totalMessages ?? 0;
const discordGeneratedAt = discordData.meta?.sources?.discord?.generatedAt ?? discordData.meta?.generatedAt ?? new Date().toISOString();

const unifiedMeta = {
  keyword: 'Combined Discord + Reddit',
  totalMessages: discordTotalMessages + totalRedditMentions,
  totalThreads: discordData.meta.totalThreads || 0,
  totalPerfumesFound: unifiedEntries.length,
  generatedAt: new Date().toISOString(),
  sources: {
    discord: {
      totalMessages: discordTotalMessages,
      generatedAt: discordGeneratedAt,
    },
    reddit: {
      totalComments: totalRedditMentions,
      generatedAt: new Date().toISOString(),
      yearsRange: sortedRedditYears.length > 0
        ? `${sortedRedditYears[0]}–${sortedRedditYears[sortedRedditYears.length - 1]}`
        : 'N/A',
    },
  },
};

// ─── Step 7: Synthesize Reddit threads & write output ───────────────

// Base Discord threads (filter out any previously appended Reddit threads)
const unifiedThreads = (discordData.threads || []).filter(t => t.source !== 'reddit');

// Synthesize conversation threads from Reddit sample mentions
for (const [perfumeName, rData] of redditMap.entries()) {
  for (const sm of (rData.sampleMentions || []).slice(0, 4)) {
    unifiedThreads.push({
      source: 'reddit',
      url: sm.url,
      keywordMessage: {
        id: `reddit_${sm.id || Math.random().toString(36).substring(2, 9)}`,
        type: 'reddit_comment',
        author: sm.author,
        authorUsername: sm.author,
        timestamp: sm.timestamp,
        content: sm.content,
        reference: null,
        attachments: [],
        embeds: sm.url ? [{ title: `r/fragrance post`, description: sm.content, url: sm.url }] : [],
      },
      parentChain: [],
      replies: [],
      contextBefore: [],
      contextAfter: [],
    });
  }
}

const output = {
  meta: unifiedMeta,
  leaderboard: unifiedEntries,
  regions: regionStats,
  categories: categoryStats,
  topContributors: discordData.topContributors || [],
  threads: unifiedThreads,
};

const outputDir = outputPath.substring(0, outputPath.lastIndexOf('/'));
if (outputDir) fs.mkdirSync(outputDir, { recursive: true });

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

// ─── Summary ────────────────────────────────────────────────────────

console.log(`\n${'═'.repeat(60)}`);
console.log(`✅ UNIFIED LEADERBOARD BUILT`);
console.log(`${'═'.repeat(60)}`);
console.log(`📊 ${unifiedEntries.length} total perfumes ranked`);
console.log(`   💬 Discord-only: ${[...allPerfumeNames].filter(n => discordMap.has(n) && !redditMap.has(n)).length}`);
console.log(`   🔴 Reddit-only:  ${[...allPerfumeNames].filter(n => !discordMap.has(n) && redditMap.has(n)).length}`);
console.log(`   🔗 Both sources: ${[...allPerfumeNames].filter(n => discordMap.has(n) && redditMap.has(n)).length}`);
console.log(`📁 Output: ${outputPath}`);

// Top 15
console.log(`\n🏆 Unified Top 15:`);
console.log('─'.repeat(50));
unifiedEntries.slice(0, 15).forEach(p => {
  const medal = p.rank <= 3 ? ['🥇', '🥈', '🥉'][p.rank - 1] : `${p.rank}.`.padStart(3);
  const discord = p.sources?.discord?.mentionCount || 0;
  const reddit = p.sources?.reddit?.mentionCount || 0;
  const flags = [
    discord > 0 ? '💬' : '  ',
    reddit > 0 ? '🔴' : '  ',
  ].join('');
  console.log(
    `${medal} ${flags} ${p.name.padEnd(36)} ${String(p.mentionCount).padStart(6)} total  (💬${String(discord).padStart(5)} 🔴${String(reddit).padStart(5)})`
  );
});

console.log('');


// ─── Helper: Find metadata in catalog ───────────────────────────────

function findInCatalog(catalog, perfumeName, redditEntry) {
  if (!catalog?.brands) return {};

  const brand = redditEntry?.brand;
  const model = redditEntry?.model;

  if (brand && catalog.brands[brand]?.models?.[model]) {
    const m = catalog.brands[brand].models[model];
    return {
      brand,
      region: catalog.brands[brand].region,
      countryCode: catalog.brands[brand].countryCode,
      category: catalog.brands[brand].category,
      gender: m.gender || 'Unisex',
      description: m.description || '',
      notes: m.notes || [],
    };
  }

  // Fuzzy fallback: search by full_name
  for (const [bName, bData] of Object.entries(catalog.brands)) {
    for (const [mName, mData] of Object.entries(bData.models || {})) {
      if (mData.full_name === perfumeName) {
        return {
          brand: bName,
          region: bData.region,
          countryCode: bData.countryCode,
          category: bData.category,
          gender: mData.gender || 'Unisex',
          description: mData.description || '',
          notes: mData.notes || [],
        };
      }
    }
  }

  return {};
}
