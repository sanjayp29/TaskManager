import {
    auth,
    db,
    updateProfile,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    collection,
    addDoc,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy
} from './firebase-config.js';

// Global variables
export let boards = [];
let currentBoard = null;
let currentEditingTask = null;
let currentTaskColumn = null;
export let currentUser = null;

// Initialise the following things when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    initializeLoginForm();
    initializeSignupForm();
    document.getElementById('createFirstBoardBtn')?.addEventListener('click', createBoardModal);
    document.getElementById('newBoardBtn')?.addEventListener('click', createBoardModal);

    const loadingScreen = document.getElementById('loading-screen');
    const appUI = document.getElementById('app-ui');

    // it will hide the appUI container until firebase responds
    appUI.style.display = 'none';

    // onAuthStateChanged is a firebase function, helps in changing ui when the user is logged in or signed out
    onAuthStateChanged(auth, (user) => {
        loadingScreen.style.display = 'none';
        appUI.style.display = 'block';

        currentUser = user;
        if (user) {
            console.log("User logged in:", user.email);
            updateBoardsDropdown();
            loadUserBoards();
            document.getElementById("auth-section").classList.add("hidden");
            document.getElementById("user-section").style.display = "block";
            document.getElementById("username-display").textContent = user.displayName || "User";
            document.getElementById("board-management").style.display = "flex";
        } else {
            currentUser = null;
            console.log("No user logged in.");

            //below functions will clear the ui when there is not any login found
            document.getElementById("user-section").style.display = "none";
            document.getElementById("auth-section").classList.remove("hidden");
            document.getElementById("username-display").textContent = "User";
            document.getElementById("board-management").style.display = "none";


            const dropdown = document.getElementById("boards-dropdown");
            if (dropdown) dropdown.innerHTML = '';

            const boardTitle = document.getElementById("board-title");
            const boardDesc = document.getElementById("board-description");
            if (boardTitle) boardTitle.textContent = '';
            if (boardDesc) boardDesc.textContent = '';

            boards = [];
        }
    });

    //it will set up particular modals when the DOM is loaded and clear the forms
    setupModalEventListeners();
});

function setupModalEventListeners() {
    // Clear forms when modals are hidden
    document.getElementById('createBoardModal').addEventListener('hidden.bs.modal', () => {
        document.getElementById('create-board-form').reset();
    });

    document.getElementById('createTaskModal').addEventListener('hidden.bs.modal', () => {
        document.getElementById('create-task-form').reset();
        currentTaskColumn = null;
    });

    document.getElementById('editTaskModal').addEventListener('hidden.bs.modal', () => {
        document.getElementById('edit-task-form').reset();
        currentEditingTask = null;
    });

    document.getElementById('loginModal').addEventListener('hidden.bs.modal', () => {
        document.getElementById('login-form').reset();
    });

    document.getElementById('signupModal').addEventListener('hidden.bs.modal', () => {
        document.getElementById('signup-form').reset();
    });

    // below is an arrow function which enables enter key to trigger seaarch tasks
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchTasks();
        }
    });

    // Clear search when input is empty
    document.getElementById('search-input').addEventListener('input', (e) => {
        if (e.target.value.trim() === '') {
            document.querySelectorAll('.task-card.highlighted').forEach(card => {
                card.classList.remove('highlighted');
            });
        }
    });
}

//Authentication Functions
function showLoginModal() {
    const modal = new bootstrap.Modal(document.getElementById('loginModal'));
    modal.show();
}

function showSignupModal() {
    const modal = new bootstrap.Modal(document.getElementById('signupModal'));
    modal.show();
}

// Initialize login form
function initializeLoginForm() {
    const loginForm = document.getElementById('login-form');
    const loginButton = document.querySelector('#loginModal .btn-primary');

    if (loginButton) {
        loginButton.addEventListener('click', handleLogin);
    }

    // below function handles the enter key press in login form
    if (loginForm) {
        loginForm.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleLogin();
            }
        });
    }
}

// Initialize signup form
function initializeSignupForm() {
    const signupForm = document.getElementById('signup-form');
    const signupButton = document.querySelector('#signupModal .btn-primary');

    if (signupButton) {
        signupButton.addEventListener('click', handleSignup);
    }

    // below function handles the enter key press in signup form
    if (signupForm) {
        signupForm.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSignup();
            }
        });
    }
}

// the handleLogin() function will handle login form submission
async function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const loginButton = document.querySelector('#loginModal .btn-primary');

    // Validation of the email and password will take place here.
    if (!email || !password) {
        showFormError('loginModal', 'Please fill in all fields.');
        return;
    }

    if (!isValidEmail(email)) {
        showFormError('loginModal', 'Please enter a valid email address.');
        return;
    }

    // Show the button loading state
    setButtonLoading(loginButton, true, 'Signing in...');
    clearFormErrors('loginModal');


    try {

        // the function signInWithEmailAndPassword() will help in signing in with Firebase
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log("login successfully")

        if (user) {

            //if login is successful
            // Hide auth/login section
            document.getElementById("auth-section").classList.add("hidden");

            // shows the user dropdown section
            document.getElementById("user-section").style.display = "block";

            // Show username in the navbar
            document.getElementById('username-display').textContent = user.displayName;

            //show the board management containing my boards and add new board
            document.getElementById('board-management').style.display = 'flex';
        }

        // it will the form after login
        clearLoginForm();

        // it will close the modal after login
        const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
        if (loginModal) loginModal.hide();

    } catch (error) {
        console.error('Login error:', error);

        // switch-case for handling specific firebase error codes and showing respective error to the user.
        let errorMessage = 'Login failed. Please try again.';

        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'No account found with this email address.';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Incorrect password. Please try again.';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Too many failed attempts. Please try again later.';
                break;
            case 'auth/user-disabled':
                errorMessage = 'This account has been disabled.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Invalid email address.';
                break;
            case 'auth/invalid-login-credentials':
                errorMessage = 'You entered password.';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Check your internet connection.';
                break;
            case 'auth/invalid-credential':
                errorMessage = 'Account with this email does not exist. Signup first.';
                break;
            default:
                errorMessage = error.message || errorMessage;
        }

        showFormError('loginModal', errorMessage);
    } finally {
        // Reset button state
        setButtonLoading(loginButton, false, 'Login');
    }
}

// The handlesignup() function will handle signup form submission
async function handleSignup() {
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    const signupButton = document.querySelector('#signupModal .btn-primary');

    // Validating the inputs from the user by checking the conditions
    if (!name || !email || !password || !confirmPassword) {
        showFormError('signupModal', 'Please fill in all fields.');
        return;
    }

    if (!isValidEmail(email)) {
        showFormError('signupModal', 'Please enter a valid email address.');
        return;
    }

    if (password.length < 6) {
        showFormError('signupModal', 'Password must be at least 8 characters long.');
        return;
    }

    if (!isStrongPassword(password)) {
        showFormError('signupModal', 'Password must contain at least six digits , one letter and one digit');
        return;
    }

    if (password !== confirmPassword) {
        showFormError('signupModal', 'Passwords do not match.');
        return;
    }

    // Show the button loading state
    setButtonLoading(signupButton, true, 'Creating Account...');
    clearFormErrors('signupModal');
    try {

        // the createUserWithEmailAndPassword will help in creating user account with Firebase
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        //the updateProfile will help in updating user profile and display the user name
        await updateProfile(user, {
            displayName: name
        });
        alert("Account Created Successfully!, You can now log in");
        console.log("signup successfully")

        // it will create the signup form after the signup success
        clearSignupForm();

        // Closing the modal of signup
        const signupModal = bootstrap.Modal.getInstance(document.getElementById('signupModal'));
        if (signupModal) signupModal.hide();

    } catch (error) {
        console.error('Signup error:', error);

        // switch-case for handling specific firebase error codes and showing respective error to the user.
        let errorMessage = 'Account creation failed. Please try again.';

        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'An account with this email already exists.';
                break;
            case 'auth/weak-password':
                errorMessage = 'Password is too weak. Please choose a stronger password.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Invalid email address.';
                break;
            case 'auth/operation-not-allowed':
                errorMessage = 'Email/password accounts are not enabled.';
                break;
            case 'auth/invalid-login-credentials':
                errorMessage = 'You entered wrong email or password.';
                break;
            default:
                errorMessage = error.message || errorMessage;
        }

        showFormError('signupModal', errorMessage);
    } finally {
        // Reset the loading button state to normal
        setButtonLoading(signupButton, false, 'Create Account');
    }
}

// validating the email format using regex
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// validating the password to be strong accordingly
function isStrongPassword(password) {
    // At least 6 characters, 1 letter, 1 digit
    const strongPasswordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
    return strongPasswordRegex.test(password);
}

// function to show form errors inside the modal body
function showFormError(modalId, message) {
    const modal = document.getElementById(modalId);
    const modalBody = modal.querySelector('.modal-body');

    // Remove existing error messages
    const existingErrors = modal.querySelectorAll('.alert-primary');
    existingErrors.forEach(error => error.remove());

    // Create and show new error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-primary alert-dismissible fade show';
    errorDiv.innerHTML = `
                        ${message}
                        <button type="button"  class="btn-close" data-bs-dismiss="alert"></button>
                    `;
    // insertBefore will help to insert the error before the start of modal body
    modalBody.insertBefore(errorDiv, modalBody.firstChild);
}

// function to clear the form errors
function clearFormErrors(modalId) {
    const modal = document.getElementById(modalId);
    const errors = modal.querySelectorAll('.alert-primary');
    errors.forEach(error => error.remove());
}

// function to set the button on loading state.
function setButtonLoading(button, isLoading, text) {
    if (isLoading) {
        button.disabled = true;
        button.innerHTML = `
                            <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                            ${text}
                        `;
    } else {
        button.disabled = false;
        button.innerHTML = text;
    }
}

// fn to clear the login form
function clearLoginForm() {
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    clearFormErrors('loginModal');
}

// same to clear signup form
function clearSignupForm() {
    document.getElementById('signup-name').value = '';
    document.getElementById('signup-email').value = '';
    document.getElementById('signup-password').value = '';
    document.getElementById('signup-confirm-password').value = '';
    clearFormErrors('signupModal');
}

//clearing the login and signup forms when modals are hidden
document.addEventListener('DOMContentLoaded', function () {
    const loginModal = document.getElementById('loginModal');
    const signupModal = document.getElementById('signupModal');

    if (loginModal) {
        loginModal.addEventListener('hidden.bs.modal', clearLoginForm);
    }

    if (signupModal) {
        signupModal.addEventListener('hidden.bs.modal', clearSignupForm);
    }
});

//function to logout from the site
document.querySelector('#logout')?.addEventListener('click', () => {
    signOut(auth)
        .then(() => {
            // below function will reset the user-interface
            document.getElementById('welcome-screen').style.display = 'flex';
            document.getElementById("user-section").style.display = "none";
            document.getElementById("auth-section").classList.remove("hidden");
            document.getElementById("username-display").textContent = "User";

            //adding classList to board header as d-none
            document.getElementById('board-header').classList.remove('d-flex');
            document.getElementById('board-header').classList.add('d-none');


            // to hide the board-management
            const boardManagement = document.getElementById('board-management');
            if (boardManagement) boardManagement.style.display = 'none';

            // to clear the boards-dropdown
            const dropdown = document.getElementById('boards-dropdown');
            if (dropdown) dropdown.innerHTML = '';

            // it will clear the board-title and board-description after logout
            const boardTitle = document.getElementById('board-title');
            const boardDesc = document.getElementById('board-description');
            if (boardTitle) boardTitle.textContent = '';
            if (boardDesc) boardDesc.textContent = '';

            // clear memory assigned
            boards = [];
            currentBoard = null;
            location.reload();
            alert("You have been logged out.");
        })
        .catch((error) => {
            console.error("Logout Error:", error);
            alert("Logout failed. Please try again.");
        });
});

//board management things
//fn to show create board modal or login modal on condition whether user is logged in or not respectively
function createBoardModal() {
    if (!currentUser) {
        alert("Please login to create a board");
        showLoginModal();
        return;
    }

    // Open the Bootstrap modal
    const modalElement = document.getElementById('createBoardModal');
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
}

//fn to implement the create board functionality
async function createBoard() {
    console.log("create board clicked");
    if (!currentUser) {
        alert('Please login to create a board');
        const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
        loginModal.show();

        return;
    }
    document.getElementById('board-header').classList.remove('hidden');
    const name = document.getElementById('board-name').value.trim();
    const description = document.getElementById('board-desc').value.trim();

    if (!name) {
        alert('Please enter a board name');
        return;
    }

    try {
        const newBoard = {
            name: name,
            description: description,
            userId: currentUser.uid,
            columns: [
                { id: 'todo', name: 'To Do', tasks: [] },
                { id: 'inprogress', name: 'In Progress', tasks: [] },
                { id: 'done', name: 'Done', tasks: [] }
            ],
            createdAt: new Date().toISOString()
        };

        // add the board to the database of firebase(firestore)
        const docRef = await addDoc(collection(db, 'boards'), newBoard);
        newBoard.id = docRef.id;

        // also add it to the local board 
        boards.push(newBoard);
        console.log("board created");

        //update the ui
        updateBoardsDropdown(); // to refresh dropdown
        loadBoard(newBoard.id); // to load selected board

        //to hide the modal and resetting the form
        const modal = bootstrap.Modal.getInstance(document.getElementById('createBoardModal'));
        if (modal) modal.hide();
        document.getElementById('create-board-form').reset();

    } catch (error) {
        console.error('Error creating board: ', error);
        alert('Error creating board. Please try again.');
    }
}

//to load the user boards by running query on the database of firebase
async function loadUserBoards() {
    if (!currentUser) return;

    try {
        const q = query(
            collection(db, 'boards'),
            where('userId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        boards = [];

        querySnapshot.forEach((doc) => {
            boards.push({ id: doc.id, ...doc.data() });
        });

        updateBoardsDropdown();
        document.getElementById('board-management').style.display = 'block';

        if (boards.length > 0) {
            loadBoard(boards[0].id);
        } else {
            showWelcomeScreen();
        }
    } catch (error) {
        console.error('Error loading boards: ', error);
    }
}

//fn to load the specific board, it takes input of boardId
export function loadBoard(boardId) {
    currentBoard = boards.find(b => b.id === boardId);
    if (!currentBoard) return;

    // // Hide welcome screen and show board view
    document.getElementById('welcome-screen').style.display = 'none';
    document.getElementById('board-view').style.display = 'block';
    document.getElementById('board-header').classList.remove('d-none');
    document.getElementById('board-header').classList.add('d-flex');

    document.getElementById('board-management').style.display = 'block';

    // Update board header
    document.getElementById('board-header').classList.remove('hidden');
    document.getElementById('board-title').textContent = currentBoard.name;
    document.getElementById('board-description').textContent = currentBoard.description;

    // Render columns
    renderColumns();
}

//fn to render columns if contained by the board
function renderColumns() {
    const container = document.getElementById('columns-container');
    container.innerHTML = '';

    currentBoard.columns.forEach(column => {
        const columnDiv = document.createElement('div');
        columnDiv.className = 'col-12 col-sm-6 col-md-4 col-lg-3';
        columnDiv.innerHTML = `
            <div class="column" data-column-id="${column.id}">
                <div class="column-header">
                    <h5 class="column-title">${column.name}</h5>
                    <div class="column-actions">
                        <button class="btn-column-action" onclick="editColumnName('${column.id}')" title="Edit column">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-column-action" onclick="deleteColumn('${column.id}')" title="Delete column">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="task-list" ondrop="dropTask(event)" ondragover="allowDrop(event)">
                    ${column.tasks.map(task => createTaskHTML(task, column.id)).join('')}
                    <button class="add-task-btn" onclick="showCreateTaskModal('${column.id}')">
                        <i class="fas fa-plus me-2"></i>
                        Add a task
                    </button>
                </div>
            </div>
        `;
        container.appendChild(columnDiv);
    });
}

//fns for the handling of Task Management
function showCreateTaskModal(columnId) {
    currentTaskColumn = columnId;
    const modal = new bootstrap.Modal(document.getElementById('createTaskModal'));
    modal.show();
}

//fn for the creation of the task
async function createTask() {
    const title = document.getElementById('task-title').value.trim();
    const description = document.getElementById('task-description').value.trim();
    const priority = document.getElementById('task-priority').value;
    const dueDate = document.getElementById('task-due-date').value;

    if (!title) {
        alert('Please enter a task title');
        return;
    }

    try {
        const newTask = {
            id: Date.now().toString(),
            title: title,
            description: description,
            priority: priority,
            dueDate: dueDate,
            createdAt: new Date().toISOString()
        };

        const column = currentBoard.columns.find(c => c.id === currentTaskColumn);
        column.tasks.push(newTask);

        // Update board in Firestore
        await updateDoc(doc(db, 'boards', currentBoard.id), {
            columns: currentBoard.columns
        });

        renderColumns();

        // Close modal and reset form
        const modal = bootstrap.Modal.getInstance(document.getElementById('createTaskModal'));
        modal.hide();
        document.getElementById('create-task-form').reset();

        // Add animation to new task
        setTimeout(() => {
            const taskElement = document.querySelector(`[data-task-id="${newTask.id}"]`);
            if (taskElement) {
                taskElement.classList.add('new-task');
            }
        }, 100);
    } catch (error) {
        console.error('Error creating task: ', error);
        alert('Error creating task. Please try again.');
    }
}

//fn for the editing of the task
function editTask(taskId) {
    // Find the task in current board
    let task = null;
    let columnId = null;

    for (const column of currentBoard.columns) {
        const foundTask = column.tasks.find(t => t.id === taskId);
        if (foundTask) {
            task = foundTask;
            columnId = column.id;
            break;
        }
    }

    if (!task) return;

    currentEditingTask = { taskId, columnId };

    // Populate edit form
    document.getElementById('edit-task-title').value = task.title;
    document.getElementById('edit-task-description').value = task.description || '';
    document.getElementById('edit-task-priority').value = task.priority;
    document.getElementById('edit-task-due-date').value = task.dueDate || '';

    const modal = new bootstrap.Modal(document.getElementById('editTaskModal'));
    modal.show();
}

//fn for the updation of the task
async function updateTask() {
    if (!currentEditingTask) return;

    const title = document.getElementById('edit-task-title').value.trim();
    const description = document.getElementById('edit-task-description').value.trim();
    const priority = document.getElementById('edit-task-priority').value;
    const dueDate = document.getElementById('edit-task-due-date').value;

    if (!title) {
        alert('Please enter a task title');
        return;
    }

    try {
        const column = currentBoard.columns.find(c => c.id === currentEditingTask.columnId);
        const task = column.tasks.find(t => t.id === currentEditingTask.taskId);

        if (task) {
            task.title = title;
            task.description = description;
            task.priority = priority;
            task.dueDate = dueDate;
            task.updatedAt = new Date().toISOString();

            // Update board in Firestore
            await updateDoc(doc(db, 'boards', currentBoard.id), {
                columns: currentBoard.columns
            });

            renderColumns();
        }

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editTaskModal'));
        modal.hide();
        currentEditingTask = null;
    } catch (error) {
        console.error('Error updating task: ', error);
        alert('Error updating task. Please try again.');
    }
}

//fn for the deletion of a particular task
async function deleteTask() {
    if (!currentEditingTask) return;

    showConfirmation(
        'Delete Task',
        'Are you sure you want to delete this task? This action cannot be undone.',
        async () => {
            try {
                const column = currentBoard.columns.find(c => c.id === currentEditingTask.columnId);
                const taskIndex = column.tasks.findIndex(t => t.id === currentEditingTask.taskId);

                if (taskIndex > -1) {
                    column.tasks.splice(taskIndex, 1);

                    // Update board in Firestore
                    await updateDoc(doc(db, 'boards', currentBoard.id), {
                        columns: currentBoard.columns
                    });

                    renderColumns();
                }

                // Close edit modal
                const editModal = bootstrap.Modal.getInstance(document.getElementById('editTaskModal'));
                editModal.hide();
                currentEditingTask = null;
            } catch (error) {
                console.error('Error deleting task: ', error);
                alert('Error deleting task. Please try again.');
            }
        }
    );
}

// column management functions
//fn to add new column
async function addNewColumn() {
    const columnName = prompt('Enter column name:');
    if (!columnName || !columnName.trim()) return;

    try {
        const newColumn = {
            id: Date.now().toString(),
            name: columnName.trim(),
            tasks: []
        };

        currentBoard.columns.push(newColumn);

        // Update board in Firestore
        await updateDoc(doc(db, 'boards', currentBoard.id), {
            columns: currentBoard.columns
        });

        renderColumns();
    } catch (error) {
        console.error('Error adding column: ', error);
        alert('Error adding column. Please try again.');
    }
}

//fn to edit column name
async function editColumnName(columnId) {
    const column = currentBoard.columns.find(c => c.id === columnId);
    if (!column) return;

    const newName = prompt('Enter new column name:', column.name);
    if (!newName || !newName.trim()) return;

    try {
        column.name = newName.trim();

        // update board in the database of firebase
        await updateDoc(doc(db, 'boards', currentBoard.id), {
            columns: currentBoard.columns
        });

        renderColumns();
    } catch (error) {
        console.error('Error updating column: ', error);
        alert('Error updating column. Please try again.');
    }
}

//fn to delete a particular column by taking column id as input
async function deleteColumn(columnId) {
    const column = currentBoard.columns.find(c => c.id === columnId);
    if (!column) return;

    const message = column.tasks.length > 0
        ? `This column contains ${column.tasks.length} task(s). Are you sure you want to delete it?`
        : 'Are you sure you want to delete this column?';

    showConfirmation(
        'Delete Column',
        message,
        async () => {
            try {
                const columnIndex = currentBoard.columns.findIndex(c => c.id === columnId);
                if (columnIndex > -1) {
                    currentBoard.columns.splice(columnIndex, 1);

                    // Update board in Firestore
                    await updateDoc(doc(db, 'boards', currentBoard.id), {
                        columns: currentBoard.columns
                    });

                    renderColumns();
                }
            } catch (error) {
                console.error('Error deleting column: ', error);
                alert('Error deleting column. Please try again.');
            }
        }
    );
}

//board management supporting functions
//fn to update the boards dropdown
export function updateBoardsDropdown() {
    const dropdown = document.getElementById('boards-dropdown');
    dropdown.innerHTML = '';

    if (boards.length === 0) {
        dropdown.innerHTML = '<li><span class="dropdown-item-text">No boards yet</span></li>';
        return;
    }

    boards.forEach(board => {
        const li = document.createElement('li');
        li.innerHTML = `
            <a class="dropdown-item ${currentBoard && currentBoard.id === board.id ? 'active' : ''}" 
               href="#" onclick="loadBoard('${board.id}')">
                ${board.name}
            </a>
        `;
        dropdown.appendChild(li);
        console.log("boards dropdown updated");
    });

    // Add divider and delete options
    dropdown.innerHTML += '<li><hr class="dropdown-divider"></li>';
    boards.forEach(board => {
        const li = document.createElement('li');
        li.innerHTML = `
            <a class="dropdown-item text-danger" href="#" onclick="deleteBoardConfirm('${board.id}')">
                <i class="fas fa-trash me-2"></i>Delete "${board.name}"
            </a>
        `;
        dropdown.appendChild(li);
    });
}

//fn to confirm the deletion of the board
async function deleteBoardConfirm(boardId) {
    const board = boards.find(b => b.id === boardId);
    if (!board) return;

    showConfirmation(
        'Delete Board',
        `Are you sure you want to delete "${board.name}"? All tasks will be lost.`,
        async () => {
            try {
                //delete from the firebase database(firestore)
                await deleteDoc(doc(db, 'boards', boardId));
                console.log(`Board deleted: ${board.name}`);

                // remove from the local array of boards also
                const boardIndex = boards.findIndex(b => b.id === boardId);
                if (boardIndex > -1) {
                    boards.splice(boardIndex, 1);
                    updateBoardsDropdown();

                    if (currentBoard && currentBoard.id === boardId) {
                        if (boards.length > 0) {
                            loadBoard(boards[0].id);
                        } else {
                            showWelcomeScreen();
                        }
                    }
                }
            } catch (error) {
                console.error('Error deleting board: ', error);
                alert('Error deleting board. Please try again.');
            }
        }
    );
}

//fn to show the welcome screen that is the home page
function showWelcomeScreen() {
    document.getElementById('welcome-screen').style.display = 'block';
    document.getElementById('board-view').style.display = 'none';
    document.getElementById('board-header').classList.add('hidden');



    if (!currentUser) {
        document.getElementById('board-management').style.display = 'none';
    }
    currentBoard = null;

}

//fn to implement the functionality of search
function searchTasks() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();

    if (!searchTerm) {
        // Clear highlighting
        document.querySelectorAll('.task-card.highlighted').forEach(card => {
            card.classList.remove('highlighted');
        });
        return;
    }

    //remove the previous highlighting if search performed earlier
    document.querySelectorAll('.task-card.highlighted').forEach(card => {
        card.classList.remove('highlighted');
    });

    //it will search and highlight matching tasks
    document.querySelectorAll('.task-card').forEach(card => {
        const title = card.querySelector('.task-title').textContent.toLowerCase();
        const description = card.querySelector('.task-description').textContent.toLowerCase();

        if (title.includes(searchTerm) || description.includes(searchTerm)) {
            card.classList.add('highlighted');
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
}

// utility functions 
//this fn handles the confirmation modal
function showConfirmation(title, message, onConfirm) {
    document.getElementById('confirmModalTitle').textContent = title;
    document.getElementById('confirmModalMessage').textContent = message;

    const confirmBtn = document.getElementById('confirmActionBtn');
    confirmBtn.onclick = () => {
        onConfirm();
        const modal = bootstrap.Modal.getInstance(document.getElementById('confirmModal'));
        modal.hide();
    };

    const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
    modal.show();
}

//convert date to ddmmyyyy format
function formatDate(dateString) {
    const date = new Date(dateString); //convert the input string into a date object
    return date.toLocaleDateString(); //format date to ddmmyyyy format
}

//check for the due date 
function isOverdue(dateString) {
    const dueDate = new Date(dateString); //convert the input string into a date object
    const today = new Date();         // get the current date and time
    today.setHours(0, 0, 0, 0);      //it reset the time to 00:00:00 for comparison
    return dueDate < today;          //check if due date is in the past
}

function createTaskHTML(task, columnId) {
    const dueDateHtml = task.dueDate ?
        `<div class="task-due-date ${isOverdue(task.dueDate) ? 'overdue' : ''}">
            <i class="fas fa-calendar"></i>
            ${formatDate(task.dueDate)}
        </div>` : '';

    return `
        <div class="task-card" draggable="true" ondragstart="dragStart(event)" data-task-id="${task.id}" onclick="editTask('${task.id}')">
            <div class="task-title">${task.title}</div>
            <div class="task-description">${task.description || ''}</div>
            <div class="task-meta">
                <span class="task-priority priority-${task.priority}">${task.priority}</span>
                ${dueDateHtml}
            </div>
        </div>
    `;
}

//drag and drop functionality implementation for the task cards
async function dropTask(event) {
    event.preventDefault(); //prevent the default event of the button
    const taskId = event.dataTransfer.getData('text/plain');
    const targetColumn = event.currentTarget.closest('.column');
    const targetColumnId = targetColumn.dataset.columnId;

    //remove drag over styling
    targetColumn.classList.remove('drag-over');
    document.querySelectorAll('.task-card.dragging').forEach(el => {
        el.classList.remove('dragging');
    });

    try {
        //find and move task
        let task = null;
        let sourceColumn = null;

        for (const column of currentBoard.columns) {
            const taskIndex = column.tasks.findIndex(t => t.id === taskId);
            if (taskIndex > -1) {
                task = column.tasks[taskIndex];
                sourceColumn = column;
                column.tasks.splice(taskIndex, 1);
                break;
            }
        }

        if (task) {
            const targetCol = currentBoard.columns.find(c => c.id === targetColumnId);
            targetCol.tasks.push(task);

            //update board in the firebase database
            await updateDoc(doc(db, 'boards', currentBoard.id), {
                columns: currentBoard.columns
            });

            renderColumns();
        }
    } catch (error) {
        console.error('Error moving task: ', error);
        alert('Error moving task. Please try again.');
    }
}

//drag and drop helper functions
function dragStart(event) {
    event.dataTransfer.setData('text/plain', event.target.dataset.taskId);
    event.target.classList.add('dragging');
}

function allowDrop(event) {
    event.preventDefault();
}

//making the functions to be available globally
window.createBoard = createBoard;
window.loadBoard = loadBoard;
window.showCreateTaskModal = showCreateTaskModal;
window.createTask = createTask;
window.editTask = editTask;
window.updateTask = updateTask;
window.deleteTask = deleteTask;
window.addNewColumn = addNewColumn;
window.editColumnName = editColumnName;
window.deleteColumn = deleteColumn;
window.dragStart = dragStart;
window.allowDrop = allowDrop;
window.dropTask = dropTask;
window.searchTasks = searchTasks;
window.deleteBoardConfirm = deleteBoardConfirm;
window.showLoginModal = showLoginModal;
window.showSignupModal = showSignupModal;