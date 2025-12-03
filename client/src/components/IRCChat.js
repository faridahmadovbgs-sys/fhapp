import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  addDoc, 
  query, 
  where,
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  limit,
  updateDoc,
  doc,
  deleteDoc,
  getDocs
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import './IRCChat.css';

const IRCChat = ({ channelName = 'general' }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [nickname, setNickname] = useState('');
  const [showUserList, setShowUserList] = useState(true);
  const [systemMessages, setSystemMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const { user } = useAuth();

  // Initialize nickname
  useEffect(() => {
    if (user) {
      const defaultNick = user.name || user.email.split('@')[0];
      setNickname(defaultNick);
      updateUserPresence(defaultNick, 'online');
    }

    return () => {
      if (user && nickname) {
        updateUserPresence(nickname, 'offline');
      }
    };
  }, [user]);

  // Update user presence
  const updateUserPresence = async (nick, status) => {
    if (!db || !user) return;

    try {
      const presenceRef = collection(db, 'chatPresence');
      const q = query(presenceRef, where('userId', '==', user.id), where('channel', '==', channelName));
      const snapshot = await getDocs(q);

      if (status === 'online') {
        if (snapshot.empty) {
          await addDoc(presenceRef, {
            userId: user.id,
            nickname: nick,
            channel: channelName,
            status: 'online',
            lastSeen: serverTimestamp()
          });
        } else {
          const docRef = doc(db, 'chatPresence', snapshot.docs[0].id);
          await updateDoc(docRef, {
            nickname: nick,
            status: 'online',
            lastSeen: serverTimestamp()
          });
        }
      } else {
        snapshot.forEach(async (document) => {
          await deleteDoc(doc(db, 'chatPresence', document.id));
        });
      }
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  };

  // Listen for online users
  useEffect(() => {
    if (!db) return;

    const presenceQuery = query(
      collection(db, 'chatPresence'),
      where('channel', '==', channelName),
      where('status', '==', 'online')
    );

    const unsubscribe = onSnapshot(presenceQuery, (snapshot) => {
      const onlineUsers = [];
      snapshot.forEach((doc) => {
        onlineUsers.push({
          id: doc.id,
          ...doc.data()
        });
      });
      setUsers(onlineUsers);
    });

    return () => unsubscribe();
  }, [channelName]);

  // Listen for messages
  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    const messagesQuery = query(
      collection(db, 'ircMessages'),
      where('channel', '==', channelName),
      orderBy('timestamp', 'asc'),
      limit(200)
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData = [];
      snapshot.forEach((doc) => {
        messagesData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      setMessages(messagesData);
      setLoading(false);
    }, (error) => {
      console.error('Error listening to messages:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [channelName]);

  // Listen for typing indicators
  useEffect(() => {
    if (!db) return;

    const typingQuery = query(
      collection(db, 'chatTyping'),
      where('channel', '==', channelName)
    );

    const unsubscribe = onSnapshot(typingQuery, (snapshot) => {
      const typing = {};
      const now = Date.now();
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const timestamp = data.timestamp?.toMillis() || 0;
        
        // Only show typing if less than 3 seconds old
        if (now - timestamp < 3000 && data.userId !== user?.id) {
          typing[data.userId] = data.nickname;
        }
      });
      
      setTypingUsers(typing);
    });

    return () => unsubscribe();
  }, [channelName, user]);

  // Auto scroll
  useEffect(() => {
    scrollToBottom();
  }, [messages, systemMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Handle typing
  const handleTyping = async () => {
    if (!user || !db) return;

    try {
      const typingRef = collection(db, 'chatTyping');
      const q = query(typingRef, where('userId', '==', user.id), where('channel', '==', channelName));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        await addDoc(typingRef, {
          userId: user.id,
          nickname: nickname,
          channel: channelName,
          timestamp: serverTimestamp()
        });
      } else {
        const docRef = doc(db, 'chatTyping', snapshot.docs[0].id);
        await updateDoc(docRef, {
          timestamp: serverTimestamp()
        });
      }

      // Clear typing after 2 seconds
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(async () => {
        const q = query(typingRef, where('userId', '==', user.id), where('channel', '==', channelName));
        const snapshot = await getDocs(q);
        snapshot.forEach(async (document) => {
          await deleteDoc(doc(db, 'chatTyping', document.id));
        });
      }, 2000);
    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  };

  // Process IRC commands
  const processCommand = async (command) => {
    const parts = command.split(' ');
    const cmd = parts[0].toLowerCase();

    switch (cmd) {
      case '/nick':
        if (parts[1]) {
          const newNick = parts[1];
          setNickname(newNick);
          await updateUserPresence(newNick, 'online');
          addSystemMessage(`You are now known as ${newNick}`);
        }
        break;

      case '/me':
        const action = parts.slice(1).join(' ');
        await sendMessage(`* ${nickname} ${action}`, 'action');
        break;

      case '/clear':
        setSystemMessages([]);
        addSystemMessage('Chat cleared locally');
        break;

      case '/help':
        addSystemMessage('Available commands:');
        addSystemMessage('/nick [name] - Change your nickname');
        addSystemMessage('/me [action] - Send an action message');
        addSystemMessage('/clear - Clear chat history (local only)');
        addSystemMessage('/users - List online users');
        addSystemMessage('/help - Show this help');
        break;

      case '/users':
        addSystemMessage(`Online users (${users.length}):`);
        users.forEach(u => {
          addSystemMessage(`  • ${u.nickname}`);
        });
        break;

      default:
        addSystemMessage(`Unknown command: ${cmd}. Type /help for available commands.`);
    }
  };

  // Add system message (local only)
  const addSystemMessage = (text) => {
    setSystemMessages(prev => [...prev, {
      id: Date.now() + Math.random(),
      text,
      timestamp: new Date(),
      type: 'system'
    }]);
  };

  // Send message
  const sendMessage = async (text = newMessage, type = 'normal') => {
    if (!text.trim() || !user || !db) return;

    const messageText = text.trim();

    // Check for commands
    if (messageText.startsWith('/')) {
      await processCommand(messageText);
      setNewMessage('');
      return;
    }

    try {
      await addDoc(collection(db, 'ircMessages'), {
        text: messageText,
        userId: user.id,
        nickname: nickname,
        userEmail: user.email,
        channel: channelName,
        timestamp: serverTimestamp(),
        type: type
      });

      setNewMessage('');

      // Clear typing indicator
      const typingRef = collection(db, 'chatTyping');
      const q = query(typingRef, where('userId', '==', user.id), where('channel', '==', channelName));
      const snapshot = await getDocs(q);
      snapshot.forEach(async (document) => {
        await deleteDoc(doc(db, 'chatTyping', document.id));
      });
    } catch (error) {
      console.error('Error sending message:', error);
      addSystemMessage('Failed to send message. Please try again.');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    handleTyping();
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      return '';
    }
  };

  const typingUsersArray = Object.values(typingUsers);

  if (loading) {
    return (
      <div className="irc-chat-container">
        <div className="irc-loading">
          <div className="spinner"></div>
          <p>Connecting to #{channelName}...</p>
        </div>
      </div>
    );
  }

  // Combine messages and system messages
  const allMessages = [
    ...messages.map(m => ({ ...m, source: 'server' })),
    ...systemMessages.map(m => ({ ...m, source: 'local' }))
  ].sort((a, b) => {
    const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : a.timestamp?.getTime() || 0;
    const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : b.timestamp?.getTime() || 0;
    return timeA - timeB;
  });

  return (
    <div className="irc-chat-container">
      {/* Header */}
      <div className="irc-header">
        <div className="irc-channel-info">
          <span className="irc-channel-name">#{channelName}</span>
          <span className="irc-user-count">{users.length} users</span>
        </div>
        <div className="irc-controls">
          <button 
            className="irc-toggle-users"
            onClick={() => setShowUserList(!showUserList)}
            title={showUserList ? "Hide user list" : "Show user list"}
          >
            {showUserList ? '→' : '←'} Users
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="irc-main">
        {/* Messages area */}
        <div className="irc-messages-wrapper">
          <div className="irc-messages">
            {/* Welcome message */}
            <div className="irc-message system-message">
              <span className="irc-timestamp">[{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}]</span>
              <span className="irc-text">*** Welcome to #{channelName}! Type /help for commands.</span>
            </div>

            {/* Messages */}
            {allMessages.map((message) => {
              if (message.type === 'system' || message.source === 'local') {
                return (
                  <div key={message.id} className="irc-message system-message">
                    <span className="irc-timestamp">[{formatTime(message.timestamp)}]</span>
                    <span className="irc-text">*** {message.text}</span>
                  </div>
                );
              }

              if (message.type === 'action') {
                return (
                  <div key={message.id} className="irc-message action-message">
                    <span className="irc-timestamp">[{formatTime(message.timestamp)}]</span>
                    <span className="irc-text">{message.text}</span>
                  </div>
                );
              }

              return (
                <div 
                  key={message.id} 
                  className={`irc-message ${message.userId === user?.id ? 'own-message' : ''}`}
                >
                  <span className="irc-timestamp">[{formatTime(message.timestamp)}]</span>
                  <span className="irc-nickname" style={{ color: getUserColor(message.nickname) }}>
                    &lt;{message.nickname}&gt;
                  </span>
                  <span className="irc-text">{message.text}</span>
                </div>
              );
            })}

            {/* Typing indicators */}
            {typingUsersArray.length > 0 && (
              <div className="irc-message system-message typing-indicator">
                <span className="irc-text">
                  *** {typingUsersArray.join(', ')} {typingUsersArray.length === 1 ? 'is' : 'are'} typing...
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <form onSubmit={handleSubmit} className="irc-input-form">
            <div className="irc-input-wrapper">
              <span className="irc-input-prefix">&lt;{nickname}&gt;</span>
              <input
                type="text"
                value={newMessage}
                onChange={handleInputChange}
                placeholder="Type a message... (or /help for commands)"
                className="irc-input"
                maxLength={500}
                autoComplete="off"
              />
              <button 
                type="submit" 
                className="irc-send-button"
                disabled={!newMessage.trim()}
              >
                Send
              </button>
            </div>
          </form>
        </div>

        {/* User list sidebar */}
        {showUserList && (
          <div className="irc-users-sidebar">
            <div className="irc-users-header">
              Online Users ({users.length})
            </div>
            <div className="irc-users-list">
              {users.map((u) => (
                <div 
                  key={u.id} 
                  className={`irc-user ${u.userId === user?.id ? 'current-user' : ''}`}
                >
                  <span className="irc-user-status">●</span>
                  <span className="irc-user-nickname" style={{ color: getUserColor(u.nickname) }}>
                    {u.nickname}
                  </span>
                  {u.userId === user?.id && <span className="irc-you-badge">(you)</span>}
                </div>
              ))}
              {users.length === 0 && (
                <div className="irc-no-users">No users online</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Generate consistent color for usernames
const getUserColor = (nickname) => {
  const colors = [
    '#e74c3c', '#3498db', '#2ecc71', '#f39c12', 
    '#9b59b6', '#1abc9c', '#e67e22', '#34495e',
    '#16a085', '#27ae60', '#2980b9', '#8e44ad',
    '#c0392b', '#d35400', '#7f8c8d'
  ];
  
  let hash = 0;
  for (let i = 0; i < nickname.length; i++) {
    hash = nickname.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

export default IRCChat;
