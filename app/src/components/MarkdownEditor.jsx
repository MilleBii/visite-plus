import React from 'react';
import MdEditor from 'react-markdown-editor-lite';
import ReactMarkdown from 'react-markdown';
import 'react-markdown-editor-lite/lib/index.css';

export default function MarkdownEditor({ value, onChange, placeholder, height = 180 }) {
  return (
    <MdEditor
      value={value}
      style={{ height }}
      renderHTML={text => <ReactMarkdown>{text}</ReactMarkdown>}
      onChange={({ text }) => onChange(text)}
      placeholder={placeholder}
      view={{ menu: true, md: true, html: true }}
      canView={{ menu: true, md: true, html: true, fullScreen: true, hideMenu: true }}
    />
  );
}
