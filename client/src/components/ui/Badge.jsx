import { getStatusBadgeClass } from '../../utils';

const Badge = ({ status, children }) => (
  <span className={getStatusBadgeClass(status)}>
    {children || status?.charAt(0).toUpperCase() + status?.slice(1)}
  </span>
);

export default Badge;
