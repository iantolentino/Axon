from flask import Flask, render_template, request, jsonify, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from config import Config
from datetime import datetime, date
import json

app = Flask(__name__)
app.config.from_object(Config)
db = SQLAlchemy(app)

# Database Models
class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    due_date = db.Column(db.DateTime)
    completed = db.Column(db.Boolean, default=False)
    reminder_sent = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Note(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    tags = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class DailyLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, unique=True, nullable=False)
    accomplishments = db.Column(db.Text)
    missed_items = db.Column(db.Text)
    tomorrow_plan = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Habit(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    streak_count = db.Column(db.Integer, default=0)
    last_completed = db.Column(db.Date)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# Routes
@app.route('/')
def index():
    # Get today's tasks
    today_tasks = Task.query.filter(
        Task.due_date <= datetime.today(),
        Task.completed == False
    ).all()
    
    # Get completed tasks today
    completed_today = Task.query.filter(
        db.func.date(Task.updated_at) == date.today(),
        Task.completed == True
    ).count()
    
    # Get recent notes
    recent_notes = Note.query.order_by(Note.updated_at.desc()).limit(5).all()
    
    # Get current date for display
    current_date = datetime.now()
    
    return render_template('index.html', 
                         today_tasks=today_tasks,
                         completed_today=completed_today,
                         recent_notes=recent_notes,
                         current_date=current_date)  # Pass current date to template

@app.route('/tasks')
def tasks():
    all_tasks = Task.query.order_by(Task.due_date.asc()).all()
    return render_template('tasks.html', tasks=all_tasks)

@app.route('/notes')
def notes():
    all_notes = Note.query.order_by(Note.updated_at.desc()).all()
    return render_template('notes.html', notes=all_notes)

@app.route('/logs')
def logs():
    recent_logs = DailyLog.query.order_by(DailyLog.date.desc()).limit(7).all()
    return render_template('logs.html', logs=recent_logs)

# API Routes for Tasks
@app.route('/api/tasks', methods=['POST'])
def create_task():
    data = request.get_json()
    task = Task(
        title=data['title'],
        description=data.get('description', ''),
        due_date=datetime.fromisoformat(data['due_date']) if data.get('due_date') else None
    )
    db.session.add(task)
    db.session.commit()
    return jsonify({'id': task.id, 'message': 'Task created successfully'})

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    task = Task.query.get_or_404(task_id)
    data = request.get_json()
    
    if 'completed' in data:
        task.completed = data['completed']
    if 'title' in data:
        task.title = data['title']
    if 'description' in data:
        task.description = data['description']
    
    db.session.commit()
    return jsonify({'message': 'Task updated successfully'})

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    task = Task.query.get_or_404(task_id)
    db.session.delete(task)
    db.session.commit()
    return jsonify({'message': 'Task deleted successfully'})

# API Routes for Notes
@app.route('/api/notes', methods=['POST'])
def create_note():
    data = request.get_json()
    note = Note(
        content=data['content'],
        tags=data.get('tags', '')
    )
    db.session.add(note)
    db.session.commit()
    return jsonify({'id': note.id, 'message': 'Note created successfully'})

@app.route('/api/notes/<int:note_id>', methods=['PUT'])
def update_note(note_id):
    note = Note.query.get_or_404(note_id)
    data = request.get_json()
    note.content = data['content']
    note.tags = data.get('tags', '')
    db.session.commit()
    return jsonify({'message': 'Note updated successfully'})

@app.route('/api/notes/<int:note_id>', methods=['DELETE'])
def delete_note(note_id):
    note = Note.query.get_or_404(note_id)
    db.session.delete(note)
    db.session.commit()
    return jsonify({'message': 'Note deleted successfully'})

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)