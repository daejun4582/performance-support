'use client';

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export default function LogoPage() {
  const router = useRouter();
  const [showText, setShowText] = React.useState(false);
  const textRef = React.useRef<HTMLDivElement | null>(null);

  const handleNavigate = () => {
    router.push('/startPage');
  };

  React.useEffect(() => {
    const timer = setTimeout(() => setShowText(true), 900); // after first enter animation
    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    if (!showText) return;
    const el = textRef.current;
    if (!el) return;
    const width = el.getBoundingClientRect().width;
    const stage = el.parentElement as HTMLElement | null;
    if (stage) {
      stage.style.setProperty('--text-width', `${Math.round(width)}px`);
    }
  }, [showText]);

  return (
    <div className={styles.container} onClick={handleNavigate}>
      <div className={styles.logoContainer}>
        <div className={`${styles.logoStage} ${showText ? styles.withText : ''}`}>
          <div className={styles.logoWrap}>
            <Image
              src="/asset/png/logo.png"
              alt="Logo"
              width={200}
              height={200}
              priority
              className={`${styles.logo} ${styles.logoEnter}`}
              style={{ cursor: 'pointer' }}
            />
          </div>

          {showText && (
            <div ref={textRef} className={styles.textBlock}>
              <div className={`${styles.textInner} ${styles.textEnter}`}>
                <div className={styles.smallText}>언제 어디서나 연기연습 보조</div>
                <div className={styles.bigText}>배우보죠</div>
              </div>
            </div>
          )}
          {showText && (
            <div className={styles.ctaText}>화면을 터치해 주세요</div>
          )}
        </div>
      </div>
      
      {/* 해상도 영역 표시 */}
      <div className={styles.resolutionArea}></div>
    </div>
  );
}
