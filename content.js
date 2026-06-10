// === Zenn Mute User Alert ===
'use strict';

const DEBUG = false;

function log(...args) {
  if (DEBUG) console.log('[Zenn Mute]', ...args);
}

// Zennのシステムパス一覧（ユーザー名ではないパス）
const SYSTEM_PATHS = new Set([
  'settings', 'articles', 'scraps', 'books', 'search',
  'topics', 'login', 'enter', 'dashboard', 'faq', 'about',
  'terms', 'privacy', 'guideline', 'notices', 'pricing',
  'changelog', 'badges', 'explore', 'feed', 'notifications',
  'messages', 'api', 'oauth', 'new', 'me'
]);

// ミュート設定ページからユーザーリストを取得して保存する
function scrapeMutedUsers() {
  log('ミュート設定ページを検出。ユーザーリストを取得中...');

  const maxAttempts = 20;
  let attempts = 0;

  const tryFetch = () => {
    attempts++;

    // ミュートユーザーのリンクを探す
    // ページ内のメインコンテンツ領域に絞る
    const mainContent = document.querySelector('main') || document.body;
    const userLinks = mainContent.querySelectorAll('a[href^="/"]');
    const mutedUsers = [];

    userLinks.forEach((link) => {
      const href = link.getAttribute('href');
      const match = href.match(/^\/([a-zA-Z0-9_-]+)$/);
      if (match) {
        const username = match[1];
        if (!SYSTEM_PATHS.has(username)) {
          mutedUsers.push(username.toLowerCase());
        }
      }
    });

    // 重複を除去
    const uniqueUsers = [...new Set(mutedUsers)];

    if (uniqueUsers.length > 0) {
      chrome.storage.local.set({ mutedUsers: uniqueUsers }, () => {
        log('ミュートリストを保存しました:', uniqueUsers);
        showSyncNotification(uniqueUsers.length);
      });
    } else if (attempts < maxAttempts) {
      setTimeout(tryFetch, 500);
    } else {
      log('ミュートユーザーが見つかりませんでした。');
      showSyncNotification(0);
    }
  };

  setTimeout(tryFetch, 1000);
}

// 同期完了通知を表示
function showSyncNotification(count) {
  const notification = document.createElement('div');
  notification.setAttribute('role', 'alert');
  notification.setAttribute('aria-live', 'polite');

  const isSuccess = count > 0;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${isSuccess ? '#27ae60' : '#e67e22'};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    z-index: 999999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  `;
  notification.textContent = isSuccess
    ? `✓ ミュートユーザー ${count}人 を同期しました`
    : '⚠ ミュートユーザーが見つかりませんでした';
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Zennのページからユーザー名を取得する
function getAuthorUsername() {
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  if (pathParts.length >= 1) {
    if (SYSTEM_PATHS.has(pathParts[0])) {
      return null;
    }
    return pathParts[0];
  }
  return null;
}

// 警告モーダルを表示する
function showMuteWarningModal(username) {
  if (document.getElementById('zenn-mute-warning-modal')) {
    return;
  }

  const overlay = document.createElement('div');
  overlay.id = 'zenn-mute-warning-modal';
  overlay.className = 'zenn-mute-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'zenn-mute-modal-title');

  const modal = document.createElement('div');
  modal.className = 'zenn-mute-modal';

  modal.innerHTML = `
    <div class="zenn-mute-modal-icon" aria-hidden="true">⚠️</div>
    <h2 class="zenn-mute-modal-title" id="zenn-mute-modal-title">ミュート中のユーザーです</h2>
    <p class="zenn-mute-modal-message">
      <strong>@${escapeHtml(username)}</strong> はミュートしたユーザーです。
    </p>
    <div class="zenn-mute-modal-buttons">
      <button id="zenn-mute-go-back" class="zenn-mute-btn zenn-mute-btn-primary">戻る</button>
      <button id="zenn-mute-go-top" class="zenn-mute-btn zenn-mute-btn-primary">トップページへ</button>
      <button id="zenn-mute-continue" class="zenn-mute-btn zenn-mute-btn-secondary">このまま閲覧する</button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // フォーカスをモーダルに移す
  document.getElementById('zenn-mute-go-back').focus();

  document.getElementById('zenn-mute-go-back').addEventListener('click', () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = 'https://zenn.dev/';
    }
  });

  document.getElementById('zenn-mute-go-top').addEventListener('click', () => {
    window.location.href = 'https://zenn.dev/';
  });

  document.getElementById('zenn-mute-continue').addEventListener('click', () => {
    overlay.remove();
  });

  // Escキーでモーダルを閉じる
  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      overlay.remove();
    }
  });
}

// HTMLエスケープ
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ミュートリストをチェックしてモーダルを表示する
function checkMutedUser() {
  const username = getAuthorUsername();
  log('現在のページのユーザー名:', username);
  if (!username) return;

  chrome.storage.local.get(['mutedUsers'], (result) => {
    const mutedUsers = result.mutedUsers || [];
    log('ミュートリスト:', mutedUsers);
    if (mutedUsers.includes(username.toLowerCase())) {
      log('ミュートユーザー検出!');
      showMuteWarningModal(username);
    }
  });
}

// メイン処理
function main() {
  const currentPath = window.location.pathname;

  if (currentPath === '/settings/mutes') {
    scrapeMutedUsers();
  } else {
    checkMutedUser();
  }
}

// 実行
main();

// SPAのページ遷移に対応
let lastUrl = location.href;
const observer = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    const existingModal = document.getElementById('zenn-mute-warning-modal');
    if (existingModal) {
      existingModal.remove();
    }
    setTimeout(main, 500);
  }
});
observer.observe(document.body, { childList: true, subtree: true });
