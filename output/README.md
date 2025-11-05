# Output 폴더

데이터 생성기가 생성한 파일들이 저장되는 폴더입니다.

## 구조

- `data/`: LogBus2가 읽는 JSONL 파일 (일자별)
- `runs/`: 실행 메타데이터 JSON 파일

## 주의사항

- `data/` 폴더의 JSONL 파일은 LogBus2 전송 후 자동 삭제 가능
- `runs/` 폴더의 메타데이터는 이력 추적용으로 보관
