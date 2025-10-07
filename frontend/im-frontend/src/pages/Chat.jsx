import { useEffect, useState } from 'react';
import axios from 'axios';
import { getSocket } from '../socket';

export default function Chat({ user }) {
  const [contacts, setContacts] = useState([]);
  const [current, setCurrent] = useState(null);
  const [text, setText] = useState('');
  const [msgs, setMsgs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    // Load contacts
    axios.get(import.meta.env.VITE_API_BASE + '/api/auth/all', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      setContacts(res.data.filter(u => u.id !== user.id));
    }).catch(err => {
      console.error('Failed to load contacts:', err);
    });

    // Setup socket listeners
    const socket = getSocket();
    socket.on('private_message', msg => {
      if (msg.from === current?.id) {
        setMsgs(prev => [...prev, { sender_id: msg.from, content: msg.content, type: msg.type || 'text' }]);
      }
    });

    return () => {
      socket.off('private_message');
    };
  }, [current, user.id]);

  useEffect(() => {
    if (current) {
      loadMessageHistory();
    } else {
      setMsgs([]);
    }
  }, [current]);

  const loadMessageHistory = async () => {
    if (!current) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE}/api/messages/${current.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMsgs(res.data);
    } catch (err) {
      console.error('Failed to load message history:', err);
    } finally {
      setLoading(false);
    }
  };

  const send = () => {
    if (!text.trim() || !current) return;
    const socket = getSocket();
    socket.emit('private_message', { 
      toUserId: current.id, 
      content: text,
      type: 'text'
    });
    setMsgs(prev => [...prev, { sender_id: user.id, content: text, type: 'text' }]);
    setText('');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !current) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('文件大小不能超过5MB');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE}/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const fileType = file.type.startsWith('image/') ? 'image' : 
                       file.type.startsWith('audio/') ? 'audio' : 'file';
      
      const socket = getSocket();
      socket.emit('private_message', {
        toUserId: current.id,
        content: res.data.url,
        type: fileType
      });

      setMsgs(prev => [...prev, { 
        sender_id: user.id, 
        content: res.data.url, 
        type: fileType 
      }]);
    } catch (err) {
      console.error('File upload failed:', err);
      alert('文件上传失败');
    }

    e.target.value = '';
  };

  const [showSidebar, setShowSidebar] = useState(true);

  return (
    <div style={{
      display: 'flex', height: '100vh', fontFamily: 'Arial',
      background: '#f5f5f5',
      position: 'relative'
    }}>
      <aside style={{
        width: 260, 
        borderRight: '1px solid #ddd', 
        background: '#fff',
        padding: 10, 
        overflowY: 'auto',
        position: window.innerWidth < 768 ? 'fixed' : 'relative',
        left: window.innerWidth < 768 && !showSidebar ? '-260px' : '0',
        transition: 'left 0.3s ease',
        zIndex: 100,
        height: '100vh'
      }}>
        <h3 style={{ color: '#d0021b', marginBottom: 10 }}>联系人</h3>
        {contacts.length === 0 && (
          <div style={{ padding: 12, color: '#999', textAlign: 'center' }}>
            暂无联系人
          </div>
        )}
        {contacts.map(c => (
          <div key={c.id}
            onClick={() => { 
              setCurrent(c); 
              if (window.innerWidth < 768) setShowSidebar(false);
            }}
            style={{
              padding: 12, cursor: 'pointer', 
              background: current?.id === c.id ? '#ffeaea' : 'transparent',
              borderBottom: '1px solid #eee', color: '#333',
              borderRadius: 6,
              marginBottom: 4
            }}>
            <div style={{ fontWeight: current?.id === c.id ? 'bold' : 'normal' }}>
              {c.nickname || c.username}
            </div>
            <div style={{ fontSize: 12, color: '#999' }}>
              @{c.username}
            </div>
          </div>
        ))}
      </aside>
      {window.innerWidth < 768 && !showSidebar && (
        <button
          onClick={() => setShowSidebar(true)}
          style={{
            position: 'fixed',
            left: 10,
            top: 10,
            zIndex: 99,
            padding: '8px 12px',
            background: '#d0021b',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '20px'
          }}
        >
          ☰
        </button>
      )}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header style={{ 
          padding: '12px 16px', 
          borderBottom: '1px solid #ddd', 
          background: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <strong style={{ color: '#d0021b', fontSize: '16px' }}>
            {current ? (current.nickname || current.username) : '请选择联系人'}
          </strong>
          <button
            onClick={() => {
              localStorage.removeItem('token');
              window.location.reload();
            }}
            style={{
              padding: '6px 12px',
              background: '#f5f5f5',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            退出登录
          </button>
        </header>
        <section style={{
          flex: 1, padding: 12, overflowY: 'auto', background: '#f5f5f5'
        }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>
              加载消息中...
            </div>
          )}
          {!loading && current && msgs.length === 0 && (
            <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>
              暂无消息，开始聊天吧
            </div>
          )}
          {!loading && !current && (
            <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>
              请选择一个联系人开始聊天
            </div>
          )}
          {!loading && msgs.map((m, i) => {
            const isMe = m.sender_id === user.id;
            const msgType = m.type || 'text';
            return (
              <div key={i} style={{
                textAlign: isMe ? 'right' : 'left',
                marginBottom: 12,
                display: 'flex',
                flexDirection: isMe ? 'row-reverse' : 'row',
                alignItems: 'flex-start'
              }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: isMe ? '#d0021b' : '#999',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  flexShrink: 0,
                  margin: isMe ? '0 0 0 8px' : '0 8px 0 0'
                }}>
                  {isMe ? user.username[0].toUpperCase() : (current?.username[0] || 'U').toUpperCase()}
                </div>
                <div style={{
                  display: 'inline-block', 
                  padding: msgType === 'image' ? '4px' : '10px 14px',
                  background: isMe ? '#d0021b' : '#fff',
                  color: isMe ? '#fff' : '#333',
                  borderRadius: 10, 
                  maxWidth: '60%', 
                  wordBreak: 'break-word',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}>
                  {msgType === 'text' && m.content}
                  {msgType === 'image' && (
                    <img 
                      src={`${import.meta.env.VITE_API_BASE}${m.content}`}
                      alt="图片消息"
                      style={{ 
                        maxWidth: 300, 
                        maxHeight: 300, 
                        borderRadius: 6,
                        display: 'block'
                      }}
                      onClick={() => window.open(`${import.meta.env.VITE_API_BASE}${m.content}`, '_blank')}
                    />
                  )}
                  {msgType === 'audio' && (
                    <audio 
                      controls 
                      src={`${import.meta.env.VITE_API_BASE}${m.content}`}
                      style={{ maxWidth: 300 }}
                    />
                  )}
                  {msgType === 'file' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>📄</span>
                      <a 
                        href={`${import.meta.env.VITE_API_BASE}${m.content}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: isMe ? '#fff' : '#d0021b', textDecoration: 'underline' }}
                      >
                        查看文件
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </section>
        <footer style={{
          padding: 10, borderTop: '1px solid #ddd', background: '#fff',
          display: 'flex', flexDirection: 'column', gap: 10
        }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button 
              onClick={() => document.getElementById('fileInput').click()}
              disabled={!current}
              style={{
                padding: '8px 12px',
                background: '#f5f5f5',
                border: '1px solid #ccc',
                borderRadius: 6,
                cursor: current ? 'pointer' : 'not-allowed',
                opacity: current ? 1 : 0.5
              }}
              title="发送文件"
            >
              📎
            </button>
            <input 
              id="fileInput"
              type="file"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
              accept="image/*,audio/*,.pdf,.doc,.docx,.txt"
            />
          </div>
          <div style={{ display: 'flex' }}>
            <input 
              value={text} 
              onChange={e => setText(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && send()}
              disabled={!current}
              placeholder={current ? "输入消息..." : "请先选择联系人"}
              style={{
                flex: 1, padding: 10, fontSize: 16,
                border: '1px solid #ccc', borderRadius: 6
              }} 
            />
            <button 
              onClick={send} 
              disabled={!current || !text.trim()}
              style={{
                padding: '10px 18px', marginLeft: 10,
                background: current && text.trim() ? '#d0021b' : '#ccc',
                color: '#fff', border: 'none',
                borderRadius: 6, fontWeight: 'bold',
                cursor: current && text.trim() ? 'pointer' : 'not-allowed'
              }}
            >
              发送
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
}
