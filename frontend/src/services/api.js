const API_BASE = '/api/v1';

export const api = {
  async getRfqs(statusFilter = '', search = '') {
    const params = new URLSearchParams();
    if (statusFilter && statusFilter !== 'ALL') params.append('status', statusFilter);
    if (search) params.append('search', search);
    
    const res = await fetch(`${API_BASE}/rfqs/?${params.toString()}`);
    if (!res.ok) throw new Error(`Failed to fetch RFQs: ${res.statusText}`);
    return res.json();
  },

  async getRfq(id) {
    const res = await fetch(`${API_BASE}/rfqs/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch RFQ details: ${res.statusText}`);
    return res.json();
  },

  async createRfq(rfqData) {
    const res = await fetch(`${API_BASE}/rfqs/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rfqData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to create RFQ');
    }
    return res.json();
  },

  async submitQuote(rfqId, quoteData) {
    const res = await fetch(`${API_BASE}/rfqs/${rfqId}/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quoteData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to submit quote');
    }
    return res.json();
  },

  async simulateBid(rfqId, simData) {
    const res = await fetch(`${API_BASE}/rfqs/${rfqId}/simulate-bid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(simData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to simulate bid');
    }
    return res.json();
  },
};

export function createRfqWebSocket(rfqId, onMessage, onError) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  const wsUrl = `${protocol}//${host}/api/v1/rfqs/${rfqId}/ws`;

  let ws = null;
  let pingInterval = null;
  let isClosedManually = false;

  function connect() {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      // Keep alive ping every 25s
      pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('ping');
        }
      }, 25000);
    };

    ws.onmessage = (event) => {
      if (event.data === 'pong') return;
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (err) {
        console.error('Error parsing WS message:', err);
      }
    };

    ws.onerror = (err) => {
      if (onError) onError(err);
    };

    ws.onclose = () => {
      clearInterval(pingInterval);
      if (!isClosedManually) {
        // Attempt reconnection after 3 seconds
        setTimeout(connect, 3000);
      }
    };
  }

  connect();

  return {
    close() {
      isClosedManually = true;
      clearInterval(pingInterval);
      if (ws) ws.close();
    }
  };
}
