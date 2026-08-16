import { useMutation, useQuery } from 'convex/react';
import { ArrowLeft, Eye, ImagePlus, Plus, Send, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { ArticlePreview } from '../components/ArticlePreview';
import { RichTextEditor } from '../components/RichTextEditor';
import { Button, LoadingState, PageHeader } from '../components/ui';
import { ADMIN_NAME, ADMIN_PHONE } from '../lib/admin';
import { api } from '../lib/api';
import { articleMarkupToHtml, htmlToArticleMarkup } from '../lib/richText';
import { uploadImage } from '../lib/upload';
import { dateInputValue, errorMessage, publicationDate, stripHtml } from '../lib/utils';
import type { Article, ArticleSection, ArticleStatus } from '../types';

type UploadTarget = 'banner' | 'gallery' | 'advertisements';

export function CreateArticlePage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const publication = useQuery(api.settings.getPublicationInfo, {});
  const articles = useQuery(api.articles.list, {});
  const createArticle = useMutation(api.articles.upsert);
  const patchArticle = useMutation(api.articles.patch);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [banner, setBanner] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [advertisements, setAdvertisements] = useState<string[]>([]);
  const [sections, setSections] = useState<ArticleSection[]>([]);
  const [registrationDate, setRegistrationDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [previewVisible, setPreviewVisible] = useState(true);
  const initializedArticle = useRef('');

  const selectedArticle = editing ? articles?.find((article) => article.id === id) : undefined;

  useEffect(() => {
    if (!selectedArticle || initializedArticle.current === selectedArticle.id) return;
    initializedArticle.current = selectedArticle.id;
    setTitle(selectedArticle.title);
    setContent(articleMarkupToHtml(selectedArticle.content));
    setBanner(selectedArticle.banner);
    setImages(selectedArticle.images);
    setAdvertisements(selectedArticle.advertisements);
    setSections((selectedArticle.sections ?? []).map((section) => ({ ...section, content: articleMarkupToHtml(section.content) })));
    setRegistrationDate(dateInputValue(selectedArticle.registrationDate ?? selectedArticle.reviewedAt));
  }, [selectedArticle]);

  if (publication === undefined || articles === undefined) return <LoadingState />;
  if (editing && !selectedArticle) return <div className="page"><p className="form-error">Article not found.</p></div>;

  const now = new Date().toISOString();
  const plainContent = stripHtml(content);
  const previewArticle: Article = {
    ...(selectedArticle ?? {}),
    id: selectedArticle?.id ?? 'preview',
    title: title || 'Your headline will appear here',
    summary: plainContent.slice(0, 140),
    content: content || 'Write the article body to preview the newspaper layout.',
    banner,
    images,
    advertisements,
    sections: sections.filter((section) => section.title.trim() || section.content.trim() || section.image),
    status: selectedArticle?.status ?? 'draft',
    reporterId: selectedArticle?.reporterId ?? 'admin',
    reporterName: selectedArticle?.reporterName ?? ADMIN_NAME,
    reporterAvatar: selectedArticle?.reporterAvatar ?? '',
    reporterPhone: selectedArticle?.reporterPhone ?? ADMIN_PHONE,
    createdAt: selectedArticle?.createdAt ?? now,
    updatedAt: now,
    registrationDate: registrationDate ? publicationDate(registrationDate) : undefined,
    views: 0,
    likes: 0,
    readTimeMinutes: Math.max(1, Math.ceil(plainContent.split(/\s+/).filter(Boolean).length / 200)),
  };

  async function uploadFiles(target: UploadTarget, event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    if (!files.length) return;
    setBusy(`upload-${target}`);
    setMessage('');
    try {
      const folder = target === 'advertisements' ? 'education-news/advertisements' : 'education-news/articles';
      const urls = await Promise.all(files.map((file) => uploadImage(file, folder)));
      if (target === 'banner') setBanner(urls[0]);
      else if (target === 'gallery') setImages((current) => [...current, ...urls]);
      else setAdvertisements((current) => [...current, ...urls]);
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy('');
      event.target.value = '';
    }
  }

  async function uploadSectionImage(sectionId: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(`section-${sectionId}`);
    setMessage('');
    try {
      const image = await uploadImage(file, 'education-news/articles');
      updateSection(sectionId, { image });
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy('');
      event.target.value = '';
    }
  }

  function addSection() {
    setSections((current) => [...current, { id: `sec-${Date.now()}`, title: '', content: '' }]);
  }

  function updateSection(id: string, patch: Partial<ArticleSection>) {
    setSections((current) => current.map((section) => section.id === id ? { ...section, ...patch } : section));
  }

  async function save(status: ArticleStatus) {
    if (!title.trim()) { setMessage('Enter an article headline.'); return; }
    if (!content.trim()) { setMessage('Enter the article body.'); return; }
    if (!banner) { setMessage('Upload a lead news image.'); return; }
    setBusy(status);
    setMessage('');
    try {
      const createdAt = new Date().toISOString();
      const savedContent = htmlToArticleMarkup(content);
      const savedSections = previewArticle.sections?.map((section) => ({ ...section, content: htmlToArticleMarkup(section.content) }));
      if (selectedArticle) {
        await patchArticle({ id: selectedArticle.id, patch: {
          title: title.trim(),
          summary: plainContent.slice(0, 140),
          content: savedContent,
          banner,
          images,
          advertisements,
          sections: savedSections,
          registrationDate: registrationDate ? publicationDate(registrationDate) : undefined,
          readTimeMinutes: previewArticle.readTimeMinutes,
          updatedAt: createdAt,
        } });
        navigate(`/articles/${selectedArticle.id}`);
        return;
      }
      const article: Article = {
        ...previewArticle,
        id: `art-admin-${Date.now()}`,
        title: title.trim(),
        summary: plainContent.slice(0, 140),
        content: savedContent,
        sections: savedSections,
        status,
        createdAt,
        updatedAt: createdAt,
        submittedAt: status === 'approved' ? createdAt : undefined,
        reviewedAt: status === 'approved' ? createdAt : undefined,
      };
      await createArticle({ article });
      navigate(`/articles/${article.id}`);
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="page create-article-page">
      <Link to={selectedArticle ? `/articles/${selectedArticle.id}` : '/articles'} className="back-link"><ArrowLeft size={17} /> {selectedArticle ? 'Back to article' : 'Back to articles'}</Link>
      <PageHeader
        eyebrow="Admin publishing"
        title={selectedArticle ? 'Edit article' : 'Write an article'}
        description={selectedArticle ? `Update this ${selectedArticle.status} article without changing its publication status.` : 'Create and publish directly from the Education News desk.'}
        actions={<Button variant="secondary" onClick={() => setPreviewVisible((visible) => !visible)}><Eye size={16} /> {previewVisible ? 'Hide preview' : 'Show preview'}</Button>}
      />
      {message ? <div className="form-error">{message}</div> : null}
      <div className={`composer-layout ${previewVisible ? '' : 'composer-full'}`}>
        <form className="composer-form" onSubmit={(event) => event.preventDefault()}>
          <section className="panel composer-section">
            <span className="eyebrow">Main story</span>
            <label>Headline<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Enter a clear news headline" /></label>
            <label>Article body<RichTextEditor value={content} onChange={setContent} placeholder="Write the complete article here..." /></label>
            <label>Publication date<input type="date" value={registrationDate} onChange={(event) => setRegistrationDate(event.target.value)} /></label>
          </section>

          <section className="panel composer-section">
            <div className="section-heading"><div><span className="eyebrow">Lead media</span><h2>News image</h2></div><label className="upload-button"><ImagePlus size={16} /> {banner ? 'Replace' : 'Upload'}<input type="file" accept="image/*" onChange={(event) => void uploadFiles('banner', event)} /></label></div>
            {banner ? <div className="composer-image"><img src={banner} alt="Lead" /><button type="button" onClick={() => setBanner('')} aria-label="Remove lead image"><X size={16} /></button></div> : <div className="upload-placeholder"><ImagePlus />Upload the main article photograph</div>}
          </section>

          <section className="panel composer-section">
            <div className="section-heading"><div><span className="eyebrow">Additional coverage</span><h2>Story sections</h2></div><Button type="button" variant="secondary" onClick={addSection}><Plus size={16} /> Add section</Button></div>
            <div className="section-editor-list">{sections.map((section, index) => <div className="section-editor" key={section.id}>
              <div className="section-editor-head"><strong>Section {index + 1}</strong><button type="button" className="icon-button" onClick={() => setSections((current) => current.filter((item) => item.id !== section.id))} aria-label="Remove section"><Trash2 size={16} /></button></div>
              <label>Section headline<input value={section.title} onChange={(event) => updateSection(section.id, { title: event.target.value })} /></label>
              <label>Section body<RichTextEditor value={section.content} onChange={(value) => updateSection(section.id, { content: value })} minHeight={150} /></label>
              <label className="upload-button"><ImagePlus size={16} /> {section.image ? 'Replace image' : 'Add image'}<input type="file" accept="image/*" onChange={(event) => void uploadSectionImage(section.id, event)} /></label>
              {section.image ? <div className="section-thumb"><img src={section.image} alt="" /><button type="button" onClick={() => updateSection(section.id, { image: undefined })}><X size={14} /></button></div> : null}
            </div>)}</div>
            {!sections.length ? <p className="muted">Add a section for a second story or continued coverage.</p> : null}
          </section>

          <section className="panel composer-section media-editor-grid">
            <MediaEditor title="Gallery images" eyebrow="Photo gallery" images={images} loading={busy === 'upload-gallery'} onUpload={(event) => void uploadFiles('gallery', event)} onRemove={(index) => setImages((current) => current.filter((_, itemIndex) => itemIndex !== index))} />
            <MediaEditor title="Advertisements" eyebrow="Advertising" images={advertisements} loading={busy === 'upload-advertisements'} onUpload={(event) => void uploadFiles('advertisements', event)} onRemove={(index) => setAdvertisements((current) => current.filter((_, itemIndex) => itemIndex !== index))} />
          </section>

          <div className="composer-actions">
            {selectedArticle ? <Button type="button" loading={busy === selectedArticle.status} disabled={Boolean(busy)} onClick={() => void save(selectedArticle.status)}><Send size={17} /> Save article</Button> : <>
              <Button type="button" variant="secondary" loading={busy === 'draft'} disabled={Boolean(busy)} onClick={() => void save('draft')}>Save draft</Button>
              <Button type="button" loading={busy === 'approved'} disabled={Boolean(busy)} onClick={() => void save('approved')}><Send size={17} /> Publish now</Button>
            </>}
          </div>
        </form>
        {previewVisible ? <aside className="composer-preview"><div className="preview-stage"><ArticlePreview article={previewArticle} publication={publication} /></div></aside> : null}
      </div>
    </div>
  );
}

function MediaEditor({ title, eyebrow, images, loading, onUpload, onRemove }: {
  title: string;
  eyebrow: string;
  images: string[];
  loading: boolean;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemove: (index: number) => void;
}) {
  return <div><div className="section-heading"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div><label className="upload-button"><ImagePlus size={16} /> {loading ? 'Uploading' : 'Add'}<input type="file" accept="image/*" multiple onChange={onUpload} /></label></div><div className="composer-thumbs">{images.map((image, index) => <div key={`${image}-${index}`}><img src={image} alt="" /><button type="button" onClick={() => onRemove(index)} aria-label="Remove image"><X size={14} /></button></div>)}</div>{!images.length ? <p className="muted">No images added.</p> : null}</div>;
}
