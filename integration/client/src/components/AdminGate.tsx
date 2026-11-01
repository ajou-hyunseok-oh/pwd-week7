import { useEffect, useState, useSyncExternalStore } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { clearAdminKey, getAdminState, setAdminKey, subscribeAdminState } from '../services/api';

export default function AdminGate({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(subscribeAdminState, getAdminState, getAdminState);
  const [keyInput, setKeyInput] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    if (state !== 'unlocked') queryClient.removeQueries({ queryKey: ['submissions'] });
  }, [state, queryClient]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!keyInput.trim()) return;
    setAdminKey(keyInput);
    setKeyInput('');
  };

  if (state !== 'unlocked') {
    return (
      <main style={{ padding: '2rem 0' }}>
        <h2>관리자 키 입력</h2>
        <p>서버의 ADMIN_API_KEY를 입력하세요. Supabase 키는 입력하지 마세요.</p>
        <p>키는 현재 탭의 메모리에만 보관되며 새로고침하면 사라집니다. 개인 컴퓨터의 로컬 실습에서만 사용하세요.</p>
        {state === 'invalid' && <p role="alert">관리자 인증에 실패했습니다. 키를 확인하고 다시 입력하세요.</p>}
        <form onSubmit={onSubmit}>
          <label htmlFor="admin-api-key">관리자 API 키</label>{' '}
          <input id="admin-api-key" type="password" autoComplete="off" value={keyInput}
            onChange={(event) => setKeyInput(event.target.value)} required />{' '}
          <button type="submit">관리 화면 열기</button>
        </form>
        <p>키는 관리자 API를 처음 요청할 때 서버에서 확인합니다.</p>
      </main>
    );
  }
  return (
    <>
      <button type="button" onClick={() => clearAdminKey()}>관리자 키 지우기</button>
      {children}
    </>
  );
}
