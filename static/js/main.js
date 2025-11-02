// Theme Toggle
const themeToggle = document.getElementById('themeToggle');
const currentTheme = localStorage.getItem('theme') || 'dark';

document.documentElement.setAttribute('data-theme', currentTheme);

themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Update button text
    themeToggle.textContent = newTheme === 'dark' ? '🌓' : '🌙';
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