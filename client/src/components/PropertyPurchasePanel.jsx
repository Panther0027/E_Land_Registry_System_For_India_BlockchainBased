import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

export default function PropertyPurchasePanel() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');

  useEffect(() => {
    fetchAvailable();
  }, []);

  // socket
  const socketRef = useRef(null);
  useEffect(() => {
    // include userId if available via window.__BHUMI_USER_ID (app may expose it) or skip
    const socket = io(undefined, { autoConnect: true, withCredentials: true, query: {} });
    socketRef.current = socket;
    socket.on('purchase_request', (data) => {
      // incoming purchase request notification
      fetchAvailable();
    });
    socket.on('new_message', (data) => {
      if (data?.message?.purchaseRequest === selected) {
        setMessages((m) => [...m, data.message]);
      }
    });
    return () => {
      socket.disconnect();
    };
  }, [selected]);

  const fetchAvailable = async () => {
    setLoading(true);
    const res = await fetch('/api/property/available');
    const json = await res.json();
    if (json.success) setProperties(json.data || []);
    setLoading(false);
  };

  const requestPurchase = async (propertyId) => {
    const res = await fetch('/api/property/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId, message: 'I would like to buy this property' }),
    });
    const json = await res.json();
    if (json.success) alert('Request sent');
    else alert(json.message || 'Failed');
  };

  const openChat = async (prId) => {
    setSelected(prId);
    const res = await fetch(`/api/property/requests/${prId}/messages`);
    const json = await res.json();
    if (json.success) setMessages(json.data || []);
    // join purchase room
    if (socketRef.current) socketRef.current.emit('joinPurchaseRoom', prId);
  };

  const sendMessage = async () => {
    if (!text || !selected) return;
    const res = await fetch(`/api/property/requests/${selected}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const json = await res.json();
    if (json.success) {
      setMessages((m) => [...m, json.data]);
      setText('');
    }
  };

  return (
    <div className="p-4">
      <h3 className="text-xl font-bold mb-3">Properties Available to Buy</h3>
      {loading && <div>Loading...</div>}
      {!loading && properties.length === 0 && <div>No properties found</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {properties.map((p) => (
          <div key={p.propertyId} className="border rounded p-3">
            <div className="font-semibold">{p.propertyId} — {p.owner?.fullName || 'Owner'}</div>
            <div className="text-sm">{p.district}, {p.state} — {p.area} sqft</div>
            <div className="mt-2 flex gap-2">
              <button className="btn btn-primary" onClick={() => requestPurchase(p.propertyId)}>Request Purchase</button>
              <button className="btn" onClick={() => alert(JSON.stringify(p, null, 2))}>View</button>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="mt-6 border rounded p-3">
          <h4 className="font-semibold">Conversation</h4>
          <div className="max-h-48 overflow-auto mt-2">
            {messages.map((m) => (
              <div key={m._id} className="mb-2">
                <div className="text-xs text-gray-500">{m.from?.fullName || m.from}</div>
                <div>{m.text}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input className="flex-1 p-2 border rounded" value={text} onChange={(e) => setText(e.target.value)} />
            <button className="btn btn-primary" onClick={sendMessage}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}
