import { useQuery } from 'convex/react';
import { ArrowRight, FileText, PenLine } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { Button, EmptyState, LoadingState, PageHeader, SearchInput, StatusBadge } from '../components/ui';
import { api } from '../lib/api';
import { plainRichText } from '../lib/richText';
import { formatDate } from '../lib/utils';
import type { ArticleStatus } from '../types';

const filters: Array<'all' | ArticleStatus> = ['all', 'pending', 'approved', 'rejected', 'draft', 'trashed'];

export function ArticlesPage() {
  const articles = useQuery(api.articles.list, {});
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const filter = (params.get('status') ?? 'all') as 'all' | ArticleStatus;

  if (!articles) return <LoadingState />;
  const normalized = search.toLowerCase();
  const visible = [...articles]
    .filter((article) => filter === 'all' || article.status === filter)
    .filter((article) => `${plainRichText(article.title)} ${article.reporterName}`.toLowerCase().includes(normalized))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return (
    <div className="page">
      <PageHeader eyebrow="Editorial" title="Articles" description="Review every submission, publication state, and archived story." actions={<Link to="/articles/new"><Button><PenLine size={16} /> Write article</Button></Link>} />
      <div className="toolbar">
        <div className="segmented-control">{filters.map((status) => (
          <button type="button" className={filter === status ? 'active' : ''} onClick={() => setParams(status === 'all' ? {} : { status })} key={status}>
            {status}<span>{status === 'all' ? articles.length : articles.filter((article) => article.status === status).length}</span>
          </button>
        ))}</div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search title or reporter" />
      </div>
      <section className="data-panel">
        <div className="table article-table">
          <div className="table-head"><span>Story</span><span>Reporter</span><span>Submitted</span><span>Status</span><span /></div>
          {visible.map((article) => (
            <Link className="table-row" to={`/articles/${article.id}`} key={article.id}>
              <div className="story-cell"><img src={article.banner} alt="" /><span><strong>{plainRichText(article.title)}</strong><small>{article.summary || `${article.views ?? 0} views`}</small></span></div>
              <span>{article.reporterName}</span>
              <span>{formatDate(article.submittedAt ?? article.createdAt)}</span>
              <StatusBadge value={article.status} />
              <ArrowRight size={17} />
            </Link>
          ))}
        </div>
        {!visible.length ? <EmptyState title="No articles found" message="Try another status or search phrase." /> : null}
      </section>
      <div className="mobile-records">{visible.map((article) => (
        <Link to={`/articles/${article.id}`} key={article.id}><FileText /><div><strong>{plainRichText(article.title)}</strong><span>{article.reporterName} · {formatDate(article.createdAt)}</span></div><StatusBadge value={article.status} /></Link>
      ))}</div>
    </div>
  );
}
