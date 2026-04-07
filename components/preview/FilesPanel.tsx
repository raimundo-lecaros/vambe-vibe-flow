'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Folder, FolderOpen, Code2, FileJson, Palette, File } from 'lucide-react';
import { C } from './constants';

interface FileEntry { path: string; lines: number; }
interface Node { name: string; path: string; isDir: boolean; lines?: number; children: Node[]; }

function buildTree(files: FileEntry[]): Node[] {
  const root: Node[] = [];
  for (const f of files) {
    const parts = f.path.split('/');
    let cur = root;
    parts.forEach((name, i) => {
      let node = cur.find((n) => n.name === name);
      if (!node) {
        const isLast = i === parts.length - 1;
        node = { name, path: parts.slice(0, i + 1).join('/'), isDir: !isLast, lines: isLast ? f.lines : undefined, children: [] };
        cur.push(node);
      }
      cur = node.children;
    });
  }
  return root;
}

function fileIcon(name: string) {
  if (name.endsWith('.tsx') || name.endsWith('.ts')) return <Code2 size={11} style={{ color: '#60a5fa', flexShrink: 0 }} />;
  if (name.endsWith('.json')) return <FileJson size={11} style={{ color: '#fbbf24', flexShrink: 0 }} />;
  if (name.endsWith('.css')) return <Palette size={11} style={{ color: '#a78bfa', flexShrink: 0 }} />;
  return <File size={11} style={{ color: C.text3, flexShrink: 0 }} />;
}

function TreeNode({ node, depth }: { node: Node; depth: number }) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <div
        role="button"
        onClick={() => node.isDir && setOpen((v) => !v)}
        style={{ paddingLeft: 8 + depth * 14, display: 'flex', alignItems: 'center', gap: 5, height: 22, cursor: node.isDir ? 'pointer' : 'default', userSelect: 'none' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = C.input; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        {node.isDir
          ? open ? <FolderOpen size={11} style={{ color: '#fbbf24', flexShrink: 0 }} />
                 : <Folder    size={11} style={{ color: '#fbbf24', flexShrink: 0 }} />
          : fileIcon(node.name)
        }
        <span style={{ fontSize: 11, color: node.isDir ? C.text1 : C.text2, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.name}
        </span>
        {node.lines !== undefined && (
          <span style={{ fontSize: 9, fontFamily: 'monospace', color: C.text3, paddingRight: 8, flexShrink: 0 }}>{node.lines}L</span>
        )}
      </div>
      {node.isDir && open && node.children.map((c) => <TreeNode key={c.path} node={c} depth={depth + 1} />)}
    </>
  );
}

export default function FilesPanel({ slug }: { slug: string }) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/list-files?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((d) => { setFiles(d.files ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [slug]);

  const tree = useMemo(() => buildTree(files), [files]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.panel }}>
      <div style={{ padding: '6px 10px', borderBottom: `1px solid ${C.border}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Explorer</span>
        {!loading && <span style={{ fontSize: 9, fontFamily: 'monospace', color: C.text3 }}>{files.length} archivos</span>}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: 4, paddingBottom: 8 }}>
        {loading
          ? <p style={{ fontSize: 11, color: C.text3, padding: '12px 12px' }}>Cargando…</p>
          : tree.map((n) => <TreeNode key={n.path} node={n} depth={0} />)
        }
      </div>
    </div>
  );
}
