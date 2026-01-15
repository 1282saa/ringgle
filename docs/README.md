# 문서 목차

> 링글 AI 전화영어 프로젝트 문서 안내
> 최종 수정: 2026-01-15

---

## 빠른 링크

| 목적 | 문서 |
|------|------|
| 프로젝트 이해하기 | [프로젝트 요약](01-overview/PROJECT_SUMMARY.md) |
| 개발 시작하기 | [프론트엔드 가이드](02-development/FRONTEND_GUIDE.md) |
| API 확인하기 | [API 레퍼런스](03-infrastructure/API_REFERENCE.md) |
| 기능 명세 보기 | [기능 명세서](04-features/FEATURE_SPECS.md) |
| 버전 히스토리 | [VERSION_HISTORY](05-history/VERSION_HISTORY.md) |

---

## 폴더 구조

```
docs/
├── 01-overview/          # 프로젝트 개요
├── 02-development/       # 개발자용 문서
├── 03-infrastructure/    # 인프라/배포
├── 04-features/          # 기능 명세
├── 05-history/           # 개발 히스토리
└── templates/            # 문서 템플릿
```

---

## 01-overview (프로젝트 개요)

> 프로젝트를 처음 보는 사람이 읽어야 할 문서

| 문서 | 설명 | 대상 |
|------|------|------|
| [PROJECT_SUMMARY.md](01-overview/PROJECT_SUMMARY.md) | 프로젝트 한 페이지 요약 | 전체 |

---

## 02-development (개발자용)

> 코드 작성 시 참고할 문서

| 문서 | 설명 |
|------|------|
| [FRONTEND_GUIDE.md](02-development/FRONTEND_GUIDE.md) | 프론트엔드 개발 가이드 |
| [BACKEND-API.md](02-development/BACKEND-API.md) | 백엔드 API 상세 |
| [DATABASE_ERD.md](02-development/DATABASE_ERD.md) | 데이터베이스 구조 |
| [AI_PIPELINE.md](02-development/AI_PIPELINE.md) | AI/음성 파이프라인 |
| [BACKEND-OPTIMIZATION-SPEC.md](02-development/BACKEND-OPTIMIZATION-SPEC.md) | 백엔드 최적화 명세 |

---

## 03-infrastructure (인프라)

> AWS 구성, API 스펙

| 문서 | 설명 |
|------|------|
| [AWS_INFRASTRUCTURE.md](03-infrastructure/AWS_INFRASTRUCTURE.md) | AWS 인프라 구성도 |
| [API_REFERENCE.md](03-infrastructure/API_REFERENCE.md) | API 엔드포인트 레퍼런스 |
| [openapi.yaml](03-infrastructure/openapi.yaml) | OpenAPI 3.0 스펙 |

---

## 04-features (기능 명세)

> 기획자/디자이너도 볼 수 있는 기능 설명

| 문서 | 설명 |
|------|------|
| [FEATURE_SPECS.md](04-features/FEATURE_SPECS.md) | 기능별 개발 명세서 |
| [UI_UX_SPECIFICATION.md](04-features/UI_UX_SPECIFICATION.md) | UI/UX 상세 스펙 |
| [CALL_HISTORY_TAB_SPEC.md](04-features/CALL_HISTORY_TAB_SPEC.md) | 통화 기록 탭 명세 |

---

## 05-history (개발 히스토리)

> 개발 과정 기록

| 문서 | 설명 |
|------|------|
| [VERSION_HISTORY.md](05-history/VERSION_HISTORY.md) | 버전별 Before→After 히스토리 |
| [DEVELOPMENT_LOG.md](05-history/DEVELOPMENT_LOG.md) | 개발 로그 |
| [phase/](05-history/phase/) | Phase별 상세 문서 (Phase 1~10) |

---

## templates (템플릿)

> 새 문서 작성 시 사용

| 문서 | 용도 |
|------|------|
| [VERSION_TEMPLATE.md](templates/VERSION_TEMPLATE.md) | 버전 기록 추가용 |

---

## 역할별 필독 문서

### 기획자/PM
1. [PROJECT_SUMMARY.md](01-overview/PROJECT_SUMMARY.md)
2. [FEATURE_SPECS.md](04-features/FEATURE_SPECS.md)
3. [VERSION_HISTORY.md](05-history/VERSION_HISTORY.md)

### 프론트엔드 개발자
1. [FRONTEND_GUIDE.md](02-development/FRONTEND_GUIDE.md)
2. [API_REFERENCE.md](03-infrastructure/API_REFERENCE.md)
3. [UI_UX_SPECIFICATION.md](04-features/UI_UX_SPECIFICATION.md)

### 백엔드 개발자
1. [BACKEND-API.md](02-development/BACKEND-API.md)
2. [DATABASE_ERD.md](02-development/DATABASE_ERD.md)
3. [AWS_INFRASTRUCTURE.md](03-infrastructure/AWS_INFRASTRUCTURE.md)

### 디자이너
1. [UI_UX_SPECIFICATION.md](04-features/UI_UX_SPECIFICATION.md)
2. [FEATURE_SPECS.md](04-features/FEATURE_SPECS.md)

---

## 문서 작성 규칙

1. **파일명**: 대문자 + 언더스코어 (예: `PROJECT_SUMMARY.md`)
2. **제목**: `# 문서명` 으로 시작
3. **날짜**: 상단에 최종 수정일 명시
4. **언어**: 한국어 (코드/기술용어는 영어)

---

## 문서 추가 시

1. 적절한 폴더에 파일 생성
2. 이 README.md 목차에 추가
3. git commit

---

*이 목차는 문서 추가/삭제 시 업데이트해주세요.*
