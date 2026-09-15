import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

function slugify(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[&]/g, 'and')
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildSqliteDb(jsonPath = 'app/public/data/leaderboard.json', dbPath = 'app/server/data/perfumery.db') {
  const startTime = Date.now();

  console.log(`\n📦 SQLITE PERFUMERY DATABASE BUILDER`);
  console.log(`═`.repeat(58));
  console.log(`📄 Ingesting JSON: ${jsonPath}`);
  console.log(`💾 Target DB:      ${dbPath}\n`);

  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Input JSON not found at ${jsonPath}`);
  }

  // Ensure target directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Remove old database if exists to ensure clean rebuild
  if (fs.existsSync(dbPath)) {
    try {
      fs.unlinkSync(dbPath);
    } catch (e) {
      console.warn('⚠️ Could not remove existing DB file:', e.message);
    }
  }

  console.log('⏳ Parsing JSON dataset...');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const perfumes = data.leaderboard || [];
  console.log(`   ✓ Ingested ${perfumes.length.toLocaleString()} perfumes`);

  const db = new DatabaseSync(dbPath);

  // Enable performance pragmas for fast writes
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA synchronous = NORMAL;');
  db.exec('PRAGMA cache_size = -64000;'); // 64MB cache

  console.log('🔨 Initializing schema...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS perfumes (
      slug TEXT PRIMARY KEY,
      rank INTEGER,
      name TEXT,
      brand TEXT,
      region TEXT,
      country_code TEXT,
      category TEXT,
      gender TEXT,
      description TEXT,
      mention_count INTEGER,
      thread_count INTEGER,
      direct_keyword_mentions INTEGER,
      unique_authors INTEGER,
      first_mentioned TEXT,
      last_mentioned TEXT,
      notes_json TEXT,
      top_notes_json TEXT,
      sources_json TEXT,
      yearly_mentions_json TEXT,
      accord_dist_json TEXT,
      co_mentions_json TEXT
    );

    CREATE TABLE IF NOT EXISTS sample_mentions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      perfume_slug TEXT,
      author TEXT,
      content TEXT,
      timestamp TEXT,
      source TEXT,
      url TEXT,
      score INTEGER
    );

    CREATE TABLE IF NOT EXISTS threads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      perfume_slug TEXT,
      keyword TEXT,
      source TEXT,
      url TEXT,
      data_json TEXT
    );
  `);

  console.log('💾 Storing metadata, categories, and region summaries...');
  const insertMeta = db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)');
  db.exec('BEGIN TRANSACTION;');
  insertMeta.run('meta', JSON.stringify(data.meta || {}));
  insertMeta.run('regions', JSON.stringify(data.regions || {}));
  insertMeta.run('categories', JSON.stringify(data.categories || {}));
  insertMeta.run('topContributors', JSON.stringify(data.topContributors || []));
  db.exec('COMMIT;');

  console.log(`💾 Inserting ${perfumes.length.toLocaleString()} perfumes into SQLite...`);
  const insertPerfume = db.prepare(`
    INSERT OR REPLACE INTO perfumes (
      slug, rank, name, brand, region, country_code, category, gender, description,
      mention_count, thread_count, direct_keyword_mentions, unique_authors,
      first_mentioned, last_mentioned,
      notes_json, top_notes_json, sources_json, yearly_mentions_json, accord_dist_json, co_mentions_json
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?,
      ?, ?, ?, ?, ?, ?
    )
  `);

  const insertMention = db.prepare(`
    INSERT INTO sample_mentions (
      perfume_slug, author, content, timestamp, source, url, score
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  db.exec('BEGIN TRANSACTION;');

  let totalMentionsInserted = 0;
  for (let i = 0; i < perfumes.length; i++) {
    const p = perfumes[i];
    const slug = slugify(p.name);

    insertPerfume.run(
      slug,
      p.rank || (i + 1),
      p.name,
      p.brand,
      p.region || 'Global',
      p.countryCode || 'XX',
      p.category || 'Designer',
      p.gender || 'Unisex',
      p.description || '',
      p.mentionCount || 0,
      p.threadCount || 0,
      p.directKeywordMentions || 0,
      p.uniqueAuthors || 0,
      p.firstMentioned || '',
      p.lastMentioned || '',
      JSON.stringify(p.notes || []),
      JSON.stringify(p.topNotes || []),
      JSON.stringify(p.sources || {}),
      JSON.stringify(p.yearlyMentions || {}),
      JSON.stringify(p.accordDistribution || {}),
      JSON.stringify(p.coMentions || [])
    );

    if (p.sampleMentions && Array.isArray(p.sampleMentions)) {
      for (const sm of p.sampleMentions) {
        insertMention.run(
          slug,
          sm.author || '[anonymous]',
          sm.content || '',
          sm.timestamp || '',
          sm.source || 'discord',
          sm.url || '',
          sm.score || 1
        );
        totalMentionsInserted++;
      }
    }
  }

  // Insert conversation threads if present
  if (data.threads && Array.isArray(data.threads)) {
    const insertThread = db.prepare('INSERT INTO threads (perfume_slug, keyword, source, url, data_json) VALUES (?, ?, ?, ?, ?)');
    for (const t of data.threads) {
      const keyword = t.keywordMessage?.content || '';
      const slug = slugify(keyword);
      insertThread.run(
        slug,
        keyword,
        t.source || 'discord',
        t.url || '',
        JSON.stringify(t)
      );
    }
  }

  db.exec('COMMIT;');
  console.log(`   ✓ Inserted ${perfumes.length.toLocaleString()} perfumes`);
  console.log(`   ✓ Inserted ${totalMentionsInserted.toLocaleString()} sample mentions`);

  console.log('⚡ Creating B-Tree indexes for sub-millisecond query execution...');
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_perfumes_rank ON perfumes(rank);
    CREATE INDEX IF NOT EXISTS idx_perfumes_mention_count ON perfumes(mention_count DESC);
    CREATE INDEX IF NOT EXISTS idx_perfumes_name ON perfumes(name);
    CREATE INDEX IF NOT EXISTS idx_perfumes_brand ON perfumes(brand);
    CREATE INDEX IF NOT EXISTS idx_perfumes_category ON perfumes(category);
    CREATE INDEX IF NOT EXISTS idx_perfumes_region ON perfumes(region);
    CREATE INDEX IF NOT EXISTS idx_sample_mentions_slug ON sample_mentions(perfume_slug);
    CREATE INDEX IF NOT EXISTS idx_threads_slug ON threads(perfume_slug);
  `);

  // Optimize and shrink database file
  db.exec('PRAGMA optimize;');

  const dbSize = fs.statSync(dbPath).size;
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n' + '═'.repeat(58));
  console.log('✅ SQLITE DATABASE BUILD COMPLETE');
  console.log('═'.repeat(58));
  console.log(`📁 Database:    ${dbPath}`);
  console.log(`💾 Size:        ${(dbSize / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`📊 Perfumes:    ${perfumes.length.toLocaleString()}`);
  console.log(`⏱  Duration:    ${elapsed}s\n`);
}

// CLI entrypoint
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('scripts/build-sqlite-db.js')) {
  const jsonPath = process.argv[2] || 'app/public/data/leaderboard.json';
  const dbPath = process.argv[3] || 'app/server/data/perfumery.db';
  buildSqliteDb(jsonPath, dbPath);
}
