# 26. SunEditor 전환에서 selection과 typing boundary를 끝까지 고정하기

## 이번 글에서 풀 문제

rich text editor를 바꾸면 보통 “툴바가 보이느냐”까지만 먼저 확인하게 됩니다.

하지만 실제로 더 오래 남는 버그는 그 다음입니다.

- 선택한 텍스트에만 서식이 적용되는가
- toolbar 클릭 뒤 selection이 살아 있는가
- styled text 뒤에 이어 쓰면 기본 스타일로 돌아오는가
- 저장 시 markup이 안정적으로 직렬화되는가

TownPet는 Tiptap 보수 경로를 버리고 SunEditor로 갈아탄 뒤,  
이 마지막 문제인 **styled typing boundary**를 끝까지 잡는 데 시간을 꽤 썼습니다.

이 글은 그 과정에서 selection, editor 내부 range, serialization, browser smoke를 어떻게 묶어 정리했는지 설명합니다.

## 왜 이 글이 중요한가

rich text editor 버그는 단순 렌더링 버그가 아닙니다.

- 브라우저 selection 상태
- 에디터 내부 range cache
- HTML -> markup 직렬화
- 저장 후 다시 렌더된 결과

가 한 번에 엮입니다.

즉 “글자 크기 하나 안 먹는다”처럼 보여도, 실제로는 상태 경계와 직렬화 경계가 같이 흔들리는 문제일 수 있습니다.

TownPet에서 이걸 정리한 이유도 여기에 있습니다.

## 먼저 볼 핵심 파일

- [`app/src/components/posts/post-body-rich-editor.tsx`](../app/src/components/posts/post-body-rich-editor.tsx)
- [`app/src/lib/editor-inline-image.ts`](../app/src/lib/editor-inline-image.ts)
- [`app/src/lib/editor-content-serializer.ts`](../app/src/lib/editor-content-serializer.ts)
- [`app/src/lib/markdown-lite.ts`](../app/src/lib/markdown-lite.ts)
- [`app/e2e/post-editor-toolbar.spec.ts`](../app/e2e/post-editor-toolbar.spec.ts)
- [`app/package.json`](../app/package.json)
- [`.github/workflows/browser-smoke.yml`](../.github/workflows/browser-smoke.yml)

## 먼저 알아둘 개념

### 1. DOM selection과 editor 내부 range는 다를 수 있다

브라우저에서 caret이 옮겨진 것처럼 보여도, 에디터 라이브러리가 별도의 current range를 캐시하고 있으면 다음 입력은 예전 위치로 들어갈 수 있습니다.

즉 `window.getSelection()`만 맞추는 것으로는 부족할 수 있습니다.

### 2. styled typing boundary는 “서식 적용”과 다른 문제다

`beta`에만 `18px`를 먹이는 것과,  
그 뒤 ` delta`가 기본 크기로 이어지는 것은 서로 다른 문제입니다.

앞은 selection command 문제고,
뒤는 **입력 시작 지점을 어디로 옮길 것인가** 문제입니다.

### 3. 이런 회귀는 browser smoke가 맞다

이 문제는 unit test로도 일부 검증할 수 있지만,
실제 failure는 브라우저 selection/toolbar interaction에서 드러납니다.

그래서 TownPet는 이 회귀를 PR hot path가 아니라 on-demand browser smoke에 넣었습니다.

## 1. TownPet가 겪은 실제 증상

문제는 이렇게 보였습니다.

1. `beta`를 입력한다.
2. `beta`만 선택해서 `18px`를 적용한다.
3. 이어서 ` delta`를 입력한다.

기대한 결과:

- `beta`만 18px
- ` delta`는 기본 스타일

실제 결과:

- `beta delta` 전체가 같은 `18px`

즉 selection command는 성공했지만,  
다음 입력의 caret이 styled span 경계 밖으로 빠져나오지 못했습니다.

## 2. DOM selection만 옮겨서는 왜 부족했는가

핵심 파일:

- [`post-body-rich-editor.tsx`](../app/src/components/posts/post-body-rich-editor.tsx)
- [`editor-inline-image.ts`](../app/src/lib/editor-inline-image.ts)

처음에는 styled span 뒤에 zero-width boundary를 두고 caret을 옮기면 끝날 것처럼 보였습니다.

하지만 SunEditor는 브라우저 selection 외에도 내부 range를 가지고 있습니다.

그래서:

- DOM selection은 span 밖으로 옮겨진 것처럼 보여도
- SunEditor가 다음 입력에서 자기 내부 range를 다시 쓰면
- 문자는 원래 styled span 안으로 이어질 수 있습니다.

즉 “보이는 caret”과 “실제 입력 위치”가 분리될 수 있습니다.

## 3. 그래서 어떤 방식으로 고쳤는가

TownPet의 현재 수정은 세 단계입니다.

### 1) styled span 뒤 boundary를 찾는다

`moveCaretOutsideStyledSpan()`은 현재 selection 기준으로:

- `font-size` 또는 `color` span을 찾고
- plain text가 시작돼야 할 다음 위치를 계산합니다.

이때 단순히 `span.nextSibling`만 보는 것이 아니라,
기존 helper인 `moveCaretAfterStyledNode()`를 재사용해
inline formatting 경계를 더 안전하게 처리합니다.

### 2) DOM selection과 SunEditor 내부 range를 같이 맞춘다

다음 위치를 찾은 뒤에는:

- 브라우저 selection만 바꾸지 않고
- `editor.core.setRange(...)`
- `editor.core.focus()`

까지 같이 호출합니다.

이게 핵심입니다.

styled typing boundary는 결국 “다음 입력이 어느 range를 따라갈 것인가” 문제라서,  
에디터 내부 range를 같이 옮기지 않으면 회귀가 남을 수 있습니다.

### 3) 명령 직후와 다음 입력 직전에 둘 다 보정한다

툴바에서 font-size submenu를 눌렀을 때는 timing이 미묘합니다.

- command DOM 반영 직후
- 다음 문자 입력 직전

두 시점이 모두 중요합니다.

그래서 TownPet는:

- submenu click 시 pending flag를 세우고
- 짧은 retry timeout으로 command 직후 보정하고
- `beforeinput`에서 아직 pending이면 한 번 더 boundary를 보정합니다

즉 “한 번 setTimeout”으로 끝내지 않고,  
실제 입력 직전에도 다시 한번 안전장치를 둡니다.

## 4. 저장 포맷 안정화는 왜 같이 중요했는가

핵심 파일:

- [`editor-content-serializer.ts`](../app/src/lib/editor-content-serializer.ts)
- [`markdown-lite.ts`](../app/src/lib/markdown-lite.ts)

브라우저에서 caret만 맞아도 저장 포맷이 흔들리면 문제는 끝나지 않습니다.

TownPet는 여전히 TownPet markup을 저장 포맷으로 유지합니다.

예:

- `[size=18]beta[/size] delta`
- `[color=#2563eb]본문[/color]`
- `![첨부 이미지](...)`

즉 editor는 HTML로 편집하지만, 저장은 markup으로 다시 직렬화됩니다.

이 구조의 장점은:

- 과거 글 호환성을 유지할 수 있고
- preview/detail 렌더러와 포맷 계약이 명확하며
- DOM 편차를 serialize 단계에서 한 번 더 정리할 수 있다는 점입니다.

## 5. 왜 browser smoke에 editor regression을 넣었는가

핵심 파일:

- [`app/package.json`](../app/package.json)
- [`.github/workflows/browser-smoke.yml`](../.github/workflows/browser-smoke.yml)

현재 `test:e2e:smoke`는:

- feed loading
- kakao / naver entry
- social onboarding
- editor toolbar regression

을 같이 봅니다.

여기서 중요한 판단은,  
이 검증을 `quality-gate` hot path에 넣지 않았다는 점입니다.

이유는 단순합니다.

- 브라우저 설치 비용이 있고
- selection/editor regression은 브라우저에서만 확실히 보이고
- 하지만 매 PR마다 강제할 만큼 보편적인 merge gate는 아닙니다

즉 TownPet는 editor regression을 “버리지 않고”,  
**on-demand browser smoke로 배치만 옮긴 것**입니다.

## 6. 직접 실행해 보고 싶다면

로컬에서 기본 검증:

```bash
corepack pnpm -C app typecheck
corepack pnpm -C app quality:check
```

브라우저 regression 확인:

```bash
corepack pnpm -C app test:e2e -- e2e/post-editor-toolbar.spec.ts --project=chromium
```

on-demand smoke 전체:

```bash
corepack pnpm -C app test:e2e:smoke
```

GitHub Actions 기준:

- [`.github/workflows/browser-smoke.yml`](../.github/workflows/browser-smoke.yml)

## 현재 구현의 한계

- editor regression은 여전히 browser-dependent라서, selection/IME 조합까지 unit test만으로 다 닫을 수는 없습니다.
- `test:e2e:smoke`에 editor spec을 넣었지만, 이것도 어디까지나 on-demand smoke입니다.
- rich text editor를 바꿀 때는 selection/serialization/save-preview-readback을 항상 같이 봐야 합니다.

## Python/Java 개발자용 요약

Spring/Django 관점으로 바꾸면 이 문제는:

- 컨트롤러 validation 버그가 아니라
- 브라우저 state machine + serializer contract 버그

에 가깝습니다.

즉 “값이 저장되느냐”만 볼 게 아니라,

- 입력 상태
- 라이브러리 내부 상태
- 저장 포맷
- 재렌더 결과

를 한 흐름으로 봐야 합니다.

TownPet는 그 경계를 `editor component -> serializer -> smoke regression`으로 나눠서 정리했습니다.

## 면접에서 이렇게 설명할 수 있다

“rich text editor는 UI 컴포넌트처럼 보여도 실제로는 selection state machine입니다. TownPet에서는 SunEditor 전환 후 font-size command 자체보다 styled text 뒤에 이어 쓰는 boundary가 더 큰 회귀였고, DOM selection만 옮겨서는 부족해서 editor 내부 range까지 같이 동기화해야 했습니다. 이 회귀는 unit test보다 browser smoke가 맞다고 보고 hot path가 아니라 on-demand smoke에 넣었습니다.”

## 면접 Q&A

### Q1. 왜 이걸 hot path CI에 넣지 않았나요?

브라우저 기반 editor regression은 중요하지만, every PR merge gate에 강제할 만큼 일반적인 실패는 아닙니다. TownPet는 이런 검증을 버리지 않고 on-demand smoke로 분리해 피드백 속도와 회귀 방지를 같이 가져갔습니다.

### Q2. 왜 DOM selection만 바꾸면 안 됐나요?

SunEditor가 내부 range를 별도로 들고 있기 때문입니다. 브라우저 caret이 밖으로 나가 보여도, 에디터가 다음 입력에서 자기 range를 쓰면 다시 styled span 안으로 이어질 수 있습니다.

### Q3. 왜 HTML 그대로 저장하지 않았나요?

TownPet는 기존 markup 호환성과 detail/preview 렌더 계약을 유지해야 했습니다. 그래서 editor는 HTML로 편집하되, 저장은 serializer가 markup으로 다시 정리하는 구조를 유지했습니다.
