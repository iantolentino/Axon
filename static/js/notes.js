// Notes Management
let currentEditingNote = null;

// Open Add Note Modal
document.getElementById('addNoteBtn')?.addEventListener('click', () => {
    currentEditingNote = null;
    document.getElementById('noteModalTitle').textContent = 'Add New Note';
    document.getElementById('noteForm').reset();
    document.getElementById('noteId').value = '';
    openModal('noteModal');
});

// Note Form Submission
document.getElementById('noteForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        content: document.getElementById('noteContent').value,
        tags: document.getElementById('noteTags').value
    };

    try {
        if (currentEditingNote) {
            // Update existing note
            await fetch(`/api/notes/${currentEditingNote}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
        } else {
            // Create new note
            await fetch('/api/notes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
        }
        
        closeModal('noteModal');
        location.reload();
    } catch (error) {
        console.error('Error saving note:', error);
        alert('Error saving note. Please try again.');
    }
});

// Note Actions
async function deleteNote(noteId) {
    if (confirm('Are you sure you want to delete this note?')) {
        try {
            await fetch(`/api/notes/${noteId}`, {
                method: 'DELETE'
            });
            location.reload();
        } catch (error) {
            console.error('Error deleting note:', error);
        }
    }
}

function editNote(noteId) {
    // For now, we'll implement a simple version
    // In a full implementation, we'd fetch the note and populate the form
    currentEditingNote = noteId;
    document.getElementById('noteModalTitle').textContent = 'Edit Note';
    
    // Find the note card and get its content
    const noteCard = document.querySelector(`[onclick="editNote(${noteId})"]`).closest('.note-card');
    const content = noteCard.querySelector('.note-content').textContent;
    const tags = noteCard.querySelector('.note-tags')?.textContent.replace(/#/g, '').trim() || '';
    
    document.getElementById('noteContent').value = content;
    document.getElementById('noteTags').value = tags;
    document.getElementById('noteId').value = noteId;
    
    openModal('noteModal');
}