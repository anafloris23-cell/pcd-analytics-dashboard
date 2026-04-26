(function () {
  'use strict';

  const MAX_ACTIVITY_ENTRIES = 30;
  const MIN_BACKOFF_MS = 1000;
  const MAX_BACKOFF_MS = 30000;

  const statusEl = document.getElementById('connection-status');
  const userCountEl = document.getElementById('user-count');
  const windowEl = document.getElementById('window-minutes');
  const lastUpdateEl = document.getElementById('last-update');
  const topBodyEl = document.getElementById('top-body');
  const activityListEl = document.getElementById('activity-list');

  const activityBuffer = [];
  let socket = null;
  let backoff = MIN_BACKOFF_MS;
  let reconnectTimer = null;

  function setStatus(state, label) {
    statusEl.className = `status ${state}`;
    statusEl.textContent = label;
  }

  function wsUrl() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${location.host}/ws`;
  }

  function connect() {
    setStatus('connecting', 'connecting...');
    socket = new WebSocket(wsUrl());

    socket.addEventListener('open', () => {
      setStatus('connected', 'connected');
      backoff = MIN_BACKOFF_MS;
    });

    socket.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data);
        handleMessage(message);
      } catch (err) {
        console.error('failed to parse message', err);
      }
    });

    socket.addEventListener('close', () => {
      setStatus('disconnected', 'disconnected');
      scheduleReconnect();
    });

    socket.addEventListener('error', (err) => {
      console.warn('websocket error', err);
    });
  }

  function scheduleReconnect() {
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
      connect();
    }, backoff);
  }

  function handleMessage(message) {
    if (message.connectedClients !== undefined) {
      userCountEl.textContent = message.connectedClients;
    }
    if (message.windowMinutes !== undefined) {
      windowEl.textContent = message.windowMinutes;
    }
    if (message.serverTimestamp) {
      lastUpdateEl.textContent = formatTime(message.serverTimestamp);
    } else {
      lastUpdateEl.textContent = formatTime(new Date().toISOString());
    }

    if (message.type === 'snapshot' || message.type === 'stats-update') {
      renderTop(message.stats || []);
    }

    if (message.type === 'stats-update' && message.event) {
      pushActivity(message.event, message.serverTimestamp);
    }
  }

  function renderTop(stats) {
    if (!stats.length) {
      topBodyEl.innerHTML = '<tr class="empty"><td colspan="3">Niciun eveniment inca</td></tr>';
      return;
    }
    topBodyEl.innerHTML = stats
      .map((row, idx) => {
        return `<tr>
          <td class="rank">#${idx + 1}</td>
          <td>${escapeHtml(row.resourceId)}</td>
          <td class="views">${row.views}</td>
        </tr>`;
      })
      .join('');
  }

  function pushActivity(event, serverTimestamp) {
    activityBuffer.unshift({
      time: serverTimestamp || new Date().toISOString(),
      resourceId: event.resourceId,
      action: event.action
    });
    if (activityBuffer.length > MAX_ACTIVITY_ENTRIES) {
      activityBuffer.length = MAX_ACTIVITY_ENTRIES;
    }
    renderActivity();
  }

  function renderActivity() {
    if (!activityBuffer.length) {
      activityListEl.innerHTML = '<li class="empty">Niciun eveniment inca</li>';
      return;
    }
    activityListEl.innerHTML = activityBuffer
      .map((entry) => {
        return `<li>
          <span class="activity-time">${formatTime(entry.time)}</span>
          <span class="activity-id">${escapeHtml(entry.action)} · ${escapeHtml(entry.resourceId)}</span>
        </li>`;
      })
      .join('');
  }

  function formatTime(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return iso;
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  connect();
})();
