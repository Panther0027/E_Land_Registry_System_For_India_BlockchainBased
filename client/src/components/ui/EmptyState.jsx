import { motion } from 'framer-motion';
import { HiOutlineInbox } from 'react-icons/hi';

const EmptyState = ({ icon: Icon = HiOutlineInbox, title, description, action }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-16 px-4 text-center"
  >
    <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center mb-6">
      <Icon size={36} className="text-primary/40" />
    </div>
    <h3 className="text-xl font-semibold text-text-primary mb-2">{title}</h3>
    <p className="text-text-secondary max-w-md mb-6">{description}</p>
    {action}
  </motion.div>
);

export default EmptyState;
