import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  limit,
  doc,
  getDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import './ChatPage.css';

const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '😸'];

const ChatPage = () => {
  const { user: currentUser } = useAuth();
  const [mainTab, setMainTab] = useState('messages'); // 'messages' or 'groups'
  const [chatTab, setChatTab] = useState('public'); // 'public' or 'direct' (under messages)
  const [publicMessages, setPublicMessages] = useState([]);
  const [privateMessages, setPrivateMessages] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupMessages, setGroupMessages] = useState([]);
  const [groups, setGroups] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [users, setUsers] = useState([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [reactionTarget, setReactionTarget] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const messagesEndRef = useRef(null);

  // Fetch current user's profile
  useEffect(() => {
    const fetchCurrentUserProfile = async () => {
      if (!currentUser || !db) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.id));
        if (userDoc.exists()) {
          setCurrentUserProfile(userDoc.data());
        }
      } catch (error) {
        console.error('Error fetching current user profile:', error);
      }
    };

    fetchCurrentUserProfile();
  }, [currentUser]);

  // Fetch all users
  useEffect(() => {
    if (!db || !currentUser) return;

    const usersQuery = query(collection(db, 'users'));

    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      const usersList = [];
      snapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData.uid !== currentUser.id) {
          usersList.push({
            id: doc.id,
            uid: userData.uid,
            email: userData.email,
            name: userData.email?.split('@')[0] || 'User',
            profilePictureUrl: userData.profilePictureUrl || null
          });
        }
      });
      setUsers(usersList);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Fetch user's groups
  useEffect(() => {
    if (!db || !currentUser) return;

    const groupsQuery = query(collection(db, 'groups'));

    const unsubscribe = onSnapshot(groupsQuery, (snapshot) => {
      const groupsList = [];
      snapshot.forEach((doc) => {
        const groupData = doc.data();
        // Show groups where current user is a member
        if (groupData.members && groupData.members.includes(currentUser.id)) {
          groupsList.push({
            id: doc.id,
            ...groupData
          });
        }
      });
      setGroups(groupsList);
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

  // Fetch group messages
  useEffect(() => {
    if (!db || !selectedGroup) {
      setGroupMessages([]);
      return;
    }

    const groupMessagesQuery = query(
      collection(db, `groups/${selectedGroup.id}/messages`),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(groupMessagesQuery, (snapshot) => {
      const messagesData = [];
      snapshot.forEach((doc) => {
        messagesData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      setGroupMessages(messagesData);
    }, (error) => {
      console.log('No group messages yet');
      setGroupMessages([]);
    });

    return () => unsubscribe();
  }, [selectedGroup]);

  // Auto scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [publicMessages, privateMessages, groupMessages]);

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
        userEmail: currentUser.email,
        userProfilePic: currentUserProfile?.profilePictureUrl || null
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send private message');
    } finally {
      setSending(false);
    }
  };

  const sendGroupMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !currentUser || !selectedGroup || !db) return;

    setSending(true);
    try {
      await addDoc(collection(db, `groups/${selectedGroup.id}/messages`), {
        text: newMessage.trim(),
        createdAt: serverTimestamp(),
        senderId: currentUser.id,
        senderName: currentUser.name || currentUser.email.split('@')[0],
        userProfilePic: currentUserProfile?.profilePictureUrl || null
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending group message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const createGroup = async () => {
    if (!groupName.trim() || selectedMembers.length === 0 || !db || !currentUser) {
      alert('Please enter a group name and select at least one member');
      return;
    }

    try {
      const groupMembers = [currentUser.id, ...selectedMembers.map(m => m.uid)];
      
      await addDoc(collection(db, 'groups'), {
        name: groupName.trim(),
        members: groupMembers,
        createdBy: currentUser.id,
        createdAt: serverTimestamp(),
        avatar: groupName.trim().charAt(0).toUpperCase()
      });

      setGroupName('');
      setSelectedMembers([]);
      setShowCreateGroup(false);
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Failed to create group');
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
        receiverId: selectedUser.uid,
        userProfilePic: currentUserProfile?.profilePictureUrl || null
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

  const addReaction = async (messageId, emoji, messageType) => {
    if (!db || !currentUser) return;

    try {
      let messageRef;
      
      if (messageType === 'public') {
        messageRef = doc(db, 'messages', messageId);
      } else if (messageType === 'private' && selectedUser) {
        const conversationId = [currentUser.id, selectedUser.uid].sort().join('-');
        messageRef = doc(db, `conversations/${conversationId}/messages`, messageId);
      } else if (messageType === 'group' && selectedGroup) {
        messageRef = doc(db, `groups/${selectedGroup.id}/messages`, messageId);
      }

      if (messageRef) {
        const reactionKey = `reactions.${emoji}.${currentUser.id}`;
        await updateDoc(messageRef, {
          [reactionKey]: serverTimestamp()
        });
      }

      setShowEmojiPicker(false);
      setReactionTarget(null);
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const getReactionSummary = (reactions) => {
    if (!reactions) return {};
    const summary = {};
    
    Object.entries(reactions).forEach(([emoji, users]) => {
      if (typeof users === 'object' && users !== null) {
        const userCount = Object.keys(users).length;
        if (userCount > 0) {
          summary[emoji] = userCount;
        }
      }
    });

    return summary;
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

  const renderUserAvatar = (profilePictureUrl, userName) => {
    if (profilePictureUrl) {
      return (
        <img 
          src={profilePictureUrl} 
          alt={userName} 
          className="user-avatar-img"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextElementSibling.style.display = 'flex';
          }}
        />
      );
    }
    return null;
  };

  const renderUserInitial = (userName) => {
    return (
      <div className="user-avatar-initial">
        {userName?.charAt(0).toUpperCase() || '?'}
      </div>
    );
  };

  return (
    <div className="chat-page">
      <div className="chat-page-header">
        <h1>💬 Team Communication</h1>
        <p>Connect with your team through public chat, direct messages, and groups</p>
      </div>

      <div className="chat-page-container">
        {/* Main Tab Buttons - Smaller */}
        <div className="main-tabs">
          <button 
            className={`main-tab ${mainTab === 'messages' ? 'active' : ''}`}
            onClick={() => setMainTab('messages')}
          >
            Messages
          </button>
          <button 
            className={`main-tab ${mainTab === 'groups' ? 'active' : ''}`}
            onClick={() => setMainTab('groups')}
          >
            Groups ({groups.length})
          </button>
        </div>

        {mainTab === 'messages' ? (
          <>
            {/* Chat Sub Tabs - Smaller */}
            <div className="chat-tabs-main">
              <button 
                className={`chat-tab-main ${chatTab === 'public' ? 'active' : ''}`}
                onClick={() => setChatTab('public')}
              >
                Public
              </button>
              <button 
                className={`chat-tab-main ${chatTab === 'direct' ? 'active' : ''}`}
                onClick={() => setChatTab('direct')}
              >
                Direct
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
                            <div className={`message-item ${msg.userId === currentUser?.id ? 'own' : 'other'}`}
                              onMouseEnter={() => setReactionTarget(msg.id)}
                              onMouseLeave={() => { if (reactionTarget === msg.id) setReactionTarget(null); }}
                            >
                              <div className="message-content-with-avatar">
                                <div className="message-avatar">
                                  {renderUserAvatar(msg.userProfilePic, msg.userName)}
                                  {renderUserInitial(msg.userName)}
                                </div>
                                <div className="message-content">
                                  <div className="message-author">{msg.userName}</div>
                                  <div className="message-bubble">{msg.text}</div>
                                  <div className="message-time">{formatTime(msg.createdAt)}</div>
                                </div>
                              </div>
                              
                              {/* Reactions Display */}
                              {msg.reactions && Object.keys(getReactionSummary(msg.reactions)).length > 0 && (
                                <div className="message-reactions">
                                  {Object.entries(getReactionSummary(msg.reactions)).map(([emoji, count]) => (
                                    <span key={emoji} className="reaction-badge">{emoji} {count > 1 ? count : ''}</span>
                                  ))}
                                </div>
                              )}

                              {/* Reaction Buttons */}
                              {reactionTarget === msg.id && (
                                <div className="reaction-menu">
                                  {EMOJI_REACTIONS.map((emoji) => (
                                    <button
                                      key={emoji}
                                      className="reaction-btn"
                                      onClick={() => addReaction(msg.id, emoji, 'public')}
                                      title="Add reaction"
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              )}
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
                          <div className="user-avatar">
                            {renderUserAvatar(user.profilePictureUrl, user.name)}
                            {renderUserInitial(user.name)}
                          </div>
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
                            <div className="private-avatar">
                              {renderUserAvatar(selectedUser.profilePictureUrl, selectedUser.name)}
                              {renderUserInitial(selectedUser.name)}
                            </div>
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
                                  <div className={`message-item ${msg.senderId === currentUser?.id ? 'own' : 'other'}`}
                                    onMouseEnter={() => setReactionTarget(msg.id)}
                                    onMouseLeave={() => { if (reactionTarget === msg.id) setReactionTarget(null); }}
                                  >
                                    <div className="message-content-with-avatar">
                                      <div className="message-avatar">
                                        {renderUserAvatar(msg.userProfilePic, msg.senderName)}
                                        {renderUserInitial(msg.senderName)}
                                      </div>
                                      <div className="message-content">
                                        <div className="message-bubble">{msg.text}</div>
                                        <div className="message-time">{formatTime(msg.createdAt)}</div>
                                      </div>
                                    </div>

                                    {/* Reactions Display */}
                                    {msg.reactions && Object.keys(getReactionSummary(msg.reactions)).length > 0 && (
                                      <div className="message-reactions">
                                        {Object.entries(getReactionSummary(msg.reactions)).map(([emoji, count]) => (
                                          <span key={emoji} className="reaction-badge">{emoji} {count > 1 ? count : ''}</span>
                                        ))}
                                      </div>
                                    )}

                                    {/* Reaction Buttons */}
                                    {reactionTarget === msg.id && (
                                      <div className="reaction-menu">
                                        {EMOJI_REACTIONS.map((emoji) => (
                                          <button
                                            key={emoji}
                                            className="reaction-btn"
                                            onClick={() => addReaction(msg.id, emoji, 'private')}
                                            title="Add reaction"
                                          >
                                            {emoji}
                                          </button>
                                        ))}
                                      </div>
                                    )}
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
          </>
        ) : (
          // Groups Tab
          <div className="groups-container">
            <div className="groups-sidebar">
              <button className="create-group-btn" onClick={() => setShowCreateGroup(!showCreateGroup)}>
                ➕ New Group
              </button>
              
              {showCreateGroup && (
                <div className="create-group-form">
                  <input
                    type="text"
                    placeholder="Group name..."
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="group-input"
                  />
                  <div className="members-select">
                    <p className="select-label">Select members:</p>
                    <div className="members-list">
                      {users.map((user) => (
                        <label key={user.id} className="member-checkbox">
                          <input
                            type="checkbox"
                            checked={selectedMembers.some(m => m.id === user.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMembers([...selectedMembers, user]);
                              } else {
                                setSelectedMembers(selectedMembers.filter(m => m.id !== user.id));
                              }
                            }}
                          />
                          <span>{user.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="form-buttons">
                    <button className="btn-primary" onClick={createGroup}>Create</button>
                    <button className="btn-secondary" onClick={() => {
                      setShowCreateGroup(false);
                      setGroupName('');
                      setSelectedMembers([]);
                    }}>Cancel</button>
                  </div>
                </div>
              )}

              <div className="groups-list">
                <div className="groups-header">Your Groups</div>
                {groups.length === 0 ? (
                  <div className="no-groups">No groups yet</div>
                ) : (
                  groups.map((group) => (
                    <div
                      key={group.id}
                      className={`group-item ${selectedGroup?.id === group.id ? 'selected' : ''}`}
                      onClick={() => setSelectedGroup(group)}
                    >
                      <div className="group-avatar">{group.avatar}</div>
                      <div className="group-info">
                        <div className="group-name">{group.name}</div>
                        <div className="group-members">{group.members.length} members</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="group-chat-panel">
              {selectedGroup ? (
                <>
                  <div className="group-header">
                    <div className="group-header-info">
                      <div className="group-avatar-lg">{selectedGroup.avatar}</div>
                      <div>
                        <div className="group-header-name">{selectedGroup.name}</div>
                        <div className="group-header-members">{selectedGroup.members.length} members</div>
                      </div>
                    </div>
                  </div>

                  <div className="chat-messages">
                    {groupMessages.length === 0 ? (
                      <div className="no-messages">Be the first to message!</div>
                    ) : (
                      groupMessages.map((msg, index) => {
                        const showDate = index === 0 || 
                          formatDate(msg.createdAt) !== formatDate(groupMessages[index - 1].createdAt);
                        
                        return (
                          <div key={msg.id}>
                            {showDate && (
                              <div className="message-date-divider">
                                {formatDate(msg.createdAt)}
                              </div>
                            )}
                            <div className={`message-item ${msg.senderId === currentUser?.id ? 'own' : 'other'}`}
                              onMouseEnter={() => setReactionTarget(msg.id)}
                              onMouseLeave={() => { if (reactionTarget === msg.id) setReactionTarget(null); }}
                            >
                              <div className="message-content-with-avatar">
                                <div className="message-avatar">
                                  {renderUserAvatar(msg.userProfilePic, msg.senderName)}
                                  {renderUserInitial(msg.senderName)}
                                </div>
                                <div className="message-content">
                                  <div className="message-author">{msg.senderName}</div>
                                  <div className="message-bubble">{msg.text}</div>
                                  <div className="message-time">{formatTime(msg.createdAt)}</div>
                                </div>
                              </div>

                              {/* Reactions Display */}
                              {msg.reactions && Object.keys(getReactionSummary(msg.reactions)).length > 0 && (
                                <div className="message-reactions">
                                  {Object.entries(getReactionSummary(msg.reactions)).map(([emoji, count]) => (
                                    <span key={emoji} className="reaction-badge">{emoji} {count > 1 ? count : ''}</span>
                                  ))}
                                </div>
                              )}

                              {/* Reaction Buttons */}
                              {reactionTarget === msg.id && (
                                <div className="reaction-menu">
                                  {EMOJI_REACTIONS.map((emoji) => (
                                    <button
                                      key={emoji}
                                      className="reaction-btn"
                                      onClick={() => addReaction(msg.id, emoji, 'group')}
                                      title="Add reaction"
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <form onSubmit={sendGroupMessage} className="chat-form">
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
                <div className="select-group">
                  <p>👈 Select a group to start chatting</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
