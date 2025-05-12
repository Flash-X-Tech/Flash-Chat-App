import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import EmojiPicker from 'emoji-picker-react';
import './App.css';

const socket = io('https://chat-app-backend.onrender.com');

function App() {
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState({});
  const [groups, setGroups] = useState({});
  const [currentGroup, setCurrentGroup] = useState('general');
  const [isTyping, setIsTyping] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [joined, setJoined] = useState(false);
  const messagesEndRef = useRef(null);

  // Join chat
  const joinChat = () => {
    if (username.trim()) {
      socket.emit('join', username);
      setJoined(true);
    }
  };

  // Send message
  const sendMessage = (e) => {
    e.preventDefault();
    if (message.trim() && username) {
      socket.emit('sendMessage', { text: message });
      setMessage('');
      setShowEmojiPicker(false);
    }
  };

  // Change group
  const changeGroup = (groupName) => {
    socket.emit('changeGroup', groupName);
    setCurrentGroup(groupName);
    setMessages([]);
  };

  // Typing indicator
  const handleTyping = () => {
    socket.emit('typing');
  };

  // Add emoji to message
  const onEmojiClick = (emojiData) => {
    setMessage(prev => prev + emojiData.emoji);
  };

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Listen for messages
    socket.on('message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    // Listen for user list updates
    socket.on('userList', (userList) => {
      setUsers(userList);
    });

    // Listen for group list updates
    socket.on('groupList', (groupList) => {
      setGroups(groupList);
    });

    // Listen for typing indicator
    socket.on('typing', (typingUser) => {
      setIsTyping(typingUser);
      const timer = setTimeout(() => setIsTyping(''), 2000);
      return () => clearTimeout(timer);
    });

    return () => {
      socket.off('message');
      socket.off('userList');
      socket.off('groupList');
      socket.off('typing');
    };
  }, []);

  if (!joined) {
    return (
      <div className="join-container">
        <h1>Join Chat</h1>
        <input
          type="text"
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && joinChat()}
        />
        <button onClick={joinChat}>Join</button>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="sidebar">
        <div className="user-info">
          <h3>{username}</h3>
          <span className="status online">Online</span>
        </div>
        
        <div className="groups">
          <h3>Groups</h3>
          <ul>
            {Object.entries(groups).map(([key, group]) => (
              <li 
                key={key} 
                className={currentGroup === key ? 'active' : ''}
                onClick={() => changeGroup(key)}
              >
                {group.name} ({group.members.size})
              </li>
            ))}
          </ul>
        </div>
        
        <div className="users">
          <h3>Online Users</h3>
          <ul>
            {Object.entries(users).map(([id, user]) => (
              <li key={id}>
                {user.username} <span className={`status ${user.status}`}>{user.status}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      <div className="chat-area">
        <div className="chat-header">
          <h2>{groups[currentGroup]?.name || 'Chat'}</h2>
        </div>
        
        <div className="messages">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.sender === username ? 'sent' : 'received'}`}>
              <div className="message-sender">{msg.sender}</div>
              <div className="message-text">{msg.text}</div>
              <div className="message-time">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="typing-indicator">
              {isTyping} is typing...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <form onSubmit={sendMessage} className="message-form">
          <div className="emoji-picker-container">
            <button 
              type="button" 
              className="emoji-btn"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              😊
            </button>
            {showEmojiPicker && (
              <div className="emoji-picker">
                <EmojiPicker onEmojiClick={onEmojiClick} />
              </div>
            )}
          </div>
          <input
            type="text"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              handleTyping();
            }}
            placeholder="Type a message..."
          />
          <button type="submit">Send</button>
        </form>
      </div>
    </div>
  );
}

export default App;
