import { spawn } from 'node:child_process';
import process from 'node:process';

console.log('\n=============================================================');
console.log('🚀 PARALLEL EXTRACTION PIPELINE: REDDIT & DISCORD');
console.log('=============================================================\n');

const startTime = Date.now();

function runProcess(command, args, label, color) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['inherit', 'pipe', 'pipe'], shell: true });

    child.stdout.on('data', (data) => {
      const lines = data.toString().split(/\r?\n/);
      for (const line of lines) {
        if (line.trim()) {
          console.log(`${color}[${label}]\x1b[0m ${line}`);
        }
      }
    });

    child.stderr.on('data', (data) => {
      const lines = data.toString().split(/\r?\n/);
      for (const line of lines) {
        if (line.trim()) {
          console.error(`\x1b[31m[${label} ERROR]\x1b[0m ${line}`);
        }
      }
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`\x1b[32m✔ [${label}] Finished successfully.\x1b[0m`);
        resolve();
      } else {
        reject(new Error(`[${label}] process exited with code ${code}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

async function main() {
  try {
    console.log('⏳ Starting concurrent extractors:\n');
    console.log('   1. Reddit comments archive (.zst) -> reddit_perfume_rankings.json');
    console.log('   2. Discord global archive (raw-export.json) -> app/public/data/leaderboard.json\n');

    // Launch both in parallel
    const p1 = runProcess('python', ['-u', 'scripts/reddit_extractor.py'], 'Reddit', '\x1b[35m');
    const p2 = runProcess('node', ['scripts/build-global-leaderboard.js'], 'Discord', '\x1b[36m');

    await Promise.all([p1, p2]);

    console.log('\n=============================================================');
    console.log('🔗 MERGING UNIFIED LEADERBOARD');
    console.log('=============================================================\n');

    await runProcess('node', ['scripts/build-unified-leaderboard.js'], 'Unified', '\x1b[33m');

    console.log('\n=============================================================');
    console.log('📦 COMPILING SQLITE PERSISTENCE');
    console.log('=============================================================\n');

    await runProcess('node', ['scripts/build-sqlite-db.js'], 'SQLite', '\x1b[32m');

    const totalSec = Math.round((Date.now() - startTime) / 1000);
    console.log(`\n🎉 PIPELINE FULLY COMPLETED in ${totalSec}s!`);
    console.log('   Leaderboard updated at app/public/data/leaderboard.json');
    console.log('   SQLite database updated at app/server/data/perfumery.db\n');
  } catch (err) {
    console.error(`\n❌ Pipeline failed: ${err.message}`);
    process.exit(1);
  }
}

main();
