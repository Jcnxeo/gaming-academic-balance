# 게임-학업 밸런스 분석기

게임 습관과 학업 생활습관 데이터를 바탕으로 사용자의 생활패턴을 유형화하고, 장르별 통계와 위험 신호, 개선 코멘트를 보여주는 정적 웹사이트입니다.

## 주요 기능

- 게임시간, 게임 장르, 공부시간, 수면시간, 출석률 입력
- 관련 학생 생활습관 자료 기반 유형 매칭
- FPS, RPG, Casual 장르별 평균 비교 그래프
- 생활습관 위험도 진단
- 상위권 학생들의 공통 패턴과 맞춤 개선 코멘트
- ChatGPT에게 추가 상담을 요청할 수 있는 프롬프트 생성

## 실행 방법

GitHub Pages에 올리면 별도 서버 없이 바로 실행됩니다.
사이트 주소 ; https://jcnxeo.github.io/gaming-academic-balance/

로컬에서 확인할 때는 PowerShell에서 아래 명령을 실행한 뒤 브라우저에서 `http://localhost:8787/`을 열면 됩니다.

```powershell
powershell -ExecutionPolicy Bypass -File .\serve.ps1
```

## 배포 파일

GitHub Pages에 올릴 때 아래 파일과 폴더가 포함되어야 합니다.

```txt
index.html
styles.css
app.js
Gaming_Academic_Performance.csv
StudentPerformanceFactors.csv
assets/dashboard-bg.png
```

## 참고

두 CSV는 같은 학생을 추적한 데이터가 아니므로, 이 사이트는 두 자료를 직접 합쳐 예측 모델로 사용하지 않습니다. 대신 공통 생활습관 축을 기준으로 참고용 비교와 유형화를 제공합니다.
