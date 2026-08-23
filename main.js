import fs from 'node:fs';
import chain from 'stream-chain';
import { parser } from 'stream-json';
import { pick } from 'stream-json/filters/pick.js';
import { streamArray } from 'stream-json/streamers/stream-array.js';

// ─── Configuration ──────────────────────────────────────────────────
const inputFileName = 'raw-export.json';
const keyword = process.argv[2] || 'floral';
const keywordRegex = new RegExp(keyword, 'i');
const CONTEXT_WINDOW = 5; // messages before/after a keyword hit to include
const outputFileName = `${keyword.toLowerCase()}_results.json`;

console.log(`\n🔍 Searching for keyword: "${keyword}"`);
console.log(`📄 Input: ${inputFileName}`);
console.log(`📦 Context window: ±${CONTEXT_WINDOW} messages\n`);

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Creates a streaming pipeline that yields each message object
 * from the deeply nested "messages" array without loading the
 * entire file into memory.
 *
 * The raw-export.json structure is:
 *   { guild: {...}, channel: {...}, messages: [ ...huge array... ] }
 *
 * We use stream-json's pick filter to only process
 * entries under the "messages" key, then streamArray
 * to assemble each array element into a JS object.
 */
function createMessageStream() {
  return chain([
    fs.createReadStream(inputFileName),
    parser(),
    pick({ filter: 'messages' }),
    streamArray(),
  ]);
}

// ─── Pass 1: Identify keyword hits & map reply chains ───────────────
async function pass1_indexMessages() {
  console.log('⏳ Pass 1 — Indexing keyword matches and reply chains...');

  const keywordHitIds = new Set();      // message IDs that contain the keyword
  const replyToMap = new Map();         // childId -> parentId  (for replies)
  const messageOrder = [];              // ordered list of message IDs for context windowing
  let totalMessages = 0;

  return new Promise((resolve, reject) => {
    const pipeline = createMessageStream();

    pipeline.on('data', ({ value: msg }) => {
      totalMessages++;
      messageOrder.push(msg.id);

      // Check if message content matches keyword
      if (msg.content && keywordRegex.test(msg.content)) {
        keywordHitIds.add(msg.id);
      }

      // Track reply relationships
      if (msg.reference && msg.reference.messageId) {
        replyToMap.set(msg.id, msg.reference.messageId);
      }

      // Progress indicator
      if (totalMessages % 50000 === 0) {
        console.log(`   ... processed ${totalMessages.toLocaleString()} messages`);
      }
    });

    pipeline.on('end', () => {
      console.log(`   ✅ Pass 1 complete: ${totalMessages.toLocaleString()} messages scanned`);
      console.log(`   🎯 ${keywordHitIds.size} keyword hits found\n`);
      resolve({ keywordHitIds, replyToMap, messageOrder, totalMessages });
    });

    pipeline.on('error', reject);
  });
}

// ─── Build the full set of IDs we need to collect ───────────────────
function buildCollectionSet(keywordHitIds, replyToMap, messageOrder) {
  const idsToCollect = new Set(keywordHitIds);

  // 1) Add all replies TO keyword messages (children)
  for (const [childId, parentId] of replyToMap) {
    if (keywordHitIds.has(parentId)) {
      idsToCollect.add(childId);
    }
  }

  // 2) Add all parents that keyword messages reply TO (walk up the chain)
  for (const hitId of keywordHitIds) {
    let current = hitId;
    while (replyToMap.has(current)) {
      const parentId = replyToMap.get(current);
      idsToCollect.add(parentId);
      current = parentId;
    }
  }

  // 3) Add surrounding context messages (±CONTEXT_WINDOW)
  const orderIndex = new Map();
  messageOrder.forEach((id, idx) => orderIndex.set(id, idx));

  for (const hitId of keywordHitIds) {
    const idx = orderIndex.get(hitId);
    if (idx === undefined) continue;

    const start = Math.max(0, idx - CONTEXT_WINDOW);
    const end = Math.min(messageOrder.length - 1, idx + CONTEXT_WINDOW);
    for (let i = start; i <= end; i++) {
      idsToCollect.add(messageOrder[i]);
    }
  }

  console.log(`📋 Total messages to collect: ${idsToCollect.size}`);
  return idsToCollect;
}

// ─── Pass 2: Collect the actual message data ────────────────────────
async function pass2_collectMessages(idsToCollect) {
  console.log('⏳ Pass 2 — Collecting message data...\n');

  const messagesById = new Map();
  let scanned = 0;

  return new Promise((resolve, reject) => {
    const pipeline = createMessageStream();

    pipeline.on('data', ({ value: msg }) => {
      scanned++;

      if (idsToCollect.has(msg.id)) {
        messagesById.set(msg.id, {
          id: msg.id,
          type: msg.type,
          author: msg.author ? msg.author.nickname || msg.author.name : 'Unknown',
          authorUsername: msg.author ? msg.author.name : 'Unknown',
          timestamp: msg.timestamp,
          content: msg.content || '',
          reference: msg.reference ? msg.reference.messageId : null,
          attachments: (msg.attachments || []).map(a => ({
            fileName: a.fileName,
            url: a.url,
          })),
          embeds: (msg.embeds || []).map(e => ({
            title: e.title,
            description: e.description,
            url: e.url,
          })),
        });
      }

      if (scanned % 50000 === 0) {
        console.log(`   ... scanned ${scanned.toLocaleString()} messages (collected ${messagesById.size})`);
      }
    });

    pipeline.on('end', () => {
      console.log(`   ✅ Pass 2 complete: ${messagesById.size} messages collected\n`);
      resolve(messagesById);
    });

    pipeline.on('error', reject);
  });
}

// ─── Assemble results into conversation threads ─────────────────────
function assembleThreads(keywordHitIds, messagesById, replyToMap, messageOrder) {
  // Build index for ordering
  const orderIndex = new Map();
  messageOrder.forEach((id, idx) => orderIndex.set(id, idx));

  const threads = [];

  for (const hitId of keywordHitIds) {
    const hitMsg = messagesById.get(hitId);
    if (!hitMsg) continue;

    // Collect parent chain (messages this one replies to)
    const parentChain = [];
    let current = hitId;
    while (replyToMap.has(current)) {
      const parentId = replyToMap.get(current);
      const parentMsg = messagesById.get(parentId);
      if (parentMsg) parentChain.unshift(parentMsg);
      current = parentId;
    }

    // Collect direct replies to the keyword message
    const replies = [];
    for (const [childId, parentId] of replyToMap) {
      if (parentId === hitId) {
        const childMsg = messagesById.get(childId);
        if (childMsg) replies.push(childMsg);
      }
    }

    // Sort replies by timestamp
    replies.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Collect surrounding context messages
    const hitIdx = orderIndex.get(hitId);
    const contextBefore = [];
    const contextAfter = [];

    if (hitIdx !== undefined) {
      for (let i = Math.max(0, hitIdx - CONTEXT_WINDOW); i < hitIdx; i++) {
        const ctxMsg = messagesById.get(messageOrder[i]);
        if (ctxMsg && ctxMsg.id !== hitId) contextBefore.push(ctxMsg);
      }
      for (let i = hitIdx + 1; i <= Math.min(messageOrder.length - 1, hitIdx + CONTEXT_WINDOW); i++) {
        const ctxMsg = messagesById.get(messageOrder[i]);
        if (ctxMsg && ctxMsg.id !== hitId) contextAfter.push(ctxMsg);
      }
    }

    threads.push({
      keywordMessage: hitMsg,
      parentChain,
      replies,
      contextBefore,
      contextAfter,
    });
  }

  // Sort threads by timestamp (oldest first)
  threads.sort((a, b) =>
    new Date(a.keywordMessage.timestamp) - new Date(b.keywordMessage.timestamp)
  );

  return threads;
}

// ─── Main ───────────────────────────────────────────────────────────
async function main() {
  const startTime = Date.now();

  // Pass 1: Index
  const { keywordHitIds, replyToMap, messageOrder, totalMessages } =
    await pass1_indexMessages();

  if (keywordHitIds.size === 0) {
    console.log('❌ No messages found matching the keyword. Exiting.');
    return;
  }

  // Build collection set
  const idsToCollect = buildCollectionSet(keywordHitIds, replyToMap, messageOrder);

  // Pass 2: Collect
  const messagesById = await pass2_collectMessages(idsToCollect);

  // Assemble threads
  const threads = assembleThreads(keywordHitIds, messagesById, replyToMap, messageOrder);

  // Write output
  const output = {
    meta: {
      keyword,
      totalMessages,
      keywordHits: keywordHitIds.size,
      threadsAssembled: threads.length,
      contextWindow: CONTEXT_WINDOW,
      generatedAt: new Date().toISOString(),
    },
    threads,
  };

  // Stream-write the output to avoid memory issues with large results
  const outputStream = fs.createWriteStream(outputFileName);
  outputStream.write(JSON.stringify(output, null, 2));
  outputStream.end();

  await new Promise((resolve) => outputStream.on('finish', resolve));

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`✅ Done in ${elapsed}s`);
  console.log(`📁 Output: ${outputFileName}`);
  console.log(`📊 ${threads.length} conversation threads saved\n`);

  // Print summary
  console.log('─'.repeat(60));
  threads.slice(0, 10).forEach((thread, i) => {
    const msg = thread.keywordMessage;
    const ts = new Date(msg.timestamp).toLocaleString();
    const preview = msg.content.length > 100
      ? msg.content.substring(0, 100) + '...'
      : msg.content;
    console.log(`\n${i + 1}. [${ts}] ${msg.author}:`);
    console.log(`   "${preview}"`);
    if (thread.parentChain.length > 0) {
      console.log(`   ↑ Replying to chain of ${thread.parentChain.length} message(s)`);
    }
    if (thread.replies.length > 0) {
      console.log(`   ↓ ${thread.replies.length} direct reply/replies`);
    }
    console.log(`   📎 Context: ${thread.contextBefore.length} before, ${thread.contextAfter.length} after`);
  });

  if (threads.length > 10) {
    console.log(`\n   ... and ${threads.length - 10} more threads (see ${outputFileName})`);
  }
  console.log('─'.repeat(60));
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});