import Image from "next/image";
import styles from "./page.module.css";

export default function LogoPage() {
  return (
    <div className={styles.container}>
      <div className={styles.logoContainer}>
        <Image
          src="/asset/png/logo.png"
          alt="Logo"
          width={200}
          height={200}
          priority
          className={styles.logo}
        />
      </div>
      
      {/* 해상도 영역 표시 */}
      <div className={styles.resolutionArea}></div>
    </div>
  );
}
