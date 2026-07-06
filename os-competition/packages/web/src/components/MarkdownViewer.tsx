import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Spin, Empty } from 'antd';

interface Props {
  projectId: number;
  getFiles: (projectId: number) => Promise<any>;
}

interface TocItem {
  id: string;
  title: string;
  level: number;
}

function parseToc(text: string): TocItem[] {
  const items: TocItem[] = [];
  const lines = text.split('\n');
  for (const line of lines) {
    const match = line.match(/^(#{1,4})\s+(.+)/);
    if (match) {
      const level = match[1].length;
      const title = match[2].trim();
      const id = `md-${title.replace(/[^\w\u4e00-\u9fff]+/g, '-').replace(/^-|-$/g, '')}`;
      items.push({ id, title, level });
    }
  }
  return items;
}

function renderMarkdown(text: string): string {
  let html = text
    .replace(/^#### (.+)$/gm, (_, title) => {
      const id = `md-${title.trim().replace(/[^\w\u4e00-\u9fff]+/g, '-').replace(/^-|-$/g, '')}`;
      return `<h4 id="${id}">${title}</h4>`;
    })
    .replace(/^### (.+)$/gm, (_, title) => {
      const id = `md-${title.trim().replace(/[^\w\u4e00-\u9fff]+/g, '-').replace(/^-|-$/g, '')}`;
      return `<h3 id="${id}">${title}</h3>`;
    })
    .replace(/^## (.+)$/gm, (_, title) => {
      const id = `md-${title.trim().replace(/[^\w\u4e00-\u9fff]+/g, '-').replace(/^-|-$/g, '')}`;
      return `<h2 id="${id}">${title}</h2>`;
    })
    .replace(/^# (.+)$/gm, (_, title) => {
      const id = `md-${title.trim().replace(/[^\w\u4e00-\u9fff]+/g, '-').replace(/^-|-$/g, '')}`;
      return `<h1 id="${id}">${title}</h1>`;
    })
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code style="background:#f5f5f5;padding:2px 6px;border-radius:4px;font-size:13px">$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
    .replace(/^---$/gm, '<hr/>')
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    .replace(/^> (.+)$/gm, '<blockquote style="border-left:4px solid #ddd;padding-left:16px;margin:8px 0;color:#666">$1</blockquote>')
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre style="background:#f6f8fa;padding:16px;border-radius:8px;overflow:auto;font-size:13px"><code>$2</code></pre>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');

  html = html.replace(/(<li>.*?<\/li>)/gs, (match) => {
    return `<ul style="padding-left:24px;margin:8px 0">${match}</ul>`;
  });

  return `<p>${html}</p>`;
}

const TOC_LEVEL_STYLES: Record<number, React.CSSProperties> = {
  1: { fontSize: 13, fontWeight: 600, paddingLeft: 8 },
  2: { fontSize: 12, paddingLeft: 16 },
  3: { fontSize: 12, paddingLeft: 28, color: '#666' },
  4: { fontSize: 12, paddingLeft: 40, color: '#999' },
};

export default function MarkdownViewer({ projectId, getFiles }: Props) {
  const [files, setFiles] = useState<any[]>([]);
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [activeName, setActiveName] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [contentLoading, setContentLoading] = useState(false);
  const [activeTocId, setActiveTocId] = useState<string>('');
  const mainAreaRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const scrollingRef = useRef(false);

  useEffect(() => {
    setLoading(true);
    getFiles(projectId).then(r => {
      const data = r.data || [];
      setFiles(data);
      if (data.length > 0) {
        setActiveUrl(data[0].url);
        setActiveName(data[0].filename);
      }
    }).finally(() => setLoading(false));
  }, [projectId, getFiles]);

  useEffect(() => {
    if (!activeUrl) return;
    setContentLoading(true);
    fetch(activeUrl)
      .then(res => res.text())
      .then(text => setContent(text))
      .finally(() => setContentLoading(false));
  }, [activeUrl]);

  const html = useMemo(() => renderMarkdown(content), [content]);
  const tocItems = useMemo(() => parseToc(content), [content]);

  // IntersectionObserver to highlight active TOC item
  useEffect(() => {
    if (!html || tocItems.length === 0) return;

    const timer = setTimeout(() => {
      if (observerRef.current) observerRef.current.disconnect();

      const headingIds = tocItems.map(t => t.id);
      const elements = headingIds.map(id => document.getElementById(id)).filter(Boolean) as HTMLElement[];

      if (elements.length === 0) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (scrollingRef.current) return;
          for (const entry of entries) {
            if (entry.isIntersecting) {
              setActiveTocId(entry.target.id);
              break;
            }
          }
        },
        { root: contentRef.current, rootMargin: '-20% 0px -70% 0px', threshold: 0 },
      );

      elements.forEach(el => observerRef.current?.observe(el));
    }, 100);

    return () => {
      clearTimeout(timer);
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [html, tocItems]);

  // Scroll to heading on TOC click
  const scrollToHeading = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    setActiveTocId(id);
    scrollingRef.current = true;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => { scrollingRef.current = false; }, 800);
  }, []);

  if (loading) return <Spin style={{ display: 'block', textAlign: 'center', padding: 40 }} />;

  if (files.length === 0) {
    return <Empty description="暂无数据" style={{ padding: 40 }} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* File tabs - horizontal */}
      <div style={{
        display: 'flex', gap: 4, padding: '8px 0', flexWrap: 'wrap',
        borderBottom: '1px solid #f0f0f0', flexShrink: 0,
      }}>
        {files.map((f) => (
          <div
            key={f.id}
            onClick={() => { setActiveUrl(f.url); setActiveName(f.filename); }}
            title={f.filename}
            style={{
              padding: '6px 14px',
              cursor: 'pointer',
              fontSize: 13,
              borderRadius: 6,
              background: f.url === activeUrl ? '#e6f4ff' : '#fafafa',
              color: f.url === activeUrl ? '#1677ff' : '#555',
              border: f.url === activeUrl ? '1px solid #91caff' : '1px solid #f0f0f0',
              fontWeight: f.url === activeUrl ? 600 : 400,
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
              maxWidth: 200,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {f.filename}
          </div>
        ))}
      </div>

      {/* Main area: TOC (sticky) + Content (scroll) */}
      <div ref={mainAreaRef} style={{ display: 'flex', flex: 1, minHeight: 0, marginTop: 8 }}>
        {/* TOC Sidebar - sticky to float on the left */}
        {tocItems.length > 0 && (
          <div style={{
            width: 190,
            flexShrink: 0,
            position: 'sticky',
            top: 64,
            alignSelf: 'flex-start',
            overflow: 'auto',
            background: '#fff',
            borderRight: '1px solid #f0f0f0',
            padding: '8px 0',
          }}>
            <div style={{
              fontSize: 12, fontWeight: 600, color: '#999',
              padding: '0 16px 10px', letterSpacing: 1,
            }}>
              目录
            </div>
            {tocItems.map((item) => (
              <div
                key={item.id}
                onClick={() => scrollToHeading(item.id)}
                title={item.title}
                style={{
                  ...TOC_LEVEL_STYLES[item.level] || TOC_LEVEL_STYLES[4],
                  cursor: 'pointer',
                  padding: '3px 12px 3px 0',
                  marginLeft: (TOC_LEVEL_STYLES[item.level]?.paddingLeft as number) || 8,
                  borderLeft: activeTocId === item.id ? '3px solid #1677ff' : '3px solid transparent',
                  color: activeTocId === item.id ? '#1677ff' : undefined,
                  background: activeTocId === item.id ? '#e6f4ff' : 'transparent',
                  borderRadius: '0 4px 4px 0',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  transition: 'all 0.15s',
                  lineHeight: '22px',
                }}
              >
                {item.title}
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        <div ref={contentRef} style={{
            flex: 1,
            overflow: 'auto',
            padding: '8px 24px 24px',
            fontFamily: 'system-ui, sans-serif',
            fontSize: 14,
            lineHeight: 1.8,
            color: '#333',
          }}
        >
          <div style={{
            padding: '4px 0 8px', marginBottom: 12,
            fontWeight: 600, fontSize: 14, color: '#333',
            borderBottom: '1px dashed #eee',
          }}>
            {activeName}
          </div>
          {contentLoading
            ? <Spin style={{ display: 'block', textAlign: 'center', padding: 40 }} />
            : <div dangerouslySetInnerHTML={{ __html: html }} />
          }
        </div>
      </div>
    </div>
  );
}
