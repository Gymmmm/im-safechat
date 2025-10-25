import { useState } from 'react';
import axios from 'axios';

export default function Login({ onLogin, onRegisterClick }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  async function login() {
    try {
      const { data } = await axios.post(import.meta.env.VITE_API_BASE + '/auth/login', {
        username, password
      });
      localStorage.setItem('token', data.token);
      onLogin(data.user);
    } catch (err) {
      alert('登 录 失 败：' + err.response?.data?.message || '未知错误');
    }
  }

  return (
    <div style={{
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      justifyContent: 'center', 
      height: '100vh', 
      background: 'linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%)'
    }}>
      <div style={{
        background: '#fff',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        width: '320px'
      }}>
        <h2 style={{ 
          color: '#d0021b', 
          textAlign: 'center', 
          marginBottom: '30px',
          fontSize: '24px',
          fontWeight: 'bold'
        }}>
          登 录
        </h2>
        <input 
          placeholder="用户名" 
          value={username} 
          onChange={e => setUsername(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && login()}
          style={{ 
            marginBottom: 15, 
            padding: '12px', 
            width: '100%',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '14px',
            boxSizing: 'border-box'
          }} 
        />
        <input 
          placeholder="密 码" 
          type="password" 
          value={password} 
          onChange={e => setPassword(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && login()}
          style={{ 
            marginBottom: 20, 
            padding: '12px', 
            width: '100%',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '14px',
            boxSizing: 'border-box'
          }} 
        />
        <button 
          onClick={login} 
          style={{ 
            padding: '12px 20px', 
            backgroundColor: '#d0021b', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '6px', 
            marginBottom: 15,
            width: '100%',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          登 录
        </button>
        <div style={{ textAlign: 'center' }}>
          <a 
            href="#" 
            onClick={(e) => { e.preventDefault(); onRegisterClick(); }} 
            style={{ 
              color: '#666',
              textDecoration: 'none',
              fontSize: '14px'
            }}
          >
            没 有 账 号？去 注 册
          </a>
        </div>
      </div>
    </div>
  );
}
