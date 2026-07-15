// Offline Local Storage & Queue Manager for Field MPOs

const QUEUE_KEY = 'jupiter_offline_queue';
const DRAFT_PREFIX = 'jupiter_draft_';

// Check if browser is online
export const isOnline = () => {
  return navigator.onLine;
};

// Save a local draft of an entry type for a given date
export const saveDraft = (entryType, dateStr, data) => {
  const key = `${DRAFT_PREFIX}${entryType}_${dateStr}`;
  localStorage.setItem(key, JSON.stringify(data));
};

// Retrieve a local draft
export const getDraft = (entryType, dateStr) => {
  const key = `${DRAFT_PREFIX}${entryType}_${dateStr}`;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
};

// Get all drafts for a month/year combination (to populate UI when offline)
export const getDraftsForMonth = (entryType, month, year) => {
  const drafts = [];
  const mStr = String(month).padStart(2, '0');
  const matchStr = `${DRAFT_PREFIX}${entryType}_${year}-${mStr}-`;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(matchStr)) {
      const parts = key.split('_');
      const dateStr = parts[parts.length - 1];
      const data = JSON.parse(localStorage.getItem(key));
      drafts.push({ date: dateStr, ...data, isOfflineDraft: true });
    }
  }
  return drafts;
};

// Add a pending request to the offline queue
export const queueRequest = (entryType, dateStr, url, method, body) => {
  const queue = getQueue();
  const id = `${entryType}_${dateStr}_${Date.now()}`;
  
  // Prevent duplicate submissions in the queue for the same date/type
  const cleanQueue = queue.filter(item => !(item.entryType === entryType && item.dateStr === dateStr));

  cleanQueue.push({
    id,
    entryType,
    dateStr,
    url,
    method,
    body,
    createdAt: Date.now()
  });

  localStorage.setItem(QUEUE_KEY, JSON.stringify(cleanQueue));
  
  // Save as a draft as well so it displays immediately in the app
  saveDraft(entryType, dateStr, body);
  
  return id;
};

// Get the full queue
export const getQueue = () => {
  const data = localStorage.getItem(QUEUE_KEY);
  return data ? JSON.parse(data) : [];
};

// Remove a successful request from the queue
export const dequeueRequest = (id) => {
  const queue = getQueue();
  const filtered = queue.filter(item => item.id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
};

// Sync queue with server (runs when online event fires)
export const syncOfflineQueue = async (apiCallFn, onProgress) => {
  const queue = getQueue();
  if (queue.length === 0) return;

  console.log(`Attempting to sync ${queue.length} offline entries...`);
  
  for (const item of queue) {
    try {
      if (onProgress) onProgress(item.id, 'syncing');
      
      // Perform the API call
      await apiCallFn(item.url, item.method, item.body);
      
      // Remove from queue on success
      dequeueRequest(item.id);
      
      if (onProgress) onProgress(item.id, 'success');
    } catch (error) {
      console.error(`Sync failed for item ${item.id}:`, error);
      if (onProgress) onProgress(item.id, 'failed');
      // Break loop to retry later (e.g. if connection drops mid-sync)
      break;
    }
  }
};
