/**
 * storage.js — Axon LocalStorage Fallback
 * ========================================
 * Intercepts all API calls. If the server is reachable, uses it normally.
 * If offline or the server is unavailable, stores everything in localStorage.
 *
 * Usage: include BEFORE tasks.js / notes.js / habits.js / logs.js
 * No changes needed to existing JS files.
 */

(function () {
  'use strict';

  // ── Keys ──────────────────────────────────────────────────────────────────
  const KEYS = {
    tasks:  'axon_tasks',
    notes:  'axon_notes',
    habits: 'axon_habits',
    logs:   'axon_logs',
    mode:   'axon_storage_mode',   // 'server' | 'local'
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  let _nextId = Date.now();                // unique IDs for local records
  const uid   = () => ++_nextId;

  function load(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch { return []; }
  }

  function save(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  function today() {
    return new Date().toISOString().split('T')[0];
  }

  function now() {
    return new Date().toISOString();
  }

  // ── Server reachability ───────────────────────────────────────────────────
  let _serverOk = null;   // null = unknown, true/false after first check

  async function checkServer() {
    try {
      const r = await window._originalFetch('/health', { method: 'HEAD', cache: 'no-store' });
      _serverOk = r.ok;
    } catch {
      _serverOk = false;
    }
    updateBadge();
    return _serverOk;
  }

  function updateBadge() {
    const badge = document.getElementById('storageBadge');
    if (!badge) return;
    if (_serverOk) {
      badge.className = 'storage-badge server';
      badge.textContent = '🟢 Server';
    } else {
      badge.className = 'storage-badge local';
      badge.textContent = '💾 Local';
    }
    localStorage.setItem(KEYS.mode, _serverOk ? 'server' : 'local');
  }

  // ── Local DB operations ───────────────────────────────────────────────────
  const LocalDB = {

    /* ---- TASKS ---- */
    getTasks() { return load(KEYS.tasks); },

    getTask(id) { return load(KEYS.tasks).find(t => t.id == id) || null; },

    createTask(data) {
      const tasks = load(KEYS.tasks);
      const task = {
        id:          uid(),
        title:       data.title || '',
        description: data.description || '',
        due_date:    data.due_date || null,
        completed:   false,
        created_at:  now(),
        updated_at:  now(),
      };
      tasks.push(task);
      save(KEYS.tasks, tasks);
      return task;
    },

    updateTask(id, data) {
      const tasks = load(KEYS.tasks);
      const idx = tasks.findIndex(t => t.id == id);
      if (idx === -1) return null;
      if ('completed'   in data) tasks[idx].completed   = data.completed;
      if ('title'       in data) tasks[idx].title       = data.title;
      if ('description' in data) tasks[idx].description = data.description;
      if ('due_date'    in data) tasks[idx].due_date    = data.due_date;
      tasks[idx].updated_at = now();
      save(KEYS.tasks, tasks);
      return tasks[idx];
    },

    deleteTask(id) {
      const tasks = load(KEYS.tasks).filter(t => t.id != id);
      save(KEYS.tasks, tasks);
    },

    /* ---- NOTES ---- */
    getNotes()   { return load(KEYS.notes); },

    createNote(data) {
      const notes = load(KEYS.notes);
      const note  = {
        id:         uid(),
        content:    data.content || '',
        tags:       data.tags    || '',
        created_at: now(),
        updated_at: now(),
      };
      notes.push(note);
      save(KEYS.notes, notes);
      return note;
    },

    updateNote(id, data) {
      const notes = load(KEYS.notes);
      const idx   = notes.findIndex(n => n.id == id);
      if (idx === -1) return null;
      notes[idx].content    = data.content    ?? notes[idx].content;
      notes[idx].tags       = data.tags       ?? notes[idx].tags;
      notes[idx].updated_at = now();
      save(KEYS.notes, notes);
      return notes[idx];
    },

    deleteNote(id) {
      save(KEYS.notes, load(KEYS.notes).filter(n => n.id != id));
    },

    /* ---- HABITS ---- */
    getHabits() {
      let habits = load(KEYS.habits);
      if (!habits.length) habits = LocalDB._initHabits();
      return habits;
    },

    _initHabits() {
      const defaults = [
        { name: 'Morning Planning',  description: 'Plan your day each morning' },
        { name: 'Evening Review',    description: 'Review accomplishments each evening' },
        { name: 'Daily Exercise',    description: '30 minutes of physical activity' },
        { name: 'Learning Time',     description: 'Spend time learning something new' },
      ];
      const habits = defaults.map(h => ({
        id:             uid(),
        name:           h.name,
        description:    h.description,
        streak_count:   0,
        last_completed: null,
        created_at:     now(),
      }));
      save(KEYS.habits, habits);
      return habits;
    },

    completeHabit(id) {
      const habits = load(KEYS.habits);
      const h      = habits.find(h => h.id == id);
      if (!h) return 0;
      const todayStr = today();
      if (h.last_completed === todayStr) return h.streak_count;  // already done
      const daysSince = h.last_completed
        ? Math.floor((Date.now() - new Date(h.last_completed)) / 86400000)
        : 999;
      h.streak_count  = daysSince === 1 ? h.streak_count + 1 : 1;
      h.last_completed = todayStr;
      save(KEYS.habits, habits);
      return h.streak_count;
    },

    skipHabit(id) {
      const habits = load(KEYS.habits);
      const h      = habits.find(h => h.id == id);
      if (!h) return 0;
      const daysSince = h.last_completed
        ? Math.floor((Date.now() - new Date(h.last_completed)) / 86400000)
        : 0;
      if (daysSince > 1) h.streak_count = 0;
      save(KEYS.habits, habits);
      return h.streak_count;
    },

    /* ---- LOGS ---- */
    getTodayLog() {
      const todayStr = today();
      return load(KEYS.logs).find(l => l.date === todayStr) || null;
    },

    getLogs() { return load(KEYS.logs); },

    createLog(data) {
      const logs    = load(KEYS.logs);
      const todayStr = today();
      if (logs.find(l => l.date === todayStr)) {
        return { error: 'Log already exists for today' };
      }
      const log = {
        id:             uid(),
        date:           todayStr,
        accomplishments: data.accomplishments || '',
        missed_items:   data.missed_items    || '',
        tomorrow_plan:  data.tomorrow_plan   || '',
        created_at:     now(),
      };
      logs.push(log);
      save(KEYS.logs, logs);
      return log;
    },

    updateLog(id, data) {
      const logs = load(KEYS.logs);
      const idx  = logs.findIndex(l => l.id == id);
      if (idx === -1) return null;
      logs[idx].accomplishments = data.accomplishments ?? logs[idx].accomplishments;
      logs[idx].missed_items    = data.missed_items    ?? logs[idx].missed_items;
      logs[idx].tomorrow_plan   = data.tomorrow_plan   ?? logs[idx].tomorrow_plan;
      save(KEYS.logs, logs);
      return logs[idx];
    },

    deleteLog(id) {
      save(KEYS.logs, load(KEYS.logs).filter(l => l.id != id));
    },

    /* ---- RECAP ---- */
    getDailyRecap() {
      const todayStr   = today();
      const nowTs      = Date.now();
      const tasks      = load(KEYS.tasks);
      const completed  = tasks.filter(t => t.completed && t.updated_at?.startsWith(todayStr));
      const overdue    = tasks.filter(t => !t.completed && t.due_date && new Date(t.due_date) < nowTs);
      const notes      = load(KEYS.notes).filter(n => n.created_at?.startsWith(todayStr));
      const score      = Math.max(0, Math.min(100, completed.length * 10 - overdue.length * 5));

      let summary = completed.length
        ? `Completed ${completed.length} task(s). `
        : 'A quiet day. ';
      if (overdue.length) summary += `⚠️ ${overdue.length} task(s) overdue. `;
      if (notes.length)   summary += `Captured ${notes.length} new idea(s). `;
      summary += score > 50 ? '🎉 Great work!' : '🌟 Every day is progress!';

      return {
        completed_count:    completed.length,
        overdue_count:      overdue.length,
        notes_count:        notes.length,
        productivity_score: score,
        summary,
      };
    },
  };

  // ── Mock Response builder ─────────────────────────────────────────────────
  function json(body, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── Route matcher ─────────────────────────────────────────────────────────
  function localFetch(url, opts = {}) {
    const method = (opts.method || 'GET').toUpperCase();
    const path   = url.replace(location.origin, '').split('?')[0];
    const body   = opts.body ? JSON.parse(opts.body) : {};

    // --- tasks ---
    if (path === '/api/tasks' && method === 'GET') {
      return Promise.resolve(json(LocalDB.getTasks()));
    }
    if (path === '/api/tasks' && method === 'POST') {
      const t = LocalDB.createTask(body);
      return Promise.resolve(json({ id: t.id, message: 'Task created' }));
    }
    const taskM = path.match(/^\/api\/tasks\/(\d+)$/);
    if (taskM) {
      const id = taskM[1];
      if (method === 'GET')    return Promise.resolve(json(LocalDB.getTask(id) || {}, LocalDB.getTask(id) ? 200 : 404));
      if (method === 'PUT')  { LocalDB.updateTask(id, body); return Promise.resolve(json({ message: 'Task updated' })); }
      if (method === 'DELETE') { LocalDB.deleteTask(id);   return Promise.resolve(json({ message: 'Task deleted' })); }
    }

    // --- notes ---
    if (path === '/api/notes' && method === 'GET') {
      return Promise.resolve(json(LocalDB.getNotes()));
    }
    if (path === '/api/notes' && method === 'POST') {
      const n = LocalDB.createNote(body);
      return Promise.resolve(json({ id: n.id, message: 'Note created' }));
    }
    const noteM = path.match(/^\/api\/notes\/(\d+)$/);
    if (noteM) {
      const id = noteM[1];
      if (method === 'PUT')    { LocalDB.updateNote(id, body); return Promise.resolve(json({ message: 'Note updated' })); }
      if (method === 'DELETE') { LocalDB.deleteNote(id);       return Promise.resolve(json({ message: 'Note deleted' })); }
    }

    // --- habits ---
    if (path === '/api/habits' && method === 'GET') {
      return Promise.resolve(json(LocalDB.getHabits()));
    }
    if (path === '/api/initialize-habits' && method === 'POST') {
      return Promise.resolve(json({ message: 'Default habits initialized' }));
    }
    const habitComplete = path.match(/^\/api\/habits\/(\d+)\/complete$/);
    if (habitComplete && method === 'POST') {
      const streak = LocalDB.completeHabit(habitComplete[1]);
      return Promise.resolve(json({ message: 'Habit completed!', streak }));
    }
    const habitSkip = path.match(/^\/api\/habits\/(\d+)\/skip$/);
    if (habitSkip && method === 'POST') {
      const streak = LocalDB.skipHabit(habitSkip[1]);
      return Promise.resolve(json({ message: 'Habit skipped', streak }));
    }

    // --- logs ---
    if (path === '/api/logs/today' && method === 'GET') {
      const log = LocalDB.getTodayLog();
      return Promise.resolve(json(log ? { ...log, exists: true } : { exists: false }));
    }
    if (path === '/api/logs' && method === 'GET') {
      return Promise.resolve(json(LocalDB.getLogs()));
    }
    if (path === '/api/logs' && method === 'POST') {
      const result = LocalDB.createLog(body);
      if (result.error) return Promise.resolve(json(result, 400));
      return Promise.resolve(json({ id: result.id, message: 'Log created' }));
    }
    const logM = path.match(/^\/api\/logs\/(\d+)$/);
    if (logM) {
      const id = logM[1];
      if (method === 'PUT')    { LocalDB.updateLog(id, body); return Promise.resolve(json({ message: 'Log updated' })); }
      if (method === 'DELETE') { LocalDB.deleteLog(id);       return Promise.resolve(json({ message: 'Log deleted' })); }
    }

    // --- recap ---
    if (path === '/api/daily-recap') {
      return Promise.resolve(json(LocalDB.getDailyRecap()));
    }

    // --- health ---
    if (path === '/health') {
      return Promise.resolve(json({ status: 'local', timestamp: now() }));
    }

    // Unmatched — pass through
    return window._originalFetch(url, opts);
  }

  // ── Intercept fetch ───────────────────────────────────────────────────────
  window._originalFetch = window.fetch.bind(window);

  window.fetch = async function (url, opts = {}) {
    const urlStr = typeof url === 'string' ? url : url.toString();

    // Only intercept our own API calls
    if (!urlStr.includes('/api/') && !urlStr.includes('/health')) {
      return window._originalFetch(url, opts);
    }

    // If we already confirmed server is down, go local immediately
    if (_serverOk === false) {
      return localFetch(urlStr, opts);
    }

    // Try server first
    try {
      const r = await window._originalFetch(url, opts);
      if (_serverOk !== true) { _serverOk = true; updateBadge(); }
      return r;
    } catch {
      // Server unreachable — fall back to local
      if (_serverOk !== false) { _serverOk = false; updateBadge(); }
      console.warn('[Axon] Server unreachable — using localStorage');
      return localFetch(urlStr, opts);
    }
  };

  // ── Expose for console debugging ─────────────────────────────────────────
  window.AxonLocalDB = LocalDB;

  // ── Init: badge + server check ────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    // Inject storage badge into topbar / sidebar footer if elements exist
    function injectBadge(containerId) {
      const el = document.getElementById(containerId);
      if (!el) return;
      const badge = document.createElement('span');
      badge.id = 'storageBadge';
      badge.className = 'storage-badge local';
      badge.textContent = '💾 Local';
      badge.title = 'Data storage mode';
      el.appendChild(badge);
    }
    injectBadge('sidebarFooter');
    injectBadge('topbarActions');

    // Check server in background
    checkServer();
    setInterval(checkServer, 30_000);
  });

  // ── Sync local → server when server comes back ────────────────────────────
  // (best-effort: tries to push any local records that don't have "server" ids)
  // You can call window.AxonSync() manually from the console too.
  window.AxonSync = async function () {
    if (!_serverOk) { console.warn('[Axon] Sync skipped — server is offline'); return; }
    console.info('[Axon] Sync started (local → server)…');
    // Tasks
    for (const t of load(KEYS.tasks)) {
      if (String(t.id).length > 10) { // our local UIDs are large timestamps
        await window._originalFetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(t),
        }).catch(() => {});
      }
    }
    // Notes
    for (const n of load(KEYS.notes)) {
      if (String(n.id).length > 10) {
        await window._originalFetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(n),
        }).catch(() => {});
      }
    }
    console.info('[Axon] Sync complete.');
  };

})();
