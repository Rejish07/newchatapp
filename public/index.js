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
  
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    const db = firebase.database();
    const auth = firebase.auth();
  
    class ChatApp {
      constructor() {
        this.currentUser = null;
        this.currentChat = null;
        this.init();
      }
  
      init() {
        // Check auth state
        auth.onAuthStateChanged((user) => {
          if (user) {
            this.currentUser = user;
            this.mainPage();
          } else {
            this.authPage();
          }
        });
      }
  
      // Auth Page
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
  
        const authBox = document.getElementById('auth-box');
        const authToggle = document.getElementById('auth-toggle');
        const authSubmit = document.getElementById('auth-submit');
        let isLogin = true;
  
        // Toggle between login and signup
        authToggle.addEventListener('click', () => {
          isLogin = !isLogin;
          if (isLogin) {
            authSubmit.textContent = 'Sign In';
            authToggle.textContent = 'Sign Up';
          } else {
            authSubmit.textContent = 'Sign Up';
            authToggle.textContent = 'Sign In';
          }
        });
  
        // Handle auth submit
        authSubmit.addEventListener('click', () => {
          const email = document.getElementById('auth-email').value;
          const password = document.getElementById('auth-password').value;
  
          if (!email || !password) {
            alert('Please enter email and password');
            return;
          }
  
          if (isLogin) {
            auth.signInWithEmailAndPassword(email, password)
              .catch(error => {
                alert(error.message);
              });
          } else {
            auth.createUserWithEmailAndPassword(email, password)
              .then((userCredential) => {
                // Create user profile in database
                return db.ref('users/' + userCredential.user.uid).set({
                  email: email,
                  createdAt: firebase.database.ServerValue.TIMESTAMP
                });
              })
              .catch(error => {
                alert(error.message);
              });
          }
        });
      }
  
      // Main Page
      mainPage() {
        document.body.innerHTML = `
          <div class="main-container">
            <!-- Sidebar -->
            <div class="sidebar">
              <div class="user-profile">
                <div class="user-avatar">${this.getInitials(this.currentUser.email)}</div>
                <div class="user-name">${this.currentUser.email}</div>
                <div class="user-logout"><i class="fas fa-sign-out-alt"></i></div>
              </div>
              
              <div class="search-container">
                <input type="text" class="search-input" placeholder="Search contacts...">
              </div>
              
              <div class="contacts-title">CONTACTS</div>
              <div class="contacts-list" id="contacts-list"></div>
            </div>
            
            <!-- Chat Area -->
            <div class="chat-area">
              <div class="chat-header">
                <div class="chat-title" id="chat-title">Select a contact to chat</div>
              </div>
              
              <div class="chat-content" id="chat-content"></div>
              
              <div class="chat-input-container">
                <input type="text" class="chat-input" id="chat-input" placeholder="Type a message..." disabled>
                <div class="chat-send" id="chat-send" disabled><i class="fas fa-paper-plane"></i></div>
              </div>
            </div>
          </div>
        `;
  
        // Logout button
        document.querySelector('.user-logout').addEventListener('click', () => {
          auth.signOut();
        });
  
        // Load contacts
        this.loadContacts();
  
        // Search functionality
        document.querySelector('.search-input').addEventListener('input', (e) => {
          const searchTerm = e.target.value.toLowerCase();
          const contacts = document.querySelectorAll('.contact-item');
          
          contacts.forEach(contact => {
            const name = contact.querySelector('.contact-name').textContent.toLowerCase();
            if (name.includes(searchTerm)) {
              contact.style.display = 'flex';
            } else {
              contact.style.display = 'none';
            }
          });
        });
  
        // Send message
        const chatInput = document.getElementById('chat-input');
        const chatSend = document.getElementById('chat-send');
  
        chatInput.addEventListener('keyup', (e) => {
          if (e.key === 'Enter' && chatInput.value.trim() !== '') {
            this.sendMessage(chatInput.value);
            chatInput.value = '';
          }
        });
  
        chatSend.addEventListener('click', () => {
          if (chatInput.value.trim() !== '') {
            this.sendMessage(chatInput.value);
            chatInput.value = '';
          }
        });
      }
  
      // Get initials from email
      getInitials(email) {
        return email.charAt(0).toUpperCase();
      }
  
      // Load contacts
      loadContacts() {
        const contactsList = document.getElementById('contacts-list');
        contactsList.innerHTML = '<div class="loader"></div>';
  
        // In a real app, you would have a proper contacts system
        // For demo, we'll just show all users except current user
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
                // Set active chat
                document.querySelectorAll('.contact-item').forEach(item => {
                  item.classList.remove('active');
                });
                contact.classList.add('active');
                
                this.currentChat = user.key;
                document.getElementById('chat-title').textContent = user.val().email;
                document.getElementById('chat-input').disabled = false;
                this.loadMessages();
              });
              
              contactsList.appendChild(contact);
            }
          });
        });
      }
  
      // Load messages
      loadMessages() {
        const chatContent = document.getElementById('chat-content');
        chatContent.innerHTML = '<div class="loader"></div>';
  
        // Get messages between current user and selected contact
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
          
          // Sort by timestamp
          messages.sort((a, b) => a.timestamp - b.timestamp);
          
          // Display messages
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
          
          // Scroll to bottom
          chatContent.scrollTop = chatContent.scrollHeight;
        });
      }
  
      // Generate conversation ID (always the same for two users)
      getConversationId() {
        const users = [this.currentUser.uid, this.currentChat].sort();
        return users.join('_');
      }
  
      // Send message
      sendMessage(text) {
        if (!this.currentChat || !text.trim()) return;
        
        // Get receiver's email
        db.ref('users/' + this.currentChat).once('value').then(snapshot => {
          const receiverEmail = snapshot.val().email;
          
          // Create message
          const newMessage = {
            senderId: this.currentUser.uid,
            senderEmail: this.currentUser.email,
            receiverId: this.currentChat,
            receiverEmail: receiverEmail,
            text: text,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            conversationId: this.getConversationId()
          };
          
          // Save to database
          db.ref('messages').push(newMessage);
        });
      }
    }
  
    // Initialize the app
    new ChatApp();
  };