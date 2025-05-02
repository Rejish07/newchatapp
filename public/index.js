window.onload = function() {
  const firebaseConfig = {
    apiKey: "AIzaSyD-h84Z77jQOC1DAEofIVSKlLnNWLR6U74",
    authDomain: "chat-f2700.firebaseapp.com",
    projectId: "chat-f2700",
    storageBucket: "chat-f2700.appspot.com",
    messagingSenderId: "532226445600",
    appId: "1:532226445600:web:2b3f45a150b59556da0745",
    measurementId: "G-4C08EKFZNQ"
  };

  firebase.initializeApp(firebaseConfig);
  const db = firebase.database();
  const auth = firebase.auth();

  class ChatApp {
    constructor() {
      this.currentUser = null;
      this.currentChat = null;
      this.currentGroup = null;
      this.chatMode = 'private';
      
      // Bind all methods
      this.init = this.init.bind(this);
      this.authPage = this.authPage.bind(this);
      this.mainPage = this.mainPage.bind(this);
      this.getInitials = this.getInitials.bind(this);
      this.loadContacts = this.loadContacts.bind(this);
      this.loadGroups = this.loadGroups.bind(this);
      this.loadMessages = this.loadMessages.bind(this);
      this.loadGroupMessages = this.loadGroupMessages.bind(this);
      this.sendMessage = this.sendMessage.bind(this);
      this.showCreateGroupModal = this.showCreateGroupModal.bind(this);
      this.createGroup = this.createGroup.bind(this);
      this.showGroupInfo = this.showGroupInfo.bind(this);
      this.getConversationId = this.getConversationId.bind(this);
      this.groupMessagesListener = null; // Add this line


      this.init();
    }

    getInitials(email) {
      return email ? email.charAt(0).toUpperCase() : '?';
    }

    init() {
      auth.onAuthStateChanged((user) => {
        if (user) {
          this.currentUser = user;
          this.mainPage();
        } else {
          this.authPage();
        }
      });
    }

    authPage() {
      document.body.innerHTML = `
        <div class="auth-container">
          <div class="auth-box" id="auth-box">
            <h1 class="auth-title">ChatApp</h1>
            <input type="email" id="auth-email" class="auth-input" placeholder="Email">
            <input type="password" id="auth-password" class="auth-input" placeholder="Password">
            <button id="auth-submit" class="auth-button">Sign In</button>
            <div class="auth-switch">Don't have an account? <span id="auth-toggle">Sign Up</span></div>
          </div>
        </div>
      `;

      const authToggle = document.getElementById('auth-toggle');
      const authSubmit = document.getElementById('auth-submit');
      let isLogin = true;

      authToggle.addEventListener('click', () => {
        isLogin = !isLogin;
        authSubmit.textContent = isLogin ? 'Sign In' : 'Sign Up';
        authToggle.textContent = isLogin ? 'Sign Up' : 'Sign In';
      });

      authSubmit.addEventListener('click', () => {
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;

        if (!email || !password) {
          alert('Please enter email and password');
          return;
        }

        const authAction = isLogin
          ? auth.signInWithEmailAndPassword(email, password)
          : auth.createUserWithEmailAndPassword(email, password)
              .then((userCredential) => {
                return db.ref('users/' + userCredential.user.uid).set({
                  email: email,
                  createdAt: firebase.database.ServerValue.TIMESTAMP
                });
              });

        authAction.catch(error => alert(error.message));
      });
    }

    mainPage() {
      document.body.innerHTML = `
        <div class="main-container">
          <div class="sidebar">
            <div class="user-profile">
              <div class="user-avatar">${this.getInitials(this.currentUser.email)}</div>
              <div class="user-name">${this.currentUser.email}</div>
              <div class="user-logout"><i class="fas fa-sign-out-alt"></i></div>
            </div>
            
            <div class="chat-tabs">
              <div class="chat-tab active" id="private-tab">Private</div>
              <div class="chat-tab" id="group-tab">Groups</div>
            </div>
            
            <div class="group-controls">
              <button class="create-group-btn" id="create-group-btn">
                <i class="fas fa-plus"></i> New Group
              </button>
            </div>
            
            <div class="search-container">
              <input type="text" class="search-input" placeholder="Search...">
            </div>
            
            <div class="contacts-list" id="contacts-list"></div>
          </div>
          
          <div class="chat-area">
            <div class="chat-header">
              <div class="chat-title" id="chat-title">Select a chat</div>
            </div>
            
            <div class="chat-content" id="chat-content"></div>
            
            <div class="chat-input-container">
              <input type="text" class="chat-input" id="chat-input" placeholder="Type a message..." disabled>
              <div class="chat-send" id="chat-send" disabled><i class="fas fa-paper-plane"></i></div>
            </div>
          </div>
        </div>
      `;

      // Tab switching
      document.getElementById('private-tab').addEventListener('click', () => {
        this.chatMode = 'private';
        document.querySelectorAll('.chat-tab').forEach(tab => tab.classList.remove('active'));
        document.getElementById('private-tab').classList.add('active');
        this.loadContacts();
      });

      document.getElementById('group-tab').addEventListener('click', () => {
        this.chatMode = 'group';
        document.querySelectorAll('.chat-tab').forEach(tab => tab.classList.remove('active'));
        document.getElementById('group-tab').classList.add('active');
        this.loadGroups();
      });

      // Create group button
      // document.getElementById('create-group-btn').addEventListener('click', this.showCreateGroupModal);
      document.getElementById('create-group-btn').addEventListener('click', () => {
        alert('Button clicked!'); // Test if this shows up
        this.showCreateGroupModal();
      });
      

      // Logout button
      document.querySelector('.user-logout').addEventListener('click', () => {
        auth.signOut();
      });

      // Load initial contacts
      this.loadContacts();

      // Search functionality
      document.querySelector('.search-input').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        document.querySelectorAll('.contact-item').forEach(contact => {
          const name = contact.querySelector('.contact-name').textContent.toLowerCase();
          contact.style.display = name.includes(searchTerm) ? 'flex' : 'none';
        });
      });

      // Message sending
      const chatInput = document.getElementById('chat-input');
      chatInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter' && chatInput.value.trim() !== '') {
          this.sendMessage(chatInput.value);
          chatInput.value = '';
        }
      });

      document.getElementById('chat-send').addEventListener('click', () => {
        if (chatInput.value.trim() !== '') {
          this.sendMessage(chatInput.value);
          chatInput.value = '';
        }
      });
    }

    loadContacts() {
      const contactsList = document.getElementById('contacts-list');
      contactsList.innerHTML = '<div class="loader"></div>';

      db.ref('users').once('value').then(snapshot => {
        contactsList.innerHTML = '';
        
        snapshot.forEach(user => {
          if (user.key !== this.currentUser.uid) {
            const contact = document.createElement('div');
            contact.className = 'contact-item';
            contact.innerHTML = `
              <div class="contact-avatar">${this.getInitials(user.val().email)}</div>
              <div class="contact-name">${user.val().email}</div>
            `;
            
            contact.addEventListener('click', () => {
              document.querySelectorAll('.contact-item').forEach(item => item.classList.remove('active'));
              contact.classList.add('active');
              
              this.currentChat = user.key;
              this.chatMode = 'private';
              document.getElementById('chat-title').textContent = user.val().email;
              document.getElementById('chat-input').disabled = false;
              this.loadMessages();
            });
            
            contactsList.appendChild(contact);
          }
        });
      });
    }
    

    loadGroups() {
      const contactsList = document.getElementById('contacts-list');
      contactsList.innerHTML = '<div class="loader"></div>';

      db.ref('groups').orderByChild(`members/${this.currentUser.uid}`).equalTo(true).once('value').then(snapshot => {
        contactsList.innerHTML = '';
        
        if (!snapshot.exists()) {
          contactsList.innerHTML = '<div style="text-align: center; padding: 20px;">No groups yet. Create one!</div>';
          return;
        }

        snapshot.forEach(group => {
          const groupItem = document.createElement('div');
          groupItem.className = 'contact-item';
          groupItem.innerHTML = `
            <div class="contact-avatar"><i class="fas fa-users"></i></div>
            <div class="contact-name">${group.val().name}</div>
          `;
          
          groupItem.addEventListener('click', () => {
            document.querySelectorAll('.contact-item').forEach(item => item.classList.remove('active'));
            groupItem.classList.add('active');
            
            this.currentGroup = group.key;
            this.chatMode = 'group';
            document.getElementById('chat-title').textContent = group.val().name;
            document.getElementById('chat-input').disabled = false;
            this.loadGroupMessages();
            this.showGroupInfo(group.val());
          });
          
          contactsList.appendChild(groupItem);
        });
      });
    }

    showCreateGroupModal() {
      // Check if a modal already exists
      if (document.querySelector('.modal')) return;
    
      // const modal = document.createElement('div');
      // modal.className = 'modal';
      // modal.innerHTML = `
      //   <div class="modal-content">
      //     <h3>Create New Group</h3>
      //     <input type="text" id="group-name-input" placeholder="Group name">
      //     <div class="member-selection">
      //       <h4>Select Members</h4>
      //       <div id="available-members"></div>
      //     </div>
      //     <div class="modal-buttons">
      //       <button id="confirm-create-group" class="modal-button primary">Create Group</button>
      //       <button id="cancel-create-group" class="modal-button secondary">Cancel</button>
      //     </div>
      //   </div>
      // `;
      
      // document.body.appendChild(modal);

      const modal = document.createElement('div');
      modal.className = 'modal active'; // Add 'active' class immediately
      modal.innerHTML = `
        <div class="modal-content">
          <h3>Create New Group</h3>
          <input type="text" id="group-name-input" placeholder="Group name">
          <div class="member-selection">
            <h4>Select Members</h4>
            <div id="available-members"></div>
          </div>
          <div class="modal-buttons">
            <button id="confirm-create-group" class="modal-button primary">Create Group</button>
            <button id="cancel-create-group" class="modal-button secondary">Cancel</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // Rest of your modal logic...

      
      // Load available members
      db.ref('users').once('value').then(snapshot => {
        const membersContainer = document.getElementById('available-members');
        membersContainer.innerHTML = '';
        
        snapshot.forEach(user => {
          if (user.key !== this.currentUser.uid) {
            const member = document.createElement('div');
            member.className = 'member-option';
            member.innerHTML = `
              <input type="checkbox" id="member-${user.key}" value="${user.key}">
              <label for="member-${user.key}">${user.val().email}</label>
            `;
            membersContainer.appendChild(member);
          }
        });
      });
    
      document.getElementById('confirm-create-group').addEventListener('click', () => {
        const groupName = document.getElementById('group-name-input').value;
        const checkboxes = document.querySelectorAll('.member-option input:checked');
        
        if (!groupName || checkboxes.length === 0) {
          alert('Please enter a group name and select at least one member');
          return;
        }
    
        const members = { [this.currentUser.uid]: true };
        checkboxes.forEach(checkbox => {
          members[checkbox.value] = true;
        });
    
        this.createGroup(groupName, members);
        document.body.removeChild(modal);
      });
    
      document.getElementById('cancel-create-group').addEventListener('click', () => {
        document.body.removeChild(modal);
      });
    
      // Add click listener to close modal when clicking outside content
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          document.body.removeChild(modal);
        }
      });
    }

    createGroup(groupName, members) {
      const groupRef = db.ref('groups').push();
      groupRef.set({
        name: groupName,
        members: members,
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        createdBy: this.currentUser.uid
      }).then(() => {
        this.loadGroups();
      });
    }

    showGroupInfo(groupData) {
      const chatContent = document.getElementById('chat-content');
      const infoDiv = document.createElement('div');
      infoDiv.className = 'group-info';
      
      let membersHtml = '';
      Object.keys(groupData.members).forEach(uid => {
        membersHtml += `<span class="member-tag">${uid === this.currentUser.uid ? 'You' : uid}</span>`;
      });
      
      infoDiv.innerHTML = `
        <h4>Group Info</h4>
        <p>Created: ${new Date(groupData.createdAt).toLocaleString()}</p>
        <div class="group-members">${membersHtml}</div>
      `;
      
      chatContent.innerHTML = '';
      chatContent.appendChild(infoDiv);
    }

    loadMessages() {
      const chatContent = document.getElementById('chat-content');
      chatContent.innerHTML = '<div class="loader"></div>';

      db.ref('messages').orderByChild('conversationId').equalTo(this.getConversationId()).on('value', snapshot => {
        chatContent.innerHTML = '';
        
        if (!snapshot.exists()) {
          chatContent.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">No messages yet. Start the conversation!</div>';
          return;
        }
        
        const messages = [];
        snapshot.forEach(child => {
          messages.push(child.val());
        });
        
        messages.sort((a, b) => a.timestamp - b.timestamp);
        
        messages.forEach(msg => {
          const isSent = msg.senderId === this.currentUser.uid;
          const messageDiv = document.createElement('div');
          messageDiv.className = `message ${isSent ? 'message-sent' : 'message-received'}`;
          
          messageDiv.innerHTML = `
            <div class="message-sender">${isSent ? 'You' : msg.senderEmail}</div>
            <div class="message-bubble">${msg.text}</div>
          `;
          
          chatContent.appendChild(messageDiv);
        });
        
        chatContent.scrollTop = chatContent.scrollHeight;
      });
    }

    loadGroupMessages() {
      const chatContent = document.getElementById('chat-content');
      
      // Clear existing messages but keep group info
      const existingInfo = chatContent.querySelector('.group-info');
      chatContent.innerHTML = '';
      if (existingInfo) chatContent.appendChild(existingInfo);
      
      // Remove previous listener if it exists
      if (this.groupMessagesListener) {
        db.ref(`groupMessages/${this.currentGroup}`).off('value', this.groupMessagesListener);
      }
      
      // Add new listener and store the reference
      this.groupMessagesListener = db.ref(`groupMessages/${this.currentGroup}`).on('value', (snapshot) => {
        if (!snapshot.exists()) return;
        
        // Clear messages before adding them again (but keep group info)
        const currentInfo = chatContent.querySelector('.group-info');
        chatContent.innerHTML = '';
        if (currentInfo) chatContent.appendChild(currentInfo);
        
        const messages = [];
        snapshot.forEach(child => {
          messages.push({ id: child.key, ...child.val() });
        });
        
        messages.sort((a, b) => a.timestamp - b.timestamp);
        
        messages.forEach(msg => {
          const isSent = msg.sender === this.currentUser.uid;
          const messageDiv = document.createElement('div');
          messageDiv.className = `group-message ${isSent ? 'message-sent' : 'message-received'}`;
          
          messageDiv.innerHTML = `
            <div class="group-message-sender">${isSent ? 'You' : msg.senderEmail}</div>
            <div class="group-message-content">${msg.text}</div>
          `;
          
          chatContent.appendChild(messageDiv);
        });
        
        chatContent.scrollTop = chatContent.scrollHeight;
      });
    }

    getConversationId() {
      const users = [this.currentUser.uid, this.currentChat].sort();
      return users.join('_');
    }

    sendMessage(text) {
      if (!text.trim()) return;
      
      if (this.chatMode === 'private') {
        db.ref('users/' + this.currentChat).once('value').then(snapshot => {
          const newMessage = {
            senderId: this.currentUser.uid,
            senderEmail: this.currentUser.email,
            receiverId: this.currentChat,
            receiverEmail: snapshot.val().email,
            text: text,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            conversationId: this.getConversationId()
          };
          db.ref('messages').push(newMessage);
        });
      } else if (this.chatMode === 'group') {
        // Disable input temporarily to prevent multiple sends
        const chatInput = document.getElementById('chat-input');
        chatInput.disabled = true;
        
        db.ref(`groupMessages/${this.currentGroup}`).push({
          sender: this.currentUser.uid,
          senderEmail: this.currentUser.email,
          text: text,
          timestamp: firebase.database.ServerValue.TIMESTAMP
        }).then(() => {
          chatInput.disabled = false;
          chatInput.focus();
        }).catch((error) => {
          console.error("Error sending message:", error);
          chatInput.disabled = false;
        });
      }
    }
  }

  new ChatApp();
};