import React from 'react';

const SkeletonLoader = ({ className = '', width = 'w-full', height = 'h-4' }) => {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${width} ${height} ${className}`} />
  );
};

export const SearchSkeleton = () => {
  return (
    <div className="space-y-4">
      {/* Search input skeleton */}
      <div className="relative">
        <SkeletonLoader height="h-12" className="rounded-lg" />
      </div>
      
      {/* Suggestions skeleton */}
      <div className="bg-white border border-gray-300 rounded-lg shadow-lg">
        {[...Array(5)].map((_, index) => (
          <div key={index} className="p-3 border-b last:border-b-0">
            <div className="flex justify-between items-center">
              <SkeletonLoader width="w-3/4" />
              <SkeletonLoader width="w-16" height="h-3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const VisualizationSkeleton = () => {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <SkeletonLoader width="w-1/2" height="h-8" />
        <SkeletonLoader width="w-3/4" height="h-4" />
      </div>
      
      {/* Info box skeleton */}
      <div className="p-4 bg-blue-50 rounded-lg space-y-2">
        <SkeletonLoader width="w-1/3" height="h-5" />
        <SkeletonLoader width="w-full" height="h-4" />
        <SkeletonLoader width="w-5/6" height="h-4" />
        <SkeletonLoader width="w-4/5" height="h-4" />
      </div>
      
      {/* Visualization area skeleton */}
      <div className="border border-gray-200 rounded-lg p-6">
        <SkeletonLoader width="w-full" height="h-96" className="rounded" />
      </div>
    </div>
  );
};

export const PerformanceSkeleton = () => {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <SkeletonLoader width="w-1/3" height="h-8" />
      
      {/* Metrics grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow border">
            <SkeletonLoader width="w-1/2" height="h-4" className="mb-2" />
            <SkeletonLoader width="w-3/4" height="h-8" className="mb-1" />
            <SkeletonLoader width="w-1/3" height="h-3" />
          </div>
        ))}
      </div>
      
      {/* Chart skeleton */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <SkeletonLoader width="w-1/4" height="h-6" className="mb-4" />
        <SkeletonLoader width="w-full" height="h-64" className="rounded" />
      </div>
    </div>
  );
};

export const TableSkeleton = ({ rows = 5, columns = 3 }) => {
  return (
    <div className="space-y-2">
      {/* Header row */}
      <div className="flex space-x-4 p-3 bg-gray-50 rounded">
        {[...Array(columns)].map((_, index) => (
          <SkeletonLoader key={index} width="flex-1" height="h-4" />
        ))}
      </div>
      
      {/* Data rows */}
      {[...Array(rows)].map((_, rowIndex) => (
        <div key={rowIndex} className="flex space-x-4 p-3 border-b">
          {[...Array(columns)].map((_, colIndex) => (
            <SkeletonLoader key={colIndex} width="flex-1" height="h-4" />
          ))}
        </div>
      ))}
    </div>
  );
};

export default SkeletonLoader;