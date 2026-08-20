class NetworkManager {
  constructor(options = {}) {
    this.network = options.network || new Network(options.networkOptions || {});
    this.pingUrl = options.pingUrl || null;
    this.pingInterval = options.pingInterval || 20000;
    this.reconnectBackoff = options.reconnectBackoff || [1000, 2000, 5000, 10000, 30000];
    this.queue = [];
    this.listeners = { status: new Set(), presence: new Set(), queue: new Set() };
    this.connected = null;
    this.reconnectAttempt = 0;
    this.reconnectTimer = null;
    this.pingTimer = null;
  }

  init(user) {
    if (!this._wired) {
      this.network.onConnectionChange(connected => this._handleConnectionChange(connected));
      this.network.onPresenceChange(users => this._emit("presence", users));
      this._wired = true;
    }
    if (user) this.network.registerUser(user);
    this.network.start();
    this.connected = this.network.isConnected();
    this._emit("status", this._status());
    if (this.pingUrl) this._startPing();
    return this;
  }

  destroy() {
    this.network.stop();
    this._stopPing();
    this._stopReconnectLoop();
  }

  onStatusChange(callback) {
    this.listeners.status.add(callback);
    return () => this.listeners.status.delete(callback);
  }

  onPresenceChange(callback) {
    this.listeners.presence.add(callback);
    return () => this.listeners.presence.delete(callback);
  }

  onQueueFlushed(callback) {
    this.listeners.queue.add(callback);
    return () => this.listeners.queue.delete(callback);
  }

  getStatus() {
    return this._status();
  }

  getOnlineUsers(role) {
    return this.network.getOnlineUsers(role);
  }

  getOnlineCount(role) {
    return this.network.getOnlineCount(role);
  }

  enqueue(task) {
    this.queue.push(task);
    if (this.connected) this._flushQueue();
    return this.queue.length;
  }

  async _flushQueue() {
    if (!this.queue.length) return;
    const pending = this.queue.splice(0, this.queue.length);
    const results = [];
    for (const task of pending) {
      try {
        results.push(await task());
      } catch (err) {
        results.push({ error: err.message });
      }
    }
    this._emit("queue", results);
  }

  _handleConnectionChange(connected) {
    this.connected = connected;
    this._emit("status", this._status());
    if (connected) {
      this.reconnectAttempt = 0;
      this._stopReconnectLoop();
      this._flushQueue();
    } else {
      this._startReconnectLoop();
    }
  }

  _startReconnectLoop() {
    this._stopReconnectLoop();
    const attempt = () => {
      const delay = this.reconnectBackoff[Math.min(this.reconnectAttempt, this.reconnectBackoff.length - 1)];
      this.reconnectTimer = setTimeout(async () => {
        this.reconnectAttempt++;
        const reachable = await this._checkReachable();
        if (reachable) {
          this._handleConnectionChange(true);
        } else if (!this.connected) {
          attempt();
        }
      }, delay);
    };
    attempt();
  }

  _stopReconnectLoop() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  _startPing() {
    this._stopPing();
    this.pingTimer = setInterval(() => {
      this._checkReachable().then(reachable => {
        if (reachable !== this.connected) this._handleConnectionChange(reachable);
      });
    }, this.pingInterval);
  }

  _stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  async _checkReachable() {
    if (!this.pingUrl || typeof fetch === "undefined") return this.network.isConnected();
    try {
      await fetch(this.pingUrl, { method: "HEAD", cache: "no-store", mode: "no-cors" });
      return true;
    } catch (err) {
      return false;
    }
  }

  _status() {
    return {
      connected: this.connected,
      onlineUsers: this.network.getOnlineUsers(),
      students: this.network.getOnlineCount("aluno"),
      teachers: this.network.getOnlineCount("professor"),
      queued: this.queue.length
    };
  }

  _emit(kind, payload) {
    this.listeners[kind].forEach(callback => callback(payload));
  }
}

if (typeof window !== "undefined") {
  window.NetworkManager = NetworkManager;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = NetworkManager;
}
