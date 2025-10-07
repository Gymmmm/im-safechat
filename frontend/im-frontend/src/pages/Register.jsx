import { useState } from 'react';
import axios from 'axios';

export default function Register({ onRegister }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  async function register() {
    try {
      const res = await axios.post(import.meta.env.VITE_API_BASE + '/auth/register', {
        username, password
      });
      alert('注 册 成 功，请 登录');
      onRegister();
    } catch (err) {
      alert('注 册 失 败：' + err.response?.data?.message || '未知错误');
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
          注 册
        </h2>
        <input 
          placeholder="用户名" 
          value={username} 
          onChange={e => setUsername(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && register()}
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
          onKeyPress={e => e.key === 'Enter' && register()}
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
          onClick={register} 
          style={{ 
            padding: '12px 20px', 
            backgroundColor: '#d0021b', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '6px',
            width: '100%',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          注 册
        </button>
        <div style={{ textAlign: 'center', marginTop: 15 }}>
          <a 
            href="#" 
            onClick={(e) => { e.preventDefault(); onRegister(); }} 
            style={{ 
              color: '#666',
              textDecoration: 'none',
              fontSize: '14px'
            }}
          >
            已 有 账 号？去 登 录
          </a>
        </div>
      </div>
    </div>
  );
}
