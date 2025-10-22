'use client';

import React, { useRef } from 'react';
import { ApplyButton } from './ActionButton';
import styles from './ImageUploadModal.module.css';

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageSelect: (imageUrl: string) => void;
  onReset?: () => void;
}

export const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  isOpen,
  onClose,
  onImageSelect,
  onReset
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setSelectedImage(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApply = () => {
    if (selectedImage) {
      onImageSelect(selectedImage);
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedImage(null);
    onClose();
  };

  // 모달이 열릴 때마다 이미지 초기화
  React.useEffect(() => {
    if (isOpen) {
      setSelectedImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className={styles.header}>
          <span className={styles.headerText}>참고 이미지 선택</span>
        </div>

        {/* 이미지 표시 영역 */}
        <div className={styles.imageArea}>
          {selectedImage ? (
            <img 
              src={selectedImage} 
              alt="선택된 이미지" 
              className={styles.selectedImage}
            />
          ) : (
            <div className={styles.placeholder}>
              <span className={styles.placeholderText}>사진 A</span>
            </div>
          )}
        </div>

        {/* 파일 입력 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className={styles.fileInput}
        />

        {/* 적용하기 버튼 */}
        <div className={styles.buttonContainer}>
          <ApplyButton onClick={handleApply} />
        </div>
      </div>
    </div>
  );
};
