import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  HiOutlineSearch, HiOutlineFilter, HiOutlineExclamationCircle, HiOutlineShoppingCart, HiOutlineHeart
} from 'react-icons/hi';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import { PropertyCardSkeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { propertyAPI } from '../services';
import { formatArea, formatCurrency } from '../utils';

const PropertyMarketplacePage = () => {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['marketplace', search, sort, page, minPrice, maxPrice],
    queryFn: () =>
      propertyAPI.getPropertiesForSale({
        search,
        sort,
        page,
        limit: 12,
        minPrice: minPrice ? parseInt(minPrice) : undefined,
        maxPrice: maxPrice ? parseInt(maxPrice) : undefined,
      }).then((r) => r.data),
    retry: 1,
    placeholderData: { data: [], count: 0, total: 0 },
  });

  const handleViewDetails = (propertyId) => {
    navigate(`/property/${propertyId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-primary">Property Marketplace</h1>
          <p className="text-text-secondary">Browse verified properties for sale</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="card space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <Input
              placeholder="Search by ID, survey number, district..."
              className="pl-10"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <HiOutlineFilter size={20} />
            <span className="text-sm font-medium">Filters</span>
          </button>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            className="input-field w-auto"
          >
            <option value="newest">Newest First</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="p-4 border-t border-slate-200 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Min Price (₹)</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={minPrice}
                  onChange={(e) => {
                    setMinPrice(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Max Price (₹)</label>
                <Input
                  type="number"
                  placeholder="No limit"
                  value={maxPrice}
                  onChange={(e) => {
                    setMaxPrice(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setMinPrice('');
                setMaxPrice('');
                setPage(1);
              }}
              className="w-full"
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      {/* Results Stats */}
      {data && (
        <div className="text-sm text-text-secondary">
          Showing {data.data?.length || 0} of {data.total || 0} properties
        </div>
      )}

      {/* Properties Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <PropertyCardSkeleton key={i} />
          ))}
        </div>
      ) : data?.data?.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.data.map((property) => (
              <div
                key={property._id || property.propertyId}
                className="card group overflow-hidden hover:shadow-lg transition-shadow duration-300"
              >
                {/* Header Badge */}
                <div className="flex items-center justify-between mb-4">
                  <Badge status={property.status} />
                  <div className="flex items-center gap-2 text-yellow-500">
                    <HiOutlineHeart size={18} />
                  </div>
                </div>

                {/* Property Info */}
                <div className="space-y-3 mb-4">
                  <div>
                    <p className="text-xs uppercase tracking-[.2em] text-text-secondary">Property ID</p>
                    <p className="font-semibold text-lg text-primary">{property.propertyId}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-text-secondary">Owner</p>
                      <p className="font-medium text-sm">{property.ownerName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary">Area</p>
                      <p className="font-medium text-sm">{formatArea(property.area)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-text-secondary">District</p>
                      <p className="font-medium text-sm">{property.district}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary">Type</p>
                      <p className="font-medium text-sm capitalize">{property.landType}</p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {property.listingDescription && (
                  <p className="text-sm text-text-secondary mb-4 line-clamp-2">{property.listingDescription}</p>
                )}

                {/* Price */}
                <div className="mb-4 pb-4 border-b border-slate-200">
                  <p className="text-xs text-text-secondary">Asking Price</p>
                  <p className="text-2xl font-bold text-primary">
                    ₹{formatCurrency(property.listingPrice)}
                  </p>
                </div>

                {/* Seller Info */}
                {property.owner && (
                  <div className="flex items-center gap-2 mb-4 p-3 bg-slate-50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-primary text-xs font-bold">
                      {property.owner.fullName?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-primary">{property.owner.fullName}</p>
                      {property.owner.email && (
                        <p className="text-xs text-text-secondary">{property.owner.email}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleViewDetails(property.propertyId)}
                  >
                    View Details
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => {
                      navigate(`/transfer?propertyId=${property.propertyId}`);
                      toast.success('Redirecting to transfer page');
                    }}
                  >
                    <HiOutlineShoppingCart className="mr-2 inline" />
                    Inquire
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {data.total > 12 && (
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-text-secondary">
                Page {page}
              </span>
              <Button
                variant="outline"
                disabled={data.count < 12}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          title="No properties for sale"
          description="Check back soon! New properties will be listed regularly."
        />
      )}
    </div>
  );
};

export default PropertyMarketplacePage;
