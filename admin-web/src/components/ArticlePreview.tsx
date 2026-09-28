import type { ReactNode } from 'react';

import { articleByline } from '../lib/admin';
import { isCenterAligned, parseRichText, type RichTextRun } from '../lib/richText';
import { stripHtml } from '../lib/utils';
import type { Article, PublicationInfo } from '../types';

export function ArticlePreview({ article, publication }: { article: Article; publication?: PublicationInfo | null }) {
  const [firstSection, ...restSections] = article.sections ?? [];
  const [page2FirstSection, ...page2RestSections] = article.page2?.sections ?? [];
  const byline = articleByline(article);
  const isMainTitleCenter = isCenterAligned(article.title);

  return (
    <article className="newspaper" id="article-preview">
      {/* PAGE 1 */}
      <img className="newspaper-masthead" src="/logoBanner.jpeg" alt="Education News" />
      <div className="publication-strip">
        वर्ष : {publication?.year ?? '—'} &nbsp;|&nbsp; अंक : {publication?.issueNumber ?? '—'} &nbsp;|&nbsp;
        पृष्ठ : {article.page2 ? '1 / 2' : (1 + restSections.length)} &nbsp;|&nbsp; दिनांक {article.registrationDate ?? '—'} &nbsp;|&nbsp;
        मूल्य : {publication?.price ?? '—'}
      </div>
      {firstSection ? (
        <div className="newspaper-columns">
          <CompactStory title={article.title} image={article.banner} content={article.content} />
          <CompactStory title={firstSection.title} image={firstSection.image ?? article.banner} content={firstSection.content} />
        </div>
      ) : (
        <>
          <h1 style={isMainTitleCenter ? { textAlign: 'center' } : undefined}><RichTitle value={article.title} /></h1>
          <div className="newspaper-rule" />
          <img className="lead-photo" src={article.banner} alt="" />
          <RichTextContent value={article.content} className="story-body" />
        </>
      )}
      {restSections.map((section) => (
        <section className="newspaper-section" key={section.id}>
          {section.image ? <img src={section.image} alt="" /> : null}
          <h2 style={isCenterAligned(section.title) ? { textAlign: 'center' } : undefined}><RichTitle value={section.title} /></h2>
          <RichTextContent value={section.content} />
        </section>
      ))}
      {article.images.length ? <div className="newspaper-gallery">{article.images.map((image) => <img key={image} src={image} alt="" />)}</div> : null}
      {article.advertisements.length ? (
        <>
          <div className="newspaper-divider-rule" />
          <div className="newspaper-ads">{article.advertisements.map((image) => <img key={image} src={image} alt="Advertisement" />)}</div>
        </>
      ) : null}
      <footer><span>News Reporter</span><strong>{byline.name}{byline.phone ? ` : ${byline.phone}` : ''}</strong></footer>

      {/* PAGE 2 (if present) */}
      {article.page2 ? (
        <>
          <div className="newspaper-page-break">
            <span className="newspaper-page-badge">पृष्ठ २</span>
          </div>
          <img className="newspaper-masthead" src="/logoBanner.jpeg" alt="Education News" />
          <div className="publication-strip">
            वर्ष : {publication?.year ?? '—'} &nbsp;|&nbsp; अंक : {publication?.issueNumber ?? '—'} &nbsp;|&nbsp;
            पृष्ठ : 2 / 2 &nbsp;|&nbsp; दिनांक {article.registrationDate ?? '—'} &nbsp;|&nbsp;
            मूल्य : {publication?.price ?? '—'}
          </div>
          {page2FirstSection ? (
            <div className="newspaper-columns">
              <CompactStory title={article.page2.title} image={article.page2.banner} content={article.page2.content} />
              <CompactStory title={page2FirstSection.title} image={page2FirstSection.image ?? article.page2.banner} content={page2FirstSection.content} />
            </div>
          ) : (
            <>
              <h1 style={isCenterAligned(article.page2.title) ? { textAlign: 'center' } : undefined}><RichTitle value={article.page2.title} /></h1>
              <div className="newspaper-rule" />
              <img className="lead-photo" src={article.page2.banner} alt="" />
              <RichTextContent value={article.page2.content} className="story-body" />
            </>
          )}
          {page2RestSections.map((section) => (
            <section className="newspaper-section" key={section.id}>
              {section.image ? <img src={section.image} alt="" /> : null}
              <h2 style={isCenterAligned(section.title) ? { textAlign: 'center' } : undefined}><RichTitle value={section.title} /></h2>
              <RichTextContent value={section.content} />
            </section>
          ))}
          <footer><span>News Reporter</span><strong>{byline.name}{byline.phone ? ` : ${byline.phone}` : ''}</strong></footer>
        </>
      ) : null}
    </article>
  );
}

function RichTextContent({ value, className }: { value: string; className?: string }) {
  const blocks = parseRichText(value);
  return <div className={className}>{blocks.map((block, index) => {
    const content = block.runs.map((run, runIndex) => <RichRun key={runIndex} run={run} />);
    const alignStyle = block.align === 'center' ? { textAlign: 'center' as const } : undefined;
    if (block.type === 'heading') return <h2 key={index} style={alignStyle}>{content}</h2>;
    if (block.type === 'quote') return <blockquote key={index} style={alignStyle}>{content}</blockquote>;
    if (block.type === 'bullet' || block.type === 'ordered') return <p className="story-list-item" key={index} style={alignStyle}><span>{block.type === 'bullet' ? '•' : `${block.number}.`}</span>{content}</p>;
    return <p key={index} style={alignStyle}>{content}</p>;
  })}</div>;
}

function RichRun({ run }: { run: RichTextRun }) {
  let content: ReactNode = run.text;
  if (run.marks.bold) content = <strong>{content}</strong>;
  if (run.marks.italic) content = <em>{content}</em>;
  if (run.marks.underline) content = <u>{content}</u>;
  if (run.marks.strike) content = <s>{content}</s>;
  if (run.marks.href) content = <a href={run.marks.href} target="_blank" rel="noreferrer">{content}</a>;
  if (run.marks.color) content = <span style={{ color: run.marks.color }}>{content}</span>;
  return content;
}

function RichTitle({ value }: { value: string }) {
  return parseRichText(value).flatMap((block) => block.runs).map((run, index) => <RichRun key={index} run={run} />);
}

function CompactStory({ title, image, content }: { title: string; image: string; content: string }) {
  const isTitleCenter = isCenterAligned(title);
  return (
    <section>
      <h2 style={isTitleCenter ? { textAlign: 'center' } : undefined}><RichTitle value={title} /></h2>
      <img src={image} alt="" />
      <p>{stripHtml(content).slice(0, 900)}</p>
    </section>
  );
}
