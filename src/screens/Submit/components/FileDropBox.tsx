import React, { useState } from 'react';
import { formatMb } from '../../../utils/format';

type FileDropBoxProps = {
  inputId: string;
  icon: string;
  emptyText: string;
  subText: string;
  accept: string;
  file: File | null;
  onSelectFile: (file: File | null) => void;
};

const FileDropBox = ({ inputId, icon, emptyText, subText, accept, file, onSelectFile }: FileDropBoxProps) => {
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
    onSelectFile(event.dataTransfer.files[0] || null);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onSelectFile(event.target.files?.[0] || null);
  };

  const handleClearFile = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onSelectFile(null);
  };

  const boxClassName = ['filebox', isDragOver ? 'dragover' : '', file ? 'hasfile' : ''].join(' ').trim();

  const styles = createStyles();

  return (
    <label
      className={boxClassName}
      htmlFor={inputId}
      onDragEnter={handleDragOver}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="big">{icon}</div>
      <div className="name">{file ? file.name : emptyText}</div>
      <div className="sub">{subText}</div>
      {file && (
        <span className="filechip" style={styles.chip}>
          ✓ {formatMb(file.size)}
          <span className="x" title="Bỏ chọn file" onClick={handleClearFile}>
            ✕
          </span>
        </span>
      )}
      <input id={inputId} type="file" accept={accept} onChange={handleInputChange} />
    </label>
  );
};

export default FileDropBox;

const createStyles = () => {
  return {
    chip: { marginTop: 8 } as React.CSSProperties,
  };
};
