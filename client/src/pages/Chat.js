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
import './Chat.css';

const Chat = ({ isEmbedded = false }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    // Create query for messages (exclude announcements)
    const messagesQuery = query(
      collection(db, 'messages'),
      where('isAnnouncement', '!=', true),
      orderBy('isAnnouncement', 'asc'),
      orderBy('createdAt', 'asc'),
      limit(100) // Limit to last 100 messages
    );

    // Listen for real-time updates
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

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || sending || !user) return;
    
    setSending(true);
    
    try {
      await addDoc(collection(db, 'messages'), {
        text: newMessage.trim(),
        createdAt: serverTimestamp(),
        userId: user.id,
        userName: user.name || user.email.split('@')[0],
        userEmail: user.email,
        isAnnouncement: false
      });
      
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return '';
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const today = new Date();
      const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      if (messageDate.getTime() === todayDate.getTime()) {
        return 'Today';
      } else {
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });
      }
    } catch (error) {
      return '';
    }
  };

  // Group messages by date
  const groupMessagesByDate = (messages) => {
    const groups = [];
    let currentDate = null;
    let currentGroup = [];

    messages.forEach((message) => {
      const messageDate = formatDate(message.createdAt);
      
      if (messageDate !== currentDate) {
        if (currentGroup.length > 0) {
          groups.push({ date: currentDate, messages: currentGroup });
        }
        currentDate = messageDate;
        currentGroup = [message];
      } else {
        currentGroup.push(message);
      }
    });

    if (currentGroup.length > 0) {
      groups.push({ date: currentDate, messages: currentGroup });
    }

    return groups;
  };

  if (loading) {
    return (
      <div className={`chat-container ${isEmbedded ? 'chat-embedded' : ''}`}>
        <div className="chat-header">
          <h1>💬 Team Chat</h1>
          <div className="chat-status">Connecting...</div>
        </div>
        <div className="loading-chat">
          <div className="spinner"></div>
          <p>Loading messages...</p>
        </div>
      </div>
    );
  }

  if (!db) {
    return (
      <div className={`chat-container ${isEmbedded ? 'chat-embedded' : ''}`}>
        <div className="chat-header">
          <h1>💬 Team Chat</h1>
          <div className="chat-status offline">Offline</div>
        </div>
        <div className="chat-error">
          <p>Chat is currently unavailable. Please check your connection.</p>
        </div>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className={`chat-container ${isEmbedded ? 'chat-embedded' : ''}`}>
      <div className="chat-header">
        <h1>💬 Team Chat</h1>
        <div className="chat-status online">
          {messages.length} messages • Online
        </div>
      </div>

      <div className="chat-messages">
        {messageGroups.length === 0 ? (
          <div className="no-messages">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messageGroups.map((group, groupIndex) => (
            <div key={groupIndex}>
              <div className="date-separator">
                <span>{group.date}</span>
              </div>
              {group.messages.map((message) => (
                <div
                  key={message.id}
                  className={`message ${message.userId === user?.id ? 'own-message' : 'other-message'}`}
                >
                  <div className="message-content">
                    <div className="message-header">
                      <span className="message-author">
                        {message.userId === user?.id ? 'You' : message.userName}
                      </span>
                      <span className="message-time">
                        {formatTime(message.createdAt)}
                      </span>
                    </div>
                    <div className="message-text">
                      {message.text}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="chat-input-form">
        <div className="input-container">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            disabled={sending}
            maxLength={500}
            className="message-input"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="send-button"
          >
            {sending ? '📤' : '🚀'}
          </button>
        </div>
        <div className="input-info">
          <span>Chatting as: {user?.name || user?.email}</span>
          <span>{newMessage.length}/500</span>
        </div>
      </form>
    </div>
  );
};

export default Chat;