import React, { useEffect, useState } from 'react';

export default function RequestListPanel() {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    const res = await fetch('/api/property/requests/owner');
    const json = await res.json();
    if (json.success) setRequests(json.data || []);
  };

  const act = async (id, action) => {
    const res = await fetch(`/api/property/requests/${id}/${action}`, { method: 'POST' });
    const json = await res.json();
    if (json.success) fetchRequests();
    else alert(json.message || 'Failed');
  };

  return (
    <div className="p-4">
      <h3 className="text-xl font-bold mb-3">Incoming Purchase Requests</h3>
      {requests.length === 0 && <div>No requests</div>}
      <div className="space-y-3">
        {requests.map((r) => (
          <div key={r._id} className="border rounded p-3 flex justify-between items-center">
            <div>
              <div className="font-semibold">{r.propertyId} — {r.buyer?.fullName}</div>
              <div className="text-sm">{r.message}</div>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-primary" onClick={() => act(r._id, 'approve')}>Approve</button>
              <button className="btn btn-secondary" onClick={() => act(r._id, 'reject')}>Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
