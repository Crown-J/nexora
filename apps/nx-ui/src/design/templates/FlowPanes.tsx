// apps/nx-ui/src/design/templates/FlowPanes.tsx
//
// 流程段落的兩欄骨架（v3.0.0 模板軌 第 4 支）
// 規格：docs/專案/介面規格/NEXORA-介面架構-v3.0.0.md v1.1 §6 §7
//
// ⭐ 為什麼有這支（執行長 2026-08-02 拍板）：
//    「版面直接沿用之前彈跳視窗的版本，只是變成不是彈跳視窗而已，
//      這樣就不用每個都還要再調整一次。」
//
//    舊的浮層工作站每一段都是同一個骨架：
//        52px 階段軌 ｜ B 主容器（做事） ｜ C 副容器（看跟著選中項走的資料）
//    階段軌在新架構已經變成 FlowTemplate 的左欄常駐，剩下的 B／C 就是這支。
//
// ⭐ 原則一句話：**左邊做事、右邊看資料**。
//    右欄的內容永遠「跟著左欄選中的那一項走」，⛔ 不放與選中項無關的東西。
//
// ⚠️ 沿用的是骨架與分欄，⛔ 不是像素級照抄（執行長 2026-08-02 同一次拍板）：
//    舊站是 12–13px＋灰字，違反規格 §6（內文 15–16px、⛔ 不用灰字）。
//    字級與顏色一律走 design/styles/v3.css 的語意類別。
//
// ⚠️ 欄寬比例沿用舊站的 1.15 : 1（主容器略寬）。
//    ⛔ 不要改成 1:1——做事的那一側要放輸入欄與清單，比看資料的那側需要更多水平空間。

'use client';

export type FlowPanesProps = {
  /** 左欄標題（做事的那一側） */
  mainTitle: string;
  /** 左欄標題右邊的補充（筆數、鍵位提示之類） */
  mainNote?: React.ReactNode;
  main: React.ReactNode;
  /** 右欄標題（看資料的那一側） */
  sideTitle: string;
  sideNote?: React.ReactNode;
  side: React.ReactNode;
};

export function FlowPanes({
  mainTitle,
  mainNote,
  main,
  sideTitle,
  sideNote,
  side,
}: FlowPanesProps) {
  return (
    <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <Pane title={mainTitle} note={mainNote}>
        {main}
      </Pane>
      {/*
        右欄用淡底把「這一側是看的、不是填的」講清楚。
        ⚠️ 用 bg-muted/40 ⛔ 不用灰字來表達次要——規格 §6 禁灰字，
           降階要靠底色，⛔ 不靠把字調淡。
      */}
      <Pane title={sideTitle} note={sideNote} tinted>
        {side}
      </Pane>
    </div>
  );
}

function Pane({
  title,
  note,
  tinted,
  children,
}: {
  title: string;
  note?: React.ReactNode;
  tinted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`flex min-h-0 flex-col rounded-lg border border-border p-4 ${
        tinted ? 'bg-muted/40' : ''
      }`}
    >
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 border-b border-border pb-2">
        <h3 className="nx-t-sub">{title}</h3>
        {note ? <span className="nx-hint ml-auto">{note}</span> : null}
      </div>
      {/* ⚠️ min-h-0 不能省：少了它，內容超長時 flex 子項不會縮、段落會被撐爆 */}
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}
