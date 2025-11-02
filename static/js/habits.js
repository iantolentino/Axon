let currentHabitId = null;

// Load habits when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Habits page loaded');
});

function openHabitModal(habitId) {
    currentHabitId = habitId;
    const habitCard = document.querySelector(`[data-habit-id="${habitId}"]`);
    const habitName = habitCard.querySelector('h3').textContent;
    
    document.getElementById('habitModalText').textContent = `Did you complete "${habitName}" today?`;
    document.getElementById('habitModal').style.display = 'flex';
}

function closeHabitModal() {
    document.getElementById('habitModal').style.display = 'none';
    currentHabitId = null;
}

async function completeHabit() {
    if (!currentHabitId) return;
    
    try {
        const response = await fetch(`/api/habits/${currentHabitId}/complete`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const result = await response.json();
        
        closeHabitModal();
        // Reload the page to show updated streaks
        location.reload();
    } catch (error) {
        console.error('Error completing habit:', error);
        alert('Error completing habit. Please try again.');
    }
}

async function skipHabit() {
    if (!currentHabitId) return;
    
    try {
        const response = await fetch(`/api/habits/${currentHabitId}/skip`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const result = await response.json();
        
        closeHabitModal();
        // Reload the page to show updated streaks
        location.reload();
    } catch (error) {
        console.error('Error skipping habit:', error);
        alert('Error skipping habit. Please try again.');
    }
}

async function initializeHabits() {
    try {
        const response = await fetch('/api/initialize-habits', {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const result = await response.json();
        
        alert('Default habits created!');
        location.reload();
    } catch (error) {
        console.error('Error initializing habits:', error);
        alert('Error creating habits. Please try again.');
    }
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    if (e.target.id === 'habitModal') {
        closeHabitModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeHabitModal();
    }
});