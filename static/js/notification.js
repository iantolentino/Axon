// Simple notification system
class NotificationManager {
    constructor() {
        this.init();
    }

    async init() {
        // Request notification permission
        if ('Notification' in window) {
            await Notification.requestPermission();
        }
    }

    showTaskReminder(taskTitle, taskDescription) {
        if (Notification.permission === 'granted') {
            new Notification(`🔔 ${taskTitle}`, {
                body: taskDescription || 'Reminder!',
                icon: '/static/icons/icon-192.png'
            });
        }
    }
}

// Start the notification system
const notificationManager = new NotificationManager();

// Test function - you can call this from browser console
function testNotification() {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Test Reminder', {
            body: 'The reminder system is working!',
            icon: '/static/icons/icon-192.png'
        });
    } else {
        alert('Please allow notifications in your browser settings');
    }
}