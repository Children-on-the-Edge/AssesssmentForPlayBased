/* sync-queue.js — durable retry queue for Cloud Sync pushes.
 *
 * Every save queues itself for sync FIRST (persisted to local storage, so it
 * survives a closed tab, a lost connection, or the browser quitting mid-save),
 * then an immediate push is attempted. If the push fails for any reason — no
 * connection, a dropped request, anything — the record just stays in the
 * queue. Nothing is ever silently lost; it just waits for the next successful
 * flush, which happens automatically:
 *   - the moment the browser regains connectivity (the "online" event)
 *   - once on every app launch (catches anything queued in a previous session)
 *   - periodically as a safety net, since "online" isn't 100% reliable in
 *     every browser/PWA context
 */

let syncQueueFlushInProgress = false;

async function queueAndPushRecord(tool, record) {
  if (!window.SheetsSync || !SheetsSync.isConfigured()) return; // Cloud Sync not set up on this device
  DB.syncQueue.add(tool, record.id);
  await flushSyncQueue(); // attempt right away; a failure just leaves it queued for later
}

async function flushSyncQueue() {
  if (syncQueueFlushInProgress) return;
  if (!window.SheetsSync || !SheetsSync.isConfigured()) return;
  syncQueueFlushInProgress = true;
  try {
    const queue = DB.syncQueue.get();
    for (const entry of queue) {
      const record = entry.tool === "tool1" ? DB.tool1.get(entry.id) : DB.tool2.get(entry.id);
      if (!record) { DB.syncQueue.remove(entry.tool, entry.id); continue; } // deleted locally since queuing — nothing to sync
      try {
        await SheetsSync.pushRecord(entry.tool, record);
        DB.syncQueue.remove(entry.tool, entry.id);
      } catch (e) {
        // Still failing (most likely no connection) — leave the rest of the queue
        // untouched and stop this round rather than retrying each one in a row,
        // since if one fails from lack of connectivity the rest almost certainly
        // will too.
        break;
      }
    }
  } finally {
    syncQueueFlushInProgress = false;
  }
  if (window.renderCloudStatusIcon) renderCloudStatusIcon();
}

function pendingSyncCount() {
  return (window.DB && DB.syncQueue) ? DB.syncQueue.count() : 0;
}

// Recovers records that were saved before this device ever had a working sync
// (or failed silently under older versions of this app, before the durable queue
// existed) — compares what's actually in the shared sheet against what's on this
// device, and pushes only the ones genuinely missing. Never re-pushes records
// already present, so it can't create duplicates.
async function recoverMissingRecords(tool) {
  const remote = await SheetsSync.pullAll(tool);
  const remoteIds = new Set(remote.map(r => r.id));
  const local = tool === "tool1" ? DB.tool1.all() : DB.tool2.all();
  const missing = local.filter(r => !remoteIds.has(r.id));
  missing.forEach(rec => DB.syncQueue.add(tool, rec.id));
  await flushSyncQueue();
  const stillMissing = missing.filter(rec => DB.syncQueue.has(tool, rec.id)).length;
  return { found: missing.length, recovered: missing.length - stillMissing };
}
