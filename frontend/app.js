const STORAGE_KEYS = {
  token: 'safechat_token'
};

const state = {
  token: localStorage.getItem(STORAGE_KEYS.token) || null,
  user: null,
  friends: [],
  conversations: [],
  requests: { incoming: [], outgoing: [] },
  activeConversationId: null,
  messages: new Map(),
  conversationFilter: 'all',
  isDemo: false
};

let socket = null;

const elements = {
  authPanel: document.getElementById('auth-panel'),
  chatLayout: document.getElementById('chat-layout'),
  loginForm: document.getElementById('login-form'),
  registerForm: document.getElementById('register-form'),
  authTabs: document.querySelectorAll('.auth-tab'),
  tabButtons: document.querySelectorAll('.tab-button'),
  tabPanels: document.querySelectorAll('.tab-panel'),
  mobileHeading: document.getElementById('mobile-heading'),
  mobileSubtitle: document.getElementById('mobile-subtitle'),
  currentUser: document.getElementById('current-user'),
  profileUsername: document.getElementById('profile-username'),
  profileAvatar: document.getElementById('profile-avatar'),
  conversationsList: document.getElementById('conversations-list'),
  friendsList: document.getElementById('friends-list'),
  incomingRequests: document.getElementById('incoming-requests'),
  outgoingRequests: document.getElementById('outgoing-requests'),
  placeholder: document.getElementById('placeholder'),
  conversationContainer: document.getElementById('conversation'),
  conversationTitle: document.getElementById('conversation-title'),
  conversationStatus: document.getElementById('conversation-status'),
  conversationMeta: document.getElementById('conversation-meta'),
  conversationType: document.getElementById('conversation-type'),
  conversationAvatars: document.getElementById('conversation-avatars'),
  messages: document.getElementById('messages'),
  messageForm: document.getElementById('message-form'),
  messageInput: document.getElementById('message-input'),
  logoutButton: document.getElementById('logout-btn'),
  addFriendButton: document.getElementById('add-friend-btn'),
  searchPanel: document.getElementById('search-panel'),
  userSearch: document.getElementById('user-search'),
  searchResults: document.getElementById('search-results'),
  newGroupButton: document.getElementById('new-group-chat'),
  newPrivateChatButton: document.getElementById('new-private-chat'),
  leaveConversationButton: document.getElementById('leave-conversation'),
  conversationFilterButtons: document.querySelectorAll('#conversation-filters .chip'),
  demoButton: document.getElementById('demo-mode'),
  closeConversationButton: document.getElementById('close-conversation')
};

// ------------------
// Utility helpers
// ------------------
function formatDateTime(date) {
  const d = new Date(date);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  })}`;
}

function formatTime(date) {
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function stringToHslColor(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 60%)`;
}

const TAB_COPY = {
  messages: {
    title: '消息',
    subtitle: '保持联系，让沟通更简单'
  },
  contacts: {
    title: '通讯录',
    subtitle: '管理好友与请求，快速发起会话'
  },
  profile: {
    title: '我的',
    subtitle: '查看账户信息与后台控制台'
  }
};

function switchTab(tab) {
  elements.tabButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === tab);
  });
  elements.tabPanels.forEach((panel) => {
    panel.classList.toggle('active', panel.dataset.tab === tab);
  });
  const copy = TAB_COPY[tab] || TAB_COPY.messages;
  elements.mobileHeading.textContent = copy.title;
  elements.mobileSubtitle.textContent = state.isDemo
    ? '预览模式 · 数据仅供展示'
    : copy.subtitle;
  if (tab !== 'contacts') {
    elements.searchPanel.classList.add('hidden');
  }
}

function updateProfileInfo() {
  if (!elements.currentUser) return;
  if (!state.user) {
    elements.currentUser.textContent = '未登录';
    if (elements.profileUsername) {
      elements.profileUsername.textContent = '@safechat';
    }
    if (elements.profileAvatar) {
      elements.profileAvatar.textContent = '🙂';
      elements.profileAvatar.style.background = 'rgba(255, 255, 255, 0.85)';
    }
    return;
  }
  elements.currentUser.textContent = `${state.user.displayName}${
    state.isDemo ? ' (预览模式)' : ''
  }`;
  if (elements.profileUsername) {
    elements.profileUsername.textContent = `@${state.user.username}`;
  }
  const initial = state.user.displayName?.[0] || state.user.username?.[0] || '你';
  if (elements.profileAvatar) {
    elements.profileAvatar.textContent = initial.toUpperCase();
    elements.profileAvatar.style.background = stringToHslColor(
      state.user.displayName || state.user.username
    );
  }
}

function createListItem({ title, subtitle, badge, meta, avatar, active = false }) {
  const template = document.getElementById('list-item-template');
  const element = template.content.firstElementChild.cloneNode(true);
  const avatarElement = element.querySelector('.avatar');
  const titleElement = element.querySelector('.title');
  const subtitleElement = element.querySelector('.subtitle');
  const badgeElement = element.querySelector('.badge');
  const metaElement = element.querySelector('.meta');

  const avatarLabel = avatar || title;
  if (avatarLabel) {
    avatarElement.textContent = avatarLabel.slice(0, 1).toUpperCase();
    avatarElement.style.background = stringToHslColor(avatarLabel);
  }

  titleElement.textContent = title;

  if (subtitle) {
    subtitleElement.textContent = subtitle;
  } else {
    subtitleElement.remove();
  }

  if (badge) {
    badgeElement.textContent = badge;
  } else {
    badgeElement.remove();
  }

  if (meta) {
    metaElement.textContent = meta;
  } else {
    metaElement.remove();
  }

  if (active) {
    element.classList.add('active');
  }

  return element;
}

async function apiFetch(path, { method = 'GET', body } = {}) {
  if (state.isDemo) {
    throw new Error('预览模式下不可执行此操作');
  }
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  if (response.status === 401) {
    handleLogout();
    throw new Error('登录已过期，请重新登录');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: '请求失败' }));
    throw new Error(error.message || '请求失败');
  }

  return response.json();
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('visible'));
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

function setLoading(element, isLoading) {
  element.disabled = isLoading;
  element.dataset.loading = isLoading ? 'true' : 'false';
}

function setConversationFilter(filter) {
  if (!filter) return;
  if (state.conversationFilter === filter) {
    renderConversations();
    return;
  }
  state.conversationFilter = filter;
  renderConversations();
}

function enterDemoMode() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  state.token = null;
  localStorage.removeItem(STORAGE_KEYS.token);

  const now = new Date();
  const minutesAgo = (minutes) => new Date(now.getTime() - minutes * 60000).toISOString();

  const demoUser = {
    id: 'demo-user',
    username: 'previewer',
    displayName: '界面预览'
  };

  const friends = [
    { id: 'friend-lin', username: 'lin', displayName: '林晓' },
    { id: 'friend-zhang', username: 'zhang', displayName: '张伟' },
    { id: 'friend-chen', username: 'chen', displayName: '陈思' }
  ];

  const conversations = [
    {
      id: 'demo-conv-1',
      type: 'private',
      name: null,
      title: '林晓',
      participants: [demoUser, friends[0]],
      lastMessage: {
        id: 'demo-msg-3',
        conversationId: 'demo-conv-1',
        content: '当然，我会提前整理好！',
        createdAt: minutesAgo(12),
        sender: friends[0]
      },
      updatedAt: minutesAgo(12)
    },
    {
      id: 'demo-conv-2',
      type: 'group',
      name: '产品发布推进组',
      title: '产品发布推进组',
      participants: [demoUser, friends[0], friends[1], friends[2]],
      lastMessage: {
        id: 'demo-msg-6',
        conversationId: 'demo-conv-2',
        content: '设计稿我稍后上传到文档中心。',
        createdAt: minutesAgo(35),
        sender: friends[2]
      },
      updatedAt: minutesAgo(35)
    },
    {
      id: 'demo-conv-3',
      type: 'private',
      name: null,
      title: '张伟',
      participants: [demoUser, friends[1]],
      lastMessage: {
        id: 'demo-msg-9',
        conversationId: 'demo-conv-3',
        content: '今晚 8 点记得上线看看数据。',
        createdAt: minutesAgo(180),
        sender: friends[1]
      },
      updatedAt: minutesAgo(180)
    }
  ];

  const messages = new Map([
    [
      'demo-conv-1',
      [
        {
          id: 'demo-msg-1',
          conversationId: 'demo-conv-1',
          sender: friends[0],
          content: '早上好！日程我已经同步在共享表上了。',
          createdAt: minutesAgo(240)
        },
        {
          id: 'demo-msg-2',
          conversationId: 'demo-conv-1',
          sender: demoUser,
          content: '早安～下午的评审还麻烦你主持一下。',
          createdAt: minutesAgo(210)
        },
        {
          id: 'demo-msg-3',
          conversationId: 'demo-conv-1',
          sender: friends[0],
          content: '当然，我会提前整理好！',
          createdAt: minutesAgo(12)
        }
      ]
    ],
    [
      'demo-conv-2',
      [
        {
          id: 'demo-msg-4',
          conversationId: 'demo-conv-2',
          sender: friends[1],
          content: '大家下午 2 点记得例会，我们走一下关键里程碑。',
          createdAt: minutesAgo(180)
        },
        {
          id: 'demo-msg-5',
          conversationId: 'demo-conv-2',
          sender: demoUser,
          content: '收到，我会准备 demo。',
          createdAt: minutesAgo(120)
        },
        {
          id: 'demo-msg-6',
          conversationId: 'demo-conv-2',
          sender: friends[2],
          content: '设计稿我稍后上传到文档中心。',
          createdAt: minutesAgo(35)
        }
      ]
    ],
    [
      'demo-conv-3',
      [
        {
          id: 'demo-msg-7',
          conversationId: 'demo-conv-3',
          sender: demoUser,
          content: '你那边的客户反馈都收齐了吗？',
          createdAt: minutesAgo(720)
        },
        {
          id: 'demo-msg-8',
          conversationId: 'demo-conv-3',
          sender: friends[1],
          content: '都在 CRM 里了，今晚统一整理一版。',
          createdAt: minutesAgo(300)
        },
        {
          id: 'demo-msg-9',
          conversationId: 'demo-conv-3',
          sender: friends[1],
          content: '今晚 8 点记得上线看看数据。',
          createdAt: minutesAgo(180)
        }
      ]
    ]
  ]);

  const requests = {
    incoming: [
      {
        id: 'demo-request-1',
        from: { id: 'friend-liya', username: 'liya', displayName: '李雅' },
        to: demoUser,
        createdAt: minutesAgo(60)
      }
    ],
    outgoing: [
      {
        id: 'demo-request-2',
        from: demoUser,
        to: { id: 'friend-zhao', username: 'zhao', displayName: '赵天明' },
        createdAt: minutesAgo(300)
      }
    ]
  };

  state.isDemo = true;
  state.user = demoUser;
  state.friends = friends.map((friend) => ({ ...friend }));
  state.conversations = conversations.map((conversation) => ({
    ...conversation,
    participants: conversation.participants.map((participant) => ({ ...participant })),
    lastMessage: conversation.lastMessage
      ? {
          ...conversation.lastMessage,
          sender: { ...conversation.lastMessage.sender }
        }
      : null
  }));
  state.requests = {
    incoming: requests.incoming.map((request) => ({
      ...request,
      from: { ...request.from },
      to: { ...request.to }
    })),
    outgoing: requests.outgoing.map((request) => ({
      ...request,
      from: { ...request.from },
      to: { ...request.to }
    }))
  };
  state.messages = new Map(
    Array.from(messages.entries()).map(([key, value]) => [
      key,
      value.map((message) => ({
        ...message,
        sender: { ...message.sender }
      }))
    ])
  );
  state.activeConversationId = null;
  state.conversationFilter = 'all';

  updateProfileInfo();
  elements.authPanel.classList.add('hidden');
  elements.chatLayout.classList.remove('hidden');
  elements.chatLayout.classList.add('demo-mode');
  elements.messageInput.value = '';

  renderFriends();
  renderConversations();
  renderRequests();

  hideConversation();
  switchTab('messages');

  showToast('已进入界面预览模式', 'success');
}

// ------------------
// Authentication
// ------------------
async function handleLoginSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  setLoading(submitButton, true);
  try {
    const formData = new FormData(form);
    const data = await apiFetch('/api/login', {
      method: 'POST',
      body: Object.fromEntries(formData.entries())
    });
    state.token = data.token;
    localStorage.setItem(STORAGE_KEYS.token, data.token);
    await bootstrapAfterAuth(data.user);
    showToast('登录成功', 'success');
  } catch (error) {
    showToast(error.message, 'danger');
  } finally {
    setLoading(submitButton, false);
  }
}

async function handleRegisterSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  setLoading(submitButton, true);
  try {
    const formData = new FormData(form);
    const body = Object.fromEntries(formData.entries());
    if (!body.displayName) {
      delete body.displayName;
    }
    const data = await apiFetch('/api/register', {
      method: 'POST',
      body
    });
    state.token = data.token;
    localStorage.setItem(STORAGE_KEYS.token, data.token);
    await bootstrapAfterAuth(data.user);
    showToast('注册成功，已自动登录', 'success');
  } catch (error) {
    showToast(error.message, 'danger');
  } finally {
    setLoading(submitButton, false);
  }
}

function toggleAuthTab(event) {
  const tab = event.currentTarget;
  elements.authTabs.forEach((el) => el.classList.remove('active'));
  tab.classList.add('active');
  const isLogin = tab.dataset.tab === 'login';
  elements.loginForm.classList.toggle('hidden', !isLogin);
  elements.registerForm.classList.toggle('hidden', isLogin);
}

function handleLogout() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  state.token = null;
  state.user = null;
  state.conversations = [];
  state.friends = [];
  state.requests = { incoming: [], outgoing: [] };
  state.messages.clear();
  state.activeConversationId = null;
  state.conversationFilter = 'all';
  state.isDemo = false;
  localStorage.removeItem(STORAGE_KEYS.token);
  updateProfileInfo();
  hideConversation();
  elements.chatLayout.classList.add('hidden');
  elements.chatLayout.classList.remove('demo-mode');
  elements.authPanel.classList.remove('hidden');
  switchTab('messages');
  showToast('已退出登录');
}

// ------------------
// Data rendering
// ------------------
function renderFriends() {
  const container = elements.friendsList;
  container.innerHTML = '';
  if (!state.friends.length) {
    container.classList.add('empty-state');
    container.textContent = '暂无好友';
    return;
  }
  container.classList.remove('empty-state');
  state.friends.forEach((friend) => {
    const item = createListItem({
      title: friend.displayName,
      subtitle: `@${friend.username}`,
      avatar: friend.displayName
    });
    item.addEventListener('click', () => startPrivateConversation(friend.id));
    container.appendChild(item);
  });
}

function renderConversations() {
  const container = elements.conversationsList;
  container.innerHTML = '';
  const filtered = state.conversations.filter((conversation) => {
    if (state.conversationFilter === 'all') return true;
    return conversation.type === state.conversationFilter;
  });

  elements.conversationFilterButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.filter === state.conversationFilter);
  });

  if (!filtered.length) {
    container.classList.add('empty-state');
    container.textContent = '暂无会话';
    return;
  }
  container.classList.remove('empty-state');
  filtered.forEach((conversation) => {
    const title = conversation.title || (conversation.type === 'group' ? '群聊' : '私聊');
    const lastSender = conversation.lastMessage?.sender?.displayName ||
      conversation.lastMessage?.sender?.username ||
      '';
    const previewBase = conversation.lastMessage
      ? `${lastSender ? `${lastSender}: ` : ''}${conversation.lastMessage.content}`
      : '暂无消息';
    const subtitle = previewBase.length > 56 ? `${previewBase.slice(0, 56)}…` : previewBase;
    const meta = conversation.lastMessage
      ? formatTime(conversation.lastMessage.createdAt)
      : conversation.updatedAt
        ? formatTime(conversation.updatedAt)
        : '';
    const item = createListItem({
      title,
      subtitle,
      badge: conversation.type === 'group' ? '群聊' : '私聊',
      meta,
      avatar: title,
      active: conversation.id === state.activeConversationId
    });
    item.addEventListener('click', () => openConversation(conversation.id));
    container.appendChild(item);
  });

  if (state.activeConversationId) {
    const stillExists = state.conversations.some(
      (conversation) => conversation.id === state.activeConversationId
    );
    if (!stillExists) {
      state.activeConversationId = null;
      hideConversation();
    }
  }
}

function renderRequests() {
  const incomingContainer = elements.incomingRequests;
  const outgoingContainer = elements.outgoingRequests;

  const renderRequestItem = (request, type) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'request-item';
    const user = type === 'incoming' ? request.from : request.to;
    wrapper.innerHTML = `
      <div>
        <div class="title">${user.displayName}</div>
        <div class="subtitle">@${user.username}</div>
        <div class="subtitle">${formatDateTime(request.createdAt)}</div>
      </div>
    `;

    if (type === 'incoming') {
      const actions = document.createElement('div');
      actions.className = 'request-actions';
      const acceptBtn = document.createElement('button');
      acceptBtn.className = 'primary';
      acceptBtn.textContent = '接受';
      acceptBtn.addEventListener('click', () => acceptFriendRequest(request.id));
      const rejectBtn = document.createElement('button');
      rejectBtn.className = 'secondary';
      rejectBtn.textContent = '拒绝';
      rejectBtn.addEventListener('click', () => rejectFriendRequest(request.id));
      actions.append(acceptBtn, rejectBtn);
      wrapper.appendChild(actions);
    }
    return wrapper;
  };

  incomingContainer.innerHTML = '';
  if (!state.requests.incoming.length) {
    incomingContainer.classList.add('empty-state');
    incomingContainer.textContent = '暂无请求';
  } else {
    incomingContainer.classList.remove('empty-state');
    state.requests.incoming.forEach((request) => {
      incomingContainer.appendChild(renderRequestItem(request, 'incoming'));
    });
  }

  outgoingContainer.innerHTML = '';
  if (!state.requests.outgoing.length) {
    outgoingContainer.classList.add('empty-state');
    outgoingContainer.textContent = '暂无请求';
  } else {
    outgoingContainer.classList.remove('empty-state');
    state.requests.outgoing.forEach((request) => {
      outgoingContainer.appendChild(renderRequestItem(request, 'outgoing'));
    });
  }
}

function renderMessages(conversationId) {
  const container = elements.messages;
  container.innerHTML = '';
  const messages = state.messages.get(conversationId) || [];
  if (!messages.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-chat';
    empty.innerHTML = '<h3>暂无消息</h3><p>发送第一条消息开始交流吧。</p>';
    container.appendChild(empty);
    return;
  }

  let lastDateKey = null;
  messages.forEach((message) => {
    const template = document.getElementById('message-template');
    const dividerTemplate = document.getElementById('day-divider-template');
    const messageDate = new Date(message.createdAt);
    const dateKey = messageDate.toDateString();
    if (dividerTemplate && dateKey !== lastDateKey) {
      const divider = dividerTemplate.content.firstElementChild.cloneNode(true);
      divider.querySelector('.date').textContent = messageDate.toLocaleDateString();
      container.appendChild(divider);
      lastDateKey = dateKey;
    }

    const element = template.content.firstElementChild.cloneNode(true);
    const displayName = message.sender.displayName || message.sender.username || '用户';
    if (state.user && message.sender.id === state.user.id) {
      element.classList.add('own');
    }
    const avatar = element.querySelector('.avatar');
    avatar.textContent = displayName.slice(0, 1).toUpperCase();
    avatar.style.background = stringToHslColor(displayName);
    element.querySelector('.sender').textContent = displayName;
    element.querySelector('.time').textContent = formatTime(message.createdAt);
    element.querySelector('.content').textContent = message.content;
    container.appendChild(element);
  });
  container.scrollTop = container.scrollHeight;
}

function showConversation() {
  elements.placeholder.classList.add('hidden');
  elements.conversationContainer.classList.remove('hidden');
  elements.conversationContainer.classList.remove('visible');
  requestAnimationFrame(() => {
    elements.conversationContainer.classList.add('visible');
  });
}

function hideConversation(resetActive = false) {
  elements.conversationContainer.classList.remove('visible');
  elements.conversationContainer.classList.add('hidden');
  elements.placeholder.classList.remove('hidden');
  if (resetActive) {
    state.activeConversationId = null;
    renderConversations();
  }
}

function showConversationDetails(conversation) {
  showConversation();
  elements.conversationContainer.classList.toggle('group-mode', conversation.type === 'group');
  const type = conversation.type || 'private';
  elements.conversationTitle.textContent = conversation.title || '会话';
  elements.conversationType.textContent = type === 'group' ? '群聊' : '私信';
  elements.conversationType.dataset.variant = type;
  const memberNames = conversation.participants
    .map((member) => member.displayName)
    .join('、');
  const label = conversation.type === 'group' ? '群聊成员' : '参与者';
  elements.conversationMeta.textContent = `${label}（${conversation.participants.length}）: ${memberNames}`;
  if (elements.conversationStatus) {
    elements.conversationStatus.textContent =
      conversation.type === 'group' ? '群组沙龙 · 高端交流' : '私享对话 · 实时连线';
  }
  if (elements.conversationAvatars) {
    elements.conversationAvatars.innerHTML = '';
    const participants = conversation.participants.slice(0, 4);
    participants.forEach((member, index) => {
      const avatar = document.createElement('span');
      avatar.className = 'meta-avatar';
      avatar.style.zIndex = String(10 - index);
      const labelText = member.displayName || member.username || '友';
      avatar.textContent = labelText.slice(0, 1).toUpperCase();
      avatar.style.background = stringToHslColor(labelText);
      elements.conversationAvatars.appendChild(avatar);
    });
    if (conversation.participants.length > 4) {
      const more = document.createElement('span');
      more.className = 'meta-avatar more';
      more.textContent = `+${conversation.participants.length - 4}`;
      elements.conversationAvatars.appendChild(more);
    }
  }
}

// ------------------
// Friend request actions
// ------------------
async function acceptFriendRequest(id) {
  if (state.isDemo) {
    showToast('预览模式下不可操作好友请求', 'info');
    return;
  }
  try {
    await apiFetch(`/api/friends/requests/${id}/accept`, { method: 'POST' });
    showToast('已接受好友请求', 'success');
    await Promise.all([loadFriends(), loadRequests()]);
  } catch (error) {
    showToast(error.message, 'danger');
  }
}

async function rejectFriendRequest(id) {
  if (state.isDemo) {
    showToast('预览模式下不可操作好友请求', 'info');
    return;
  }
  try {
    await apiFetch(`/api/friends/requests/${id}/reject`, { method: 'POST' });
    showToast('已拒绝好友请求');
    await loadRequests();
  } catch (error) {
    showToast(error.message, 'danger');
  }
}

async function sendFriendRequest(userId) {
  if (state.isDemo) {
    showToast('预览模式下不可发送好友请求', 'info');
    return;
  }
  try {
    await apiFetch('/api/friends/requests', {
      method: 'POST',
      body: { toUserId: userId }
    });
    showToast('好友请求已发送', 'success');
    await loadRequests();
  } catch (error) {
    showToast(error.message, 'danger');
  }
}

// ------------------
// Conversations
// ------------------
async function openConversation(conversationId) {
  if (state.isDemo) {
    state.activeConversationId = conversationId;
    renderConversations();
    const conversation = state.conversations.find((item) => item.id === conversationId);
    if (conversation) {
      showConversationDetails(conversation);
      renderMessages(conversationId);
    }
    return;
  }
  if (state.activeConversationId === conversationId) return;
  if (socket && state.activeConversationId) {
    socket.emit('leaveConversation', state.activeConversationId);
  }
  state.activeConversationId = conversationId;
  renderConversations();
  if (socket) {
    socket.emit('joinConversation', conversationId);
  }
  if (!state.messages.has(conversationId)) {
    try {
      const data = await apiFetch(`/api/conversations/${conversationId}/messages`);
      state.messages.set(conversationId, data.messages);
    } catch (error) {
      showToast(error.message, 'danger');
      return;
    }
  }
  const conversation = state.conversations.find((item) => item.id === conversationId);
  if (conversation) {
    showConversationDetails(conversation);
    renderMessages(conversationId);
  }
}

async function startPrivateConversation(userId) {
  if (state.isDemo) {
    showToast('预览模式下不可创建真实会话', 'info');
    return;
  }
  try {
    const { conversation } = await apiFetch('/api/conversations/private', {
      method: 'POST',
      body: { userId }
    });
    upsertConversation(conversation);
    openConversation(conversation.id);
  } catch (error) {
    showToast(error.message, 'danger');
  }
}

async function createGroupConversation() {
  if (state.isDemo) {
    showToast('预览模式下不可创建真实群聊', 'info');
    return;
  }
  const name = prompt('请输入群聊名称');
  if (!name) return;
  if (!state.friends.length) {
    showToast('您还没有好友，无法创建群聊', 'danger');
    return;
  }
  const selected = prompt('请输入要邀请的好友用户名，多个以逗号分隔（留空表示所有好友）');
  let memberIds = state.friends.map((friend) => friend.id);
  if (selected) {
    const usernames = selected
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    memberIds = state.friends
      .filter((friend) => usernames.includes(friend.username))
      .map((friend) => friend.id);
  }
  try {
    const { conversation } = await apiFetch('/api/conversations/group', {
      method: 'POST',
      body: { name, memberIds }
    });
    upsertConversation(conversation);
    openConversation(conversation.id);
    showToast('群聊创建成功', 'success');
  } catch (error) {
    showToast(error.message, 'danger');
  }
}

async function sendMessage(event) {
  event.preventDefault();
  if (!state.activeConversationId) return;
  const content = elements.messageInput.value.trim();
  if (!content) return;
  if (state.isDemo) {
    showToast('预览模式下不会发送真实消息', 'info');
    elements.messageInput.value = '';
    return;
  }
  try {
    const { message } = await apiFetch(
      `/api/conversations/${state.activeConversationId}/messages`,
      {
        method: 'POST',
        body: { content }
      }
    );
    appendMessage(state.activeConversationId, message);
    elements.messageInput.value = '';
  } catch (error) {
    showToast(error.message, 'danger');
  }
}

function appendMessage(conversationId, message) {
  if (!state.messages.has(conversationId)) {
    state.messages.set(conversationId, []);
  }
  const messages = state.messages.get(conversationId);
  if (messages.some((item) => item.id === message.id)) {
    return;
  }
  messages.push(message);
  if (state.activeConversationId === conversationId) {
    renderMessages(conversationId);
  }
}

function upsertConversation(conversation) {
  const index = state.conversations.findIndex((item) => item.id === conversation.id);
  if (index >= 0) {
    state.conversations[index] = conversation;
  } else {
    state.conversations.unshift(conversation);
  }
  state.conversations.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  renderConversations();
}

// ------------------
// Data loading
// ------------------
async function loadFriends() {
  if (state.isDemo) return;
  const { friends } = await apiFetch('/api/friends');
  state.friends = friends;
  renderFriends();
}

async function loadConversations() {
  if (state.isDemo) return;
  const { conversations } = await apiFetch('/api/conversations');
  state.conversations = conversations;
  renderConversations();
}

async function loadRequests() {
  if (state.isDemo) return;
  const requests = await apiFetch('/api/friends/requests');
  state.requests = requests;
  renderRequests();
}

async function loadCurrentUser() {
  if (state.isDemo) return;
  const data = await apiFetch('/api/me');
  state.user = data.user;
  updateProfileInfo();
}

async function bootstrapAfterAuth(user) {
  state.isDemo = false;
  state.user = user;
  state.activeConversationId = null;
  updateProfileInfo();
  elements.authPanel.classList.add('hidden');
  elements.chatLayout.classList.remove('hidden');
  elements.chatLayout.classList.remove('demo-mode');
  switchTab('messages');
  hideConversation();
  await Promise.all([loadFriends(), loadConversations(), loadRequests()]);
  connectSocket();
}

// ------------------
// Socket
// ------------------
function connectSocket() {
  if (!state.token) return;
  if (state.isDemo) return;
  if (socket) {
    socket.disconnect();
  }
  socket = io({
    transports: ['websocket', 'polling']
  });
  socket.on('connect', () => {
    socket.emit('authenticate', state.token);
  });
  socket.on('authenticated', () => {
    if (state.activeConversationId) {
      socket.emit('joinConversation', state.activeConversationId);
    }
  });
  socket.on('unauthorized', () => {
    showToast('Socket 认证失败，请重新登录', 'danger');
    handleLogout();
  });
  socket.on('messageCreated', (message) => {
    appendMessage(message.conversationId, message);
    const conversation = state.conversations.find(
      (item) => item.id === message.conversationId
    );
    if (conversation) {
      conversation.lastMessage = message;
      conversation.updatedAt = message.createdAt;
      upsertConversation(conversation);
    }
  });
  socket.on('conversationUpdated', ({ conversation, message }) => {
    upsertConversation(conversation);
    if (message) {
      appendMessage(conversation.id, message);
    }
  });
}

// ------------------
// Search
// ------------------
let searchTimeout = null;

function toggleSearchPanel() {
  elements.searchPanel.classList.toggle('hidden');
  if (!elements.searchPanel.classList.contains('hidden')) {
    switchTab('contacts');
    elements.userSearch.disabled = state.isDemo;
    if (state.isDemo) {
      elements.searchResults.classList.add('empty-state');
      elements.searchResults.textContent = '预览模式下不可搜索用户';
      return;
    }
    elements.userSearch.focus();
    performSearch(elements.userSearch.value.trim());
  } else {
    elements.userSearch.disabled = false;
  }
}

function handleSearchInput(event) {
  const value = event.currentTarget.value.trim();
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => performSearch(value), 300);
}

async function performSearch(keyword) {
  if (state.isDemo) {
    elements.searchResults.classList.add('empty-state');
    elements.searchResults.textContent = '预览模式下不可搜索用户';
    return;
  }
  elements.searchResults.innerHTML = '';
  if (!keyword) {
    elements.searchResults.classList.add('empty-state');
    elements.searchResults.textContent = '请输入用户名';
    return;
  }
  try {
    const { users } = await apiFetch(`/api/users/search?query=${encodeURIComponent(keyword)}`);
    if (!users.length) {
      elements.searchResults.classList.add('empty-state');
      elements.searchResults.textContent = '未找到匹配的用户';
      return;
    }
    elements.searchResults.classList.remove('empty-state');
    users.forEach((user) => {
      const item = createListItem({
        title: user.displayName,
        subtitle: `@${user.username}`,
        avatar: user.displayName
      });
      item.addEventListener('click', () => sendFriendRequest(user.id));
      elements.searchResults.appendChild(item);
    });
  } catch (error) {
    elements.searchResults.classList.add('empty-state');
    elements.searchResults.textContent = error.message;
  }
}

// ------------------
// Event bindings
// ------------------
elements.loginForm.addEventListener('submit', handleLoginSubmit);
elements.registerForm.addEventListener('submit', handleRegisterSubmit);
elements.authTabs.forEach((tab) => tab.addEventListener('click', toggleAuthTab));
elements.tabButtons.forEach((button) => {
  button.addEventListener('click', () => switchTab(button.dataset.tab));
});
elements.logoutButton.addEventListener('click', handleLogout);
elements.addFriendButton.addEventListener('click', toggleSearchPanel);
elements.userSearch.addEventListener('input', handleSearchInput);
elements.newGroupButton.addEventListener('click', createGroupConversation);
elements.newPrivateChatButton.addEventListener('click', () => {
  toggleSearchPanel();
  if (!state.isDemo) {
    elements.userSearch.focus();
  }
});
elements.messageForm.addEventListener('submit', sendMessage);
elements.leaveConversationButton.addEventListener('click', () => {
  showToast('暂不支持离开会话，可联系管理员移除。', 'danger');
});
if (elements.closeConversationButton) {
  elements.closeConversationButton.addEventListener('click', () => hideConversation(true));
}
elements.conversationFilterButtons.forEach((button) => {
  button.addEventListener('click', () => setConversationFilter(button.dataset.filter));
});
if (elements.demoButton) {
  elements.demoButton.addEventListener('click', enterDemoMode);
}

switchTab('messages');
updateProfileInfo();

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && state.token && !state.isDemo) {
    Promise.all([loadConversations(), loadRequests()]).catch(() => {});
  }
});

window.addEventListener('focus', () => {
  if (state.token && !state.isDemo) {
    Promise.all([loadConversations(), loadRequests()]).catch(() => {});
  }
});

// Auto login if token exists
(async function init() {
  if (state.token) {
    try {
      await loadCurrentUser();
      await bootstrapAfterAuth(state.user);
    } catch (error) {
      console.error(error);
      handleLogout();
    }
  }
})();
