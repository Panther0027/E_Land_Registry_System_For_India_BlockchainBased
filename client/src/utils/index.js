export const maskAadhaar = (value) => {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length <= 4) return cleaned;
  return 'XXXX-XXXX-' + cleaned.slice(-4);
};

export const formatAadhaarInput = (value) => {
  const cleaned = value.replace(/\D/g, '').slice(0, 12);
  const parts = [];
  for (let i = 0; i < cleaned.length; i += 4) {
    parts.push(cleaned.slice(i, i + 4));
  }
  return parts.join('-');
};

export const validateAadhaar = (aadhaar) => {
  const cleaned = String(aadhaar || '').replace(/[\s-]/g, '');
  return /^\d{12}$/.test(cleaned);
};

export const formatDate = (date) => {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

export const formatArea = (sqft) => {
  if (sqft >= 43560) return `${(sqft / 43560).toFixed(2)} acres`;
  return `${sqft.toLocaleString('en-IN')} sq.ft`;
};

export const truncateHash = (hash, start = 10, end = 8) => {
  if (!hash) return '';
  if (hash.length <= start + end) return hash;
  return `${hash.slice(0, start)}...${hash.slice(-end)}`;
};

export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

export const getStatusBadgeClass = (status) => {
  const map = {
    verified: 'badge-verified',
    pending: 'badge-pending',
    disputed: 'badge-disputed',
    transferred: 'bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold',
  };
  return map[status] || 'badge-pending';
};

export const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
};
