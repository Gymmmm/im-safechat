const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_safechat_key';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/safechat';
const PORT = process.env.PORT || 3001;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '*')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = ALLOWED_ORIGINS.includes('*')
  ? { origin: '*', credentials: false }
  : { origin: ALLOWED_ORIGINS, credentials: true };

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions
});

app.use(cors(corsOptions));
app.use(express.json());

// --------------------
// Database Models
// --------------------
const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    username: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 50
    },
    password: {
      type: String,
      required: true
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: 100
    },
    friends: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  {
    timestamps: true
  }
);

const FriendRequestSchema = new Schema(
  {
    from: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    to: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending'
    }
  },
  { timestamps: true }
);

const ConversationSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['private', 'group'],
      required: true
    },
    name: {
      type: String,
      trim: true,
      maxlength: 120
    },
    participants: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: 'Message'
    }
  },
  { timestamps: true }
);

const MessageSchema = new Schema(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 4000
    }
  },
  { timestamps: true }
);

const User = mongoose.model('User', UserSchema);
const FriendRequest = mongoose.model('FriendRequest', FriendRequestSchema);
const Conversation = mongoose.model('Conversation', ConversationSchema);
const Message = mongoose.model('Message', MessageSchema);

// --------------------
// Helpers
// --------------------
function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function generateToken(user) {
  return jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, {
    expiresIn: '7d'
  });
}

function serializeUser(user) {
  return {
    id: user._id.toString(),
    username: user.username,
    displayName: user.displayName || user.username
  };
}

function serializeMessage(message) {
  const conversationId =
    typeof message.conversation === 'object' && message.conversation !== null
      ? message.conversation._id?.toString() || message.conversation.id?.toString()
      : message.conversation.toString();

  return {
    id: message._id.toString(),
    conversationId,
    sender: serializeUser(message.sender),
    content: message.content,
    createdAt: message.createdAt
  };
}

function conversationTitle(conversation, currentUserId) {
  if (conversation.type === 'group') {
    return conversation.name || '未命名群聊';
  }

  const otherParticipant = conversation.participants.find(
    (participant) => participant._id.toString() !== currentUserId.toString()
  );
  if (!otherParticipant) {
    return '私聊';
  }
  return otherParticipant.displayName || otherParticipant.username;
}

function serializeConversation(conversation, currentUserId) {
  const participants = conversation.participants.map(serializeUser);
  const lastMessage = conversation.lastMessage
    ? {
        id: conversation.lastMessage._id.toString(),
        content: conversation.lastMessage.content,
        createdAt: conversation.lastMessage.createdAt,
        sender: serializeUser(conversation.lastMessage.sender)
      }
    : null;

  return {
    id: conversation._id.toString(),
    type: conversation.type,
    name: conversation.name,
    title: conversationTitle(conversation, currentUserId),
    participants,
    lastMessage,
    updatedAt: conversation.updatedAt
  };
}

const authMiddleware = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : null;

  if (!token) {
    return res.status(401).json({ message: '未提供认证信息' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user) {
      return res.status(401).json({ message: '用户不存在' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: '无效或过期的令牌' });
  }
});

// --------------------
// Authentication
// --------------------
app.post(
  '/api/register',
  asyncHandler(async (req, res) => {
    const { username, password, displayName } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码不能为空' });
    }

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ message: '用户名已存在' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      password: hashedPassword,
      displayName: displayName?.trim() || username
    });

    const token = generateToken(user);
    res.status(201).json({
      token,
      user: serializeUser(user)
    });
  })
);

app.post(
  '/api/login',
  asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码不能为空' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    const token = generateToken(user);
    res.json({ token, user: serializeUser(user) });
  })
);

app.get(
  '/api/me',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).populate('friends');
    res.json({
      user: serializeUser(user),
      friends: user.friends.map(serializeUser)
    });
  })
);

// --------------------
// Friend System
// --------------------
app.get(
  '/api/users/search',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { query } = req.query;
    if (!query) {
      return res.json({ users: [] });
    }

    const users = await User.find({
      username: { $regex: query, $options: 'i' },
      _id: { $ne: req.user._id }
    }).limit(20);

    res.json({ users: users.map(serializeUser) });
  })
);

app.get(
  '/api/friends',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).populate('friends');
    res.json({ friends: user.friends.map(serializeUser) });
  })
);

app.post(
  '/api/friends/requests',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { toUserId } = req.body;

    if (!toUserId) {
      return res.status(400).json({ message: '请选择要添加的用户' });
    }

    if (toUserId === req.user._id.toString()) {
      return res.status(400).json({ message: '无法添加自己为好友' });
    }

    const [targetUser, alreadyFriends, existingRequest] = await Promise.all([
      User.findById(toUserId),
      User.exists({ _id: req.user._id, friends: toUserId }),
      FriendRequest.findOne({
        $or: [
          { from: req.user._id, to: toUserId, status: 'pending' },
          { from: toUserId, to: req.user._id, status: 'pending' }
        ]
      })
    ]);

    if (!targetUser) {
      return res.status(404).json({ message: '用户不存在' });
    }

    if (alreadyFriends) {
      return res.status(400).json({ message: '你们已经是好友了' });
    }

    if (existingRequest) {
      return res.status(400).json({ message: '已存在待处理的好友请求' });
    }

    const request = await FriendRequest.create({
      from: req.user._id,
      to: toUserId
    });

    const populatedRequest = await request.populate('from to');

    res.status(201).json({
      request: {
        id: populatedRequest._id.toString(),
        from: serializeUser(populatedRequest.from),
        to: serializeUser(populatedRequest.to),
        createdAt: populatedRequest.createdAt
      }
    });
  })
);

app.get(
  '/api/friends/requests',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const [incoming, outgoing] = await Promise.all([
      FriendRequest.find({ to: req.user._id, status: 'pending' }).populate('from'),
      FriendRequest.find({ from: req.user._id, status: 'pending' }).populate('to')
    ]);

    res.json({
      incoming: incoming.map((request) => ({
        id: request._id.toString(),
        from: serializeUser(request.from),
        createdAt: request.createdAt
      })),
      outgoing: outgoing.map((request) => ({
        id: request._id.toString(),
        to: serializeUser(request.to),
        createdAt: request.createdAt
      }))
    });
  })
);

app.post(
  '/api/friends/requests/:id/accept',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const request = await FriendRequest.findById(req.params.id).populate('from to');

    if (!request || request.status !== 'pending') {
      return res.status(404).json({ message: '好友请求不存在或已处理' });
    }

    if (request.to._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '无权处理该好友请求' });
    }

    request.status = 'accepted';
    await request.save();

    await Promise.all([
      User.updateOne(
        { _id: request.from._id },
        { $addToSet: { friends: request.to._id } }
      ),
      User.updateOne(
        { _id: request.to._id },
        { $addToSet: { friends: request.from._id } }
      )
    ]);

    res.json({ message: '已接受好友请求' });
  })
);

app.post(
  '/api/friends/requests/:id/reject',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const request = await FriendRequest.findById(req.params.id);

    if (!request || request.status !== 'pending') {
      return res.status(404).json({ message: '好友请求不存在或已处理' });
    }

    if (request.to.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '无权处理该好友请求' });
    }

    request.status = 'declined';
    await request.save();

    res.json({ message: '已拒绝好友请求' });
  })
);

// --------------------
// Conversation helpers
// --------------------
async function ensurePrivateConversation(currentUserId, otherUserId) {
  let conversation = await Conversation.findOne({
    type: 'private',
    participants: { $all: [currentUserId, otherUserId] }
  });

  if (
    conversation &&
    conversation.participants.length !== 2
  ) {
    conversation = null;
  }

  if (!conversation) {
    conversation = await Conversation.create({
      type: 'private',
      participants: [currentUserId, otherUserId],
      createdBy: currentUserId
    });
  }

  return conversation;
}

async function loadConversation(conversationId) {
  return Conversation.findById(conversationId)
    .populate('participants')
    .populate({
      path: 'lastMessage',
      populate: { path: 'sender' }
    });
}

async function canAccessConversation(conversationId, userId) {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId
  });
  return Boolean(conversation);
}

function emitConversationUpdate(conversation, message) {
  conversation.participants.forEach((participant) => {
    const sockets = activeUsers.get(participant._id.toString());
    if (!sockets) return;
    sockets.forEach((socket) => {
      socket.emit('conversationUpdated', {
        conversation: serializeConversation(conversation, participant._id),
        message
      });
    });
  });
}

// --------------------
// Conversation Routes
// --------------------
app.get(
  '/api/conversations',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const conversations = await Conversation.find({
      participants: req.user._id
    })
      .sort({ updatedAt: -1 })
      .populate('participants')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender' }
      });

    res.json({
      conversations: conversations.map((conversation) =>
        serializeConversation(conversation, req.user._id)
      )
    });
  })
);

app.post(
  '/api/conversations/private',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: '请选择聊天对象' });
    }

    const otherUser = await User.findById(userId);
    if (!otherUser) {
      return res.status(404).json({ message: '用户不存在' });
    }

    const conversation = await ensurePrivateConversation(
      req.user._id,
      otherUser._id
    );

    const populated = await loadConversation(conversation._id);
    res.status(201).json({
      conversation: serializeConversation(populated, req.user._id)
    });
  })
);

app.post(
  '/api/conversations/group',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { name, memberIds } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: '群聊名称不能为空' });
    }

    const participants = new Set([req.user._id.toString(), ...(memberIds || [])]);

    const users = await User.find({ _id: { $in: Array.from(participants) } });
    if (users.length < 2) {
      return res.status(400).json({ message: '群聊至少需要两名成员' });
    }

    const conversation = await Conversation.create({
      type: 'group',
      name: name.trim(),
      participants: Array.from(participants),
      createdBy: req.user._id
    });

    const populated = await loadConversation(conversation._id);
    res.status(201).json({
      conversation: serializeConversation(populated, req.user._id)
    });
  })
);

app.get(
  '/api/conversations/:id/messages',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const conversationId = req.params.id;

    const canAccess = await canAccessConversation(conversationId, req.user._id);
    if (!canAccess) {
      return res.status(403).json({ message: '您没有权限查看该会话' });
    }

    const messages = await Message.find({ conversation: conversationId })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('sender')
      .populate('conversation');

    res.json({
      messages: messages
        .reverse()
        .map((message) => serializeMessage(message))
    });
  })
);

app.post(
  '/api/conversations/:id/messages',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const conversationId = req.params.id;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: '消息内容不能为空' });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id
    });

    if (!conversation) {
      return res.status(403).json({ message: '您没有权限发送该消息' });
    }

    const message = await Message.create({
      conversation: conversation._id,
      sender: req.user._id,
      content: content.trim()
    });

    const populatedMessage = await message.populate('sender conversation');

    conversation.lastMessage = populatedMessage._id;
    conversation.updatedAt = new Date();
    await conversation.save();

    const populatedConversation = await loadConversation(conversation._id);

    const serializedMessage = serializeMessage(populatedMessage);
    emitConversationUpdate(populatedConversation, serializedMessage);
    io.to(conversation._id.toString()).emit('messageCreated', serializedMessage);

    res.status(201).json({ message: serializedMessage });
  })
);

// --------------------
// Admin analytics
// --------------------
app.get(
  '/api/admin/overview',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const past24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      userCount,
      newUsers24h,
      conversationCount,
      groupCount,
      privateCount,
      messageCount,
      messagesToday,
      pendingRequests,
      activeUsersAggregation,
      friendshipAggregation
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: past24Hours } }),
      Conversation.countDocuments(),
      Conversation.countDocuments({ type: 'group' }),
      Conversation.countDocuments({ type: 'private' }),
      Message.countDocuments(),
      Message.countDocuments({ createdAt: { $gte: startOfDay } }),
      FriendRequest.countDocuments({ status: 'pending' }),
      Message.aggregate([
        { $match: { createdAt: { $gte: past24Hours } } },
        { $group: { _id: '$sender' } },
        { $count: 'count' }
      ]),
      User.aggregate([
        { $project: { friendCount: { $size: '$friends' } } },
        { $group: { _id: null, total: { $sum: '$friendCount' } } }
      ])
    ]);

    const activeUsers24h = activeUsersAggregation[0]?.count || 0;
    const totalFriendLinks = friendshipAggregation[0]?.total || 0;
    const friendshipCount = Math.floor(totalFriendLinks / 2);

    res.json({
      overview: {
        userCount,
        newUsers24h,
        conversationCount,
        groupCount,
        privateCount,
        messageCount,
        messagesToday,
        pendingRequests,
        activeUsers24h,
        friendshipCount
      }
    });
  })
);

app.get(
  '/api/admin/users',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const [users, lastMessages] = await Promise.all([
      User.find({}, 'username displayName createdAt updatedAt friends').sort({
        createdAt: -1
      }),
      Message.aggregate([
        {
          $group: {
            _id: '$sender',
            lastMessageAt: { $max: '$createdAt' }
          }
        }
      ])
    ]);

    const lastMessageMap = new Map(
      lastMessages.map((entry) => [entry._id.toString(), entry.lastMessageAt])
    );

    const data = users.map((user) => ({
      id: user._id.toString(),
      username: user.username,
      displayName: user.displayName || user.username,
      friendCount: user.friends.length,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastMessageAt: lastMessageMap.get(user._id.toString()) || null
    }));

    res.json({ users: data });
  })
);

app.get(
  '/api/admin/conversations',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const [conversations, messageStats] = await Promise.all([
      Conversation.find()
        .populate('participants', 'username displayName')
        .sort({ updatedAt: -1 }),
      Message.aggregate([
        {
          $group: {
            _id: '$conversation',
            messageCount: { $sum: 1 },
            lastActivityAt: { $max: '$createdAt' }
          }
        }
      ])
    ]);

    const statsMap = new Map(
      messageStats.map((stat) => [stat._id.toString(), stat])
    );

    const data = conversations.map((conversation) => {
      const stats = statsMap.get(conversation._id.toString()) || {};
      const participantNames = conversation.participants
        .map((participant) => participant.displayName || participant.username)
        .filter(Boolean);
      const baseTitle =
        conversation.type === 'group'
          ? conversation.name?.trim() || participantNames.join('、')
          : participantNames.join('、');
      const title = baseTitle || `会话 ${conversation._id.toString().slice(-6)}`;

      return {
        id: conversation._id.toString(),
        title,
        type: conversation.type,
        participantCount: conversation.participants.length,
        messageCount: stats.messageCount || 0,
        updatedAt: conversation.updatedAt,
        lastActivityAt: stats.lastActivityAt || conversation.updatedAt
      };
    });

    res.json({ conversations: data });
  })
);

// --------------------
// Socket.io handling
// --------------------
const activeUsers = new Map(); // userId -> Set<socket>

io.on('connection', (socket) => {
  socket.on('authenticate', async (token) => {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(payload.id);
      if (!user) {
        socket.emit('unauthorized');
        return;
      }

      socket.user = user;
      const userId = user._id.toString();
      if (!activeUsers.has(userId)) {
        activeUsers.set(userId, new Set());
      }
      activeUsers.get(userId).add(socket);
      socket.emit('authenticated', serializeUser(user));
    } catch (error) {
      socket.emit('unauthorized');
    }
  });

  socket.on('joinConversation', async (conversationId) => {
    if (!socket.user) return;

    const canAccess = await canAccessConversation(conversationId, socket.user._id);
    if (!canAccess) return;

    socket.join(conversationId);
  });

  socket.on('leaveConversation', (conversationId) => {
    socket.leave(conversationId);
  });

  socket.on('disconnect', () => {
    if (socket.user) {
      const userId = socket.user._id.toString();
      const sockets = activeUsers.get(userId);
      if (sockets) {
        sockets.delete(socket);
        if (sockets.size === 0) {
          activeUsers.delete(userId);
        }
      }
    }
  });
});

// --------------------
// Error handling
// --------------------
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ message: '服务器内部错误' });
});

app.get('/health', (req, res) => res.send('SafeChat backend is running'));

async function connectDatabase(uri = MONGODB_URI) {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (mongoose.connection.readyState === 2) {
    await new Promise((resolve, reject) => {
      mongoose.connection.once('connected', resolve);
      mongoose.connection.once('error', reject);
    });
    return mongoose.connection;
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000
  });
  console.log('MongoDB 连接成功');
  return mongoose.connection;
}

async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

async function start({ mongoUri = MONGODB_URI, port = PORT, host = '0.0.0.0' } = {}) {
  await connectDatabase(mongoUri);

  if (server.listening) {
    return server;
  }

  await new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off('listening', onListening);
      reject(error);
    };

    const onListening = () => {
      server.off('error', onError);
      console.log(`后端服务监听端口 ${port}`);
      resolve();
    };

    server.once('error', onError);
    server.listen(port, host, onListening);
  });

  return server;
}

async function stop() {
  if (server.listening) {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  if (io) {
    io.disconnectSockets(true);
    io.removeAllListeners();
  }

  await disconnectDatabase();
}

if (require.main === module) {
  start().catch((error) => {
    console.error('无法启动后端服务:', error);
    process.exit(1);
  });
}

module.exports = {
  app,
  server,
  io,
  start,
  stop,
  connectDatabase,
  disconnectDatabase
};
