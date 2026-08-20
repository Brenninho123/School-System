class Network {
  constructor(options = {}) {
    this.storagePrefix = options.storagePrefix || "network:presence:";
    this.heartbeatInterval = options.heartbeatInterval || 15000;
    this.timeoutThreshold = options.timeoutThreshold || 45000;
    this.staleCleanupThreshold = options.staleCleanupThreshold || 300000;
    this.currentUser = null;
    this.heartbeatTimer = null;
    this.connectionListeners = new Set();
    this.presenceListeners = new Set();
    this._handleOnline = this._handleOnline.bind(this);
    this._handleOffline = this._handleOffline.bind(this);
    this._handleUnload = this._handleUnload.bind(this);
    this._handleStorage = this._handleStorage.bind(this);
  }

  registerUser({ id, name, role }) {
    if (!id) throw new Error("É necessário informar um id para o usuário.");
    this.currentUser = { id: String(id), name: name || String(id), role: role || "aluno" };
    return this.currentUser;
  }

  start() {
    if (typeof window === "undefined") return;
    window.addEventListener("online", this._handleOnline);
    window.addEventListener("offline", this._handleOffline);
    window.addEventListener("beforeunload", this._handleUnload);
    window.addEventListener("pagehide", this._handleUnload);
    window.addEventListener("storage", this._handleStorage);

    if (this.currentUser) {
      this._writePresence();
      this.heartbeatTimer = setInterval(() => {
        this._writePresence();
        this._cleanupStale();
      }, this.heartbeatInterval);
    }
  }

  stop() {
    if (typeof window === "undefined") return;
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this._removePresence();
    window.removeEventListener("online", this._handleOnline);
    window.removeEventListener("offline", this._handleOffline);
    window.removeEventListener("beforeunload", this._handleUnload);
    window.removeEventListener("pagehide", this._handleUnload);
    window.removeEventListener("storage", this._handleStorage);
  }

  isConnected() {
    if (typeof navigator === "undefined") return true;
    return navigator.onLine;
  }

  onConnectionChange(callback) {
    this.connectionListeners.add(callback);
    return () => this.connectionListeners.delete(callback);
  }

  onPresenceChange(callback) {
    this.presenceListeners.add(callback);
    return () => this.presenceListeners.delete(callback);
  }

  isUserOnline(id) {
    const entry = this._readPresence(String(id));
    if (!entry) return false;
    return Date.now() - entry.lastSeen < this.timeoutThreshold;
  }

  getOnlineUsers(role) {
    if (typeof localStorage === "undefined") return [];
    const now = Date.now();
    const users = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(this.storagePrefix)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const data = JSON.parse(raw);
        if (now - data.lastSeen >= this.timeoutThreshold) continue;
        if (role && data.role !== role) continue;
        users.push({
          id: key.slice(this.storagePrefix.length),
          name: data.name,
          role: data.role,
          lastSeen: data.lastSeen
        });
      } catch (err) {
        continue;
      }
    }
    return users.sort((a, b) => b.lastSeen - a.lastSeen);
  }

  getOnlineCount(role) {
    return this.getOnlineUsers(role).length;
  }

  _writePresence() {
    if (!this.currentUser || typeof localStorage === "undefined") return;
    const data = { name: this.currentUser.name, role: this.currentUser.role, lastSeen: Date.now() };
    localStorage.setItem(this.storagePrefix + this.currentUser.id, JSON.stringify(data));
  }

  _removePresence() {
    if (!this.currentUser || typeof localStorage === "undefined") return;
    localStorage.removeItem(this.storagePrefix + this.currentUser.id);
  }

  _readPresence(id) {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(this.storagePrefix + id);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (err) {
      return null;
    }
  }

  _cleanupStale() {
    if (typeof localStorage === "undefined") return;
    const now = Date.now();
    const staleKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(this.storagePrefix)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const data = JSON.parse(raw);
        if (now - data.lastSeen >= this.staleCleanupThreshold) staleKeys.push(key);
      } catch (err) {
        staleKeys.push(key);
      }
    }
    staleKeys.forEach(key => localStorage.removeItem(key));
  }

  _handleOnline() {
    this.connectionListeners.forEach(callback => callback(true));
  }

  _handleOffline() {
    this.connectionListeners.forEach(callback => callback(false));
  }

  _handleUnload() {
    this._removePresence();
  }

  _handleStorage(event) {
    if (!event.key || !event.key.startsWith(this.storagePrefix)) return;
    this.presenceListeners.forEach(callback => callback(this.getOnlineUsers()));
  }
}

if (typeof window !== "undefined") {
  window.Network = Network;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = Network;
}
