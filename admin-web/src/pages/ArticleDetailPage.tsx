import { useMutation, useQuery } from 'convex/react';
import { ArrowLeft, Check, Download, ImagePlus, Pencil, RotateCcw, Save, Trash2, X } from 'lucide-react';
import { useState, type ChangeEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { ArticlePreview } from '../components/ArticlePreview';
import { Button, Dialog, EmptyState, LoadingState, PageHeader, StatusBadge } from '../components/ui';
import { api } from '../lib/api';
import { exportArticleAsPng } from '../lib/exportArticle';
import { uploadImage } from '../lib/upload';
import { articleImageFilename, dateInputValue, errorMessage, publicationDate } from '../lib/utils';

export function ArticleDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const articles = useQuery(api.articles.list, {});
  const publication = useQuery(api.settings.getPublicationInfo, {});
  const patchArticle = useMutation(api.articles.patch);
  const removeArticle = useMutation(api.articles.remove);
  const addNotification = useMutation(api.notifications.add);
  const selectedArticle = articles?.find((item) => item.id === id);
  const [date, setDate] = useState('');
  const [ads, setAds] = useState<string[] | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  if (!articles || publication === undefined) return <LoadingState />;
  if (!selectedArticle) return <div className="page"><EmptyState title="Article not found" message="It may have been permanently deleted." /></div>;
  const article = selectedArticle;
  const currentAds = ads ?? article.advertisements;
  const currentDate = date || dateInputValue(article.registrationDate ?? article.reviewedAt);
  const previewArticle = { ...article, advertisements: currentAds, registrationDate: currentDate ? publicationDate(currentDate) : article.registrationDate };

  async function run(name: string, action: () => Promise<void>) {
    setBusy(name);
    setMessage('');
    try { await action(); } catch (error) { setMessage(errorMessage(error)); } finally { setBusy(''); }
  }

  async function notify(status: 'approved' | 'rejected', reason?: string) {
    await addNotification({ notification: {
      type: status === 'approved' ? 'article_approved' : 'article_rejected',
      audience: 'reporter',
      reporterId: article.reporterId,
      articleId: article.id,
      title: status === 'approved' ? 'Article Approved' : 'Article Needs Changes',
      message: status === 'approved' ? `“${article.title}” has been approved for publication.` : reason || 'Please review the editorial feedback.',
    } });
  }

  async function uploadAds(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    if (!files.length) return;
    await run('upload', async () => {
      const uploaded = await Promise.all(files.map((file) => uploadImage(file)));
      setAds([...currentAds, ...uploaded]);
    });
    event.target.value = '';
  }

  function saveChanges() {
    return run('save', async () => {
      await patchArticle({ id: article.id, patch: {
        advertisements: currentAds,
        ...(currentDate ? { registrationDate: publicationDate(currentDate) } : {}),
      } });
      setAds(null);
    });
  }

  function approve() {
    return run('approve', async () => {
      const reviewedAt = new Date().toISOString();
      await patchArticle({ id: article.id, patch: {
        status: 'approved', reviewedAt, advertisements: currentAds,
        registrationDate: currentDate ? publicationDate(currentDate) : publicationDate(reviewedAt.slice(0, 10)),
      } });
      await notify('approved');
    });
  }

  function reject() {
    if (!rejectionReason.trim()) return;
    return run('reject', async () => {
      await patchArticle({ id: article.id, patch: {
        status: 'rejected', reviewedAt: new Date().toISOString(), rejectionReason: rejectionReason.trim(), advertisements: currentAds,
      } });
      await notify('rejected', rejectionReason.trim());
      setRejecting(false);
    });
  }

  async function downloadPreview() {
    await run('download', async () => {
      const url = await exportArticleAsPng(previewArticle, publication);
      const link = document.createElement('a');
      link.download = articleImageFilename(article.title);
      link.href = url;
      link.click();
    });
  }

  return (
    <div className="page article-detail-page">
      <Link to="/articles" className="back-link"><ArrowLeft size={17} /> Back to articles</Link>
      <PageHeader title={article.title} description={`${article.reporterName} · Editorial workspace`} actions={<><StatusBadge value={article.status} />{article.status === 'pending' || article.status === 'approved' ? <Link to={`/articles/${article.id}/edit`}><Button variant="secondary"><Pencil size={16} /> Edit</Button></Link> : null}<Button variant="secondary" onClick={() => void downloadPreview()} loading={busy === 'download'}><Download size={16} /> Download</Button></>} />
      {message ? <div className="form-error">{message}</div> : null}
      <div className="article-workspace">
        <div className="preview-stage"><ArticlePreview article={previewArticle} publication={publication} /></div>
        <aside className="editor-panel">
          <section><span className="eyebrow">Publication</span><h2>Issue controls</h2><label>Registration date<input type="date" value={currentDate} onChange={(event) => setDate(event.target.value)} /></label></section>
          <section><div className="section-heading"><div><span className="eyebrow">Advertising</span><h2>Ad placements</h2></div><label className="upload-button"><ImagePlus size={16} /> Add<input type="file" accept="image/*" multiple onChange={(event) => void uploadAds(event)} /></label></div>
            <div className="ad-editor">{currentAds.map((image, index) => <div key={`${image}-${index}`}><img src={image} alt="Advertisement" /><button type="button" onClick={() => setAds(currentAds.filter((_, itemIndex) => itemIndex !== index))} aria-label="Remove advertisement"><X size={14} /></button></div>)}</div>
            {!currentAds.length ? <p className="muted">No advertisements assigned.</p> : null}
          </section>
          <Button variant="secondary" onClick={() => void saveChanges()} loading={busy === 'save' || busy === 'upload'}><Save size={16} /> Save date & ads</Button>
          <div className="editor-actions">
            {article.status === 'pending' || article.status === 'rejected' ? <Button onClick={() => void approve()} loading={busy === 'approve'}><Check size={17} /> Approve</Button> : null}
            {article.status === 'pending' || article.status === 'approved' ? <Button variant="secondary" onClick={() => setRejecting(true)}><X size={17} /> Reject</Button> : null}
            {article.status !== 'trashed' ? <Button variant="danger" onClick={() => void run('trash', () => patchArticle({ id: article.id, patch: { status: 'trashed' } }))} loading={busy === 'trash'}><Trash2 size={17} /> Move to trash</Button> : <>
              <Button onClick={() => void run('restore', () => patchArticle({ id: article.id, patch: { status: 'pending' } }))} loading={busy === 'restore'}><RotateCcw size={17} /> Restore</Button>
              <Button variant="danger" onClick={() => { if (window.confirm('Permanently delete this article?')) void run('delete', async () => { await removeArticle({ id: article.id }); navigate('/articles'); }); }} loading={busy === 'delete'}><Trash2 size={17} /> Delete forever</Button>
            </>}
          </div>
        </aside>
      </div>
      {rejecting ? <Dialog title="Reject article" onClose={() => setRejecting(false)}><div className="dialog-body"><label>Editorial feedback<textarea rows={5} value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} placeholder="Explain what the reporter should revise." /></label><div className="dialog-actions"><Button variant="secondary" onClick={() => setRejecting(false)}>Cancel</Button><Button variant="danger" disabled={!rejectionReason.trim()} loading={busy === 'reject'} onClick={() => void reject()}>Send feedback</Button></div></div></Dialog> : null}
    </div>
  );
}
