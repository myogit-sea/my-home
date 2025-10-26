import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp, setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Global Variable Setup (Mandatory for Canvas Environment) ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// --- Firebase Initialization ---
let app;
let db;
let auth;
let userId = null;
let isAuthReady = false;

setLogLevel('Debug'); // Enable Firestore logging for console checks

if (Object.keys(firebaseConfig).length > 0) {
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        // Handle Authentication and determine userId
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                userId = user.uid;
            } else {
                // Sign in with custom token or anonymously
                try {
                    if (initialAuthToken) {
                        await signInWithCustomToken(auth, initialAuthToken);
                    } else {
                        const anonUser = await signInAnonymously(auth);
                        userId = anonUser.user.uid;
                    }
                } catch (error) {
                    console.error("Firebase Auth Error on init:", error);
                    // Fallback to a random ID if auth fails completely
                    userId = crypto.randomUUID();
                }
            }
            isAuthReady = true;
            console.log("Auth is ready. User ID:", userId);
        });

    } catch (error) {
        console.error("Firebase Initialization Error:", error);
    }
} else {
    console.log("Firebase configuration not available. Running in standalone mode.");
    isAuthReady = true; // Assume ready if no Firebase is present
}

// --- Core Website JavaScript ---

// 1. Mobile Menu Toggle
document.getElementById('mobile-menu-button')?.addEventListener('click', function() {
    const menu = document.getElementById('mobile-menu');
    menu.classList.toggle('hidden');
});

// 2. Contact Form Submission (using Modal and Firestore)
document.getElementById('contact-form')?.addEventListener('submit', async function(event) {
    event.preventDefault();

    // Check if Firebase is initialized and auth is ready
    if (!isAuthReady || !db || !userId) {
        console.error("Firebase or Auth is not ready. Cannot save data.");
        showModal('Submission Failed', 'The connection to the server is not ready. Please try again in a moment.', false);
        return;
    }

    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    try {
        // Path structure: /artifacts/{appId}/public/data/inquiries
        const collectionPath = `artifacts/${appId}/public/data/inquiries`;

        await addDoc(collection(db, collectionPath), {
            ...data,
            // Add metadata
            userId: userId,
            timestamp: serverTimestamp(),
        });

        form.reset(); // Clear the form on successful submission
        showModal('Inquiry Sent!', 'Thank you for your interest. We will be in touch within 24-48 hours!', true);
    } catch (error) {
        console.error("Error writing document: ", error);
        showModal('Submission Error', 'We could not submit your inquiry due to a network error. Please try again.', false);
    }
});

// 3. Modal Functions
function showModal(title, message, isSuccess) {
    const modal = document.getElementById('success-modal');
    const modalContent = document.getElementById('modal-content');
    const modalTitle = modalContent.querySelector('h3');
    const modalMessage = modalContent.querySelector('p');
    const modalIcon = modalContent.querySelector('svg');

    // Update modal content
    modalTitle.textContent = title;
    modalMessage.textContent = message;

    // Update icon and colors based on success/error
    if (isSuccess) {
        // Checkmark Icon
        modalIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>';
        modalIcon.classList.remove('text-red-500');
        modalIcon.classList.add('text-primary'); // primary is violet
        modalContent.querySelector('.bg-primary\\/20').classList.remove('bg-red-500/20');
        modalContent.querySelector('.bg-primary\\/20').classList.add('bg-primary/20');
    } else {
        // X-mark Icon
        modalIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>';
        modalIcon.classList.remove('text-primary');
        modalIcon.classList.add('text-red-500');
        modalContent.querySelector('.bg-primary\\/20').classList.remove('bg-primary/20');
        modalContent.querySelector('.bg-primary\\/20').classList.add('bg-red-500/20');
    }

    // Show modal and reset form
    modal.classList.remove('hidden');

    // Apply transition classes for animation
    setTimeout(() => {
        modalContent.classList.remove('scale-95', 'opacity-0');
        modalContent.classList.add('scale-100', 'opacity-100');
    }, 10);
}

document.getElementById('close-modal-button')?.addEventListener('click', closeModal);

// Allow closing by clicking outside the modal box
document.getElementById('success-modal')?.addEventListener('click', function(event) {
    const modalContent = document.getElementById('modal-content');
    // Check if the click target is the modal container itself, not the content inside it
    if (event.target === this) {
        closeModal();
    }
});

function closeModal() {
    const modal = document.getElementById('success-modal');
    const modalContent = document.getElementById('modal-content');

    modalContent.classList.remove('scale-100', 'opacity-100');
    modalContent.classList.add('scale-95', 'opacity-0');

    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}
