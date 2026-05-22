import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { HiOutlineSearch, HiOutlinePlus, HiOutlineX, HiOutlineTag } from 'react-icons/hi';
import toast from 'react-hot-toast';
import PropertyCard from '../components/PropertyCard';
import { PropertyCardSkeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { propertyAPI } from '../services';

const FILTERS = ['all', 'verified', 'pending', 'disputed', 'transferred'];

const SellPropertyModal = ({ property, onClose, onSuccess }) => {
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleListForSale = async (e) => {
    e.preventDefault();
    if (!price || parseFloat(price) <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    setLoading(true);
    try {
      await propertyAPI.listPropertyForSale({
        propertyId: property.propertyId,
        listingPrice: parseFloat(price),
        listingDescription: description,
      });
      toast.success('Property listed for sale!');
      queryClient.invalidateQueries(['my-properties']);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to list property');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold text-primary">List for Sale</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <HiOutlineX size={24} />
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            <strong>{property.propertyId}</strong> - {property.district}, {property.state}
          </p>
        </div>

        <form onSubmit={handleListForSale} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Asking Price (₹) *
            </label>
            <Input
              type="number"
              placeholder="e.g., 500000"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              min="1"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Description (Optional)
            </label>
            <textarea
              placeholder="Add details about the property, condition, amenities, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              rows="3"
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" loading={loading} className="flex-1">
              List for Sale
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const MyPropertyCardWithSell = ({ property, index, onListClick }) => (
  <div className="relative">
    <PropertyCard property={property} index={index} />
    {property.status === 'verified' && !property.forSale && (
      <button
        onClick={() => onListClick(property)}
        className="absolute top-3 right-3 flex items-center gap-1 bg-secondary text-primary px-3 py-1 rounded-lg text-xs font-medium hover:bg-secondary-light transition-colors"
      >
        <HiOutlineTag size={14} />
        Sell
      </button>
    )}
    {property.forSale && (
      <div className="absolute top-3 right-3 bg-success text-white px-3 py-1 rounded-lg text-xs font-medium">
        For Sale
      </div>
    )}
  </div>
);

const MyPropertiesPage = () => {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [selectedProperty, setSelectedProperty] = useState(null);
  const queryClient = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ['my-properties-stats'],
    queryFn: () => propertyAPI.getDashboardStats().then((r) => r.data.data),
    retry: 1,
    placeholderData: {
      pendingCount: 0,
      verifiedCount: 0,
      disputedCount: 0,
      transferredCount: 0,
    },
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['my-properties', filter, search, sort],
    queryFn: () =>
      propertyAPI.getMyProperties({ status: filter, search, sort }).then((r) => r.data.data),
    retry: 1,
    placeholderData: [],
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-primary">My Properties</h1>
          <p className="text-text-secondary">{data?.length ?? 0} properties registered</p>
        </div>
        <Link to="/register-property">
          <Button><HiOutlinePlus className="inline mr-1" /> Register New</Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <Input
            placeholder="Search by ID, survey number, district..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="input-field w-auto">
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Verified', value: stats?.verifiedCount ?? 0 },
          { label: 'Pending', value: stats?.pendingCount ?? 0 },
          { label: 'Disputed', value: stats?.disputedCount ?? 0 },
          { label: 'Transferred', value: stats?.transferredCount ?? 0 },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[.2em] text-text-secondary">{item.label}</p>
            <p className="mt-3 text-2xl font-semibold text-primary">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              filter === f ? 'bg-primary text-white' : 'bg-white text-text-secondary hover:bg-primary/5'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => <PropertyCardSkeleton key={i} />)}
        </div>
      ) : data?.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.map((p, i) => (
            <MyPropertyCardWithSell
              key={p._id}
              property={p}
              index={i}
              onListClick={setSelectedProperty}
            />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          title="Could not load properties"
          description="Start the API (cd bhumi/server && npm run dev) and log in again. For 10,000 dataset properties, run import:dataset with REGISTRY_PRIMARY_EMAIL in .env."
        />
      ) : (
        <EmptyState
          title="No properties found"
          description="Register your first property to get started with Bhumi."
          action={<Link to="/register-property"><Button>Register Property</Button></Link>}
        />
      )}

      {selectedProperty && (
        <SellPropertyModal
          property={selectedProperty}
          onClose={() => setSelectedProperty(null)}
          onSuccess={() => queryClient.invalidateQueries(['my-properties'])}
        />
      )}
    </div>
  );
};

export default MyPropertiesPage;
