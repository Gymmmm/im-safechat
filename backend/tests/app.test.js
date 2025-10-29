const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const {
  app,
  connectDatabase,
  disconnectDatabase
} = require('../app');

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

describe('SafeChat REST API', () => {
  let mongoServer;
  let skipAll = false;

  beforeAll(async () => {
    try {
      mongoServer = await MongoMemoryServer.create({
        binary: {
          version: '7.0.5',
          platform: 'linux',
          arch: 'x86_64',
          os: { dist: 'ubuntu', release: '20.04' }
        }
      });
      await connectDatabase(mongoServer.getUri());
    } catch (error) {
      if (String(error?.message || error).includes('Status Code is 403')) {
        skipAll = true;
        console.warn(
          '跳过集成测试：无法从 fastdl.mongodb.org 下载测试所需的 MongoDB 二进制文件。'
        );
      } else {
        throw error;
      }
    }
  });

  afterAll(async () => {
    if (skipAll) {
      return;
    }
    await disconnectDatabase();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    if (skipAll) {
      return;
    }
    const { db } = mongoose.connection;
    const collections = await db.collections();
    await Promise.all(collections.map((collection) => collection.deleteMany({})));
  });

  test('supports registration, login, friends and conversations workflow', async () => {
    if (skipAll) {
      return;
    }

    const registerAlice = await request(app)
      .post('/api/register')
      .send({
        username: 'alice',
        password: 'alice-pass',
        displayName: 'Alice'
      })
      .expect(201);

    const registerBob = await request(app)
      .post('/api/register')
      .send({
        username: 'bob',
        password: 'bob-pass',
        displayName: 'Bob'
      })
      .expect(201);

    const loginAlice = await request(app)
      .post('/api/login')
      .send({ username: 'alice', password: 'alice-pass' })
      .expect(200);

    expect(loginAlice.body).toHaveProperty('token');
    expect(loginAlice.body.user.username).toBe('alice');

    const aliceToken = loginAlice.body.token;
    const bobToken = registerBob.body.token;

    const friendRequest = await request(app)
      .post('/api/friends/requests')
      .set(authHeader(aliceToken))
      .send({ toUserId: registerBob.body.user.id })
      .expect(201);

    const requestsForBob = await request(app)
      .get('/api/friends/requests')
      .set(authHeader(bobToken))
      .expect(200);

    expect(requestsForBob.body.incoming).toHaveLength(1);

    await request(app)
      .post(`/api/friends/requests/${friendRequest.body.request.id}/accept`)
      .set(authHeader(bobToken))
      .expect(200);

    const aliceFriends = await request(app)
      .get('/api/friends')
      .set(authHeader(aliceToken))
      .expect(200);

    expect(aliceFriends.body.friends.map((f) => f.username)).toContain('bob');

    const privateConversation = await request(app)
      .post('/api/conversations/private')
      .set(authHeader(aliceToken))
      .send({ userId: registerBob.body.user.id })
      .expect(201);

    const privateConversationId = privateConversation.body.conversation.id;

    await request(app)
      .post(`/api/conversations/${privateConversationId}/messages`)
      .set(authHeader(aliceToken))
      .send({ content: 'Hi Bob, ready for the meeting?' })
      .expect(201);

    await request(app)
      .get(`/api/conversations/${privateConversationId}/messages`)
      .set(authHeader(bobToken))
      .expect(200);

    const groupConversation = await request(app)
      .post('/api/conversations/group')
      .set(authHeader(bobToken))
      .send({
        name: '收藏家交流群',
        memberIds: [registerAlice.body.user.id]
      })
      .expect(201);

    await request(app)
      .post(`/api/conversations/${groupConversation.body.conversation.id}/messages`)
      .set(authHeader(bobToken))
      .send({ content: '欢迎加入收藏家群！' })
      .expect(201);

    const conversationsForAlice = await request(app)
      .get('/api/conversations')
      .set(authHeader(aliceToken))
      .expect(200);

    const conversationTypes = conversationsForAlice.body.conversations.map(
      (conversation) => conversation.type
    );

    expect(conversationTypes).toEqual(expect.arrayContaining(['private', 'group']));
  });

  test('provides aggregated analytics through admin endpoints', async () => {
    if (skipAll) {
      return;
    }

    const alice = await request(app)
      .post('/api/register')
      .send({ username: 'alice', password: 'alice-pass', displayName: 'Alice' })
      .expect(201);

    const bob = await request(app)
      .post('/api/register')
      .send({ username: 'bob', password: 'bob-pass', displayName: 'Bob' })
      .expect(201);

    await request(app)
      .post('/api/friends/requests')
      .set(authHeader(alice.body.token))
      .send({ toUserId: bob.body.user.id })
      .expect(201);

    const bobRequests = await request(app)
      .get('/api/friends/requests')
      .set(authHeader(bob.body.token))
      .expect(200);

    const requestId = bobRequests.body.incoming[0].id;

    await request(app)
      .post(`/api/friends/requests/${requestId}/accept`)
      .set(authHeader(bob.body.token))
      .expect(200);

    const conversation = await request(app)
      .post('/api/conversations/private')
      .set(authHeader(alice.body.token))
      .send({ userId: bob.body.user.id })
      .expect(201);

    await request(app)
      .post(`/api/conversations/${conversation.body.conversation.id}/messages`)
      .set(authHeader(alice.body.token))
      .send({ content: 'Hello analytics!' })
      .expect(201);

    const overview = await request(app)
      .get('/api/admin/overview')
      .set(authHeader(alice.body.token))
      .expect(200);

    expect(overview.body.overview.userCount).toBe(2);
    expect(overview.body.overview.conversationCount).toBeGreaterThanOrEqual(1);
    expect(overview.body.overview.messageCount).toBeGreaterThanOrEqual(1);

    const users = await request(app)
      .get('/api/admin/users')
      .set(authHeader(alice.body.token))
      .expect(200);

    expect(users.body.users).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ username: 'alice', friendCount: 1 }),
        expect.objectContaining({ username: 'bob', friendCount: 1 })
      ])
    );

    const conversations = await request(app)
      .get('/api/admin/conversations')
      .set(authHeader(alice.body.token))
      .expect(200);

    expect(conversations.body.conversations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'private', messageCount: 1 })
      ])
    );
  });
});
