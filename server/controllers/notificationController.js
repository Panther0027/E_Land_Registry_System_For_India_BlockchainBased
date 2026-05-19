import Notification from '../models/Notification.js';
import { isDbConnected } from '../config/db.js';
import { isDemoUser } from '../data/demoDocuments.js';

export const getNotifications = async (req, res, next) => {
  try {
    if (isDemoUser(req.user) || !isDbConnected()) {
      return res.json({ success: true, data: [], unreadCount: 0, demo: true });
    }

    const { filter } = req.query;
    const query = { user: req.user._id };

    if (filter === 'unread') query.isRead = false;
    else if (filter && filter !== 'all') query.type = filter;

    const notifications = await Notification.find(query).sort({ createdAt: -1 }).limit(50);
    const unreadCount = await Notification.countDocuments({ user: req.user._id, isRead: false });

    res.json({ success: true, data: notifications, unreadCount });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    if (isDemoUser(req.user) || !isDbConnected()) {
      return res.json({ success: true, message: 'Notification marked as read' });
    }
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    if (isDemoUser(req.user) || !isDbConnected()) {
      return res.json({ success: true, message: 'All notifications marked as read' });
    }
    await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};
