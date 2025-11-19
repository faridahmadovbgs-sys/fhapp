import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import './ChatPopup.css';

const ChatPopup = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  const messagesEndRef = useRef(null);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen for messages
  useEffect(() => {
    if (!db || !user) return;

    setLoading(true);
    setError('');

    const messagesRef = collection(db, 'messages');
    const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'), limit(100));

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const messagesData = [];
        let newUnreadCount = 0;

        snapshot.forEach((doc) => {
          const data = doc.data();
          messagesData.push({
            id: doc.id,
            ...data
          });

          // Count unread messages (messages from others after popup was last opened)
          if (!isOpen && data.userId !== user.id) {
            newUnreadCount++;
          }
        });

        setMessages(messagesData);
        if (!isOpen) {
          setUnreadCount(newUnreadCount);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching messages:', error);
        setError('Failed to load messages');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, isOpen]);

  // Send message
  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !user || !db) return;

    try {
      await addDoc(collection(db, 'messages'), {
        text: newMessage.trim(),
        userId: user.id,
        userEmail: user.email,
        userName: user.name || user.email.split('@')[0],
        timestamp: serverTimestamp()
      });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
    }
  };

  // Toggle popup
  const togglePopup = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setUnreadCount(0); // Reset unread count when opening
    }
  };

  // Group messages by date
  const groupMessagesByDate = (messages) => {
    const groups = {};
    
    messages.forEach(message => {
      if (message.timestamp) {
        const date = message.timestamp.toDate().toDateString();
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(message);
      }
    });
    
    return groups;
  };

  const messageGroups = groupMessagesByDate(messages);

  if (!user) return null;

  return (
    <>
      {/* Chat Toggle Button */}
      <div className={`chat-toggle ${isOpen ? 'active' : ''}`} onClick={togglePopup}>
        <span className="chat-icon">💬</span>
        {unreadCount > 0 && !isOpen && (
          <div className="unread-badge">{unreadCount > 99 ? '99+' : unreadCount}</div>
        )}
      </div>

      {/* Chat Popup */}
      <div className={`chat-popup ${isOpen ? 'open' : ''}`}>
        <div className="chat-popup-header">
          <h3>Live Chat</h3>
          <button className="close-chat" onClick={togglePopup}>×</button>
        </div>

        <div className="chat-popup-messages">
          {loading ? (
            <div className="loading-messages">
              <div className="spinner"></div>
              <p>Loading messages...</p>
            </div>
          ) : error ? (
            <div className="chat-error">
              <p>⚠️ {error}</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="no-messages">
              <p>💬 No messages yet. Start the conversation!</p>
            </div>
          ) : (
            Object.entries(messageGroups).map(([date, dayMessages]) => (
              <div key={date}>
                <div className="date-separator">
                  <span>{new Date(date).toLocaleDateString()}</span>
                </div>
                {dayMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`message ${message.userId === user.id ? 'own-message' : 'other-message'}`}
                  >
                    <div className="message-content">
                      <div className="message-header">
                        <span className="message-author">
                          {message.userId === user.id ? 'You' : message.userName}
                        </span>
                        <span className="message-time">
                          {message.timestamp?.toDate().toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div className="message-text">{message.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <form className="chat-popup-input" onSubmit={sendMessage}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            maxLength={500}
            disabled={loading}
            className="message-input"
          />
          <button type="submit" disabled={!newMessage.trim() || loading} className="send-button">
            ➤
          </button>
        </form>
        
        <div className="input-info">
          <span>{newMessage.length}/500 characters</span>
        </div>
      </div>
    </>
  );
};

export default ChatPopup;