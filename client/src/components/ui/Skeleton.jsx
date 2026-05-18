const Skeleton = ({ className = '', variant = 'rect' }) => {
  const variants = {
    rect: 'rounded-xl',
    circle: 'rounded-full',
    text: 'rounded h-4',
  };

  return (
    <div
      className={`animate-pulse bg-gray-200 ${variants[variant]} ${className}`}
    />
  );
};

export const CardSkeleton = () => (
  <div className="card space-y-4">
    <Skeleton className="h-6 w-1/3" variant="text" />
    <Skeleton className="h-4 w-full" variant="text" />
    <Skeleton className="h-4 w-2/3" variant="text" />
  </div>
);

export const PropertyCardSkeleton = () => (
  <div className="card">
    <div className="flex justify-between items-start mb-4">
      <Skeleton className="h-6 w-32" variant="text" />
      <Skeleton className="h-6 w-20 rounded-full" />
    </div>
    <Skeleton className="h-4 w-full mb-2" variant="text" />
    <Skeleton className="h-4 w-2/3" variant="text" />
  </div>
);

export const DashboardSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-10 w-64" variant="text" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="card">
          <Skeleton className="h-4 w-24 mb-3" variant="text" />
          <Skeleton className="h-8 w-16" variant="text" />
        </div>
      ))}
    </div>
  </div>
);

export default Skeleton;
