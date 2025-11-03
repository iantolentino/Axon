// Logs Management - Complete Working Version
let currentEditingLog = null;

// Load today's log when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadTodayLog();
    
    // Set up event listeners
    document.getElementById('addLogBtn')?.addEventListener('click', openAddLogModal);
    document.getElementById('logForm')?.addEventListener('submit', handleLogSubmit);
});

// Load today's log
async function loadTodayLog() {
    const todayLogContent = document.getElementById('todayLogContent');
    
    try {
        const response = await fetch('/api/logs/today');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const todayLog = await response.json();
        
        if (todayLog.exists) {
            todayLogContent.innerHTML = `
                <div class="today-log-preview">
                    ${todayLog.accomplishments ? `
                        <div class="log-preview-section">
                            <strong>✅ Accomplishments:</strong>
                            <p>${todayLog.accomplishments.replace(/\n/g, '<br>')}</p>
                        </div>
                    ` : ''}
                    
                    ${todayLog.missed_items ? `
                        <div class="log-preview-section">
                            <strong>❌ Missed:</strong>
                            <p>${todayLog.missed_items.replace(/\n/g, '<br>')}</p>
                        </div>
                    ` : ''}
                    
                    ${todayLog.tomorrow_plan ? `
                        <div class="log-preview-section">
                            <strong>📅 Tomorrow:</strong>
                            <p>${todayLog.tomorrow_plan.replace(/\n/g, '<br>')}</p>
                        </div>
                    ` : ''}
                    
                    <div class="today-log-actions">
                        <button onclick="editLog(${todayLog.id})" class="btn-secondary">Edit Today's Log</button>
                        <button onclick="deleteLog(${todayLog.id})" class="btn-danger">Delete</button>
                    </div>
                </div>
            `;
        } else {
            todayLogContent.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📔</div>
                    <h3>No log for today</h3>
                    <p>Create your daily log to track your progress and plan for tomorrow!</p>
                    <button onclick="openAddLogModal()" class="btn-primary">Create Today's Log</button>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading today\'s log:', error);
        todayLogContent.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <h3>Error loading today's log</h3>
                <p>There was a problem loading your log. Please try refreshing the page.</p>
                <button onclick="loadTodayLog()" class="btn-secondary">Retry</button>
            </div>
        `;
    }
}

// Open Add Log Modal
function openAddLogModal() {
    currentEditingLog = null;
    document.getElementById('logModalTitle').textContent = "Add Today's Log";
    document.getElementById('logForm').reset();
    document.getElementById('logId').value = '';
    document.getElementById('saveLogText').textContent = 'Save Today\'s Log';
    openModal('logModal');
}

// Handle Log Form Submission
async function handleLogSubmit(e) {
    e.preventDefault();
    
    const saveButton = document.querySelector('#logForm button[type="submit"]');
    const saveText = document.getElementById('saveLogText');
    const spinner = document.getElementById('logLoadingSpinner');
    
    // Show loading state
    saveText.textContent = 'Saving...';
    spinner.classList.remove('hidden');
    saveButton.disabled = true;
    
    const formData = {
        accomplishments: document.getElementById('accomplishments').value,
        missed_items: document.getElementById('missedItems').value,
        tomorrow_plan: document.getElementById('tomorrowPlan').value
    };

    try {
        let response;
        
        if (currentEditingLog) {
            // Update existing log
            response = await fetch(`/api/logs/${currentEditingLog}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
        } else {
            // Create new log
            response = await fetch('/api/logs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
        }
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Show success message
        if (window.notificationSystem) {
            window.notificationSystem.show(result.message, 'success');
        }
        
        closeLogModal();
        loadTodayLog(); // Reload the today's log section
        setTimeout(() => location.reload(), 1000); // Full reload after a delay
        
    } catch (error) {
        console.error('Error saving log:', error);
        
        // Show error message
        if (window.notificationSystem) {
            window.notificationSystem.show('Error saving log: ' + error.message, 'error');
        } else {
            alert('Error saving log: ' + error.message);
        }
        
        // Reset button state
        saveText.textContent = currentEditingLog ? 'Update Log' : 'Save Today\'s Log';
        spinner.classList.add('hidden');
        saveButton.disabled = false;
    }
}

// Edit log
async function editLog(logId) {
    try {
        const response = await fetch('/api/logs/today');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const log = await response.json();
        
        if (log.exists && log.id === logId) {
            currentEditingLog = logId;
            document.getElementById('logModalTitle').textContent = "Edit Today's Log";
            document.getElementById('logId').value = log.id;
            document.getElementById('accomplishments').value = log.accomplishments || '';
            document.getElementById('missedItems').value = log.missed_items || '';
            document.getElementById('tomorrowPlan').value = log.tomorrow_plan || '';
            document.getElementById('saveLogText').textContent = 'Update Log';
            
            openModal('logModal');
        } else {
            throw new Error('Log not found or not from today');
        }
    } catch (error) {
        console.error('Error loading log for editing:', error);
        alert('Error loading log for editing: ' + error.message);
    }
}

// Delete log
async function deleteLog(logId) {
    if (!confirm('Are you sure you want to delete this log? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/logs/${logId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Show success message
        if (window.notificationSystem) {
            window.notificationSystem.show(result.message, 'success');
        }
        
        // Reload the page to reflect changes
        location.reload();
        
    } catch (error) {
        console.error('Error deleting log:', error);
        alert('Error deleting log: ' + error.message);
    }
}

// Modal functions
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeLogModal() {
    document.getElementById('logModal').style.display = 'none';
    document.body.style.overflow = 'auto';
    currentEditingLog = null;
    
    // Reset button state
    const saveText = document.getElementById('saveLogText');
    const spinner = document.getElementById('logLoadingSpinner');
    const saveButton = document.querySelector('#logForm button[type="submit"]');
    
    saveText.textContent = 'Save Today\'s Log';
    spinner.classList.add('hidden');
    saveButton.disabled = false;
}

// Close modal when clicking outside or with Escape key
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        closeLogModal();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeLogModal();
    }
});