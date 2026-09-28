import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Eye, ImagePlus, Plus, Send, Trash2, X } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { useMutation, useQuery } from 'convex/react';
import { ArticlePreview } from '../components/ArticlePreview';
import { RichTextEditor } from '../components/RichTextEditor';
import { Button, LoadingState, PageHeader } from '../components/ui';
import { ADMIN_NAME, ADMIN_PHONE } from '../lib/admin';
import { api } from '../lib/api';
import { articleMarkupToHtml, htmlToArticleMarkup } from '../lib/richText';
import { uploadImage } from '../lib/upload';
import { dateInputValue, errorMessage, publicationDate, stripHtml } from '../lib/utils';
import type { Article, ArticlePage, ArticleSection, ArticleStatus } from '../types';

type UploadTarget = 'banner' | 'page2Banner' | 'gallery' | 'advertisements';
const SINGLE_ARTICLE_WORD_LIMIT = 320;
const TWO_NEWS_WORD_LIMIT = 150;

function wordCount(value: string) {
  return stripHtml(value).split(/\s+/).filter(Boolean).length;
}

export function CreateArticlePage({ editing = false }: { editing?: boolean }) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const publication = useQuery(api.settings.getPublicationInfo, {});
  const articles = useQuery(api.articles.list, {});
  const createArticle = useMutation(api.articles.upsert);
  const patchArticle = useMutation(api.articles.patch);

  // Page 1 state
  const [articleMode, setArticleMode] = useState<'single' | 'two'>('single');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [banner, setBanner] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [advertisements, setAdvertisements] = useState<string[]>([]);
  const [sections, setSections] = useState<ArticleSection[]>([]);
  const [registrationDate, setRegistrationDate] = useState(new Date().toISOString().slice(0, 10));

  // Multi-page state
  const [hasPage2, setHasPage2] = useState(false);
  const [activePage, setActivePage] = useState<1 | 2>(1);
  const [page2Mode, setPage2Mode] = useState<'single' | 'two'>('single');
  const [page2Title, setPage2Title] = useState('');
  const [page2Content, setPage2Content] = useState('');
  const [page2Banner, setPage2Banner] = useState('');
  const [page2Sections, setPage2Sections] = useState<ArticleSection[]>([]);

  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [previewVisible, setPreviewVisible] = useState(true);
  const initializedArticle = useRef('');

  const selectedArticle = editing ? articles?.find((article) => article.id === id) : undefined;

  useEffect(() => {
    if (!selectedArticle || initializedArticle.current === selectedArticle.id) return;
    initializedArticle.current = selectedArticle.id;
    setArticleMode(selectedArticle.sections && selectedArticle.sections.length > 0 ? 'two' : 'single');
    setTitle(articleMarkupToHtml(selectedArticle.title));
    setContent(articleMarkupToHtml(selectedArticle.content));
    setBanner(selectedArticle.banner);
    setImages(selectedArticle.images);
    setAdvertisements(selectedArticle.advertisements);
    setSections((selectedArticle.sections ?? []).map((section) => ({
      ...section,
      title: articleMarkupToHtml(section.title),
      content: articleMarkupToHtml(section.content),
    })));
    setRegistrationDate(dateInputValue(selectedArticle.registrationDate ?? selectedArticle.reviewedAt));

    if (selectedArticle.page2) {
      setHasPage2(true);
      setPage2Mode(selectedArticle.page2.mode ?? (selectedArticle.page2.sections && selectedArticle.page2.sections.length > 0 ? 'two' : 'single'));
      setPage2Title(articleMarkupToHtml(selectedArticle.page2.title));
      setPage2Content(articleMarkupToHtml(selectedArticle.page2.content));
      setPage2Banner(selectedArticle.page2.banner);
      setPage2Sections((selectedArticle.page2.sections ?? []).map((section) => ({
        ...section,
        title: articleMarkupToHtml(section.title),
        content: articleMarkupToHtml(section.content),
      })));
    }
  }, [selectedArticle]);

  if (publication === undefined || articles === undefined) return <LoadingState />;
  if (editing && !selectedArticle) return <div className="page"><p className="form-error">Article not found.</p></div>;

  const now = new Date().toISOString();
  const plainContent = stripHtml(content);
  const savedTitle = htmlToArticleMarkup(title);

  const previewPage2: ArticlePage | undefined = hasPage2 ? {
    mode: page2Mode,
    title: htmlToArticleMarkup(page2Title) || 'Page 2 headline will appear here',
    content: page2Content || 'Write Page 2 content to preview.',
    banner: page2Banner,
    sections: page2Sections
      .filter((section) => stripHtml(section.title).trim() || stripHtml(section.content).trim() || section.image)
      .map((section) => ({ ...section, title: htmlToArticleMarkup(section.title) })),
  } : undefined;

  const previewArticle: Article = {
    ...(selectedArticle ?? {}),
    id: selectedArticle?.id ?? 'preview',
    title: savedTitle || 'Your headline will appear here',
    summary: plainContent.slice(0, 140),
    content: content || 'Write the article body to preview the newspaper layout.',
    banner,
    images,
    advertisements,
    sections: sections
      .filter((section) => stripHtml(section.title).trim() || stripHtml(section.content).trim() || section.image)
      .map((section) => ({ ...section, title: htmlToArticleMarkup(section.title) })),
    page2: previewPage2,
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
      else if (target === 'page2Banner') setPage2Banner(urls[0]);
      else if (target === 'gallery') setImages((current) => [...current, ...urls]);
      else setAdvertisements((current) => [...current, ...urls]);
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy('');
      event.target.value = '';
    }
  }

  async function uploadSectionImage(sectionId: string, event: ChangeEvent<HTMLInputElement>, isPage2 = false) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(`section-${sectionId}`);
    setMessage('');
    try {
      const image = await uploadImage(file, 'education-news/articles');
      if (isPage2) {
        updatePage2Section(sectionId, { image });
      } else {
        updateSection(sectionId, { image });
      }
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

  function addPage2Section() {
    setPage2Sections((current) => [...current, { id: `sec-p2-${Date.now()}`, title: '', content: '' }]);
  }

  function updatePage2Section(id: string, patch: Partial<ArticleSection>) {
    setPage2Sections((current) => current.map((section) => section.id === id ? { ...section, ...patch } : section));
  }

  async function save(status: ArticleStatus) {
    if (!stripHtml(title).trim()) { setMessage('Enter an article headline for Page 1.'); setActivePage(1); return; }
    if (!content.trim()) { setMessage('Enter the article body for Page 1.'); setActivePage(1); return; }
    if (!banner) { setMessage('Upload a lead news image for Page 1.'); setActivePage(1); return; }

    if (hasPage2) {
      if (!stripHtml(page2Title).trim()) { setMessage('Enter a headline for Page 2 or remove Page 2.'); setActivePage(2); return; }
      if (!page2Content.trim()) { setMessage('Enter article body for Page 2 or remove Page 2.'); setActivePage(2); return; }
      if (!page2Banner) { setMessage('Upload a news photo for Page 2 or remove Page 2.'); setActivePage(2); return; }
    }

    setBusy(status);
    setMessage('');
    try {
      const createdAt = new Date().toISOString();
      const savedContent = htmlToArticleMarkup(content);
      const savedSections = previewArticle.sections?.map((section) => ({
        ...section,
        title: htmlToArticleMarkup(section.title),
        content: htmlToArticleMarkup(section.content),
      }));
      const savedPage2: ArticlePage | undefined = hasPage2 ? {
        mode: page2Mode,
        title: htmlToArticleMarkup(page2Title),
        content: htmlToArticleMarkup(page2Content),
        banner: page2Banner,
        sections: page2Sections
          .filter((section) => stripHtml(section.title).trim() || stripHtml(section.content).trim() || section.image)
          .map((section) => ({ ...section, title: htmlToArticleMarkup(section.title), content: htmlToArticleMarkup(section.content) })),
      } : undefined;

      if (selectedArticle) {
        await patchArticle({ id: selectedArticle.id, patch: {
          title: savedTitle,
          summary: plainContent.slice(0, 140),
          content: savedContent,
          banner,
          images,
          advertisements,
          sections: savedSections,
          page2: savedPage2,
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
        title: savedTitle,
        summary: plainContent.slice(0, 140),
        content: savedContent,
        sections: savedSections,
        page2: savedPage2,
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
          {/* Page Switcher Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                className={`composer-mode-btn ${activePage === 1 ? 'active' : ''}`}
                onClick={() => setActivePage(1)}>
                Page 1
              </button>
              {hasPage2 ? (
                <button
                  type="button"
                  className={`composer-mode-btn ${activePage === 2 ? 'active' : ''}`}
                  onClick={() => setActivePage(2)}>
                  Page 2
                </button>
              ) : null}
            </div>
            {!hasPage2 ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setHasPage2(true);
                  setActivePage(2);
                }}>
                <Plus size={16} /> Add Page 2
              </Button>
            ) : (
              <button
                type="button"
                className="icon-button"
                style={{ color: '#EF4444', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}
                onClick={() => {
                  if (confirm('Remove Page 2 and its content from this article?')) {
                    setHasPage2(false);
                    setActivePage(1);
                  }
                }}>
                <Trash2 size={15} /> Remove Page 2
              </button>
            )}
          </div>

          {activePage === 1 ? (
            <>
              <div className="composer-mode-selector">
                <button
                  type="button"
                  className={`composer-mode-btn ${articleMode === 'single' ? 'active' : ''}`}
                  onClick={() => {
                    setArticleMode('single');
                    setSections([]);
                  }}>
                  Article 1 (Single)
                  <span className="composer-mode-badge">{SINGLE_ARTICLE_WORD_LIMIT}w</span>
                </button>
                <button
                  type="button"
                  className={`composer-mode-btn ${articleMode === 'two' ? 'active' : ''}`}
                  onClick={() => {
                    setArticleMode('two');
                    if (!sections.length) {
                      setSections([{ id: `sec-${Date.now()}`, title: '', content: '' }]);
                    }
                  }}>
                  Article 2 (Two News)
                  <span className="composer-mode-badge">{TWO_NEWS_WORD_LIMIT}w ea</span>
                </button>
              </div>

              <section className="panel composer-section">
                <span className="eyebrow">{articleMode === 'two' ? 'Article 1' : 'Main story'}</span>
                <label>{articleMode === 'two' ? 'Article 1 headline' : 'Headline'}<RichTextEditor value={title} onChange={setTitle} placeholder="Enter a clear news headline" minHeight={58} variant="title" /></label>
                <label>{articleMode === 'two' ? `Article 1 body (${wordCount(content)}/${TWO_NEWS_WORD_LIMIT} words)` : `Article body (${wordCount(content)}/${SINGLE_ARTICLE_WORD_LIMIT} words)`}<RichTextEditor value={content} onChange={setContent} placeholder="Write the complete article here..." maxWords={articleMode === 'two' ? TWO_NEWS_WORD_LIMIT : SINGLE_ARTICLE_WORD_LIMIT} /></label>
                <label>Publication date<input type="date" value={registrationDate} onChange={(event) => setRegistrationDate(event.target.value)} /></label>
              </section>

              <section className="panel composer-section">
                <div className="section-heading"><div><span className="eyebrow">{articleMode === 'two' ? 'Article 1 image' : 'Lead media'}</span><h2>News image</h2></div><label className="upload-button"><ImagePlus size={16} /> {banner ? 'Replace' : 'Upload'}<input type="file" accept="image/*" onChange={(event) => void uploadFiles('banner', event)} /></label></div>
                {banner ? <div className="composer-image"><img src={banner} alt="Lead" /><button type="button" onClick={() => setBanner('')} aria-label="Remove lead image"><X size={16} /></button></div> : <div className="upload-placeholder"><ImagePlus />Upload the main article photograph</div>}
              </section>

              <section className="panel composer-section">
                <div className="section-heading"><div><span className="eyebrow">Additional coverage</span><h2>Story sections</h2></div><Button type="button" variant="secondary" onClick={() => { setArticleMode('two'); addSection(); }}><Plus size={16} /> Add section</Button></div>
                <div className="section-editor-list">{sections.map((section, index) => <div className="section-editor" key={section.id}>
                  <div className="section-editor-head"><strong>{index === 0 && articleMode === 'two' ? 'Article 2' : `Section ${index + 1}`}</strong><button type="button" className="icon-button" onClick={() => setSections((current) => current.filter((item) => item.id !== section.id))} aria-label="Remove section"><Trash2 size={16} /></button></div>
                  <label>{index === 0 && articleMode === 'two' ? 'Article 2 headline' : 'Section headline'}<RichTextEditor value={section.title} onChange={(value) => updateSection(section.id, { title: value })} placeholder={index === 0 && articleMode === 'two' ? 'Enter Article 2 headline' : 'Enter section headline'} minHeight={58} variant="title" /></label>
                  <label>{index === 0 ? `Article 2 body (${wordCount(section.content)}/${TWO_NEWS_WORD_LIMIT} words)` : 'Section body'}<RichTextEditor value={section.content} onChange={(value) => updateSection(section.id, { content: value })} minHeight={150} maxWords={index === 0 ? TWO_NEWS_WORD_LIMIT : undefined} /></label>
                  <label className="upload-button"><ImagePlus size={16} /> {section.image ? 'Replace image' : 'Add image'}<input type="file" accept="image/*" onChange={(event) => void uploadSectionImage(section.id, event, false)} /></label>
                  {section.image ? <div className="section-thumb"><img src={section.image} alt="" /><button type="button" onClick={() => updateSection(section.id, { image: undefined })}><X size={14} /></button></div> : null}
                </div>)}</div>
                {!sections.length ? <p className="muted">Add a section for a second story or continued coverage.</p> : null}
              </section>

              <section className="panel composer-section media-editor-grid">
                <MediaEditor title="Gallery images" eyebrow="Photo gallery" images={images} loading={busy === 'upload-gallery'} onUpload={(event) => void uploadFiles('gallery', event)} onRemove={(index) => setImages((current) => current.filter((_, itemIndex) => itemIndex !== index))} />
                <MediaEditor title="Advertisements" eyebrow="Advertising" images={advertisements} loading={busy === 'upload-advertisements'} onUpload={(event) => void uploadFiles('advertisements', event)} onRemove={(index) => setAdvertisements((current) => current.filter((_, itemIndex) => itemIndex !== index))} />
              </section>
            </>
          ) : (
            <>
              {/* PAGE 2 EDITOR */}
              <div className="composer-mode-selector">
                <button
                  type="button"
                  className={`composer-mode-btn ${page2Mode === 'single' ? 'active' : ''}`}
                  onClick={() => {
                    setPage2Mode('single');
                    setPage2Sections([]);
                  }}>
                  Page 2 (Single)
                  <span className="composer-mode-badge">{SINGLE_ARTICLE_WORD_LIMIT}w</span>
                </button>
                <button
                  type="button"
                  className={`composer-mode-btn ${page2Mode === 'two' ? 'active' : ''}`}
                  onClick={() => {
                    setPage2Mode('two');
                    if (!page2Sections.length) {
                      setPage2Sections([{ id: `sec-p2-${Date.now()}`, title: '', content: '' }]);
                    }
                  }}>
                  Page 2 (Two News)
                  <span className="composer-mode-badge">{TWO_NEWS_WORD_LIMIT}w ea</span>
                </button>
              </div>

              <section className="panel composer-section">
                <span className="eyebrow">{page2Mode === 'two' ? 'Page 2 Article 1' : 'Page 2 Story'}</span>
                <label>{page2Mode === 'two' ? 'Page 2 Article 1 headline' : 'Page 2 Headline'}<RichTextEditor value={page2Title} onChange={setPage2Title} placeholder="Enter Page 2 news headline" minHeight={58} variant="title" /></label>
                <label>{page2Mode === 'two' ? `Page 2 Article 1 body (${wordCount(page2Content)}/${TWO_NEWS_WORD_LIMIT} words)` : `Page 2 Article body (${wordCount(page2Content)}/${SINGLE_ARTICLE_WORD_LIMIT} words)`}<RichTextEditor value={page2Content} onChange={setPage2Content} placeholder="Write Page 2 article body..." maxWords={page2Mode === 'two' ? TWO_NEWS_WORD_LIMIT : SINGLE_ARTICLE_WORD_LIMIT} /></label>
              </section>

              <section className="panel composer-section">
                <div className="section-heading"><div><span className="eyebrow">{page2Mode === 'two' ? 'Page 2 Article 1 image' : 'Page 2 media'}</span><h2>Page 2 News image</h2></div><label className="upload-button"><ImagePlus size={16} /> {page2Banner ? 'Replace' : 'Upload'}<input type="file" accept="image/*" onChange={(event) => void uploadFiles('page2Banner', event)} /></label></div>
                {page2Banner ? <div className="composer-image"><img src={page2Banner} alt="Lead" /><button type="button" onClick={() => setPage2Banner('')} aria-label="Remove Page 2 image"><X size={16} /></button></div> : <div className="upload-placeholder"><ImagePlus />Upload Page 2 photograph</div>}
              </section>

              <section className="panel composer-section">
                <div className="section-heading"><div><span className="eyebrow">Page 2 Additional coverage</span><h2>Story sections</h2></div><Button type="button" variant="secondary" onClick={() => { setPage2Mode('two'); addPage2Section(); }}><Plus size={16} /> Add section</Button></div>
                <div className="section-editor-list">{page2Sections.map((section, index) => <div className="section-editor" key={section.id}>
                  <div className="section-editor-head"><strong>{index === 0 && page2Mode === 'two' ? 'Page 2 Article 2' : `Page 2 Section ${index + 1}`}</strong><button type="button" className="icon-button" onClick={() => setPage2Sections((current) => current.filter((item) => item.id !== section.id))} aria-label="Remove section"><Trash2 size={16} /></button></div>
                  <label>{index === 0 && page2Mode === 'two' ? 'Page 2 Article 2 headline' : 'Section headline'}<RichTextEditor value={section.title} onChange={(value) => updatePage2Section(section.id, { title: value })} placeholder={index === 0 && page2Mode === 'two' ? 'Enter Page 2 Article 2 headline' : 'Enter section headline'} minHeight={58} variant="title" /></label>
                  <label>{index === 0 ? `Page 2 Article 2 body (${wordCount(section.content)}/${TWO_NEWS_WORD_LIMIT} words)` : 'Section body'}<RichTextEditor value={section.content} onChange={(value) => updatePage2Section(section.id, { content: value })} minHeight={150} maxWords={index === 0 ? TWO_NEWS_WORD_LIMIT : undefined} /></label>
                  <label className="upload-button"><ImagePlus size={16} /> {section.image ? 'Replace image' : 'Add image'}<input type="file" accept="image/*" onChange={(event) => void uploadSectionImage(section.id, event, true)} /></label>
                  {section.image ? <div className="section-thumb"><img src={section.image} alt="" /><button type="button" onClick={() => updatePage2Section(section.id, { image: undefined })}><X size={14} /></button></div> : null}
                </div>)}</div>
                {!page2Sections.length ? <p className="muted">Add a section for a second story on Page 2.</p> : null}
              </section>
            </>
          )}

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
