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
  updateDoc,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { getUserMemberOrganizations } from '../services/organizationService';
import './ChatPage.css';

const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '😸'];

const ChatPage = () => {
  const { user: currentUser } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrganization, setSelectedOrganization] = useState(null);
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
  const messagesEndRef = useRef(null);

  // Fetch user's organizations
  useEffect(() => {
    if (!currentUser) return;

    const fetchOrganizations = async () => {
      try {
        const result = await getUserMemberOrganizations(currentUser.id);
        setOrganizations(result.organizations);
        
        // Auto-select first organization if available
        if (result.organizations.length > 0 && !selectedOrganization) {
          setSelectedOrganization(result.organizations[0]);
        }
      } catch (error) {
        console.error('Error fetching organizations:', error);
      }
    };

    fetchOrganizations();
  }, [currentUser]);

  // Fetch organization members as users (including account owner)
  useEffect(() => {
    if (!db || !currentUser || !selectedOrganization) return;

    // Fetch all members of the organization
    const fetchOrgMembers = async () => {
      try {
        const memberIds = selectedOrganization.members || [];
        const usersList = [];

        // Fetch user details for each member
        for (const memberId of memberIds) {
          const usersQuery = query(
            collection(db, 'users'),
            where('uid', '==', memberId)
          );

          const snapshot = await getDocs(usersQuery);
          snapshot.forEach((doc) => {
            const userData = doc.data();
            usersList.push({
              id: doc.id,
              uid: userData.uid,
              email: userData.email,
              name: userData.name || userData.email?.split('@')[0] || 'User',
              photoURL: userData.photoURL || userData.profilePictureUrl || null,
              role: userData.uid === selectedOrganization.ownerId ? 'Account Owner' : 'Member'
            });
          });
        }

        setUsers(usersList);
      } catch (error) {
        console.error('Error fetching organization members:', error);
      }
    };

    fetchOrgMembers();
  }, [currentUser, selectedOrganization]);

  // Fetch organization's groups
  useEffect(() => {
    if (!db || !currentUser || !selectedOrganization) return;

    const groupsQuery = query(
      collection(db, 'groups'),
      where('organizationId', '==', selectedOrganization.id)
    );

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
  }, [currentUser, selectedOrganization]);

  // Fetch organization public messages
  useEffect(() => {
    if (!db || !selectedOrganization) return;

    const messagesQuery = query(
      collection(db, 'messages'),
      where('organizationId', '==', selectedOrganization.id),
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
      // Sort by createdAt in memory
      messagesData.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return a.createdAt.toMillis() - b.createdAt.toMillis();
      });
      setPublicMessages(messagesData);
    }, (error) => {
      console.error('Error fetching messages:', error);
      setPublicMessages([]);
    });

    return () => unsubscribe();
  }, [selectedOrganization]);

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
    
    console.log('📤 Attempting to send message...');
    console.log('Current user:', currentUser?.id, currentUser?.email);
    console.log('Selected org:', selectedOrganization?.id, selectedOrganization?.name);
    console.log('DB initialized:', !!db);
    console.log('Message:', newMessage.trim());
    
    if (!newMessage.trim() || sending || !currentUser || !db || !selectedOrganization) {
      console.warn('❌ Message send blocked:', {
        hasMessage: !!newMessage.trim(),
        sending,
        hasUser: !!currentUser,
        hasDb: !!db,
        hasOrg: !!selectedOrganization
      });
      return;
    }

    setSending(true);
    try {
      console.log('💾 Adding document to Firestore...');
      const docRef = await addDoc(collection(db, 'messages'), {
        text: newMessage.trim(),
        createdAt: serverTimestamp(),
        userId: currentUser.id,
        userName: currentUser.name || currentUser.email.split('@')[0],
        userEmail: currentUser.email,
        organizationId: selectedOrganization.id
      });
      console.log('✅ Message sent successfully! Doc ID:', docRef.id);
      setNewMessage('');
    } catch (error) {
      console.error('❌ Error sending message:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      alert(`Failed to send message: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  const sendGroupMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !currentUser || !selectedGroup || !db || !selectedOrganization) return;

    setSending(true);
    try {
      await addDoc(collection(db, `groups/${selectedGroup.id}/messages`), {
        text: newMessage.trim(),
        createdAt: serverTimestamp(),
        senderId: currentUser.id,
        senderName: currentUser.name || currentUser.email.split('@')[0],
        organizationId: selectedOrganization.id
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
    if (!groupName.trim() || selectedMembers.length === 0 || !db || !currentUser || !selectedOrganization) {
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
        avatar: groupName.trim().charAt(0).toUpperCase(),
        organizationId: selectedOrganization.id
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

  const renderUserInitial = (userName) => {
    return (
      <div className="user-avatar-initial">
        {userName?.charAt(0).toUpperCase() || '?'}
      </div>
    );
  };

  const renderAvatar = (user, size = 'medium') => {
    if (user?.photoURL) {
      return (
        <img 
          src={user.photoURL} 
          alt={user.name || 'User'} 
          className={`user-avatar-photo ${size}`}
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
      );
    }
    return renderUserInitial(user?.name || 'User');
  };

  return (
    <div className="chat-page">
      <div className="chat-page-header">
        <h1>💬 Team Communication</h1>
        <p>Connect with your team through public chat, direct messages, and groups</p>
        
        {/* Organization Selector */}
        {organizations.length > 0 && (
          <div className="organization-selector">
            <label htmlFor="org-select">Organization:</label>
            <select 
              id="org-select"
              value={selectedOrganization?.id || ''}
              onChange={(e) => {
                const org = organizations.find(o => o.id === e.target.value);
                setSelectedOrganization(org);
              }}
              className="org-dropdown"
            >
              {organizations.map(org => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {!selectedOrganization && organizations.length === 0 && (
          <div className="no-organization">
            <p>You are not a member of any organization yet.</p>
          </div>
        )}
      </div>

      {selectedOrganization && (
        <div className="chat-page-container">
          {/* Left Sidebar */}
          <div className="chat-nav-sidebar">
            <div className="sidebar-header">
              <input 
                type="text" 
                placeholder="Search" 
                className="sidebar-search"
              />
            </div>

            {/* Sidebar Tabs */}
            <div className="sidebar-tabs">
              <button 
                className={`sidebar-tab ${mainTab === 'messages' ? 'active' : ''}`}
                onClick={() => setMainTab('messages')}
              >
                Chat
              </button>
              <button 
                className={`sidebar-tab ${mainTab === 'groups' ? 'active' : ''}`}
                onClick={() => setMainTab('groups')}
              >
                Teams
              </button>
            </div>

            {/* Sidebar Content */}
            <div className="sidebar-content">
              {mainTab === 'messages' ? (
                <>
                  <div className="sidebar-section">
                    <div className="sidebar-section-title">Channels</div>
                    <div 
                      className={`chat-list-item ${chatTab === 'public' ? 'active' : ''}`}
                      onClick={() => setChatTab('public')}
                    >
                      <div className="chat-item-avatar">#</div>
                      <div className="chat-item-info">
                        <div className="chat-item-name">General</div>
                        <div className="chat-item-preview">Team chat</div>
                      </div>
                    </div>
                  </div>

                  <div className="sidebar-section">
                    <div className="sidebar-section-title">Direct Messages</div>
                    {users.length === 0 ? (
                      <div style={{padding: '8px 16px', fontSize: '0.75rem', color: '#605e5c'}}>
                        No team members
                      </div>
                    ) : (
                      users.map((user) => (
                        <div
                          key={user.id}
                          className={`chat-list-item ${chatTab === 'direct' && selectedUser?.id === user.id ? 'active' : ''}`}
                          onClick={() => {
                            setChatTab('direct');
                            setSelectedUser(user);
                          }}
                        >
                          <div className="chat-item-avatar">
                            {user.photoURL ? (
                              <img src={user.photoURL} alt={user.name} className="user-avatar-photo" />
                            ) : (
                              renderUserInitial(user.name)
                            )}
                          </div>
                          <div className="chat-item-info">
                            <div className="chat-item-name">{user.name}</div>
                            <div className="chat-item-preview">{user.email}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="sidebar-section">
                  <button className="create-group-btn" onClick={() => setShowCreateGroup(!showCreateGroup)}>
                    + New Team
                  </button>

                  {showCreateGroup && (
                    <div className="create-group-form">
                      <h3>Create New Team</h3>
                      <div className="form-group">
                        <label>Team Name</label>
                        <input
                          type="text"
                          value={groupName}
                          onChange={(e) => setGroupName(e.target.value)}
                          placeholder="Enter team name"
                        />
                      </div>
                      <div className="form-group">
                        <label>Add Members</label>
                        <div className="members-list">
                          {users.map((user) => (
                            <label key={user.id} className="member-checkbox">
                              <input
                                type="checkbox"
                                checked={selectedMembers.some(m => m.uid === user.uid)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedMembers([...selectedMembers, user]);
                                  } else {
                                    setSelectedMembers(selectedMembers.filter(m => m.uid !== user.uid));
                                  }
                                }}
                              />
                              {user.name}
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

                  <div className="sidebar-section-title">Your Teams</div>
                  {groups.length === 0 ? (
                    <div style={{padding: '8px 16px', fontSize: '0.75rem', color: '#605e5c'}}>
                      No teams yet
                    </div>
                  ) : (
                    groups.map((group) => (
                      <div
                        key={group.id}
                        className={`chat-list-item ${selectedGroup?.id === group.id ? 'active' : ''}`}
                        onClick={() => setSelectedGroup(group)}
                      >
                        <div className="chat-item-avatar">{group.avatar}</div>
                        <div className="chat-item-info">
                          <div className="chat-item-name">{group.name}</div>
                          <div className="chat-item-preview">{group.members.length} members</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Content Area */}
          <div className="chat-content-wrapper">
            {mainTab === 'messages' ? (
              chatTab === 'public' ? (
                <>
                  <div className="chat-header">
                    <div className="chat-item-avatar">#</div>
                    <div>
                      <div className="chat-header-title">General</div>
                      <div className="chat-header-subtitle">Team-wide conversation</div>
                    </div>
                  </div>

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
                              <div className="message-avatar">
                                {renderUserInitial(msg.userName)}
                              </div>
                              <div className="message-content">
                                <div className="message-header">
                                  <div className="message-author">{msg.userName}</div>
                                  <div className="message-time">{formatTime(msg.createdAt)}</div>
                                </div>
                                <div className="message-text">{msg.text}</div>
                                
                                {/* Reactions Display */}
                                {msg.reactions && Object.keys(getReactionSummary(msg.reactions)).length > 0 && (
                                  <div className="message-reactions">
                                    {Object.entries(getReactionSummary(msg.reactions)).map(([emoji, count]) => (
                                      <span key={emoji} className="reaction-badge">{emoji} {count > 1 ? count : ''}</span>
                                    ))}
                                  </div>
                                )}
                              </div>

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
                      {sending ? '...' : 'Send'}
                    </button>
                  </form>
                </>
              ) : selectedUser ? (
                <>
                  <div className="chat-header">
                    <div className="chat-item-avatar">
                      {renderUserInitial(selectedUser.name)}
                    </div>
                    <div>
                      <div className="chat-header-title">{selectedUser.name}</div>
                      <div className="chat-header-subtitle">{selectedUser.email}</div>
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
                              <div className="message-avatar">
                                {renderUserInitial(msg.senderName)}
                              </div>
                              <div className="message-content">
                                <div className="message-header">
                                  <div className="message-author">{msg.senderName}</div>
                                  <div className="message-time">{formatTime(msg.createdAt)}</div>
                                </div>
                                <div className="message-text">{msg.text}</div>

                                {/* Reactions Display */}
                                {msg.reactions && Object.keys(getReactionSummary(msg.reactions)).length > 0 && (
                                  <div className="message-reactions">
                                    {Object.entries(getReactionSummary(msg.reactions)).map(([emoji, count]) => (
                                      <span key={emoji} className="reaction-badge">{emoji} {count > 1 ? count : ''}</span>
                                    ))}
                                  </div>
                                )}
                              </div>

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
                      {sending ? '...' : 'Send'}
                    </button>
                  </form>
                </>
              ) : (
                <div className="select-conversation">
                  <p>← Select a person to start chatting</p>
                </div>
              )
            ) : selectedGroup ? (
              <>
                <div className="chat-header">
                  <div className="chat-item-avatar">{selectedGroup.avatar}</div>
                  <div>
                    <div className="chat-header-title">{selectedGroup.name}</div>
                    <div className="chat-header-subtitle">{selectedGroup.members.length} members</div>
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
                            <div className="message-avatar">
                              {renderUserInitial(msg.senderName)}
                            </div>
                            <div className="message-content">
                              <div className="message-header">
                                <div className="message-author">{msg.senderName}</div>
                                <div className="message-time">{formatTime(msg.createdAt)}</div>
                              </div>
                              <div className="message-text">{msg.text}</div>

                              {/* Reactions Display */}
                              {msg.reactions && Object.keys(getReactionSummary(msg.reactions)).length > 0 && (
                                <div className="message-reactions">
                                  {Object.entries(getReactionSummary(msg.reactions)).map(([emoji, count]) => (
                                    <span key={emoji} className="reaction-badge">{emoji} {count > 1 ? count : ''}</span>
                                  ))}
                                </div>
                              )}
                            </div>

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
                    {sending ? '...' : 'Send'}
                  </button>
                </form>
              </>
            ) : (
              <div className="select-group">
                <p>← Select a team to start chatting</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
