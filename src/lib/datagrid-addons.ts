export interface AddonExampleDefinition {
  id: string;
  category: string;
  title: string;
  description: string;
  detail: string;
}

export const addonExamples: AddonExampleDefinition[] = [
  {
    id: "quick-filter",
    category: "Addons",
    title: "Quick filter",
    description: "상단 입력 하나로 전체 그리드 검색을 거는 예제입니다.",
    detail: "운영 콘솔에서 주문 코드, 담당자, 지역, 플랜을 한 번에 찾는 가장 기본적인 보조 기능입니다.",
  },
  {
    id: "row-selection",
    category: "Addons",
    title: "Row selection",
    description: "체크박스 선택과 다중 행 선택을 보여주는 예제입니다.",
    detail: "일괄 승인, 일괄 검토, 일괄 태깅 같은 실제 백오피스 작업 흐름의 시작점입니다.",
  },
  {
    id: "pinned-summary",
    category: "Addons",
    title: "Pinned summary",
    description: "상단 고정 요약행으로 현재 데이터의 합계와 핵심 수치를 노출합니다.",
    detail: "대형 금액 테이블에서 스크롤해도 총액과 최고 위험도를 놓치지 않도록 하는 예제입니다.",
  },
  {
    id: "action-column",
    category: "Addons",
    title: "Action column",
    description: "상태 배지와 행 액션 버튼을 함께 두는 예제입니다.",
    detail: "그리드가 단순 조회가 아니라 작업면이 되려면 셀 렌더러와 액션 열이 반드시 필요합니다.",
  },
];
