import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { getUserMemberOrganizations } from '../services/organizationService';
import './ChatPopup.css';

const ChatPopup = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [userOrganization, setUserOrganization] = useState(null);
  const { user } = useAuth();
  const messagesEndRef = useRef(null);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch user's organization
  useEffect(() => {
    const fetchOrganization = async () => {
      if (!user?.id) return;
      
      try {
        const result = await getUserMemberOrganizations(user.id);
        if (result.organizations.length > 0) {
          setUserOrganization(result.organizations[0]);
        }
      } catch (error) {
        console.error('Error fetching user organization:', error);
      }
    };
    
    fetchOrganization();
  }, [user]);

  // Listen for messages
  useEffect(() => {
    if (!db || !user || !userOrganization) return;

    setLoading(true);
    setError('');

    const messagesRef = collection(db, 'messages');
    const messagesQuery = query(
      messagesRef, 
      where('organizationId', '==', userOrganization.id),
      orderBy('timestamp', 'asc'), 
      limit(100)
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const messagesData = [];
        let newUnreadCount = 0;

        snapshot.forEach((doc) => {
          const data = doc.data();
          messagesData.push({
            id: doc.id,
            ...data,
            reactions: data.reactions || {} // Ensure reactions field exists
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
        
        // Debug logging for reactions
        const messagesWithReactions = messagesData.filter(msg => msg.reactions && Object.keys(msg.reactions).length > 0);
        if (messagesWithReactions.length > 0) {
          console.log('Messages with reactions:', messagesWithReactions.length);
        }
      },
      (error) => {
        console.error('Error fetching messages:', error);
        setError('Failed to load messages');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, isOpen, userOrganization]);

  // Send message
  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !user || !db || !userOrganization) return;

    try {
      // Process emoji shortcuts before sending
      const processedMessage = processEmojiShortcuts(newMessage.trim());
      
      await addDoc(collection(db, 'messages'), {
        text: processedMessage,
        userId: user.id,
        userEmail: user.email,
        userName: user.name || user.email.split('@')[0],
        organizationId: userOrganization.id,
        timestamp: serverTimestamp(),
        reactions: {},
        createdAt: serverTimestamp()
      });

      setNewMessage('');
      setShowEmojiPicker(false);
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
    }
  };

  // Add reaction to a message
  const addReaction = async (messageId, emoji) => {
    if (!user || !db) return;

    try {
      const messageRef = doc(db, 'messages', messageId);
      
      // Use a transaction-like approach to handle concurrent updates
      const messageDoc = await getDoc(messageRef);
      
      if (messageDoc.exists()) {
        const messageData = messageDoc.data();
        const currentReactions = messageData.reactions || {};
        const emojiReactions = currentReactions[emoji] || [];
        
        // Check if user already reacted with this emoji
        const userIndex = emojiReactions.findIndex(reaction => reaction.userId === user.id);
        
        let updatedEmojiReactions;
        if (userIndex === -1) {
          // Add reaction
          updatedEmojiReactions = [...emojiReactions, {
            userId: user.id,
            userName: user.name || user.email.split('@')[0]
          }];
        } else {
          // Remove reaction (toggle)
          updatedEmojiReactions = emojiReactions.filter(reaction => reaction.userId !== user.id);
        }

        // Update reactions object
        const updatedReactions = { ...currentReactions };
        if (updatedEmojiReactions.length === 0) {
          delete updatedReactions[emoji];
        } else {
          updatedReactions[emoji] = updatedEmojiReactions;
        }

        // Update the message in Firestore - this will trigger real-time listeners
        await updateDoc(messageRef, { 
          reactions: updatedReactions,
          updatedAt: serverTimestamp() // Add timestamp for debugging
        });
        
        console.log('Reaction updated successfully for message:', messageId, 'emoji:', emoji);
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
      setError('Failed to add reaction: ' + error.message);
    }
  };

  // Process emoji shortcuts (like :smile: -> 😊)
  const processEmojiShortcuts = (text) => {
    const emojiMap = {
      ':smile:': '😊', ':laugh:': '😂', ':love:': '😍', ':heart:': '❤️',
      ':thumbs_up:': '👍', ':thumbs_down:': '👎', ':clap:': '👏', ':fire:': '🔥',
      ':star:': '⭐', ':check:': '✅', ':x:': '❌', ':warning:': '⚠️',
      ':idea:': '💡', ':rocket:': '🚀', ':party:': '🎉', ':coffee:': '☕',
      ':pizza:': '🍕', ':beer:': '🍺', ':wine:': '🍷', ':cake:': '🎂',
      ':sun:': '☀️', ':moon:': '🌙', ':rain:': '🌧️', ':snow:': '❄️',
      ':cat:': '🐱', ':dog:': '🐶', ':unicorn:': '🦄', ':rainbow:': '🌈'
    };

    let processed = text;
    Object.entries(emojiMap).forEach(([shortcut, emoji]) => {
      processed = processed.replace(new RegExp(shortcut.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), emoji);
    });
    return processed;
  };

  // Add emoji to message
  const addEmoji = (emoji) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Popular emojis for quick access
  const popularEmojis = [
    '😊', '😂', '😍', '👍', '👎', '❤️', '🔥', '⭐',
    '✅', '❌', '🎉', '💡', '🚀', '👏', '☕', '🍕',
    '😎', '🤔', '😢', '😮', '😴', '🤗', '🙌', '💪',
    '🌟', '💯', '🎯', '📱', '💻', '📸', '🎵', '🌈'
  ];

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

                    {/* Message Reactions */}
                    {message.reactions && Object.keys(message.reactions).length > 0 && (
                      <div className="message-reactions">
                        {Object.entries(message.reactions).map(([emoji, reactions]) => {
                          const reactionArray = Array.isArray(reactions) ? reactions : [];
                          if (reactionArray.length === 0) return null;
                          
                          return (
                            <button
                              key={emoji}
                              className={`reaction-badge ${reactionArray.some(r => r.userId === user.id) ? 'user-reacted' : ''}`}
                              onClick={() => addReaction(message.id, emoji)}
                              title={reactionArray.map(r => r.userName || r.userId).join(', ')}
                            >
                              {emoji} {reactionArray.length}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Quick Reaction Buttons (show on hover) */}
                    <div className="quick-reactions">
                      {['👍', '❤️', '😂', '😮', '😢', '😡'].map((emoji) => (
                        <button
                          key={emoji}
                          className="quick-reaction-btn"
                          onClick={() => addReaction(message.id, emoji)}
                          title={`React with ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div className="emoji-picker">
            <div className="emoji-picker-header">
              <span>Pick an emoji</span>
              <button 
                type="button" 
                className="close-emoji-picker" 
                onClick={() => setShowEmojiPicker(false)}
              >
                ×
              </button>
            </div>
            <div className="emoji-grid">
              {popularEmojis.map((emoji, index) => (
                <button
                  key={index}
                  type="button"
                  className="emoji-button"
                  onClick={() => addEmoji(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="emoji-shortcuts-info">
              <p>💡 Quick shortcuts: :smile: :heart: :thumbs_up: :fire: :rocket: :party:</p>
            </div>
          </div>
        )}

        {/* Message Input */}
        <form className="chat-popup-input" onSubmit={sendMessage}>
          <button
            type="button"
            className="emoji-toggle-button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            title="Add emoji"
          >
            😊
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message or :emoji:..."
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
          <span>Use :smile: :heart: :fire: for emojis</span>
        </div>
      </div>
    </>
  );
};

export default ChatPopup;