'use strict';

// HTMLエスケープ
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ミュートリストを表示する
function renderList(mutedUsers) {
  const list = document.getElementById('muted-list');
  const count = document.getElementById('count');
  list.innerHTML = '';

  if (mutedUsers.length === 0) {
    list.innerHTML = '<p class="empty-message">ミュートしたユーザーはいません</p>';
    count.textContent = '';
    return;
  }

  count.textContent = `${mutedUsers.length}人のユーザーをミュート中`;

  mutedUsers.forEach((username) => {
    const li = document.createElement('li');

    const span = document.createElement('span');
    span.className = 'username';
    span.textContent = `@${username}`;

    const btn = document.createElement('button');
    btn.className = 'btn-remove';
    btn.dataset.username = username;
    btn.title = '削除';
    btn.textContent = '×';
    btn.setAttribute('aria-label', `@${username} を削除`);
    btn.addEventListener('click', () => removeUser(username));

    li.appendChild(span);
    li.appendChild(btn);
    list.appendChild(li);
  });
}

// ユーザーを追加する
function addUser(username) {
  const cleaned = username.trim().toLowerCase().replace(/^@/, '');
  if (!cleaned) return;

  // ユーザー名のバリデーション
  if (!/^[a-zA-Z0-9_-]+$/.test(cleaned)) {
    showStatus('無効なユーザー名です', 'warn');
    return;
  }

  chrome.storage.local.get(['mutedUsers'], (result) => {
    const mutedUsers = result.mutedUsers || [];

    if (mutedUsers.includes(cleaned)) {
      showStatus('このユーザーは既に登録されています', 'warn');
      return;
    }

    mutedUsers.push(cleaned);
    chrome.storage.local.set({ mutedUsers }, () => {
      renderList(mutedUsers);
      showStatus(`@${cleaned} を追加しました`, 'success');
      document.getElementById('username-input').value = '';
    });
  });
}

// ユーザーを削除する
function removeUser(username) {
  chrome.storage.local.get(['mutedUsers'], (result) => {
    const mutedUsers = (result.mutedUsers || []).filter((u) => u !== username);
    chrome.storage.local.set({ mutedUsers }, () => {
      renderList(mutedUsers);
      showStatus(`@${username} を削除しました`, 'success');
    });
  });
}

// ステータスメッセージを表示する
function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.style.color = type === 'success' ? '#27ae60' : '#e67e22';
  setTimeout(() => {
    status.textContent = '';
  }, 3000);
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['mutedUsers'], (result) => {
    renderList(result.mutedUsers || []);
  });

  // 同期ボタン：ミュート設定ページを新しいタブで開く
  document.getElementById('sync-btn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://zenn.dev/settings/mutes' });
    showStatus('ミュート設定ページを開きました。自動的に同期されます。', 'success');
  });

  // 追加ボタン
  document.getElementById('add-btn').addEventListener('click', () => {
    const input = document.getElementById('username-input');
    addUser(input.value);
  });

  // Enterキーで追加
  document.getElementById('username-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      addUser(e.target.value);
    }
  });
});
