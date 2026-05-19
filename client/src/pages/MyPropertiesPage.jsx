import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { HiOutlineSearch, HiOutlinePlus } from 'react-icons/hi';
import PropertyCard from '../components/PropertyCard';
import { PropertyCardSkeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { propertyAPI } from '../services';

const FILTERS = ['all', 'verified', 'pending', 'disputed'];

const MyPropertiesPage = () => {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');

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
          {data.map((p, i) => <PropertyCard key={p._id} property={p} index={i} />)}
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
    </div>
  );
};

export default MyPropertiesPage;
