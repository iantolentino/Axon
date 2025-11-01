// Task Management
let currentEditingTask = null;

// Open Add Task Modal
document.getElementById('addTaskBtn')?.addEventListener('click', () => {
    currentEditingTask = null;
    document.getElementById('modalTitle').textContent = 'Add New Task';
    document.getElementById('taskForm').reset();
    document.getElementById('taskId').value = '';
    openModal('taskModal');
});

// Task Form Submission
document.getElementById('taskForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        title: document.getElementById('taskTitle').value,
        description: document.getElementById('taskDescription').value,
        due_date: document.getElementById('taskDueDate').value
    };

    try {
        if (currentEditingTask) {
            // Update existing task
            await fetch(`/api/tasks/${currentEditingTask}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
        } else {
            // Create new task
            await fetch('/api/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
        }
        
        closeModal('taskModal');
        location.reload();
    } catch (error) {
        console.error('Error saving task:', error);
        alert('Error saving task. Please try again.');
    }
});

// Task Actions
async function toggleTaskCompletion(taskId) {
    try {
        const taskElement = document.querySelector(`[onchange="toggleTaskCompletion(${taskId})"]`);
        const isCompleted = taskElement.checked;
        
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ completed: isCompleted })
        });
        
        if (response.ok) {
            location.reload();
        }
    } catch (error) {
        console.error('Error updating task:', error);
    }
}

async function deleteTask(taskId) {
    if (confirm('Are you sure you want to delete this task?')) {
        try {
            await fetch(`/api/tasks/${taskId}`, {
                method: 'DELETE'
            });
            location.reload();
        } catch (error) {
            console.error('Error deleting task:', error);
        }
    }
}

function editTask(taskId) {
    // For now, reload and we'll implement proper editing later
    alert('Edit functionality coming soon!');
}

// Modal functions
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

function closeModal() {
    document.getElementById('taskModal').style.display = 'none';
}

// Task Filtering
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const filter = btn.dataset.filter;
        filterTasks(filter);
    });
});

function filterTasks(filter) {
    const tasks = document.querySelectorAll('.task-card');
    
    tasks.forEach(task => {
        const status = task.dataset.status;
        
        if (filter === 'all' || filter === status) {
            task.style.display = 'block';
        } else {
            task.style.display = 'none';
        }
    });
}