import { useState, useEffect, useMemo } from 'react';
import { Spin, Empty } from 'antd';

interface Props {
  projectId: number;
  getFiles: (projectId: number) => Promise<any>;
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: 220, borderRight: '1px solid #f0f0f0', overflow: 'auto',
    padding: '8px 0', flexShrink: 0,
  },
  fileItem: (active: boolean): React.CSSProperties => ({
    padding: '8px 16px', cursor: 'pointer', fontSize: 13,
    background: active ? '#e6f4ff' : 'transparent',
    borderRight: active ? '3px solid #1677ff' : '3px solid transparent',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  }),
  content: {
    flex: 1, overflow: 'auto', padding: '16px 24px',
    fontFamily: 'system-ui, sans-serif', fontSize: 14, lineHeight: 1.8,
    color: '#333',
  },
};

function renderMarkdown(text: string): string {
  let html = text
    // headers
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // bold / italic
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // inline code
    .replace(/`([^`]+)`/g, '<code style="background:#f5f5f5;padding:2px 6px;border-radius:4px;font-size:13px">$1</code>')
    // links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
    // horizontal rule
    .replace(/^---$/gm, '<hr/>')
    // unordered lists
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    // blockquote
    .replace(/^> (.+)$/gm, '<blockquote style="border-left:4px solid #ddd;padding-left:16px;margin:8px 0;color:#666">$1</blockquote>')
    // code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre style="background:#f6f8fa;padding:16px;border-radius:8px;overflow:auto;font-size:13px"><code>$2</code></pre>')
    // paragraphs (double newlines)
    .replace(/\n\n/g, '</p><p>')
    // line breaks
    .replace(/\n/g, '<br/>');

  // Wrap list items
  html = html.replace(/(<li>.*?<\/li>)/gs, (match) => {
    return `<ul style="padding-left:24px;margin:8px 0">${match}</ul>`;
  });

  return `<p>${html}</p>`;
}

export default function MarkdownViewer({ projectId, getFiles }: Props) {
  const [files, setFiles] = useState<any[]>([]);
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [activeName, setActiveName] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [contentLoading, setContentLoading] = useState(false);

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

  if (loading) return <Spin style={{ display: 'block', textAlign: 'center', padding: 40 }} />;

  if (files.length === 0) {
    return <Empty description="暂无查重结果" style={{ padding: 40 }} />;
  }

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
      <div style={styles.sidebar}>
        {files.map((f) => (
          <div
            key={f.id}
            style={styles.fileItem(f.url === activeUrl)}
            onClick={() => { setActiveUrl(f.url); setActiveName(f.filename); }}
            title={f.filename}
          >
            {f.filename}
          </div>
        ))}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{
          padding: '8px 24px', borderBottom: '1px solid #f0f0f0',
          fontWeight: 600, fontSize: 14, color: '#333',
          background: '#fafafa', flexShrink: 0,
        }}>
          {activeName}
        </div>
        <div style={styles.content}>
          {contentLoading
            ? <Spin style={{ display: 'block', textAlign: 'center', padding: 40 }} />
            : <div dangerouslySetInnerHTML={{ __html: html }} />
          }
        </div>
      </div>
    </div>
  );
}
