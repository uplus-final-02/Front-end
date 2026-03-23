/**
 * SSE(Server-Sent Events) 서비스
 * fetch 기반으로 Authorization 헤더를 포함한 SSE 구독을 지원합니다.
 */
import { API_BASE_URL } from "./apiClient";

export interface TranscodeResultEvent {
  eventId: string;
  occurredAtEpochMillis: number;
  requestType: string;
  contentId: number;
  videoId: number | null;
  videoFileId: number;
  transcodeStatus: "DONE" | "FAILED";
  hlsMasterKey: string | null;
  durationSec: number | null;
  reason: string | null;
}

export interface SSESubscription {
  close: () => void;
}

/**
 * User 콘텐츠 트랜스코딩 SSE 구독
 * GET /api/user/contents/{userContentId}/publish/subscribe
 */
export function subscribeUserTranscode(
  userContentId: number,
  onResult: (event: TranscodeResultEvent) => void,
  onError?: (error: any) => void,
): SSESubscription {
  const url = `${API_BASE_URL}/api/user/contents/${userContentId}/publish/subscribe`;
  return createSSEConnection(url, onResult, onError);
}

/**
 * Admin 콘텐츠 트랜스코딩 SSE 구독
 * GET /admin/contents/{contentId}/publish/subscribe
 */
export function subscribeAdminTranscode(
  contentId: number,
  onResult: (event: TranscodeResultEvent) => void,
  onError?: (error: any) => void,
): SSESubscription {
  const url = `${API_BASE_URL}/admin/contents/${contentId}/publish/subscribe`;
  return createSSEConnection(url, onResult, onError);
}

function createSSEConnection(
  url: string,
  onResult: (event: TranscodeResultEvent) => void,
  onError?: (error: any) => void,
): SSESubscription {
  let aborted = false;
  const controller = new AbortController();

  const connect = async () => {
    const token = localStorage.getItem("accessToken");
    try {
      console.log("[SSE] 연결 시도:", url);
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "text/event-stream",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: controller.signal,
      });

      console.log(
        "[SSE] 응답 상태:",
        response.status,
        response.headers.get("content-type"),
      );

      if (!response.ok || !response.body) {
        throw new Error(`SSE 연결 실패: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentEvent = "";

      while (!aborted) {
        const { done, value } = await reader.read();
        if (done) {
          console.log("[SSE] 스트림 종료");
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        console.log("[SSE] 수신:", chunk);
        buffer += chunk;
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event:")) {
            currentEvent = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            const dataStr = line.slice(5).trim();
            if (!dataStr) continue;
            try {
              const data = JSON.parse(dataStr) as TranscodeResultEvent;
              // TRANSCODE_RESULT 이벤트이거나, transcodeStatus 필드가 있으면 처리
              if (currentEvent === "TRANSCODE_RESULT" || data.transcodeStatus) {
                console.log("[SSE] TRANSCODE_RESULT 이벤트:", data);
                onResult(data);
              }
            } catch (e) {
              console.warn("SSE 데이터 파싱 실패:", e);
            }
          } else if (line.trim() === "") {
            currentEvent = "";
          }
        }
      }
    } catch (err: any) {
      if (aborted || err.name === "AbortError") return;
      console.error("SSE 연결 오류:", err);
      onError?.(err);
      // 3초 후 재연결
      if (!aborted) {
        setTimeout(() => {
          if (!aborted) connect();
        }, 3000);
      }
    }
  };

  connect();

  return {
    close: () => {
      aborted = true;
      controller.abort();
    },
  };
}
