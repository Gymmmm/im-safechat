const STORAGE_KEYS = {
  token: 'safechat_token'
};

const state = {
  token: localStorage.getItem(STORAGE_KEYS.token) || null,
  overview: null,
  users: [],
  conversations: [],
  operator: null
};

const elements = {
  notice: document.getElementById('auth-notice'),
  dashboard: document.getElementById('dashboard'),
  overviewCards: document.getElementById('overview-cards'),
  usersTable: document.getElementById('users-table'),
  conversationsTable: document.getElementById('conversations-table'),
  refreshAll: document.getElementById('refresh-all'),
  refreshUsers: document.getElementById('refresh-users'),
  refreshConversations: document.getElementById('refresh-conversations'),
  operatorName: document.getElementById('operator-name'),
  toast: document.getElementById('toast')
};

function showToast(message, timeout = 2600) {
  if (!elements.toast) return;
  elements.toast.textContent = message;
  elements.toast.classList.remove('hidden');
  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = setTimeout(() => {
    elements.toast.classList.add('hidden');
  }, timeout);
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('zh-CN');
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  })}`;
}

function formatRelative(value) {
  if (!value) return '暂无数据';
  const now = Date.now();
  const diff = now - new Date(value).getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return '刚刚';
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  if (diff < day * 7) return `${Math.floor(diff / day)} 天前`;
  return formatDateTime(value);
}

async function apiFetch(path, { method = 'GET', body } = {}) {
  if (!state.token) {
    throw new Error('未登录');
  }
  const headers = { 'Content-Type': 'application/json' };
  headers.Authorization = `Bearer ${state.token}`;

  const response = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  if (response.status === 401) {
    state.token = null;
    localStorage.removeItem(STORAGE_KEYS.token);
    throw new Error('登录信息已过期，请重新登录');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: '请求失败' }));
    throw new Error(error.message || '请求失败');
  }

  return response.json();
}

function renderOverview() {
  if (!state.overview) return;
  elements.overviewCards.innerHTML = '';
  const template = document.getElementById('overview-card-template');
  const cards = [
    {
      label: '活跃用户（24h）',
      value: formatNumber(state.overview.activeUsers24h),
      meta: `用户总数 ${formatNumber(state.overview.userCount)} · 新增 ${formatNumber(
        state.overview.newUsers24h
      )}`
    },
    {
      label: '会话总数',
      value: formatNumber(state.overview.conversationCount),
      meta: `群聊 ${formatNumber(state.overview.groupCount)} · 私信 ${formatNumber(
        state.overview.privateCount
      )}`
    },
    {
      label: '消息总量',
      value: formatNumber(state.overview.messageCount),
      meta: `今日发送 ${formatNumber(state.overview.messagesToday)} 条`
    },
    {
      label: '好友网络',
      value: formatNumber(state.overview.friendshipCount),
      meta: `待处理请求 ${formatNumber(state.overview.pendingRequests)}`
    }
  ];

  cards.forEach((card) => {
    const element = template.content.firstElementChild.cloneNode(true);
    element.querySelector('.card-label').textContent = card.label;
    element.querySelector('.card-value').textContent = card.value;
    element.querySelector('.card-meta').textContent = card.meta;
    elements.overviewCards.appendChild(element);
  });
}

function renderUsers() {
  elements.usersTable.innerHTML = '';
  if (!state.users.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 4;
    cell.textContent = '暂无用户数据';
    row.appendChild(cell);
    elements.usersTable.appendChild(row);
    return;
  }

  state.users.forEach((user) => {
    const row = document.createElement('tr');
    const userCell = document.createElement('td');
    const display = document.createElement('strong');
    display.textContent = user.displayName;
    const meta = document.createElement('div');
    meta.className = 'muted';
    meta.textContent = `@${user.username}`;
    userCell.append(display, meta);
    const friendCell = document.createElement('td');
    friendCell.textContent = formatNumber(user.friendCount);
    const createdCell = document.createElement('td');
    createdCell.textContent = formatDateTime(user.createdAt);
    const activityCell = document.createElement('td');
    activityCell.textContent = user.lastMessageAt
      ? formatRelative(user.lastMessageAt)
      : '暂无消息';

    row.append(userCell, friendCell, createdCell, activityCell);
    elements.usersTable.appendChild(row);
  });
}

function renderConversations() {
  elements.conversationsTable.innerHTML = '';
  if (!state.conversations.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.textContent = '暂无会话数据';
    row.appendChild(cell);
    elements.conversationsTable.appendChild(row);
    return;
  }

  state.conversations.forEach((conversation) => {
    const row = document.createElement('tr');
    const titleCell = document.createElement('td');
    const title = document.createElement('strong');
    title.textContent = conversation.title;
    const meta = document.createElement('div');
    meta.className = 'muted';
    meta.textContent = `${conversation.type === 'group' ? '群聊' : '私聊'} · ${formatNumber(
      conversation.participantCount
    )} 人`;
    titleCell.append(title, meta);

    const typeCell = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `badge ${conversation.type}`;
    badge.textContent = conversation.type === 'group' ? '群聊' : '私聊';
    typeCell.appendChild(badge);

    const memberCell = document.createElement('td');
    memberCell.textContent = formatNumber(conversation.participantCount);

    const messagesCell = document.createElement('td');
    messagesCell.textContent = formatNumber(conversation.messageCount);

    const activityCell = document.createElement('td');
    activityCell.textContent = formatRelative(conversation.lastActivityAt || conversation.updatedAt);

    row.append(titleCell, typeCell, memberCell, messagesCell, activityCell);
    elements.conversationsTable.appendChild(row);
  });
}

async function loadOverview() {
  const data = await apiFetch('/api/admin/overview');
  state.overview = data.overview;
  renderOverview();
}

async function loadUsers() {
  const data = await apiFetch('/api/admin/users');
  state.users = data.users;
  renderUsers();
}

async function loadConversations() {
  const data = await apiFetch('/api/admin/conversations');
  state.conversations = data.conversations;
  renderConversations();
}

async function loadOperator() {
  const data = await apiFetch('/api/me');
  state.operator = data.user;
  if (elements.operatorName) {
    elements.operatorName.textContent = `${state.operator.displayName} · 后台实时监管`;
  }
}

async function refreshAllData() {
  try {
    await Promise.all([loadOverview(), loadUsers(), loadConversations()]);
    showToast('数据已刷新');
  } catch (error) {
    showToast(error.message);
    throw error;
  }
}

function attachEvents() {
  if (elements.refreshAll) {
    elements.refreshAll.addEventListener('click', () => {
      refreshAllData().catch(() => {});
    });
  }
  if (elements.refreshUsers) {
    elements.refreshUsers.addEventListener('click', () => {
      loadUsers().then(() => showToast('用户数据已更新')).catch((error) => showToast(error.message));
    });
  }
  if (elements.refreshConversations) {
    elements.refreshConversations.addEventListener('click', () => {
      loadConversations()
        .then(() => showToast('会话数据已更新'))
        .catch((error) => showToast(error.message));
    });
  }
}

(async function init() {
  attachEvents();
  if (!state.token) {
    elements.notice.classList.remove('hidden');
    return;
  }
  try {
    await loadOperator();
    await refreshAllData();
    elements.notice.classList.add('hidden');
    elements.dashboard.classList.remove('hidden');
  } catch (error) {
    console.error(error);
    elements.notice.classList.remove('hidden');
    elements.dashboard.classList.add('hidden');
    showToast(error.message);
  }
})();
