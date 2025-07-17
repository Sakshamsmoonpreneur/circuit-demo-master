import Editor from "@monaco-editor/react";

interface PopupEditorProps {
  visible: boolean;
  code: string;
  onChange: (value: string) => void;
  onClose: () => void;
}

export default function PopupEditor({
  visible,
  code,
  onChange,
  onClose,
}: PopupEditorProps) {
  if (!visible) return null;

  return (
    <div className="fixed top-10 left-10 right-10 bottom-10 bg-white z-50 border p-4 shadow-lg">
      <button
        onClick={onClose}
        className="absolute top-2 right-2 text-white bg-red-500 px-2 py-1 rounded z-50"
      >
        Close
      </button>
      <Editor
        height="99%"
        width="95%"
        defaultLanguage="python"
        value={code}
        theme="vs-dark"
        onChange={(value) => onChange(value ?? "")}
      />
    </div>
  );
}
