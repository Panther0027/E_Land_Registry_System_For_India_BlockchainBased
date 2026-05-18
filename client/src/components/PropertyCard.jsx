import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { HiOutlineLocationMarker, HiOutlineScale } from 'react-icons/hi';
import Badge from './ui/Badge';
import { formatArea } from '../utils';

const PropertyCard = ({ property, index = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05 }}
  >
    <Link
      to={`/properties/${property.propertyId}`}
      className="card block hover:shadow-card-hover transition-all duration-300 group"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-xs text-text-secondary font-medium">Property ID</p>
          <h3 className="font-semibold text-primary group-hover:text-primary-light transition-colors">
            {property.propertyId}
          </h3>
        </div>
        <Badge status={property.status} />
      </div>

      <div className="space-y-2 text-sm text-text-secondary">
        <div className="flex items-center gap-2">
          <HiOutlineLocationMarker className="text-secondary shrink-0" />
          <span>{property.district}, {property.state}</span>
        </div>
        <div className="flex items-center gap-2">
          <HiOutlineScale className="text-secondary shrink-0" />
          <span>{formatArea(property.area)} • {property.landType}</span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
        <span className="text-xs text-text-secondary">Survey: {property.surveyNumber}</span>
        <span className="text-xs text-primary font-medium group-hover:underline">View Details →</span>
      </div>
    </Link>
  </motion.div>
);

export default PropertyCard;
