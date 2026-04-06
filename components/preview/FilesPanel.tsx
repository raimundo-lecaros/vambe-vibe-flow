'use client';

import React, { useState, useMemo } from 'react';
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
        style={{ paddingLeft: 8 + depth * 12, display: 'flex', alignItems: 'center', gap: 5, height: 22, cursor: node.isDir ? 'pointer' : 'default', userSelect: 'none' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = C.input; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        {node.isDir
          ? open
            ? <FolderOpen size={11} style={{ color: '#fbbf24', flexShrink: 0 }} />
            : <Folder    size={11} style={{ color: '#fbbf24', flexShrink: 0 }} />
          : fileIcon(node.name)
        }
        <span style={{ fontSize: 11, color: node.isDir ? C.text1 : C.text2, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.name}
        </span>
        {node.lines !== undefined && (
          <span style={{ fontSize: 9, fontFamily: 'monospace', color: C.text3, paddingRight: 8 }}>{node.lines}L</span>
        )}
      </div>
      {node.isDir && open && node.children.map((child) => (
        <TreeNode key={child.path} node={child} depth={depth + 1} />
      ))}
    </>
  );
}

export default function FilesPanel({ files }: { files: FileEntry[] }) {
  const tree = useMemo(() => buildTree(files), [files]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.panel, overflow: 'hidden' }}>
      <div style={{ padding: '7px 10px 6px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Explorer</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: 4, paddingBottom: 8 }}>
        {tree.map((node) => <TreeNode key={node.path} node={node} depth={0} />)}
      </div>
    </div>
  );
}
