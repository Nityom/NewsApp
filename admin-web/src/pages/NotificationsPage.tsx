import { useMutation, useQuery } from 'convex/react';
import { Bell, CheckCheck, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button, EmptyState, LoadingState, PageHeader } from '../components/ui';
import { api } from '../lib/api';
import { formatDate } from '../lib/utils';

export function NotificationsPage() {
  const notifications = useQuery(api.notifications.list, {});
  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);
  if (!notifications) return <LoadingState />;
  const sorted = [...notifications].sort((left, right) => Number(left.isRead) - Number(right.isRead) || right.createdAt.localeCompare(left.createdAt));
  const unreadIds = notifications.filter((notification) => !notification.isRead).map((notification) => notification.id);

  return (
    <div className="page">
      <PageHeader eyebrow="Inbox" title="Notifications" description="System events and newsroom requests requiring administrator attention." actions={unreadIds.length ? <Button variant="secondary" onClick={() => void markAllRead({ ids: unreadIds })}><CheckCheck size={17} /> Mark all read</Button> : undefined} />
      <section className="notification-list">
        {sorted.map((notification) => {
          const target = notification.articleId ? `/articles/${notification.articleId}` : notification.reporterId ? `/reporters/${notification.reporterId}` : undefined;
          const content = <><div className={`notification-icon type-${notification.type}`}><Bell /></div><div><div className="notification-title"><strong>{notification.title}</strong>{!notification.isRead ? <span>New</span> : null}</div><p>{notification.message}</p><small>{formatDate(notification.createdAt, true)}</small></div>{target ? <ChevronRight /> : null}</>;
          return target ? <Link className={`notification-item ${notification.isRead ? '' : 'unread'}`} to={target} key={notification.id} onClick={() => { if (!notification.isRead) void markRead({ id: notification.id }); }}>{content}</Link> : <button type="button" className={`notification-item ${notification.isRead ? '' : 'unread'}`} key={notification.id} onClick={() => { if (!notification.isRead) void markRead({ id: notification.id }); }}>{content}</button>;
        })}
        {!sorted.length ? <EmptyState title="Inbox clear" message="New administrator notifications will appear here." /> : null}
      </section>
    </div>
  );
}
