// Enhanced Theme Toggle with Better Design
class ThemeManager {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || 'dark';
        this.themeToggle = document.getElementById('themeToggle');
        this.init();
    }

    init() {
        // Set initial theme
        this.applyTheme(this.currentTheme);
        
        // Set up event listener
        this.themeToggle.addEventListener('click', () => {
            this.toggleTheme();
        });

        // Update button icon
        this.updateButtonIcon();
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(this.currentTheme);
        this.updateButtonIcon();
        localStorage.setItem('theme', this.currentTheme);
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        
        // Add smooth transition
        document.documentElement.style.transition = 'all 0.3s ease';
        
        // Dispatch custom event for theme change
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
    }

    updateButtonIcon() {
        const icon = this.currentTheme === 'dark' ? '🌙' : '☀️';
        this.themeToggle.innerHTML = `
            <div class="theme-toggle-inner">
                <span class="theme-icon">${icon}</span>
                <span class="theme-label">${this.currentTheme === 'dark' ? 'Dark' : 'Light'}</span>
            </div>
        `;
    }

    getCurrentTheme() {
        return this.currentTheme;
    }
}

// Initialize theme manager when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    window.themeManager = new ThemeManager();
    
    // Add active state to current page in navigation
    const currentPath = window.location.pathname;
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });
});
// FAB Functionality
const fab = document.getElementById('fab');
fab.addEventListener('click', () => {
    const currentPath = window.location.pathname;
    
    switch(currentPath) {
        case '/tasks':
            document.getElementById('addTaskBtn')?.click();
            break;
        case '/notes':
            document.getElementById('addNoteBtn')?.click();
            break;
        case '/habits':
            // Could open habit creation modal
            window.location.href = '/habits';
            break;
        default:
            window.location.href = '/tasks';
    }
});

// Global modal handling
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
    document.body.style.overflow = 'auto'; // Restore scrolling
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        closeModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});

// Auto-save functionality for forms
function setupAutoSave(formId, saveEndpoint) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    let saveTimeout;
    form.addEventListener('input', () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            // Auto-save implementation would go here
            console.log('Auto-saving...');
        }, 1000);
    });
}

// Notification system
class NotificationSystem {
    constructor() {
        this.container = this.createNotificationContainer();
    }
    
    createNotificationContainer() {
        const container = document.createElement('div');
        container.className = 'notification-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
        `;
        document.body.appendChild(container);
        return container;
    }
    
    show(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            background: var(--secondary-bg);
            border: 1px solid var(--border-color);
            border-left: 4px solid ${this.getColorForType(type)};
            padding: 1rem;
            margin-bottom: 0.5rem;
            border-radius: var(--radius);
            box-shadow: var(--shadow-md);
            animation: slideIn 0.3s ease;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; color: var(--text-muted);">×</button>
            </div>
        `;
        
        this.container.appendChild(notification);
        
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, duration);
        }
        
        return notification;
    }
    
    getColorForType(type) {
        const colors = {
            info: 'var(--accent-primary)',
            success: 'var(--accent-success)',
            warning: 'var(--accent-warning)',
            error: 'var(--accent-error)'
        };
        return colors[type] || colors.info;
    }
}

// Initialize notification system
window.notificationSystem = new NotificationSystem();

// Quick actions
function quickAddTask() {
    const title = prompt('Quick task title:');
    if (title && title.trim()) {
        fetch('/api/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: title.trim(),
                description: ''
            })
        })
        .then(response => response.json())
        .then(data => {
            window.notificationSystem.show('Task added successfully!', 'success');
            // Refresh if on tasks page
            if (window.location.pathname === '/tasks') {
                setTimeout(() => location.reload(), 1000);
            }
        })
        .catch(error => {
            window.notificationSystem.show('Error adding task', 'error');
        });
    }
}

function quickAddNote() {
    const content = prompt('Quick note:');
    if (content && content.trim()) {
        fetch('/api/notes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: content.trim(),
                tags: 'quick'
            })
        })
        .then(response => response.json())
        .then(data => {
            window.notificationSystem.show('Note added successfully!', 'success');
            if (window.location.pathname === '/notes') {
                setTimeout(() => location.reload(), 1000);
            }
        })
        .catch(error => {
            window.notificationSystem.show('Error adding note', 'error');
        });
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K for search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        window.location.href = '/search';
    }
    
    // Ctrl/Cmd + N for new task
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        quickAddTask();
    }
    
    // Ctrl/Cmd + Shift + N for new note
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        quickAddNote();
    }
});

// Add CSS for notifications
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .notification {
        animation: slideIn 0.3s ease;
    }
    
    .notification-success {
        border-left-color: var(--accent-success) !important;
    }
    
    .notification-error {
        border-left-color: var(--accent-error) !important;
    }
    
    .notification-warning {
        border-left-color: var(--accent-warning) !important;
    }
`;
document.head.appendChild(notificationStyles);

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Second Brain initialized');
    
    // Add active state to current page in navigation
    const currentPath = window.location.pathname;
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });
});

// Enhanced online/offline detection
function updateOnlineStatus() {
    const offlineIndicator = document.getElementById('offlineIndicator');
    if (!navigator.onLine) {
        offlineIndicator.classList.remove('hidden');
        console.log('App is offline');
    } else {
        offlineIndicator.classList.add('hidden');
        console.log('App is online');
    }
}

// Listen for online/offline events
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// Initial check
updateOnlineStatus();

// Test network connectivity
async function testNetwork() {
    try {
        const response = await fetch('/health', { 
            method: 'HEAD',
            cache: 'no-store'
        });
        return response.ok;
    } catch (error) {
        return false;
    }
}

// Periodic network checks (optional)
setInterval(async () => {
    const isOnline = await testNetwork();
    const offlineIndicator = document.getElementById('offlineIndicator');
    
    if (!isOnline && !offlineIndicator.classList.contains('hidden')) {
        offlineIndicator.classList.remove('hidden');
    } else if (isOnline && offlineIndicator.classList.contains('hidden')) {
        offlineIndicator.classList.add('hidden');
    }
}, 30000); // Check every 30 seconds