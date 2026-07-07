/** Okta OAuth 콜백 오류 코드를 사용자 메시지로 변환 */
export function describeOktaAuthError(
  errorCode: string,
  detail?: string | null,
): string {
  switch (errorCode) {
    case "okta_not_configured":
      return "Okta 로그인이 설정되지 않았습니다.";
    case "okta_invalid_state":
      return "Okta 로그인 상태가 만료되었습니다. 다시 시도하세요.";
    case "okta_no_email":
      return "Okta 계정에서 이메일을 확인하지 못했습니다.";
    case "okta_not_admin":
      return "등록된 관리자 계정이 아닙니다. 관리자에게 등록을 요청하세요.";
    case "okta_failed":
      return detail
        ? `Okta 로그인에 실패했습니다: ${decodeURIComponent(detail)}`
        : "Okta 로그인에 실패했습니다.";
    default:
      if (errorCode.startsWith("okta_")) {
        return `Okta 로그인 오류: ${errorCode.replace(/^okta_/, "")}`;
      }
      return "로그인에 실패했습니다.";
  }
}
