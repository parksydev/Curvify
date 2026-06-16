'use client';

import { forwardRef, useImperativeHandle, useRef } from 'react';

export interface ShortcutsDialogHandle {
  show: () => void;
}

const SHORTCUTS = [
  { cat: '파일', items: [
    ['새 문서', 'Ctrl+N'],
    ['저장', 'Ctrl+S'],
    ['불러오기', 'Ctrl+O'],
  ]},
  { cat: '편집', items: [
    ['실행 취소', 'Ctrl+Z'],
    ['다시 실행', 'Ctrl+Y'],
    ['삭제', 'Del'],
    ['객체 수정', 'F2'],
    ['다시 근사 (스케치)', 'Ctrl+R'],
  ]},
  { cat: '도구', items: [
    ['이동', 'M'],
    ['함수/극곡선 그리기', 'F'],
    ['점', 'P'],
    ['입력', 'I'],
    ['선택 해제 / 이동', 'Esc'],
  ]},
  { cat: '보기', items: [
    ['직교좌표', '1'],
    ['극좌표', '2'],
    ['확대', '+'],
    ['축소', '-'],
    ['화면 맞춤', '0'],
    ['원점 보기', 'Home'],
  ]},
  { cat: '입력창', items: [
    ['실행', 'Enter'],
    ['편집 취소', 'Esc'],
    ['명령 이력 ↑', 'Ctrl+↑'],
    ['명령 이력 ↓', 'Ctrl+↓'],
  ]},
  { cat: '도움말', items: [
    ['단축키 목록', 'F1'],
  ]},
];

const ShortcutsDialog = forwardRef<ShortcutsDialogHandle>(function ShortcutsDialog(_, ref) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useImperativeHandle(ref, () => ({
    show: () => dialogRef.current?.showModal(),
  }));

  return (
    <dialog ref={dialogRef} className="app-dialog shortcuts-dialog">
      <h2>단축키</h2>
      <div className="shortcuts-grid">
        {SHORTCUTS.map((group) => (
          <section key={group.cat}>
            <h3>{group.cat}</h3>
            <table>
              <tbody>
                {group.items.map(([label, key]) => (
                  <tr key={label}>
                    <td>{label}</td>
                    <td>
                      <kbd>{key}</kbd>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
      <form method="dialog">
        <button type="submit" className="btn-primary">
          닫기
        </button>
      </form>
    </dialog>
  );
});

export default ShortcutsDialog;
