export interface WorkInfo {
  src: string;
  alt: string;
  characters: {
    male: string;
    female: string;
  };
  sceneInfo: string;
  title: string; // 작품 제목 추가
}

export const WORKS: WorkInfo[] = [
  { 
    src: '/asset/png/work1.png', 
    alt: '작품 1', 
    title: '미스터 션샤인',
    characters: { male: '유진 초이', female: '고애신' }, 
    sceneInfo: '3화 S#40. 양복점/ 재봉실 (낮)' 
  },
  { 
    src: '/asset/png/work2.png', 
    alt: '작품 2', 
    title: '태양의 후예',
    characters: { male: '유시진', female: '강모연' }, 
    sceneInfo: '3화 #36-1. 난파선 안 (낮)' 
  },
  { 
    src: '/asset/png/work3.png', 
    alt: '작품 3', 
    title: '',
    characters: { male: '', female: '' }, 
    sceneInfo: '' 
  },
];

