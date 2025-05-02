/**
 * author - rejishmahi@gmail.com
 * Note - comments are added for learning purpose make use of that.
 * Credit - comments are done by AI.
 * 
 * =============================
 * MAIN APPLICATION ENTRY POINT
 * =============================
 * This function runs when the window finishes loading
 * Purpose: Initialize Firebase and start the ChatApp
 * Security Note: Firebase config should ideally be loaded from environment
 * variables in production to avoid exposing API keys
 */
window.onload = function() {
  /**
   * =======================
   * FIREBASE CONFIGURATION
   * =======================
   * Contains all necessary credentials to connect to your Firebase project
   * 
   * Structure:
   * - apiKey: Authenticates your app with Firebase services
   * - authDomain: Domain for Firebase Authentication
   * - projectId: Your Firebase project ID
   * - storageBucket: For file storage (not used in current implementation)
   * - messagingSenderId: For Firebase Cloud Messaging (future use)
   * - appId: Your Firebase app ID
   * - measurementId: For Google Analytics (optional)
   * 
   * Important: Never commit real API keys to public repositories!
   */
  const firebaseConfig = {
    apiKey: "AIzaSyD-h84Z77jQOC1DAEofIVSKlLnNWLR6U74",
    authDomain: "chat-f2700.firebaseapp.com",
    projectId: "chat-f2700",
    storageBucket: "chat-f2700.appspot.com",
    messagingSenderId: "532226445600",
    appId: "1:532226445600:web:2b3f45a150b59556da0745",
    measurementId: "G-4C08EKFZNQ"
  };

  // Initialize Firebase using the configuration above
  // This connects your web app to all Firebase services
  firebase.initializeApp(firebaseConfig);
  
  /**
   * =============================
   * FIREBASE SERVICE REFERENCES
   * =============================
   */
  const db = firebase.database();  // Realtime Database reference
  const auth = firebase.auth();    // Authentication service reference

  /**
   * =======================================
   * CHATAPP CLASS - CORE APPLICATION LOGIC
   * ========================================
   * This class encapsulates all functionality of the chat application
   * Design Pattern: Singleton (only one instance created)
   * Architecture: MVC-like (Model = Firebase, View = DOM, Controller = This class)
   */
  class ChatApp {
    /**
     * ===========================================
     * CONSTRUCTOR - INITIALIZE APPLICATION STATE
     * ===========================================
     * Called when creating new ChatApp instance
     * Sets up initial state and binds methods
     */
    constructor() {
      /**
       * ============================
       * APPLICATION STATE VARIABLES
       * ============================
       */
      this.currentUser = null;    // Currently authenticated user object
      this.currentChat = null;    // User ID of current 1:1 chat partner
      this.currentGroup = null;   // Group ID of current group chat
      this.chatMode = 'private';  // Current mode ('private' or 'group')
      this.groupMessagesListener = null; // Reference to active group messages listener
      
      /**
       * ================
       * METHOD BINDING
       * ================
       * Necessary because these methods are used as event handlers
       * where 'this' context would otherwise be lost
       */
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

      // Start the application
      this.init();
    }

    /**
     * ========================================
     * UTILITY METHOD: GET INITIALS FROM EMAIL
     * ========================================
     * @param {string} email - User's email address
     * @return {string} First letter of email in uppercase
     * 
     * Example:
     *   getInitials("test@example.com") -> "T"
     *   getInitials(null) -> "?"
     */
    getInitials(email) {
      // Using ternary operator for concise null check
      return email ? email.charAt(0).toUpperCase() : '?';
    }

    /**
     * =======================
     * INITIALIZE APPLICATION
     * =======================
     * Sets up authentication state observer
     * This is the "heartbeat" of the application
     */
    init() {
      /**
       * Firebase Auth State Observer
       * Listens for changes in authentication state
       * 
       * Flow:
       * 1. When auth state changes (login/logout), this callback runs
       * 2. If user exists (logged in):
       *    - Set currentUser
       *    - Show main chat interface
       * 3. If no user (logged out):
       *    - Show auth page
       */
      auth.onAuthStateChanged((user) => {
        if (user) {
          // User is signed in
          this.currentUser = user; // Store user object
          this.mainPage(); // Show main chat interface
        } else {
          // No user is signed in
          this.authPage(); // Show authentication page
        }
      });
    }

    /**
     * ====================
     * AUTHENTICATION PAGE
     * ====================
     * Renders and manages the login/signup interface
     * 
     * Features:
     * - Toggle between login/signup modes
     * - Form validation
     * - Firebase authentication
     * - Error handling
     */
    authPage() {
      // Build the authentication page HTML
      // Using template literals for clean multi-line HTML
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

      // DOM element references
      const authToggle = document.getElementById('auth-toggle');
      const authSubmit = document.getElementById('auth-submit');
      
      // State variable to track auth mode
      let isLogin = true; // Start in login mode by default

      /**
       * Toggle between login and signup modes
       * Changes button text and toggle link text
       */
      authToggle.addEventListener('click', () => {
        isLogin = !isLogin; // Flip the boolean
        authSubmit.textContent = isLogin ? 'Sign In' : 'Sign Up';
        authToggle.textContent = isLogin ? 'Sign Up' : 'Sign In';
      });

      /**
       * Handle form submission
       */
      authSubmit.addEventListener('click', () => {
        // Get form values
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;

        // Basic validation
        if (!email || !password) {
          alert('Please enter email and password');
          return;
        }

        /**
         * Determine authentication action based on current mode
         * 
         * Ternary operator selects between:
         * 1. signInWithEmailAndPassword (login)
         * 2. createUserWithEmailAndPassword (signup)
         * 
         * For signup, we chain a .then() to also create a user record
         */
        const authAction = isLogin
          ? auth.signInWithEmailAndPassword(email, password) // Login
          : auth.createUserWithEmailAndPassword(email, password) // Signup
              .then((userCredential) => {
                // Additional step for signup: create user record
                return db.ref('users/' + userCredential.user.uid).set({
                  email: email,
                  createdAt: firebase.database.ServerValue.TIMESTAMP
                });
              });

        // Error handling
        authAction.catch(error => {
          // In a production app, you'd want more sophisticated error handling
          alert(error.message); 
        });
      });
    }

    /**
     * ====================
     * MAIN CHAT INTERFACE
     * ====================
     * Renders and manages the primary chat application UI
     * 
     * Structure:
     * - Sidebar with contacts/groups
     * - Main chat area
     * - Message input
     * 
     * Initializes all event listeners for chat functionality
     */
    mainPage() {
      // Build the main chat interface HTML
      document.body.innerHTML = `
        <div class="main-container">
          <!-- Sidebar Section -->
          <div class="sidebar">
            <!-- User Profile Header -->
            <div class="user-profile">
              <div class="user-avatar">${this.getInitials(this.currentUser.email)}</div>
              <div class="user-name">${this.currentUser.email}</div>
              <div class="user-logout"><i class="fas fa-sign-out-alt"></i></div>
            </div>
            
            <!-- Chat Type Tabs -->
            <div class="chat-tabs">
              <div class="chat-tab active" id="private-tab">Private</div>
              <div class="chat-tab" id="group-tab">Groups</div>
            </div>
            
            <!-- Group Management -->
            <div class="group-controls">
              <button class="create-group-btn" id="create-group-btn">
                <i class="fas fa-plus"></i> New Group
              </button>
            </div>
            
            <!-- Search Functionality -->
            <div class="search-container">
              <input type="text" class="search-input" placeholder="Search...">
            </div>
            
            <!-- Contacts/Groups List -->
            <div class="contacts-list" id="contacts-list"></div>
          </div>
          
          <!-- Main Chat Area -->
          <div class="chat-area">
            <div class="chat-header">
              <div class="chat-title" id="chat-title">Select a chat</div>
            </div>
            
            <!-- Messages Container -->
            <div class="chat-content" id="chat-content"></div>
            
            <!-- Message Input -->
            <div class="chat-input-container">
              <input type="text" class="chat-input" id="chat-input" placeholder="Type a message..." disabled>
              <div class="chat-send" id="chat-send" disabled><i class="fas fa-paper-plane"></i></div>
            </div>
          </div>
        </div>
      `;

      /**
       * ============================
       * TAB SWITCHING FUNCTIONALITY
       * ============================
       */
      document.getElementById('private-tab').addEventListener('click', () => {
        this.chatMode = 'private';
        // Update active tab styling
        document.querySelectorAll('.chat-tab').forEach(tab => tab.classList.remove('active'));
        document.getElementById('private-tab').classList.add('active');
        // Load private contacts
        this.loadContacts();
      });

      document.getElementById('group-tab').addEventListener('click', () => {
        this.chatMode = 'group';
        // Update active tab styling
        document.querySelectorAll('.chat-tab').forEach(tab => tab.classList.remove('active'));
        document.getElementById('group-tab').classList.add('active');
        // Load groups
        this.loadGroups();
      });

      /**
       * ======================
       * GROUP CREATION BUTTON
       * ======================
       */
      document.getElementById('create-group-btn').addEventListener('click', () => {
        this.showCreateGroupModal();
      });

      /**
       * =====================
       * LOGOUT FUNCTIONALITY
       * =====================
       */
      document.querySelector('.user-logout').addEventListener('click', () => {
        auth.signOut(); // Firebase signOut() automatically triggers auth state change
      });

      // Load initial contacts (starts in private chat mode)
      this.loadContacts();

      /**
       * =====================
       * SEARCH FUNCTIONALITY
       * =====================
       */
      document.querySelector('.search-input').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        document.querySelectorAll('.contact-item').forEach(contact => {
          const name = contact.querySelector('.contact-name').textContent.toLowerCase();
          // Simple show/hide based on search match
          contact.style.display = name.includes(searchTerm) ? 'flex' : 'none';
        });
      });

      /**
       * ==============================
       * MESSAGE SENDING FUNCTIONALITY
       * ==============================
       */
      const chatInput = document.getElementById('chat-input');
      
      // Send on Enter key
      chatInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter' && chatInput.value.trim() !== '') {
          this.sendMessage(chatInput.value);
          chatInput.value = ''; // Clear input
        }
      });

      // Send on button click
      document.getElementById('chat-send').addEventListener('click', () => {
        if (chatInput.value.trim() !== '') {
          this.sendMessage(chatInput.value);
          chatInput.value = ''; // Clear input
        }
      });
    }

    /**
     * ===================================
     * LOAD CONTACTS (FOR PRIVATE CHATS)
     * ===================================
     * Fetches and displays all available users for private messaging
     * 
     * Flow:
     * 1. Show loading indicator
     * 2. Fetch users from Firebase
     * 3. Filter out current user
     * 4. Render contact list
     * 5. Set up click handlers for each contact
     */
    loadContacts() {
      const contactsList = document.getElementById('contacts-list');
      // Show loading state
      contactsList.innerHTML = '<div class="loader"></div>';

      // Fetch all users from Firebase
      db.ref('users').once('value').then(snapshot => {
        contactsList.innerHTML = ''; // Clear loading state
        
        // Process each user in the snapshot
        snapshot.forEach(user => {
          // Skip current user (don't show yourself in contacts)
          if (user.key !== this.currentUser.uid) {
            // Create contact element
            const contact = document.createElement('div');
            contact.className = 'contact-item';
            contact.innerHTML = `
              <div class="contact-avatar">${this.getInitials(user.val().email)}</div>
              <div class="contact-name">${user.val().email}</div>
            `;
            
            /**
             * Contact Click Handler
             * 1. Marks contact as active
             * 2. Sets current chat partner
             * 3. Updates chat title
             * 4. Enables message input
             * 5. Loads messages
             */
            contact.addEventListener('click', () => {
              // Update active state
              document.querySelectorAll('.contact-item').forEach(item => item.classList.remove('active'));
              contact.classList.add('active');
              
              // Set current chat state
              this.currentChat = user.key;
              this.chatMode = 'private';
              document.getElementById('chat-title').textContent = user.val().email;
              document.getElementById('chat-input').disabled = false; // Enable input
              this.loadMessages(); // Load conversation
            });
            
            // Add contact to the list
            contactsList.appendChild(contact);
          }
        });
      });
    }
    
    /**
     * ============
     * LOAD GROUPS
     * ============
     * Fetches and displays all groups the current user belongs to
     * 
     * Firebase Query Explanation:
     * - orderByChild(`members/${this.currentUser.uid}`) = Looks in each group's members
     * - equalTo(true) = Only includes groups where current user is a member
     */
    loadGroups() {
      const contactsList = document.getElementById('contacts-list');
      contactsList.innerHTML = '<div class="loader"></div>';

      // Query groups where current user is a member
      db.ref('groups')
        .orderByChild(`members/${this.currentUser.uid}`)
        .equalTo(true)
        .once('value')
        .then(snapshot => {
          contactsList.innerHTML = ''; // Clear loading state
          
          // Handle empty state (no groups)
          if (!snapshot.exists()) {
            contactsList.innerHTML = '<div style="text-align: center; padding: 20px;">No groups yet. Create one!</div>';
            return;
          }

          // Process each group
          snapshot.forEach(group => {
            const groupItem = document.createElement('div');
            groupItem.className = 'contact-item';
            groupItem.innerHTML = `
              <div class="contact-avatar"><i class="fas fa-users"></i></div>
              <div class="contact-name">${group.val().name}</div>
            `;
            
            /**
             * Group Click Handler
             * 1. Marks group as active
             * 2. Sets current group
             * 3. Updates chat title
             * 4. Enables message input
             * 5. Loads group messages
             * 6. Shows group info
             */
            groupItem.addEventListener('click', () => {
              // Update active state
              document.querySelectorAll('.contact-item').forEach(item => item.classList.remove('active'));
              groupItem.classList.add('active');
              
              // Set current group state
              this.currentGroup = group.key;
              this.chatMode = 'group';
              document.getElementById('chat-title').textContent = group.val().name;
              document.getElementById('chat-input').disabled = false; // Enable input
              this.loadGroupMessages(); // Load messages
              this.showGroupInfo(group.val()); // Show group info
            });
            
            contactsList.appendChild(groupItem);
          });
        });
    }

    /**
     * ========================
     * SHOW CREATE GROUP MODAL
     * ========================
     * Displays a modal dialog for creating new groups
     * 
     * Features:
     * - Group name input
     * - Member selection checklist
     * - Validation
     * - Creation handling
     */
    showCreateGroupModal() {
      // Prevent multiple modals
      if (document.querySelector('.modal')) return;
    
      // Create modal element
      const modal = document.createElement('div');
      modal.className = 'modal active';
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
      
      /**
       * =======================
       * MEMBER SELECTION LIST
       * ========================
       */
      db.ref('users').once('value').then(snapshot => {
        const membersContainer = document.getElementById('available-members');
        membersContainer.innerHTML = '';
        
        // Process each user
        snapshot.forEach(user => {
          // Skip current user (you're automatically added to groups you create)
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
    
      /**
       * =============================
       * CREATE GROUP BUTTON HANDLER
       * =============================
       */
      document.getElementById('confirm-create-group').addEventListener('click', () => {
        const groupName = document.getElementById('group-name-input').value;
        const checkboxes = document.querySelectorAll('.member-option input:checked');
        
        // Validation
        if (!groupName || checkboxes.length === 0) {
          alert('Please enter a group name and select at least one member');
          return;
        }
    
        // Prepare members object (always include current user)
        const members = { [this.currentUser.uid]: true };
        checkboxes.forEach(checkbox => {
          members[checkbox.value] = true;
        });
    
        // Create the group
        this.createGroup(groupName, members);
        document.body.removeChild(modal);
      });
    
      /**
       * ================================================================
       * CANCEL BUTTON HANDLER
       * ================================================================
       */
      document.getElementById('cancel-create-group').addEventListener('click', () => {
        document.body.removeChild(modal);
      });
    
      /**
       * ================================================================
       * CLICK OUTSIDE TO CLOSE MODAL
       * ================================================================
       */
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          document.body.removeChild(modal);
        }
      });
    }

    /**
     * ==================================================================
     * CREATE GROUP IN DATABASE
     * ==================================================================
     * @param {string} groupName - Name of the new group
     * @param {object} members - Object with member IDs as keys
     * 
     * Firebase Note:
     * - push() generates a unique ID for the new group
     * - ServerValue.TIMESTAMP uses Firebase server time
     */
    createGroup(groupName, members) {
      const groupRef = db.ref('groups').push();
      groupRef.set({
        name: groupName,
        members: members,
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        createdBy: this.currentUser.uid
      }).then(() => {
        this.loadGroups(); // Refresh groups list
      });
    }

    /**
     * ==================================================================
     * SHOW GROUP INFO
     * ==================================================================
     * Displays information about the current group
     * @param {object} groupData - Group data from Firebase
     */
    showGroupInfo(groupData) {
      const chatContent = document.getElementById('chat-content');
      const infoDiv = document.createElement('div');
      infoDiv.className = 'group-info';
      
      let membersHtml = '';
      // Generate HTML for each member
      Object.keys(groupData.members).forEach(uid => {
        membersHtml += `<span class="member-tag">${uid === this.currentUser.uid ? 'You' : uid}</span>`;
      });
      
      // Build group info HTML
      infoDiv.innerHTML = `
        <h4>Group Info</h4>
        <p>Created: ${new Date(groupData.createdAt).toLocaleString()}</p>
        <div class="group-members">${membersHtml}</div>
      `;
      
      // Clear chat content and add group info
      chatContent.innerHTML = '';
      chatContent.appendChild(infoDiv);
    }

    /**
     * =============================
     * LOAD MESSAGES (PRIVATE CHAT)
     * =============================
     * Fetches and displays messages for the current 1:1 conversation
     * 
     * Firebase Query Explanation:
     * - orderByChild('conversationId') = Indexes messages by conversationId
     * - equalTo(this.getConversationId()) = Only gets messages for this conversation
     */
    loadMessages() {
      const chatContent = document.getElementById('chat-content');
      chatContent.innerHTML = '<div class="loader"></div>';

      // Set up real-time listener for messages
      db.ref('messages')
        .orderByChild('conversationId')
        .equalTo(this.getConversationId())
        .on('value', snapshot => {
          chatContent.innerHTML = ''; // Clear loading state
          
          // Handle empty state
          if (!snapshot.exists()) {
            chatContent.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">No messages yet. Start the conversation!</div>';
            return;
          }
          
          // Collect messages in array for sorting
          const messages = [];
          snapshot.forEach(child => {
            messages.push(child.val());
          });
          
          // Sort by timestamp (oldest first)
          messages.sort((a, b) => a.timestamp - b.timestamp);
          
          // Display each message
          messages.forEach(msg => {
            const isSent = msg.senderId === this.currentUser.uid;
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${isSent ? 'message-sent' : 'message-received'}`;
            
            // Format timestamp
            const msgTime = new Date(msg.timestamp);
            const timeString = msgTime.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit'
            });
            
            // Build message HTML
            messageDiv.innerHTML = `
              <div class="message-sender">${isSent ? 'You' : msg.senderEmail}</div>
              <div class="message-bubble">${msg.text}</div>
              <div class="message-time">${timeString}</div>
            `;
            
            chatContent.appendChild(messageDiv);
          });
          
          // Auto-scroll to bottom
          chatContent.scrollTop = chatContent.scrollHeight;
        });
    }

    /**
     * ====================
     * LOAD GROUP MESSAGES
     * ====================
     * Fetches and displays messages for the current group
     * 
     * Important: Manages Firebase listener to prevent duplicates
     */
    loadGroupMessages() {
      const chatContent = document.getElementById('chat-content');
      
      // Preserve group info if it exists
      const existingInfo = chatContent.querySelector('.group-info');
      chatContent.innerHTML = '';
      if (existingInfo) chatContent.appendChild(existingInfo);
      
      // Remove previous listener if exists (prevent duplicates)
      if (this.groupMessagesListener) {
        db.ref(`groupMessages/${this.currentGroup}`).off('value', this.groupMessagesListener);
      }
      
      // Set up new listener and store reference
      this.groupMessagesListener = db.ref(`groupMessages/${this.currentGroup}`)
        .on('value', (snapshot) => {
          if (!snapshot.exists()) return;
          
          // Preserve group info during refresh
          const currentInfo = chatContent.querySelector('.group-info');
          chatContent.innerHTML = '';
          if (currentInfo) chatContent.appendChild(currentInfo);
          
          // Collect messages
          const messages = [];
          snapshot.forEach(child => {
            messages.push({ id: child.key, ...child.val() });
          });
          
          // Sort by timestamp
          messages.sort((a, b) => a.timestamp - b.timestamp);
          
          // Display each message
          messages.forEach(msg => {
            const isSent = msg.sender === this.currentUser.uid;
            const messageDiv = document.createElement('div');
            messageDiv.className = `group-message ${isSent ? 'message-sent' : 'message-received'}`;
            
            // Format timestamp
            const msgTime = new Date(msg.timestamp);
            const timeString = msgTime.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit'
            });
            
            // Build message HTML
            messageDiv.innerHTML = `
              <div class="group-message-sender">${isSent ? 'You' : msg.senderEmail}</div>
              <div class="group-message-content">${msg.text}</div>
              <div class="message-time">${timeString}</div>
            `;
            
            chatContent.appendChild(messageDiv);
          });
          
          // Auto-scroll to bottom
          chatContent.scrollTop = chatContent.scrollHeight;
        });
    }

    /**
     * ==========================
     * GENERATE CONVERSATION ID
     * ==========================
     * Creates a unique ID for private conversations by combining user IDs
     * 
     * @return {string} Sorted, concatenated user IDs
     * Example: user1_abc and user2_xyz -> abc_xyz
     */
    getConversationId() {
      const users = [this.currentUser.uid, this.currentChat].sort();
      return users.join('_');
    }

    /**
     * =============
     * SEND MESSAGE
     * =============
     * Handles sending messages for both private and group chats
     * @param {string} text - The message text to send
     */
    sendMessage(text) {
      if (!text.trim()) return; // Don't send empty messages
      
      if (this.chatMode === 'private') {
        // PRIVATE MESSAGE LOGIC
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
        // GROUP MESSAGE LOGIC
        
        // Disable input during send to prevent duplicates
        const chatInput = document.getElementById('chat-input');
        chatInput.disabled = true;
        
        db.ref(`groupMessages/${this.currentGroup}`).push({
          sender: this.currentUser.uid,
          senderEmail: this.currentUser.email,
          text: text,
          timestamp: firebase.database.ServerValue.TIMESTAMP
        }).then(() => {
          // Re-enable input after successful send
          chatInput.disabled = false;
          chatInput.focus(); // Return focus to input
        }).catch((error) => {
          console.error("Error sending message:", error);
          // Re-enable input even if error occurs
          chatInput.disabled = false;
        });
      }
    }
  }

  // START THE APPLICATION
  new ChatApp();
};