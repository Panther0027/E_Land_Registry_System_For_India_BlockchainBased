import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { HiOutlineDocumentText, HiOutlineSave, HiOutlineUpload, HiOutlineExternalLink, HiOutlineDownload } from 'react-icons/hi';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import EmptyState from '../components/ui/EmptyState';
import { CardSkeleton } from '../components/ui/Skeleton';
import { propertyAPI } from '../services';
import { formatDate } from '../utils';

const DEMO_SAMPLES = [
  { name: 'land_deed_khurda.pdf', label: 'Sample land deed (PDF)', propertyId: 'BH-001-KHURDA' },
  { name: 'ownership_proof_khurda.txt', label: 'Sample ownership proof (TXT)', propertyId: 'BH-001-KHURDA' },
];

const DocumentsPage = () => {
  const [uploading, setUploading] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState('');
  const queryClient = useQueryClient();

  const { data: documents, isLoading, isError } = useQuery({
    queryKey: ['documents'],
    queryFn: () => propertyAPI.getDocuments().then((r) => r.data.data),
    retry: 1,
  });

  const { data: properties } = useQuery({
    queryKey: ['my-properties-docs'],
    queryFn: () => propertyAPI.getMyProperties().then((r) => r.data.data),
  });

  const propertyOptions = [
    ...(properties?.map((p) => ({ value: p.propertyId, label: `${p.propertyId} — ${p.district}` })) || []),
  ];

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProperty) {
      toast.error('Select a property first');
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('document', file);
      fd.append('propertyId', selectedProperty);
      fd.append('documentType', file.type.includes('pdf') ? 'deed' : 'ownership_proof');
      await propertyAPI.uploadDocument(fd);
      toast.success('Document uploaded to IPFS');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      e.target.value = '';
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const downloadSample = (filename) => {
    window.open(`/api/demo-assets/${filename}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-primary">Documents</h1>
        <p className="text-text-secondary">Land deeds and proofs stored on IPFS</p>
      </div>

      <div className="card bg-primary/5 border border-primary/10">
        <p className="text-sm font-semibold text-primary mb-2">Demo sample files (for registration)</p>
        <p className="text-xs text-text-secondary mb-3">Download these fake documents and upload them when registering a property.</p>
        <div className="flex flex-wrap gap-2">
          {DEMO_SAMPLES.map((s) => (
            <button
              key={s.name}
              type="button"
              onClick={() => downloadSample(s.name)}
              className="text-xs px-3 py-2 rounded-lg bg-white border border-primary/20 text-primary hover:bg-primary hover:text-white transition-colors inline-flex items-center gap-1"
            >
              <HiOutlineDownload size={14} /> {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card flex flex-col sm:flex-row gap-4 items-end">
        <Select
          label="Upload to Property"
          className="flex-1"
          placeholder="Select property..."
          options={propertyOptions}
          value={selectedProperty}
          onChange={(e) => setSelectedProperty(e.target.value)}
        />
        <label className={!selectedProperty ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}>
          <input type="file" className="hidden" accept=".pdf,.txt,image/*" onChange={handleUpload} disabled={uploading || !selectedProperty} />
          <span className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 rounded-xl">
            {uploading ? 'Uploading...' : <><HiOutlineUpload /> Upload Document</>}
          </span>
        </label>
      </div>

      {isLoading ? (
        <div className="space-y-4">{[1, 2, 3].map((i) => <CardSkeleton key={i} />)}</div>
      ) : isError ? (
        <EmptyState icon={HiOutlineDocumentText} title="Could not load documents" description="Ensure the backend is running and you are logged in." />
      ) : documents?.length > 0 ? (
        <div className="space-y-4">
          {documents.map((doc, i) => (
            <div key={`${doc.propertyId}-${doc.name}-${i}`} className="card flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center shrink-0">
                  <HiOutlineDocumentText size={24} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{doc.name}</p>
                  <p className="text-sm text-text-secondary">{doc.propertyId} • {doc.location}</p>
                  <p className="text-xs text-text-secondary capitalize">
                    {doc.type?.replace('_', ' ')} • {doc.uploadedAt ? formatDate(doc.uploadedAt) : '—'} • IPFS: {doc.ipfsHash?.slice(0, 16)}…
                  </p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {doc.ipfsUrl && (
                  <a href={doc.ipfsUrl} target="_blank" rel="noopener noreferrer" title="View on IPFS">
                    <Button variant="ghost" size="sm"><HiOutlineExternalLink /></Button>
                  </a>
                )}
                {doc.ipfsUrl && (
                  <a href={doc.ipfsUrl} download={doc.name} title="Download">
                    <Button variant="outline" size="sm"><HiOutlineSave /></Button>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={HiOutlineDocumentText}
          title="No documents yet"
          description="Upload land deeds and ownership proofs, or use the demo samples above."
        />
      )}
    </div>
  );
};

export default DocumentsPage;
