import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  limit 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import './ChatPage.css';

const ChatPage = () => {
  const { user: currentUser } = useAuth();
  const [chatTab, setChatTab] = useState('public'); // 'public' or 'private'
  const [publicMessages, setPublicMessages] = useState([]);
  const [privateMessages, setPrivateMessages] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [users, setUsers] = useState([]);
  const messagesEndRef = useRef(null);

  // Fetch all users for private chat selection
  useEffect(() => {
    if (!db || !currentUser) return;

    const usersQuery = query(
      collection(db, 'users')
    );

    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      const usersList = [];
      snapshot.forEach((doc) => {
        const userData = doc.data();
        // Don't show self in user list
        if (userData.uid !== currentUser.id) {
          usersList.push({
            id: doc.id,
            uid: userData.uid,
            email: userData.email,
            name: userData.email?.split('@')[0] || 'User'
          });
        }
      });
      setUsers(usersList);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Fetch public messages
  useEffect(() => {
    if (!db) return;

    const messagesQuery = query(
      collection(db, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData = [];
      snapshot.forEach((doc) => {
        messagesData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      setPublicMessages(messagesData);
    });

    return () => unsubscribe();
  }, []);

  // Fetch private messages with selected user
  useEffect(() => {
    if (!db || !currentUser || !selectedUser) {
      setPrivateMessages([]);
      return;
    }

    // Create a consistent conversation ID
    const conversationId = [currentUser.id, selectedUser.uid].sort().join('-');

    const privateQuery = query(
      collection(db, `conversations/${conversationId}/messages`),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(privateQuery, (snapshot) => {
      const messagesData = [];
      snapshot.forEach((doc) => {
        messagesData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      setPrivateMessages(messagesData);
    }, (error) => {
      console.log('No private messages yet');
      setPrivateMessages([]);
    });

    return () => unsubscribe();
  }, [selectedUser, currentUser]);

  // Auto scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [publicMessages, privateMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendPublicMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !currentUser || !db) return;

    setSending(true);
    try {
      await addDoc(collection(db, 'messages'), {
        text: newMessage.trim(),
        createdAt: serverTimestamp(),
        userId: currentUser.id,
        userName: currentUser.name || currentUser.email.split('@')[0],
        userEmail: currentUser.email
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const sendPrivateMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !currentUser || !selectedUser || !db) return;

    setSending(true);
    try {
      const conversationId = [currentUser.id, selectedUser.uid].sort().join('-');
      
      await addDoc(collection(db, `conversations/${conversationId}/messages`), {
        text: newMessage.trim(),
        createdAt: serverTimestamp(),
        senderId: currentUser.id,
        senderName: currentUser.name || currentUser.email.split('@')[0],
        receiverId: selectedUser.uid
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending private message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="chat-page">
      <div className="chat-page-header">
        <h1>💬 Team Communication</h1>
        <p>Connect with your team through public chat and direct messages</p>
      </div>

      <div className="chat-page-container">
        <div className="chat-tabs-main">
          <button 
            className={`chat-tab-main ${chatTab === 'public' ? 'active' : ''}`}
            onClick={() => setChatTab('public')}
          >
            🌐 Public Chat
          </button>
          <button 
            className={`chat-tab-main ${chatTab === 'private' ? 'active' : ''}`}
            onClick={() => setChatTab('private')}
          >
            🔒 Direct Messages
          </button>
        </div>

        <div className="chat-content">
          {chatTab === 'public' ? (
            <div className="chat-public">
              <div className="chat-header">Public Team Chat</div>
              <div className="chat-messages">
                {publicMessages.length === 0 ? (
                  <div className="no-messages">Start the conversation!</div>
                ) : (
                  publicMessages.map((msg, index) => {
                    const showDate = index === 0 || 
                      formatDate(msg.createdAt) !== formatDate(publicMessages[index - 1].createdAt);
                    
                    return (
                      <div key={msg.id}>
                        {showDate && (
                          <div className="message-date-divider">
                            {formatDate(msg.createdAt)}
                          </div>
                        )}
                        <div className={`message-item ${msg.userId === currentUser?.id ? 'own' : 'other'}`}>
                          <div className="message-author">{msg.userName}</div>
                          <div className="message-bubble">{msg.text}</div>
                          <div className="message-time">{formatTime(msg.createdAt)}</div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={sendPublicMessage} className="chat-form">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  disabled={sending}
                  className="chat-input"
                />
                <button type="submit" disabled={sending || !newMessage.trim()} className="chat-send-btn">
                  {sending ? '...' : '➤'}
                </button>
              </form>
            </div>
          ) : (
            <div className="chat-private">
              <div className="users-list">
                <div className="users-header">Team Members</div>
                {users.length === 0 ? (
                  <div className="no-users">No team members available</div>
                ) : (
                  users.map((user) => (
                    <div
                      key={user.id}
                      className={`user-item ${selectedUser?.id === user.id ? 'selected' : ''}`}
                      onClick={() => setSelectedUser(user)}
                    >
                      <div className="user-avatar">{user.name.charAt(0).toUpperCase()}</div>
                      <div className="user-info">
                        <div className="user-name">{user.name}</div>
                        <div className="user-email">{user.email}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="chat-private-panel">
                {selectedUser ? (
                  <>
                    <div className="private-header">
                      <div className="private-user-info">
                        <div className="private-avatar">{selectedUser.name.charAt(0).toUpperCase()}</div>
                        <div>
                          <div className="private-user-name">{selectedUser.name}</div>
                          <div className="private-user-email">{selectedUser.email}</div>
                        </div>
                      </div>
                    </div>

                    <div className="chat-messages">
                      {privateMessages.length === 0 ? (
                        <div className="no-messages">No messages yet. Start the conversation!</div>
                      ) : (
                        privateMessages.map((msg, index) => {
                          const showDate = index === 0 || 
                            formatDate(msg.createdAt) !== formatDate(privateMessages[index - 1].createdAt);
                          
                          return (
                            <div key={msg.id}>
                              {showDate && (
                                <div className="message-date-divider">
                                  {formatDate(msg.createdAt)}
                                </div>
                              )}
                              <div className={`message-item ${msg.senderId === currentUser?.id ? 'own' : 'other'}`}>
                                <div className="message-bubble">{msg.text}</div>
                                <div className="message-time">{formatTime(msg.createdAt)}</div>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={sendPrivateMessage} className="chat-form">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        disabled={sending}
                        className="chat-input"
                      />
                      <button type="submit" disabled={sending || !newMessage.trim()} className="chat-send-btn">
                        {sending ? '...' : '➤'}
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="select-user">
                    <p>👈 Select a team member to start chatting</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
